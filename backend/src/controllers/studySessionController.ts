import { NextFunction, Request, Response } from 'express';
import { Op } from 'sequelize';
import { StudySession } from '../models';
import { createSession, updateSession, deleteSession, sessionIncludes } from '../services/studySessions';
import type { UpdateSessionInput } from '@study-tracker/contracts';

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

    const { planId, startDate, endDate, status, sessionType } = req.query;

    const where: any = { userId };

    if (planId) where.planId = planId;
    if (status) where.status = status;
    if (sessionType) where.sessionType = sessionType;

    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      // Set end date to end of day (23:59:59.999)
      end.setHours(23, 59, 59, 999);

      where.startTime = {
        [Op.between]: [start, end],
      };
    } else if (startDate) {
      where.startTime = {
        [Op.gte]: new Date(startDate as string),
      };
    } else if (endDate) {
      where.startTime = {
        [Op.lte]: new Date(endDate as string),
      };
    }

    const sessions = await StudySession.findAll({
      where,
      include: sessionIncludes,
      order: [['startTime', 'ASC']],
    });

    res.json({
      success: true,
      data: { sessions },
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
        error: { message: 'Çalışma seansı ID gerekli' },
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
        error: { message: 'Çalışma seansı bulunamadı' },
      });
      return;
    }

    res.json({
      success: true,
      data: { session },
    });
  } catch (error) {
    next(error);
  }
};

export const createStudySession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const session = await createSession(req.user!, req.body);
    res.status(201).json({ success: true, message: 'Çalışma seansı başarıyla oluşturuldu', data: { session } });
  } catch (error) { next(error); }
};

const writeSession = (status?: UpdateSessionInput['status']) => async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const session = await updateSession(req.user!, Number(req.params.id), { ...req.body, ...(status === undefined ? {} : { status }) });
    res.json({ success: true, message: 'Çalışma seansı başarıyla güncellendi', data: { session } });
  } catch (error) { next(error); }
};

export const updateStudySession = writeSession();
export const startStudySession = writeSession('in_progress');
export const pauseStudySession = writeSession('paused');
export const completeStudySession = writeSession('completed');

export const deleteStudySession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await deleteSession(req.user!, Number(req.params.id), req.body.expectedUpdatedAt);
    res.json({ success: true, message: 'Çalışma seansı başarıyla silindi' });
  } catch (error) { next(error); }
};
