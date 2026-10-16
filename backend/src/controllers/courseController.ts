import { NextFunction, Request, Response } from 'express';
import { Category, Course, Topic } from '../models';
import { visibleCourseWhere } from '../policies/courseAccess';
import * as catalog from '../services/catalog';

export const getCourses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { categoryId, isActive = 'true', includeTopics = 'false' } = req.query;

    const where: any = { ...visibleCourseWhere(req.user!) };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (isActive !== undefined && isActive !== 'all') {
      where.isActive = isActive === 'true';
    }

    const include: any[] = [
      {
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'color', 'icon'],
        required: true,
      }
    ];

    if (includeTopics === 'true') {
      include.push({
        model: Topic,
        as: 'topics',
        where: { isActive: true },
        required: false,
        separate: true,
        order: [['order', 'ASC'], ['id', 'ASC']],
        attributes: ['id', 'name', 'description', 'estimatedTime', 'difficulty', 'order', 'updatedAt'],
      });
    }

    const courses = await Course.findAll({
      where,
      include,
      order: [['order', 'ASC'], ['name', 'ASC']],
    });

    res.json({
      success: true,
      data: { courses },
    });
  } catch (error) {
    next(error);
  }
};

export const getCourse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { includeTopics = 'false' } = req.query;

    const include: any[] = [
      {
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'color', 'icon'],
        required: true,
      }
    ];

    if (includeTopics === 'true') {
      include.push({
        model: Topic,
        as: 'topics',
        where: { isActive: true },
        required: false,
        separate: true,
        order: [['order', 'ASC'], ['id', 'ASC']],
        attributes: ['id', 'name', 'description', 'estimatedTime', 'difficulty', 'order', 'updatedAt'],
      });
    }

    const course = await Course.findOne({ where: { id, ...visibleCourseWhere(req.user!) }, include });

    if (!course) {
      res.status(404).json({
        success: false,
        error: { message: 'Ders bulunamadı' },
      });
      return;
    }

    res.json({
      success: true,
      data: { course },
    });
  } catch (error) {
    next(error);
  }
};

export const createCourse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const course = await catalog.createCourse(req.user!, req.body);
    res.status(201).json({ success: true, message: 'Ders başarıyla oluşturuldu', data: { course } });
  } catch (error) { next(error); }
};

export const updateCourse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const course = await catalog.updateCourse(req.user!, Number(req.params.id), req.body);
    res.json({ success: true, message: 'Ders başarıyla güncellendi', data: { course } });
  } catch (error) { next(error); }
};

export const deleteCourse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await catalog.deleteCourse(req.user!, Number(req.params.id));
    res.json({ success: true, message: 'Ders ve konuları silindi. Çalışma geçmişi korundu' });
  } catch (error) { next(error); }
};

export const getCourseTopics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { isActive = 'true' } = req.query;

    const course = await Course.findOne({ where: { id, ...visibleCourseWhere(req.user!) } });

    if (!course) {
      res.status(404).json({
        success: false,
        error: { message: 'Ders bulunamadı' },
      });
      return;
    }

    const where: any = { courseId: id };

    if (isActive !== undefined && isActive !== 'all') {
      where.isActive = isActive === 'true';
    }

    const topics = await Topic.findAll({
      where,
      order: [['order', 'ASC'], ['name', 'ASC']],
    });

    // Fetch course with category
    const courseWithCategory = await Course.findByPk(id, {
      include: [{
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'color', 'icon'],
      }]
    });

    res.json({
      success: true,
      data: {
        course: courseWithCategory,
        topics,
      },
    });
  } catch (error) {
    next(error);
  }
};
