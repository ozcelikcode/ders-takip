import { Request, Response, NextFunction } from 'express';
import { Course, Topic, Category } from '../models';

export const getCourses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { categoryId, isActive = 'true', includeTopics = 'false' } = req.query;

    const where: any = {};

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const include: any[] = [
      {
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'color', 'icon'],
      }
    ];

    if (includeTopics === 'true') {
      include.push({
        model: Topic,
        as: 'topics',
        where: { isActive: true },
        required: false,
        attributes: ['id', 'name', 'description', 'estimatedTime', 'difficulty', 'order'],
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
      }
    ];

    if (includeTopics === 'true') {
      include.push({
        model: Topic,
        as: 'topics',
        where: { isActive: true },
        required: false,
        attributes: ['id', 'name', 'description', 'estimatedTime', 'difficulty', 'order'],
      });
    }

    const course = await Course.findByPk(id, { include });

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
    const { name, categoryId, description, color, icon, order } = req.body;

    // Check if category exists
    const category = await Category.findByPk(categoryId);
    if (!category) {
      res.status(400).json({
        success: false,
        error: { message: 'Kategori bulunamadı' },
      });
      return;
    }

    const existingCourse = await Course.findOne({
      where: { name, categoryId },
    });

    if (existingCourse) {
      res.status(400).json({
        success: false,
        error: { message: 'Bu kategoride aynı isimde bir ders zaten mevcut' },
      });
      return;
    }

    const course = await Course.create({
      name,
      categoryId,
      description,
      color,
      icon,
      order,
    });

    // Fetch course with category
    const createdCourse = await Course.findByPk(course.id, {
      include: [{
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'color', 'icon'],
      }]
    });

    res.status(201).json({
      success: true,
      message: 'Ders başarıyla oluşturuldu',
      data: { course: createdCourse },
    });
  } catch (error) {
    next(error);
  }
};

export const updateCourse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, categoryId, description, color, icon, order, isActive } = req.body;

    const course = await Course.findByPk(id);

    if (!course) {
      res.status(404).json({
        success: false,
        error: { message: 'Ders bulunamadı' },
      });
      return;
    }

    // Check if category exists if categoryId is being updated
    if (categoryId) {
      const category = await Category.findByPk(categoryId);
      if (!category) {
        res.status(400).json({
          success: false,
          error: { message: 'Kategori bulunamadı' },
        });
        return;
      }
    }

    if (name) course.name = name;
    if (categoryId) course.categoryId = categoryId;
    if (description !== undefined) course.description = description;
    if (color) course.color = color;
    if (icon !== undefined) course.icon = icon;
    if (order) course.order = order;
    if (isActive !== undefined) course.isActive = isActive;

    await course.save();

    // Fetch course with category
    const updatedCourse = await Course.findByPk(id, {
      include: [{
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'color', 'icon'],
      }]
    });

    res.json({
      success: true,
      message: 'Ders başarıyla güncellendi',
      data: { course: updatedCourse },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCourse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const course = await Course.findByPk(id);

    if (!course) {
      res.status(404).json({
        success: false,
        error: { message: 'Ders bulunamadı' },
      });
      return;
    }

    // Delete related topics
    await Topic.destroy({ where: { courseId: id } });

    // Delete course
    await course.destroy();

    res.json({
      success: true,
      message: 'Ders ve ilgili veriler başarıyla silindi',
    });
  } catch (error) {
    next(error);
  }
};

export const getCourseTopics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { isActive = 'true' } = req.query;

    const course = await Course.findByPk(id);

    if (!course) {
      res.status(404).json({
        success: false,
        error: { message: 'Ders bulunamadı' },
      });
      return;
    }

    const where: any = { courseId: id };

    if (isActive !== undefined) {
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