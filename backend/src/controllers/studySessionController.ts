import { NextFunction, Request, Response } from 'express';
import { Op, type WhereOptions } from 'sequelize';
import { sequelize } from '../config/database';
import { StudySession } from '../models';
import { createSession, logStudy, updateSession, deleteSession, sessionIncludes } from '../services/studySessions';
import type { SessionQuery, UpdateSessionInput } from '@study-tracker/contracts';
import { getStudyStats, scheduledRange, sessionTimezone, sessionDTO } from '../services/studyTracking';
import { sessionsWithTag } from '../services/tags';

export const getStudySessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // `protect` guarantees the user and `validate` has already parsed the query.
    const userId = req.user!.id;
    const query = req.query as unknown as SessionQuery;
    const { planId, status, sessionType, tagId, unfinished, latest } = query;
    const where: WhereOptions = { userId, ...scheduledRange(query, sessionTimezone(req.user!, query)), ...(tagId ? await sessionsWithTag(req.user!, tagId) : {}) };
    if (planId) where.planId = planId;
    const runnable = ['planned', 'in_progress', 'paused'];
    if (status) where.status = unfinished && !runnable.includes(status) ? [] : status;
    else if (unfinished) where.status = runnable;
    if (sessionType) where.sessionType = sessionType;
    const finishedAt = sequelize.fn('COALESCE', sequelize.col('StudySession.completedAt'), sequelize.col('StudySession.endTime'));
    if (latest) {
      // The ids are picked first, so the limit is not applied to the joined interval rows.
      const picked = await StudySession.findAll({ where, attributes: ['id'], order: [[finishedAt, 'DESC'], ['id', 'DESC']], limit: latest });
      where.id = { [Op.in]: picked.map(session => session.id) };
    }

    const sessions = await StudySession.findAll({
      where,
      include: sessionIncludes,
      order: latest ? [[finishedAt, 'DESC'], ['id', 'DESC']] : [['startTime', 'ASC']],
    });

    res.json({
      success: true,
      data: { sessions: sessions.map(session => sessionDTO(session)) },
    });
  } catch (error) {
    next(error);
  }
};

export const getStudySession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const userId = req.user!.id;

    const session = await StudySession.findOne({
      where: { id, userId },
      include: sessionIncludes,
    });

    if (!session) {
      res.status(404).json({
        success: false,
        error: { code: 'recordNotFound' },
      });
      return;
    }

    res.json({
      success: true,
      data: { session: sessionDTO(session) },
    });
  } catch (error) {
    next(error);
  }
};

export const createStudySession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const session = await createSession(req.user!, req.body);
    res.status(201).json({ success: true, data: { session: sessionDTO(session) } });
  } catch (error) { next(error); }
};

export const logStudySession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const session = await logStudy(req.user!, req.body);
    res.status(201).json({ success: true, data: { session: sessionDTO(session) } });
  } catch (error) { next(error); }
};

const writeSession = (status?: UpdateSessionInput['status']) => async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const session = await updateSession(req.user!, Number(req.params.id), { ...req.body, ...(status === undefined ? {} : { status }) });
    res.json({ success: true, data: { session: sessionDTO(session) } });
  } catch (error) { next(error); }
};

export const updateStudySession = writeSession();
export const startStudySession = writeSession('in_progress');
export const pauseStudySession = writeSession('paused');
export const completeStudySession = writeSession('completed');

export const controlPomodoro = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const status = { resume: 'in_progress', pause: 'paused', reset: 'planned', complete: 'completed' } as const;
    const command: import('@study-tracker/contracts').PomodoroCommand = req.body;
    const session = await updateSession(req.user!, Number(req.params.id), { expectedUpdatedAt: command.expectedUpdatedAt, ...(command.command === 'configure' ? {} : { status: status[command.command] }) }, command);
    res.json({ success: true, data: { session: sessionDTO(session) } });
  } catch (error) { next(error); }
};

export const deleteStudySession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await deleteSession(req.user!, Number(req.params.id), req.body.expectedUpdatedAt);
    res.json({ success: true });
  } catch (error) { next(error); }
};

export const getSessionStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = req.query as unknown as SessionQuery;
    const stats = await getStudyStats(req.user!.id, sessionTimezone(req.user!, query), query);
    res.json({ success: true, data: { stats } });
  } catch (error) { next(error); }
};
