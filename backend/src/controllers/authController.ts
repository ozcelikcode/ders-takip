import { userResponse } from '../services/userResponses';
import { defaultPreferences, mergePreferences, fail } from '@study-tracker/contracts';
import { NextFunction, Request, Response } from 'express';
import { Op } from 'sequelize';
import { User } from '../models/User';
import { Transaction } from 'sequelize';
import { sequelize } from '../config/database';
import {
  createAuthSession,
  rotateAuthSession,
  revokeCredential,
  revokeUserSessions,
} from '../services/authSessions';
import { readSiteSettings, sendMaintenance } from '../services/siteSettings';
import { recordAdminEvent } from '../services/adminAudit';
import {
  clearRefreshCookie,
  readRefreshCookie,
  setRefreshCookie,
} from '../middleware/authCookies';

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { username, email, password, firstName, lastName, timezone } = req.body;

    const site = await readSiteSettings();
    if (site.maintenanceMode) {
      sendMaintenance(res);
      return;
    }
    if (!site.allowRegistration) {
      res
        .status(403)
        .json({
          success: false,
          error: { code: 'registrationClosed' },
        });
      return;
    }

    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ email }, { username }],
      },
    });

    if (existingUser) {
      res.status(400).json({
        success: false,
        error: { code: existingUser.email === email ? 'emailTaken' : 'usernameTaken' },
      });
      return;
    }

    const user = await User.create({
      username,
      email,
      password,
      firstName,
      lastName,
      preferences: { ...defaultPreferences, ...(timezone ? { timezone } : {}), onboarding: 'pending' },
    });

    const session = await createAuthSession(user);
    setRefreshCookie(res, session.credential, session.session.expiresAt);
    const tokens = session.tokens;

    user.lastLogin = new Date();
    await user.save();

    const profile = userResponse(user);

    res.status(201).json({
      success: true,
      data: {
        user: profile,
        tokens,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      where: { email },
      attributes: { include: ['password'] },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: { code: 'invalidCredentials' },
      });
      return;
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      // Wrong passwords for an administrator account are logged; unknown addresses are not, so the log cannot be flooded with them.
      if (user.role === 'admin') await recordAdminEvent({ action: 'signInFailed', target: user, request: req });
      res.status(401).json({
        success: false,
        error: { code: 'invalidCredentials' },
      });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({
        success: false,
        error: { code: 'accountDisabled' },
      });
      return;
    }

    if (user.role !== 'admin' && (await readSiteSettings()).maintenanceMode) {
      sendMaintenance(res);
      return;
    }

    const session = await createAuthSession(user);
    setRefreshCookie(res, session.credential, session.session.expiresAt);
    const tokens = session.tokens;

    user.lastLogin = new Date();
    await user.save();
    if (user.role === 'admin') await recordAdminEvent({ action: 'signedIn', actor: user, request: req });

    const profile = userResponse(user);

    res.json({
      success: true,
      data: {
        user: profile,
        tokens,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const credential = readRefreshCookie(req);
    // A browser without a session cookie has nothing to restore, which is not an error.
    if (!credential) {
      res.status(204).end();
      return;
    }
    const result = await rotateAuthSession(credential);
    if (!result) {
      clearRefreshCookie(res);
      res
        .status(401)
        .json({
          success: false,
          error: { code: 'sessionExpired' },
        });
      return;
    }
    setRefreshCookie(res, result.credential, result.session.expiresAt);
    const user = result.user;
    res.json({
      success: true,
      data: { tokens: result.tokens, user: userResponse(user) },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await revokeCredential(readRefreshCookie(req));
    clearRefreshCookie(res);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = req.user!;

    const profile = userResponse(user);

    res.json({
      success: true,
      data: { user: profile },
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { firstName, lastName, username, profileImage, preferences } =
      req.body;
    const user = await sequelize.transaction(
      { type: Transaction.TYPES.IMMEDIATE },
      async (transaction) => {
        const current = await User.findByPk(req.user!.id, { transaction });
        if (!current?.isActive)
          fail(404, 'userNotFound');
        if (firstName) current.firstName = firstName;
        if (lastName) current.lastName = lastName;
        if (username) current.username = username;
        if (profileImage !== undefined)
          current.profileImage = profileImage || null;
        if (preferences !== undefined)
          current.preferences = mergePreferences(current.preferences, preferences);
        await current.save({ transaction });
        return current;
      },
    );
    res.json({
      success: true,
      data: { user: userResponse(user) },
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;

    const user = await User.findByPk(userId, {
      attributes: { include: ['password'] },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: 'userNotFound' },
      });
      return;
    }

    const isCurrentPasswordValid = await user.comparePassword(currentPassword);

    if (!isCurrentPasswordValid) {
      res.status(400).json({
        success: false,
        error: { code: 'wrongCurrentPassword' },
      });
      return;
    }

    await sequelize.transaction(
      { type: Transaction.TYPES.IMMEDIATE },
      async (transaction) => {
        const current = await User.findByPk(user.id, {
          attributes: { include: ['password'] },
          transaction,
        });
        if (!current?.isActive || current.password !== user.password)
          fail(409, 'credentialsChanged');
        current.password = newPassword;
        await current.save({ transaction });
        await revokeUserSessions(user.id, transaction);
      },
    );
    clearRefreshCookie(res);

    res.json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
};
