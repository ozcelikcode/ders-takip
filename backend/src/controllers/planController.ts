import { Request, Response, NextFunction } from 'express';
import { Plan, StudySession, Course, Topic, Category } from '../models';
import type { WhereOptions, Includeable } from 'sequelize';
import * as plans from '../services/plans';
import { getStudyStats } from '../services/studyTracking';
import { dateKeyInZone, planRecordSchema } from '@study-tracker/contracts';

const planSessions = (userId: number): Includeable => ({
  model: StudySession,
  as: 'studySessions',
  where: { userId },
  required: false,
  include: [
    {
      model: Course,
      as: 'course',
      attributes: ['id', 'name', 'color', 'icon'],
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'color'],
        },
      ],
    },
    { model: Topic, as: 'topic', attributes: ['id', 'name', 'difficulty'] },
  ],
});

export const getPlans = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { isActive, includeSessions } = req.query;

    const where: WhereOptions<Plan> = { userId };

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const include = includeSessions === 'true' ? [planSessions(userId)] : [];

    const plans = await Plan.findAll({
      where,
      include,
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: {
        plans: plans.map((plan) => planRecordSchema.parse(plan.toJSON())),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getPlan = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { includeSessions } = req.query;

    const include = includeSessions === 'true' ? [planSessions(userId)] : [];

    const plan = await Plan.findOne({
      where: { id, userId },
      include,
    });

    if (!plan) {
      res.status(404).json({
        success: false,
        error: { code: 'planNotFound' },
      });
      return;
    }

    res.json({
      success: true,
      data: { plan: planRecordSchema.parse(plan.toJSON()) },
    });
  } catch (error) {
    next(error);
  }
};

export const createPlan = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const plan = await plans.createPlan(req.user!.id, req.body);

    res.status(201).json({
      success: true,
      data: { plan },
    });
  } catch (error) {
    next(error);
  }
};

export const updatePlan = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const plan = await plans.updatePlan(
      req.user!.id,
      Number(req.params.id),
      req.body,
    );

    res.json({
      success: true,
      data: { plan },
    });
  } catch (error) {
    next(error);
  }
};

export const deletePlan = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await plans.deletePlan(req.user!.id, Number(req.params.id));

    res.json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

export const getPlanStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const plan = await Plan.findOne({
      where: { id, userId },
      include: [planSessions(userId)],
    });

    if (!plan) {
      res.status(404).json({
        success: false,
        error: { code: 'planNotFound' },
      });
      return;
    }

    const sessions = plan.studySessions || [];

    const timezone = req.user!.preferences.timezone;
    const measured = await getStudyStats(userId, timezone, { planId: plan.id });
    const planDays = Math.max(
      1,
      Math.round(
        (Date.parse(dateKeyInZone(plan.endDate, timezone)) -
          Date.parse(dateKeyInZone(plan.startDate, timezone))) /
          86400000,
      ) + 1,
    );
    const stats = {
      ...measured,
      totalSessions: sessions.length,
      completedSessions: sessions.filter((s) => s.status === 'completed')
        .length,
      totalStudyHours: measured.studySeconds / 3600,
      averageProductivity:
        sessions.filter((s) => s.productivity).length > 0
          ? sessions.reduce((acc, s) => acc + (s.productivity || 0), 0) /
            sessions.filter((s) => s.productivity).length
          : 0,
      coursesStudied: [
        ...new Set(sessions.filter((s) => s.course).map((s) => s.course!.name)),
      ],
      dailyProgress:
        plan.goals.dailyHours > 0
          ? Math.min(
              (measured.studySeconds /
                3600 /
                (planDays * plan.goals.dailyHours)) *
                100,
              100,
            )
          : 0,
    };

    res.json({
      success: true,
      data: { plan: planRecordSchema.parse(plan.toJSON()), stats },
    });
  } catch (error) {
    next(error);
  }
};
