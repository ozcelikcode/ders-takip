import { NextFunction, Request, Response } from 'express';
import type { WhereOptions } from 'sequelize';
import { StudySession } from '../models';
import { createSession, updateSession, deleteSession, sessionIncludes } from '../services/studySessions';
import { sessionQuerySchema, type UpdateSessionInput } from '@study-tracker/contracts';
import { getStudyStats, scheduledRange, sessionTimezone, sessionDTO } from '../services/studyTracking';

export const getStudySessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: { message: 'Kullanıcı kimlik doğrulaması gerekli' },
      });
      return;
    }

    const query = sessionQuerySchema.parse(req.query);
    const { planId, status, sessionType } = query;
    const where: WhereOptions = { userId, ...scheduledRange(query, sessionTimezone(req.user!, query)) };
    if (planId) where.planId = planId;
    if (status) where.status = status;
    if (sessionType) where.sessionType = sessionType;

    const sessions = await StudySession.findAll({
      where,
      include: sessionIncludes,
      order: [['startTime', 'ASC']],
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
    const { id } = req.params || {};
    const userId = req.user?.id;

    if (!id) {
      res.status(400).json({
        success: false,
        error: { message: 'Kayıt ID gerekli' },
      });
      return;
    }

    if (!userId) {
      res.status(401).json({
        success: false,
        error: { message: 'Kullanıcı kimlik doğrulaması gerekli' },
      });
      return;
    }

    const session = await StudySession.findOne({
      where: { id, userId },
      include: sessionIncludes,
    });

    if (!session) {
      res.status(404).json({
        success: false,
        error: { message: 'Kayıt bulunamadı' },
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
    res.status(201).json({ success: true, message: 'Kayıt başarıyla oluşturuldu', data: { session: sessionDTO(session) } });
  } catch (error) { next(error); }
};

const writeSession = (status?: UpdateSessionInput['status']) => async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const session = await updateSession(req.user!, Number(req.params.id), { ...req.body, ...(status === undefined ? {} : { status }) });
    res.json({ success: true, message: 'Kayıt başarıyla güncellendi', data: { session: sessionDTO(session) } });
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
    res.json({ success: true, message: 'Kayıt başarıyla silindi' });
  } catch (error) { next(error); }
};

export const getSessionStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = sessionQuerySchema.parse(req.query);
    const stats = await getStudyStats(req.user!.id, sessionTimezone(req.user!, query), query);
    res.json({ success: true, data: { stats } });
  } catch (error) { next(error); }
};
