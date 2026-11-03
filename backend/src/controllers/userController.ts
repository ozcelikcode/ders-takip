import { userResponse } from '../services/userResponses';
import { recordAdminEvent } from '../services/adminAudit';
import { getAllTimeSummaries, getStudyStats } from '../services/studyTracking';
import { defaultPreferences, mergePreferences, preferencesSchema, fail } from '@study-tracker/contracts';
import { columnContains, emailEquals, usernameEquals } from '../utils/textSearch';
import { Op, Transaction, type WhereOptions } from 'sequelize';
import { sequelize } from '../config/database';
import { revokeUserSessions } from '../services/authSessions';
import { assertNotLastAdmin, deleteAccount } from '../services/accounts';
import { NextFunction, Request, Response } from 'express';
import { Course, PasswordResetToken, StudySession, User } from '../models';
import type { AdminOverview } from '@study-tracker/contracts';

export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      role,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = req.query;

    const where: WhereOptions<User> = {
      // Same fold as global search: case and Turkish letter forms ignored, "%" and "_" literal.
      ...(typeof search === 'string' && search.trim()
        ? {
            [Op.or]: ['firstName', 'lastName', 'username', 'email'].map(
              (column) => columnContains(`User.${column}`, search),
            ),
          }
        : {}),
    };

    if (role === 'student' || role === 'admin') {
      where.role = role;
    }

    if (isActive !== undefined && isActive !== 'all' && isActive !== '') {
      where.isActive = isActive === 'true';
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;
    const safeSortBy = String(sortBy);
    const safeSortOrder = String(sortOrder).toUpperCase();

    const { count, rows: users } = await User.findAndCountAll({
      where,
      order: [
        [safeSortBy, safeSortOrder],
        ['id', safeSortOrder],
      ],
      limit: limitNum,
      offset,
      attributes: { exclude: ['password'] },
    });

    const summaries =
      req.query.includeStats === 'true'
        ? await getAllTimeSummaries(users.map((user) => user.id))
        : null;
    res.json({
      success: true,
      data: {
        users: users.map((user) => ({
          ...userResponse(user),
          ...(summaries ? { stats: summaries.get(user.id) } : {}),
        })),
        pagination: {
          current: pageNum,
          pages: Math.ceil(count / limitNum),
          total: count,
          limit: limitNum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      username,
      email,
      password,
      firstName,
      lastName,
      role = 'student',
      isActive = true,
    } = req.body;

    const hash = await User.hashPassword(password);
    const user = await sequelize.transaction(
      { type: Transaction.TYPES.IMMEDIATE },
      async (transaction) => {
        const existingUser = await User.findOne({
          where: {
            [Op.or]: [emailEquals(email), usernameEquals(username)],
          },
          transaction,
        });

        if (existingUser) {
          fail(409, existingUser.email.toLowerCase() === email ? 'emailTaken' : 'usernameTaken');
        }

        const created = User.build({
          username,
          email,
          password: hash,
          firstName,
          lastName,
          role,
          isActive,
          preferences: { ...defaultPreferences, onboarding: 'pending' },
        });
        created.setHashedPassword(hash);
        return created.save({ transaction });
      },
    );

    await recordAdminEvent({ action: 'userCreated', actor: req.user!, target: user, details: { role: user.role }, request: req });
    const profile = userResponse(user);

    res.status(201).json({
      success: true,
      data: { user: profile },
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { firstName, lastName, username, email, role, isActive, preferences } = req.body;

    const changes: { role?: string; isActive?: boolean; fields?: string[] } = {};
    const user = await sequelize.transaction(
      { type: Transaction.TYPES.IMMEDIATE },
      async (transaction) => {
        // The actor is read again under the write lock: an administrator demoted a moment ago must not act on the old role.
        const actor = await User.findByPk(req.user!.id, { transaction });
        if (!actor || actor.role !== 'admin' || !actor.isActive)
          fail(403, 'forbidden');
        const current = await User.findByPk(id, { transaction });
        if (!current)
          fail(404, 'userNotFound');
        if (current.id === req.user!.id) {
          if (isActive === false)
            fail(400, 'cannotDeactivateSelf');
          if (role !== undefined && role !== 'admin')
            fail(400, 'cannotRemoveOwnAdmin');
        }
        if ((role !== undefined && role !== 'admin') || isActive === false)
          await assertNotLastAdmin(current, transaction);
        if (username !== undefined || email !== undefined) {
          const taken = await User.findOne({
            where: {
              id: { [Op.ne]: current.id },
              [Op.or]: [
                ...(email !== undefined ? [emailEquals(email)] : []),
                ...(username !== undefined ? [usernameEquals(username)] : []),
              ],
            },
            transaction,
          });
          if (taken)
            fail(409, email !== undefined && taken.email.toLowerCase() === email ? 'emailTaken' : 'usernameTaken');
        }
        if (firstName !== undefined) current.firstName = firstName;
        if (lastName !== undefined) current.lastName = lastName;
        if (username !== undefined) current.username = username;
        if (email !== undefined) current.email = email;
        if (role !== undefined) current.role = role;
        if (isActive !== undefined) current.isActive = isActive;
        if (preferences !== undefined)
          current.preferences = mergePreferences(current.preferences, preferences);
        if (current.changed('role')) changes.role = current.role;
        if (current.changed('isActive')) changes.isActive = current.isActive;
        const fields = (['firstName', 'lastName', 'username', 'email'] as const).filter((field) => current.changed(field));
        if (fields.length) changes.fields = [...fields];
        // A reset link already sent to the old address must not open the account after the address changed.
        if (current.changed('email'))
          await PasswordResetToken.update({ usedAt: new Date() }, { where: { userId: current.id, usedAt: null }, transaction });
        const privilegesChanged =
          current.changed('role') || current.changed('isActive');
        await current.save({ transaction });
        if (privilegesChanged)
          await revokeUserSessions(current.id, transaction);
        return current;
      },
    );

    if (changes.role !== undefined)
      await recordAdminEvent({ action: 'userRoleChanged', actor: req.user!, target: user, details: { role: changes.role }, request: req });
    // Only which details changed is logged, never the old or new values.
    if (changes.fields)
      await recordAdminEvent({ action: 'userDetailsChanged', actor: req.user!, target: user, details: { fields: changes.fields }, request: req });
    if (changes.isActive !== undefined)
      await recordAdminEvent({ action: changes.isActive ? 'userActivated' : 'userDeactivated', actor: req.user!, target: user, request: req });
    const profile = userResponse(user);

    res.json({
      success: true,
      data: { user: profile },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    if (req.user!.id.toString() === id) {
      res.status(400).json({
        success: false,
        error: { code: 'cannotDeleteSelf' },
      });
      return;
    }

    const deleted = await sequelize.transaction(
      { type: Transaction.TYPES.IMMEDIATE },
      async (transaction) => {
        const user = await User.findByPk(id, { transaction });
        if (!user) {
          fail(404, 'userNotFound');
        }

        const target = { id: user.id, username: user.username };
        await deleteAccount(user, transaction);
        return target;
      },
    );
    await recordAdminEvent({ action: 'userDeleted', actor: req.user!, target: deleted, request: req });

    res.json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
};
export const getUserStudyStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (
      !Number.isSafeInteger(id) ||
      id <= 0 ||
      (req.user?.role !== 'admin' && req.user?.id !== id)
    ) {
      res
        .status(404)
        .json({ success: false, error: { code: 'userNotFound' } });
      return;
    }
    const targetUser = await User.findByPk(id);
    if (!targetUser) {
      res
        .status(404)
        .json({ success: false, error: { code: 'userNotFound' } });
      return;
    }
    const targetTimezone = preferencesSchema.parse(
      targetUser.preferences,
    ).timezone;
    const stats = await getStudyStats(id, targetTimezone, {});
    res.json({ success: true, data: { stats } });
  } catch (error) {
    next(error);
  }
};

export const getAdminOverview = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalCourses,
      activeCourses,
      summaries,
      recent,
    ] = await Promise.all([
      User.count(),
      User.count({ where: { isActive: true } }),
      Course.count(),
      Course.count({ where: { isActive: true } }),
      getAllTimeSummaries(),
      // Recent work: sessions that have begun (started, or their planned start has passed), newest first;
      // a routine's planned sessions months ahead are not recent.
      StudySession.findAll({
        where: { [Op.or]: [{ status: { [Op.ne]: 'planned' } }, { startTime: { [Op.lte]: new Date(Date.now()) } }] },
        order: [
          ['startTime', 'DESC'],
          ['id', 'DESC'],
        ],
        limit: 5,
        include: [
          { model: User, as: 'user', attributes: ['firstName', 'lastName'] },
        ],
      }),
    ]);
    const sessions = {
      totalSessions: 0,
      completedSessions: 0,
      studySeconds: 0,
      lastActivity: null as string | null,
    };
    for (const summary of summaries.values()) {
      sessions.totalSessions += summary.totalSessions;
      sessions.completedSessions += summary.completedSessions;
      sessions.studySeconds += summary.studySeconds;
      if (
        summary.lastActivity &&
        (!sessions.lastActivity || summary.lastActivity > sessions.lastActivity)
      )
        sessions.lastActivity = summary.lastActivity;
    }
    const overview: AdminOverview = {
      users: { total: totalUsers, active: activeUsers },
      courses: { total: totalCourses, active: activeCourses },
      sessions,
      recentSessions: recent.map((session) => ({
        id: session.id,
        title: session.title,
        status: session.status,
        sessionType: session.sessionType,
        duration: session.duration,
        userName: session.user
          ? `${session.user.firstName} ${session.user.lastName}`
          : '',
      })),
    };
    res.json({ success: true, data: { overview } });
  } catch (error) {
    next(error);
  }
};
