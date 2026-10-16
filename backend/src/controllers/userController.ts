import { getAllTimeSummaries, getStudyStats } from '../services/studyTracking';
import { preferencesSchema, preferencesPatchSchema } from '@study-tracker/contracts';
import { Op, Transaction } from 'sequelize';
import { sequelize } from '../config/database';
import { revokeUserSessions } from '../services/authSessions';
import { NextFunction, Request, Response } from 'express';
import { Course, StudySession, Topic, User } from '../models';
import type { AdminOverview } from '@study-tracker/contracts';

const ALLOWED_USER_SORT_FIELDS = new Set(['createdAt', 'updatedAt', 'firstName', 'lastName', 'username', 'email', 'role', 'lastLogin']);

export const getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

    const where: any = {};

    if (search && typeof search === 'string') {
      where[Op.or] = [
        { firstName: { [Op.like]: `%${search}%` } },
        { lastName: { [Op.like]: `%${search}%` } },
        { username: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    if (role === 'student' || role === 'admin') {
      where.role = role;
    }

    if (isActive !== undefined && isActive !== 'all' && isActive !== '') {
      where.isActive = isActive === 'true';
    }

    const parsedPage = Number.parseInt(String(page), 10);
    const parsedLimit = Number.parseInt(String(limit), 10);
    const pageNum = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const limitNum = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 200) : 10;
    const offset = (pageNum - 1) * limitNum;

    const safeSortBy = typeof sortBy === 'string' && ALLOWED_USER_SORT_FIELDS.has(sortBy) ? sortBy : 'createdAt';
    const safeSortOrder = typeof sortOrder === 'string' && sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const { count, rows: users } = await User.findAndCountAll({
      where,
      order: [[safeSortBy, safeSortOrder]],
      limit: limitNum,
      offset,
      attributes: { exclude: ['password'] },
    });

    const summaries = req.query.includeStats === 'true' ? await getAllTimeSummaries(users.map(user => user.id)) : null;
    res.json({
      success: true,
      data: {
        users: users.map(user => ({
          ...user.toJSON(), fullName: user.getFullName(), preferences: preferencesSchema.parse(user.preferences),
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

export const getUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (req.user?.role !== 'admin' && String(req.user?.id) !== id) {
      res.status(404).json({ success: false, error: { message: 'Kullanıcı bulunamadı' } });
      return;
    }

    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: { message: 'Kullanıcı bulunamadı' },
      });
      return;
    }

    res.json({
      success: true,
      data: { user: { ...user.toJSON(), fullName: user.getFullName(), preferences: preferencesSchema.parse(user.preferences) } },
    });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { username, email, password, firstName, lastName, role = 'student', isActive = true } = req.body;

    if (role !== 'student' && role !== 'admin') {
      res.status(400).json({ success: false, error: { message: 'Geçersiz kullanıcı rolü' } });
      return;
    }

    const user = await sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, async transaction => {
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [{ email }, { username }],
        },
        transaction,
      });

      if (existingUser) {
        throw Object.assign(
          new Error(existingUser.email === email ? 'Bu e-posta adresi zaten kullanılıyor' : 'Bu kullanıcı adı zaten alınmış'),
          { statusCode: 400 },
        );
      }

      return User.create({
        username,
        email,
        password,
        firstName,
        lastName,
        role,
        isActive: Boolean(isActive),
      }, { transaction });
    });

    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.getFullName(),
      role: user.role,
      isActive: user.isActive,
      preferences: preferencesSchema.parse(user.preferences),
      createdAt: user.createdAt,
    };

    res.status(201).json({
      success: true,
      message: 'Kullanıcı başarıyla oluşturuldu',
      data: { user: userResponse },
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { firstName, lastName, role, isActive, preferences } = req.body;

    if (role !== undefined && role !== 'student' && role !== 'admin') {
      res.status(400).json({ success: false, error: { message: 'Geçersiz kullanıcı rolü' } });
      return;
    }
    if (isActive !== undefined && typeof isActive !== 'boolean') {
      res.status(400).json({ success: false, error: { message: 'Geçersiz hesap durumu' } });
      return;
    }

    const parsed = preferencesPatchSchema.safeParse(preferences ?? {});
    if (!parsed.success) { res.status(400).json({ success: false, error: { message: 'Tercihler geçersiz' } }); return; }
    const user = await sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, async transaction => {
      const current = await User.findByPk(id, { transaction });
      if (!current) throw Object.assign(new Error('Kullanıcı bulunamadı'), { statusCode: 404 });
      if (current.id === req.user.id) {
        if (isActive === false) throw Object.assign(new Error('Kendi hesabınızı pasifleştiremezsiniz'), { statusCode: 400 });
        if (role !== undefined && role !== 'admin') throw Object.assign(new Error('Kendi yönetici yetkinizi kaldıramazsınız'), { statusCode: 400 });
      }
      if (firstName !== undefined) current.firstName = firstName;
      if (lastName !== undefined) current.lastName = lastName;
      if (role !== undefined) current.role = role;
      if (isActive !== undefined) current.isActive = isActive;
      if (preferences !== undefined) current.preferences = { ...current.preferences, ...preferencesSchema.parse({ ...current.preferences, ...parsed.data }) };
      const privilegesChanged = current.changed('role') || current.changed('isActive');
      await current.save({ transaction });
      if (privilegesChanged) await revokeUserSessions(current.id, transaction);
      return current;
    });

    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.getFullName(),
      role: user.role,
      isActive: user.isActive,
      preferences: preferencesSchema.parse(user.preferences),
      updatedAt: user.updatedAt,
    };

    res.json({
      success: true,
      message: 'Kullanıcı başarıyla güncellendi',
      data: { user: userResponse },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (req.user.id.toString() === id) {
      res.status(400).json({
        success: false,
        error: { message: 'Kendi hesabınızı silemezsiniz' },
      });
      return;
    }

    await sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, async transaction => {
      const user = await User.findByPk(id, { transaction });
      if (!user) {
        throw Object.assign(new Error('Kullanıcı bulunamadı'), { statusCode: 404 });
      }

      const privateCourses = await Course.findAll({
        where: { userId: user.id, isGlobal: false },
        attributes: ['id'],
        transaction,
      });
      const privateCourseIds = privateCourses.map(course => course.id);
      if (privateCourseIds.length > 0) {
        const privateTopics = await Topic.findAll({
          where: { courseId: { [Op.in]: privateCourseIds } },
          attributes: ['id'],
          transaction,
        });
        const privateTopicIds = privateTopics.map(topic => topic.id);
        await StudySession.update(
          { courseId: null, topicId: null },
          {
            where: {
              [Op.or]: [
                { courseId: { [Op.in]: privateCourseIds } },
                ...(privateTopicIds.length > 0 ? [{ topicId: { [Op.in]: privateTopicIds } }] : []),
              ],
            },
            transaction,
          },
        );
        await Course.destroy({ where: { id: { [Op.in]: privateCourseIds } }, transaction });
      }

      await revokeUserSessions(user.id, transaction);
      await user.destroy({ transaction });
    });

    res.json({
      success: true,
      message: 'Kullanıcı başarıyla silindi',
    });
  } catch (error) {
    next(error);
  }
};
export const getUserStudyStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0 || (req.user?.role !== 'admin' && req.user?.id !== id)) {
      res.status(404).json({ success: false, error: { message: 'Kullanıcı bulunamadı' } });
      return;
    }
    const targetUser = await User.findByPk(id);
    if (!targetUser) {
      res.status(404).json({ success: false, error: { message: 'Kullanıcı bulunamadı' } });
      return;
    }
    const targetTimezone = preferencesSchema.parse(targetUser.preferences).timezone;
    const stats = await getStudyStats(id, targetTimezone, {});
    res.json({ success: true, data: { stats } });
  } catch (error) { next(error); }
};

export const getAdminOverview = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [totalUsers, activeUsers, totalCourses, activeCourses, summaries, recent] = await Promise.all([
      User.count(), User.count({ where: { isActive: true } }),
      Course.count(), Course.count({ where: { isActive: true } }),
      getAllTimeSummaries(),
      StudySession.findAll({ order: [['startTime', 'DESC'], ['id', 'DESC']], limit: 5, include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName'] }] }),
    ]);
    const sessions = { totalSessions: 0, completedSessions: 0, studySeconds: 0, lastActivity: null as string | null };
    for (const summary of summaries.values()) {
      sessions.totalSessions += summary.totalSessions;
      sessions.completedSessions += summary.completedSessions;
      sessions.studySeconds += summary.studySeconds;
      if (summary.lastActivity && (!sessions.lastActivity || summary.lastActivity > sessions.lastActivity)) sessions.lastActivity = summary.lastActivity;
    }
    const overview: AdminOverview = {
      users: { total: totalUsers, active: activeUsers },
      courses: { total: totalCourses, active: activeCourses },
      sessions,
      recentSessions: recent.map(session => ({
        id: session.id, title: session.title, status: session.status, sessionType: session.sessionType, duration: session.duration,
        userName: session.user ? `${session.user.firstName} ${session.user.lastName}` : '',
      })),
    };
    res.json({ success: true, data: { overview } });
  } catch (error) { next(error); }
};
