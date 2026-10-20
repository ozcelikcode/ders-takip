import { userResponse } from '../services/userResponses';
import { getAllTimeSummaries, getStudyStats } from '../services/studyTracking';
import { defaultPreferences, preferencesSchema } from '@study-tracker/contracts';
import { mergePreferences } from '../services/preferences';
import { columnContains } from '../utils/textSearch';
import { Op, Transaction, type WhereOptions } from 'sequelize';
import { sequelize } from '../config/database';
import { revokeUserSessions } from '../services/authSessions';
import { deleteAccount } from '../services/accounts';
import { NextFunction, Request, Response } from 'express';
import { Course, StudySession, User } from '../models';
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

    const user = await sequelize.transaction(
      { type: Transaction.TYPES.IMMEDIATE },
      async (transaction) => {
        const existingUser = await User.findOne({
          where: {
            [Op.or]: [{ email }, { username }],
          },
          transaction,
        });

        if (existingUser) {
          throw Object.assign(
            new Error(
              existingUser.email === email
                ? 'Bu e-posta adresi zaten kullanılıyor'
                : 'Bu kullanıcı adı zaten alınmış',
            ),
            { statusCode: 400 },
          );
        }

        return User.create(
          {
            username,
            email,
            password,
            firstName,
            lastName,
            role,
            isActive,
            preferences: { ...defaultPreferences, onboarding: 'pending' },
          },
          { transaction },
        );
      },
    );

    const profile = userResponse(user);

    res.status(201).json({
      success: true,
      message: 'Kullanıcı başarıyla oluşturuldu',
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
    const { firstName, lastName, role, isActive, preferences } = req.body;

    const user = await sequelize.transaction(
      { type: Transaction.TYPES.IMMEDIATE },
      async (transaction) => {
        const current = await User.findByPk(id, { transaction });
        if (!current)
          throw Object.assign(new Error('Kullanıcı bulunamadı'), {
            statusCode: 404,
          });
        if (current.id === req.user!.id) {
          if (isActive === false)
            throw Object.assign(
              new Error('Kendi hesabınızı pasifleştiremezsiniz'),
              { statusCode: 400 },
            );
          if (role !== undefined && role !== 'admin')
            throw Object.assign(
              new Error('Kendi yönetici yetkinizi kaldıramazsınız'),
              { statusCode: 400 },
            );
        }
        if (firstName !== undefined) current.firstName = firstName;
        if (lastName !== undefined) current.lastName = lastName;
        if (role !== undefined) current.role = role;
        if (isActive !== undefined) current.isActive = isActive;
        if (preferences !== undefined)
          current.preferences = mergePreferences(current.preferences, preferences);
        const privilegesChanged =
          current.changed('role') || current.changed('isActive');
        await current.save({ transaction });
        if (privilegesChanged)
          await revokeUserSessions(current.id, transaction);
        return current;
      },
    );

    const profile = userResponse(user);

    res.json({
      success: true,
      message: 'Kullanıcı başarıyla güncellendi',
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
        error: { message: 'Kendi hesabınızı silemezsiniz' },
      });
      return;
    }

    await sequelize.transaction(
      { type: Transaction.TYPES.IMMEDIATE },
      async (transaction) => {
        const user = await User.findByPk(id, { transaction });
        if (!user) {
          throw Object.assign(new Error('Kullanıcı bulunamadı'), {
            statusCode: 404,
          });
        }

        await deleteAccount(user, transaction);
      },
    );

    res.json({
      success: true,
      message: 'Kullanıcı başarıyla silindi',
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
        .json({ success: false, error: { message: 'Kullanıcı bulunamadı' } });
      return;
    }
    const targetUser = await User.findByPk(id);
    if (!targetUser) {
      res
        .status(404)
        .json({ success: false, error: { message: 'Kullanıcı bulunamadı' } });
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
      StudySession.findAll({
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
