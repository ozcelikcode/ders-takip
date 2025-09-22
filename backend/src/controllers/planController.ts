import { Request, Response, NextFunction } from 'express';
import { Plan, StudySession, Course, Topic } from '../models';
import { Op } from 'sequelize';

export const getPlans = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user.id;
    const { isActive, includeSessions } = req.query;

    const where: any = { userId };

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const include = includeSessions === 'true' ? [
      {
        model: StudySession,
        as: 'studySessions',
        include: [
          {
            model: Course,
            as: 'course',
            attributes: ['id', 'name', 'category', 'color', 'icon'],
          },
          {
            model: Topic,
            as: 'topic',
            attributes: ['id', 'name', 'difficulty'],
          },
        ],
      },
    ] : [];

    const plans = await Plan.findAll({
      where,
      include,
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: { plans },
    });
  } catch (error) {
    next(error);
  }
};

export const getPlan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { includeSessions } = req.query;

    const include = includeSessions === 'true' ? [
      {
        model: StudySession,
        as: 'studySessions',
        include: [
          {
            model: Course,
            as: 'course',
            attributes: ['id', 'name', 'category', 'color', 'icon'],
          },
          {
            model: Topic,
            as: 'topic',
            attributes: ['id', 'name', 'difficulty'],
          },
        ],
      },
    ] : [];

    const plan = await Plan.findOne({
      where: { id, userId },
      include,
    });

    if (!plan) {
      res.status(404).json({
        success: false,
        error: { message: 'Plan bulunamadı' },
      });
      return;
    }

    res.json({
      success: true,
      data: { plan },
    });
  } catch (error) {
    next(error);
  }
};

export const createPlan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user.id;
    const { title, description, startDate, endDate, goals } = req.body;

    // Check for overlapping active plans
    const existingPlan = await Plan.findOne({
      where: {
        userId,
        isActive: true,
        [Op.or]: [
          {
            startDate: {
              [Op.between]: [startDate, endDate],
            },
          },
          {
            endDate: {
              [Op.between]: [startDate, endDate],
            },
          },
          {
            [Op.and]: [
              { startDate: { [Op.lte]: startDate } },
              { endDate: { [Op.gte]: endDate } },
            ],
          },
        ],
      },
    });

    if (existingPlan) {
      res.status(400).json({
        success: false,
        error: { message: 'Bu tarih aralığında aktif bir plan zaten mevcut' },
      });
      return;
    }

    const plan = await Plan.create({
      userId,
      title,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      goals: goals || {
        dailyHours: 4,
        weeklyHours: 28,
        targetTopics: 10,
        priority: 'medium',
      },
    });

    res.status(201).json({
      success: true,
      message: 'Plan başarıyla oluşturuldu',
      data: { plan },
    });
  } catch (error) {
    next(error);
  }
};

export const updatePlan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { title, description, startDate, endDate, goals, isActive } = req.body;

    const plan = await Plan.findOne({
      where: { id, userId },
    });

    if (!plan) {
      res.status(404).json({
        success: false,
        error: { message: 'Plan bulunamadı' },
      });
      return;
    }

    // Update fields
    if (title) plan.title = title;
    if (description !== undefined) plan.description = description;
    if (startDate) plan.startDate = new Date(startDate);
    if (endDate) plan.endDate = new Date(endDate);
    if (goals) plan.goals = { ...plan.goals, ...goals };
    if (isActive !== undefined) plan.isActive = isActive;

    await plan.save();

    res.json({
      success: true,
      message: 'Plan başarıyla güncellendi',
      data: { plan },
    });
  } catch (error) {
    next(error);
  }
};

export const deletePlan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const plan = await Plan.findOne({
      where: { id, userId },
    });

    if (!plan) {
      res.status(404).json({
        success: false,
        error: { message: 'Plan bulunamadı' },
      });
      return;
    }

    await plan.destroy();

    res.json({
      success: true,
      message: 'Plan başarıyla silindi',
    });
  } catch (error) {
    next(error);
  }
};

export const getPlanStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const plan = await Plan.findOne({
      where: { id, userId },
      include: [
        {
          model: StudySession,
          as: 'studySessions',
          include: [
            {
              model: Course,
              as: 'course',
              attributes: ['id', 'name', 'category'],
            },
          ],
        },
      ],
    });

    if (!plan) {
      res.status(404).json({
        success: false,
        error: { message: 'Plan bulunamadı' },
      });
      return;
    }

    const sessions = plan.studySessions || [];

    const stats = {
      totalSessions: sessions.length,
      completedSessions: sessions.filter(s => s.status === 'completed').length,
      totalStudyHours: sessions.reduce((acc, s) => acc + (s.duration / 60), 0),
      averageProductivity: sessions.filter(s => s.productivity).length > 0
        ? sessions.reduce((acc, s) => acc + (s.productivity || 0), 0) / sessions.filter(s => s.productivity).length
        : 0,
      coursesStudied: [...new Set(sessions.filter(s => s.course).map(s => s.course!.name))],
      dailyProgress: plan.goals.dailyHours > 0
        ? Math.min((sessions.reduce((acc, s) => acc + (s.duration / 60), 0) /
            (Math.ceil((plan.endDate.getTime() - plan.startDate.getTime()) / (1000 * 60 * 60 * 24)) * plan.goals.dailyHours)) * 100, 100)
        : 0,
    };

    res.json({
      success: true,
      data: { plan, stats },
    });
  } catch (error) {
    next(error);
  }
};