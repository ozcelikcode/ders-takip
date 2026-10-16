import { preferencesSchema, preferencesPatchSchema } from '@study-tracker/contracts';
import { NextFunction, Request, Response } from 'express';
import { Op } from 'sequelize';
import { User } from '../models/User';
import { Transaction } from 'sequelize';
import { sequelize } from '../config/database';
import { createAuthSession, rotateAuthSession, revokeCredential, revokeUserSessions } from '../services/authSessions';
import { readSiteSettings, sendMaintenance } from '../services/siteSettings';
import { clearRefreshCookie, readRefreshCookie, setRefreshCookie } from '../middleware/authCookies';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { username, email, password, firstName, lastName } = req.body;

    const site = await readSiteSettings();
    if (site.maintenanceMode) { sendMaintenance(res); return; }
    if (!site.allowRegistration) {
      res.status(403).json({ success: false, error: { message: 'Yeni kayıtlar şu anda kapalı' } });
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
        error: {
          message: existingUser.email === email
            ? 'Bu e-posta adresi zaten kullanılıyor'
            : 'Bu kullanıcı adı zaten alınmış',
        },
      });
      return;
    }

    const user = await User.create({
      username,
      email,
      password,
      firstName,
      lastName,
    });

    const session = await createAuthSession(user);
    setRefreshCookie(res, session.credential, session.session.expiresAt);
    const tokens = session.tokens;

    user.lastLogin = new Date();
    await user.save();

    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.getFullName(),
      role: user.role,
      isActive: user.isActive,
      profileImage: user.profileImage,
      preferences: preferencesSchema.parse(user.preferences),
      createdAt: user.createdAt,
    };

    res.status(201).json({
      success: true,
      message: 'Hesap başarıyla oluşturuldu',
      data: {
        user: userResponse,
        tokens,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      where: { email },
      attributes: { include: ['password'] }
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: { message: 'E-posta veya şifre hatalı' },
      });
      return;
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        error: { message: 'E-posta veya şifre hatalı' },
      });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({
        success: false,
        error: { message: 'Hesabınız deaktif durumda. Lütfen yöneticiyle iletişime geçin' },
      });
      return;
    }

    if (user.role !== 'admin' && (await readSiteSettings()).maintenanceMode) { sendMaintenance(res); return; }

    const session = await createAuthSession(user);
    setRefreshCookie(res, session.credential, session.session.expiresAt);
    const tokens = session.tokens;

    user.lastLogin = new Date();
    await user.save();

    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.getFullName(),
      role: user.role,
      isActive: user.isActive,
      profileImage: user.profileImage,
      preferences: preferencesSchema.parse(user.preferences),
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
    };

    res.json({
      success: true,
      message: 'Giriş başarılı',
      data: {
        user: userResponse,
        tokens,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await rotateAuthSession(readRefreshCookie(req));
    if (!result) {
      clearRefreshCookie(res);
      res.status(401).json({ success: false, error: { message: 'Oturum sona erdi. Lütfen yeniden giriş yapın' } });
      return;
    }
    setRefreshCookie(res, result.credential, result.session.expiresAt);
    const user = result.user;
    res.json({ success: true, message: 'Oturum yenilendi', data: { tokens: result.tokens, user: { ...user.toJSON(), fullName: user.getFullName(), preferences: preferencesSchema.parse(user.preferences), password: undefined } } });
  } catch (error) { next(error); }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await revokeCredential(readRefreshCookie(req));
    clearRefreshCookie(res);
    res.json({ success: true, message: 'Çıkış başarılı' });
  } catch (error) { next(error); }
};

export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user;

    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.getFullName(),
      role: user.role,
      isActive: user.isActive,
      profileImage: user.profileImage,
      preferences: preferencesSchema.parse(user.preferences),
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.json({
      success: true,
      data: { user: userResponse },
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { firstName, lastName, username, profileImage, preferences } = req.body;
    const parsed = preferencesPatchSchema.safeParse(preferences ?? {});
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { message: 'Tercihler geçersiz', details: parsed.error.flatten() } });
      return;
    }
    const user = await sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, async transaction => {
      const current = await User.findByPk(req.user.id, { transaction });
      if (!current?.isActive) throw Object.assign(new Error('Kullanıcı bulunamadı'), { statusCode: 404 });
      if (firstName) current.firstName = firstName;
      if (lastName) current.lastName = lastName;
      if (username) current.username = username;
      if (profileImage !== undefined) current.profileImage = profileImage || null;
      if (preferences !== undefined) current.preferences = { ...current.preferences, ...preferencesSchema.parse({ ...current.preferences, ...parsed.data }) };
      await current.save({ transaction });
      return current;
    });
    const profile = user.toJSON();
    res.json({ success: true, message: 'Profil başarıyla güncellendi', data: { user: { ...profile, password: undefined, fullName: user.getFullName(), preferences: preferencesSchema.parse(user.preferences) } } });
  } catch (error) { next(error); }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    const user = await User.findByPk(userId, {
      attributes: { include: ['password'] }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: { message: 'Kullanıcı bulunamadı' },
      });
      return;
    }

    const isCurrentPasswordValid = await user.comparePassword(currentPassword);

    if (!isCurrentPasswordValid) {
      res.status(400).json({
        success: false,
        error: { message: 'Mevcut şifre hatalı' },
      });
      return;
    }

    await sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, async transaction => {
      const current = await User.findByPk(user.id, { attributes: { include: ['password'] }, transaction });
      if (!current?.isActive || current.password !== user.password) throw Object.assign(new Error('Kimlik bilgileri değişti. Yeniden giriş yapın'), { statusCode: 409 });
      current.password = newPassword;
      await current.save({ transaction });
      await revokeUserSessions(user.id, transaction);
    });
    clearRefreshCookie(res);

    res.json({
      success: true,
      message: 'Şifre başarıyla değiştirildi',
    });
  } catch (error) {
    next(error);
  }
};