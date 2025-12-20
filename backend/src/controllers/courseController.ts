import { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import { Course, Topic, Category } from '../models';

export const getCourses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { categoryId, isActive = 'true', includeTopics = 'false' } = req.query;

    const where: any = {};
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Admins see all courses, students see their own + global ones
    if (userRole !== 'admin') {
      where[Op.or] = [
        { userId: userId },
        { isGlobal: true }
      ];
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
        required: true,
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

    console.log('🔍 Course found:', course.id, course.name);
    console.log('🔍 Course data:', JSON.stringify(course, null, 2));

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
    const { name, categoryId, description, color, icon, order, isGlobal = false } = req.body;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

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
      where: {
        name,
        categoryId,
        [Op.or]: [
          { userId: userId },
          { isGlobal: true }
        ]
      },
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
      userId,
      isGlobal: userRole === 'admin' ? isGlobal : false
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
    const { name, categoryId, description, color, icon, order, isActive, isGlobal } = req.body;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    const course = await Course.findByPk(id);

    if (!course) {
      res.status(404).json({
        success: false,
        error: { message: 'Ders bulunamadı' },
      });
      return;
    }

    // Permission check: Global courses can only be updated by admins.
    // User-specific courses can only be updated by the owner or admin.
    if (course.isGlobal && userRole !== 'admin') {
      res.status(403).json({
        success: false,
        error: { message: 'Zorunlu dersler öğrenciler tarafından güncellenemez' },
      });
      return;
    }

    if (!course.isGlobal && course.userId !== userId && userRole !== 'admin') {
      res.status(403).json({
        success: false,
        error: { message: 'Bu dersi güncelleme yetkiniz yok' },
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
    if (isGlobal !== undefined && userRole === 'admin') course.isGlobal = isGlobal;

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
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    const course = await Course.findByPk(id);

    if (!course) {
      res.status(404).json({
        success: false,
        error: { message: 'Ders bulunamadı' },
      });
      return;
    }

    // Permission check
    if (course.isGlobal && userRole !== 'admin') {
      res.status(403).json({
        success: false,
        error: { message: 'Zorunlu dersler öğrenciler tarafından silinemez' },
      });
      return;
    }

    if (!course.isGlobal && course.userId !== userId && userRole !== 'admin') {
      res.status(403).json({
        success: false,
        error: { message: 'Bu dersi silme yetkiniz yok' },
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
