import { NextFunction, Request, Response } from 'express';
import { Op } from 'sequelize';
import { Category, Course, Topic } from '../models';
import { visibleCourseWhere } from '../policies/courseAccess';
import * as catalog from '../services/catalog';
import { listTopicProgress, setTopicProgress } from '../services/topicProgress';

export const getTopics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { courseId, isActive = 'true', search } = req.query;

    const where: any = {};

    if (courseId) {
      where.courseId = courseId;
    }

    if (isActive !== undefined && isActive !== 'all') {
      where.isActive = isActive === 'true';
    }

    if (search) {
      where.name = {
        [Op.like]: `%${search}%`
      };
    }

    const topics = await Topic.findAll({
      where,
      include: [
        {
          model: Course,
          as: 'course',
          required: true,
          where: visibleCourseWhere(req.user!),
          attributes: ['id', 'name', 'color', 'icon'],
          include: [
            {
              model: Category,
              as: 'category',
              attributes: ['id', 'name', 'color'],
            }
          ]
        }
      ],
      order: [['order', 'ASC'], ['name', 'ASC']],
    });

    res.json({
      success: true,
      data: { topics },
    });
  } catch (error) {
    next(error);
  }
};

export const getTopic = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const topic = await Topic.findByPk(id, {
      include: [
        {
          model: Course,
          as: 'course',
          required: true,
          where: visibleCourseWhere(req.user!),
          attributes: ['id', 'name', 'color', 'icon'],
          include: [
            {
              model: Category,
              as: 'category',
              attributes: ['id', 'name', 'color'],
            }
          ]
        }
      ],
    });

    if (!topic) {
      res.status(404).json({
        success: false,
        error: { message: 'Konu bulunamadı' },
      });
      return;
    }

    res.json({
      success: true,
      data: { topic },
    });
  } catch (error) {
    next(error);
  }
};

export const createTopic = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const topic = await catalog.createTopic(req.user!, req.body);
    res.status(201).json({ success: true, message: 'Konu başarıyla oluşturuldu', data: { topic } });
  } catch (error) { next(error); }
};

export const updateTopic = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const topic = await catalog.updateTopic(req.user!, Number(req.params.id), req.body);
    res.json({ success: true, message: 'Konu başarıyla güncellendi', data: { topic } });
  } catch (error) { next(error); }
};

export const deleteTopic = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await catalog.deleteTopic(req.user!, Number(req.params.id));
    res.json({ success: true, message: 'Konu arşivlendi. Çalışma geçmişi korundu' });
  } catch (error) { next(error); }
};

export const reorderTopics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const topics = await catalog.reorderTopics(req.user!, Number(req.params.courseId), req.body);
    res.json({ success: true, message: 'Konu sıralaması başarıyla güncellendi', data: { topics } });
  } catch (error) { next(error); }
};

export const getTopicProgress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { res.json({ success: true, data: { progress: await listTopicProgress(req.user) } }); } catch (error) { next(error); }
};

export const updateTopicProgress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { res.json({ success: true, data: { progress: await setTopicProgress(req.user, Number(req.params.id), req.body.status) } }); } catch (error) { next(error); }
};
