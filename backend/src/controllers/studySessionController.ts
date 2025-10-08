import { Request, Response, NextFunction } from 'express';
import { StudySession, Plan, Course, Topic } from '../models';
import { Op } from 'sequelize';

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

    // Önce vakti geçmiş in_progress oturumları otomatik cancelled yap
    const now = new Date();
    await StudySession.update(
      {
        status: 'cancelled',
        notes: 'Otomatik iptal edildi - Zaman aşımı'
      },
      {
        where: {
          userId,
          status: 'in_progress',
          endTime: {
            [Op.lt]: now
          }
        }
      }
    );

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

      console.log('🔍 Query date range:', {
        startDate: startDate as string,
        endDate: endDate as string,
        start: start.toISOString(),
        end: end.toISOString(),
        userId
      });

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
      include: [
        {
          model: Plan,
          as: 'plan',
          attributes: ['id', 'title'],
        },
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
      order: [['startTime', 'ASC']],
    });

    console.log('✅ Found sessions:', sessions.length, sessions.map(s => ({
      id: s.id,
      title: s.title,
      startTime: s.startTime,
      status: s.status
    })));

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
      include: [
        {
          model: Plan,
          as: 'plan',
          attributes: ['id', 'title'],
        },
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
    console.log('createStudySession çağrıldı');
    console.log('req.body:', req.body);
    console.log('req.user:', req.user ? { id: req.user.id } : 'undefined');

    const userId = req.user?.id;

    if (!userId) {
      console.log('UserId bulunamadı');
      res.status(401).json({
        success: false,
        error: { message: 'Kullanıcı kimlik doğrulaması gerekli' },
      });
      return;
    }
    const {
      planId,
      topicId,
      courseId,
      title,
      description,
      startTime,
      endTime,
      sessionType,
      color,
      pomodoroSettings,
    } = req.body;

    // Calculate duration
    const start = new Date(startTime);
    const end = new Date(endTime);
    const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));

    // Validate plan belongs to user if provided
    if (planId) {
      const plan = await Plan.findOne({
        where: { id: planId, userId },
      });

      if (!plan) {
        res.status(400).json({
          success: false,
          error: { message: 'Geçersiz plan ID' },
        });
        return;
      }
    }

    // Check for overlapping sessions
    const overlappingSession = await StudySession.findOne({
      where: {
        userId,
        status: { [Op.in]: ['planned', 'in_progress'] },
        [Op.or]: [
          {
            // New session starts before existing session ends (but not at the exact end time)
            [Op.and]: [
              { startTime: { [Op.lt]: end } },
              { endTime: { [Op.gt]: start } },
            ],
          },
        ],
      },
    });

    if (overlappingSession) {
      res.status(400).json({
        success: false,
        error: { message: 'Bu zaman aralığında başka bir çalışma seansı mevcut' },
      });
      return;
    }

    const session = await StudySession.create({
      userId,
      planId,
      topicId,
      courseId,
      title,
      description,
      startTime: start,
      endTime: end,
      duration,
      sessionType: sessionType || 'study',
      color: color || '#3B82F6',
      pomodoroSettings,
    });

    // Fetch the created session with associations
    const createdSession = await StudySession.findByPk(session.id, {
      include: [
        {
          model: Plan,
          as: 'plan',
          attributes: ['id', 'title'],
        },
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
    });

    res.status(201).json({
      success: true,
      message: 'Çalışma seansı başarıyla oluşturuldu',
      data: { session: createdSession },
    });
  } catch (error) {
    next(error);
  }
};

export const updateStudySession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    console.log('updateStudySession çağrıldı');
    console.log('req.url:', req.url);
    console.log('req.originalUrl:', req.originalUrl);
    console.log('req.params:', req.params);
    console.log('req.route:', req.route);
    console.log('updateStudySession - req.body:', req.body);
    console.log('updateStudySession - req.user:', req.user ? { id: req.user.id } : 'undefined');

    const { id } = req.params || {};
    const userId = req.user?.id;

    if (!id) {
      console.log('updateStudySession - ID bulunamadı, params:', req.params);
      res.status(400).json({
        success: false,
        error: { message: 'Çalışma seansı ID gerekli' },
      });
      return;
    }

    if (!userId) {
      console.log('updateStudySession - UserId bulunamadı');
      res.status(401).json({
        success: false,
        error: { message: 'Kullanıcı kimlik doğrulaması gerekli' },
      });
      return;
    }
    const {
      title,
      description,
      startTime,
      endTime,
      status,
      notes,
      productivity,
      color,
      pomodoroSettings,
    } = req.body;

    const session = await StudySession.findOne({
      where: { id, userId },
    });

    if (!session) {
      res.status(404).json({
        success: false,
        error: { message: 'Çalışma seansı bulunamadı' },
      });
      return;
    }

    // Update fields
    if (title) session.title = title;
    if (description !== undefined) session.description = description;
    if (notes !== undefined) session.notes = notes;
    if (productivity !== undefined) session.productivity = productivity;
    if (color !== undefined) session.color = color;
    if (pomodoroSettings) session.pomodoroSettings = { ...session.pomodoroSettings, ...pomodoroSettings };

    if (startTime || endTime) {
      const start = startTime ? new Date(startTime) : session.startTime;
      const end = endTime ? new Date(endTime) : session.endTime;
      const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));

      session.startTime = start;
      session.endTime = end;
      session.duration = duration;
    }

    if (status) {
      session.status = status;
      if (status === 'completed' && !session.completedAt) {
        session.completedAt = new Date();
      }
    }

    await session.save();

    // Fetch updated session with associations
    const updatedSession = await StudySession.findByPk(session.id, {
      include: [
        {
          model: Plan,
          as: 'plan',
          attributes: ['id', 'title'],
        },
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
    });

    res.json({
      success: true,
      message: 'Çalışma seansı başarıyla güncellendi',
      data: { session: updatedSession },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteStudySession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
    });

    if (!session) {
      res.status(404).json({
        success: false,
        error: { message: 'Çalışma seansı bulunamadı' },
      });
      return;
    }

    await session.destroy();

    res.json({
      success: true,
      message: 'Çalışma seansı başarıyla silindi',
    });
  } catch (error) {
    next(error);
  }
};

export const startStudySession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
    });

    if (!session) {
      res.status(404).json({
        success: false,
        error: { message: 'Çalışma seansı bulunamadı' },
      });
      return;
    }

    if (session.status !== 'planned' && session.status !== 'paused') {
      res.status(400).json({
        success: false,
        error: { message: 'Bu çalışma seansı başlatılamaz' },
      });
      return;
    }

    session.status = 'in_progress';
    // startTime değiştirilmemeli - planlanan zamanı koru
    await session.save();

    res.json({
      success: true,
      message: 'Çalışma seansı başlatıldı',
      data: { session },
    });
  } catch (error) {
    next(error);
  }
};

export const pauseStudySession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
    });

    if (!session) {
      res.status(404).json({
        success: false,
        error: { message: 'Çalışma seansı bulunamadı' },
      });
      return;
    }

    if (session.status !== 'in_progress') {
      res.status(400).json({
        success: false,
        error: { message: 'Sadece devam eden seanslar duraklatılabilir' },
      });
      return;
    }

    // Bitiş saatini kontrol et
    const now = new Date();
    const endTime = new Date(session.endTime);

    if (now > endTime) {
      // Bitiş saati geçmiş
      session.status = 'planned';
      await session.save();

      res.status(400).json({
        success: false,
        error: { message: 'Bu görev için süre doldu. Görev tamamlanamadı ve planlananlar arasına geri döndü.' },
      });
      return;
    }

    session.status = 'paused';
    await session.save();

    res.json({
      success: true,
      message: 'Çalışma seansı duraklatıldı',
      data: { session },
    });
  } catch (error) {
    next(error);
  }
};

export const completeStudySession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
    const { notes, productivity } = req.body;

    const session = await StudySession.findOne({
      where: { id, userId },
    });

    if (!session) {
      res.status(404).json({
        success: false,
        error: { message: 'Çalışma seansı bulunamadı' },
      });
      return;
    }

    session.status = 'completed';
    session.completedAt = new Date();

    // Eğer oturum vakti geçmişse, endTime'ı şimdiki zamana güncelle
    const now = new Date();
    if (session.endTime < now) {
      // Vakti geçmiş oturum - gerçek süreyi hesapla
      session.duration = Math.round((session.endTime.getTime() - session.startTime.getTime()) / (1000 * 60));
    } else {
      // Normal tamamlama - planlanan süreyi koru
      session.duration = Math.round((session.endTime.getTime() - session.startTime.getTime()) / (1000 * 60));
    }

    if (notes !== undefined) session.notes = notes;
    if (productivity !== undefined) session.productivity = productivity;

    await session.save();

    res.json({
      success: true,
      message: 'Çalışma seansı tamamlandı',
      data: { session },
    });
  } catch (error) {
    next(error);
  }
};