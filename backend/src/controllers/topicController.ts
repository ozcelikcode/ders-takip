import { Request, Response, NextFunction } from 'express';
import { Topic, Course } from '../models';
import { ValidationError, Op } from 'sequelize';

export const getTopics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { courseId, isActive = 'true', search } = req.query;

    const where: any = {};

    if (courseId) {
      where.courseId = courseId;
    }

    if (isActive !== undefined) {
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
          attributes: ['id', 'name', 'category', 'color', 'icon'],
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
          attributes: ['id', 'name', 'category', 'color', 'icon'],
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
    const { name, courseId, description, estimatedTime, difficulty, order } = req.body;

    // Validate required fields
    if (!name || !courseId || !estimatedTime || !difficulty || !order) {
      res.status(400).json({
        success: false,
        error: { message: 'Tüm gerekli alanları doldurunuz' },
      });
      return;
    }

    // Check if course exists
    const course = await Course.findByPk(courseId);
    if (!course) {
      res.status(404).json({
        success: false,
        error: { message: 'Ders bulunamadı' },
      });
      return;
    }

    // Check if topic with same name exists in the course
    const existingTopic = await Topic.findOne({
      where: { name, courseId },
    });

    if (existingTopic) {
      res.status(400).json({
        success: false,
        error: { message: 'Bu derste aynı isimde bir konu zaten mevcut' },
      });
      return;
    }

    // Check if order already exists in the course
    const existingOrder = await Topic.findOne({
      where: { order, courseId },
    });

    if (existingOrder) {
      res.status(400).json({
        success: false,
        error: { message: 'Bu sıra numarası bu derste zaten kullanılıyor' },
      });
      return;
    }

    const topic = await Topic.create({
      name,
      courseId,
      description,
      estimatedTime,
      difficulty,
      order,
      isActive: true,
    });

    // Include course data in response
    const topicWithCourse = await Topic.findByPk(topic.id, {
      include: [
        {
          model: Course,
          as: 'course',
          attributes: ['id', 'name', 'category', 'color', 'icon'],
        }
      ],
    });

    res.status(201).json({
      success: true,
      message: 'Konu başarıyla oluşturuldu',
      data: { topic: topicWithCourse },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      const validationErrors = error.errors.map(e => e.message);
      res.status(400).json({
        success: false,
        error: { message: `Doğrulama hatası: ${validationErrors.join(', ')}` },
      });
      return;
    }
    next(error);
  }
};

export const updateTopic = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, estimatedTime, difficulty, order, isActive } = req.body;

    const topic = await Topic.findByPk(id);

    if (!topic) {
      res.status(404).json({
        success: false,
        error: { message: 'Konu bulunamadı' },
      });
      return;
    }

    // Check if new name conflicts with existing topic in same course
    if (name && name !== topic.name) {
      const existingTopic = await Topic.findOne({
        where: {
          name,
          courseId: topic.courseId,
          id: { [Op.ne]: id }
        },
      });

      if (existingTopic) {
        res.status(400).json({
          success: false,
          error: { message: 'Bu derste aynı isimde başka bir konu zaten mevcut' },
        });
        return;
      }
    }

    // Check if new order conflicts with existing topic in same course
    if (order && order !== topic.order) {
      const existingOrder = await Topic.findOne({
        where: {
          order,
          courseId: topic.courseId,
          id: { [Op.ne]: id }
        },
      });

      if (existingOrder) {
        res.status(400).json({
          success: false,
          error: { message: 'Bu sıra numarası bu derste başka bir konu tarafından kullanılıyor' },
        });
        return;
      }
    }

    // Update fields
    if (name) topic.name = name;
    if (description !== undefined) topic.description = description;
    if (estimatedTime) topic.estimatedTime = estimatedTime;
    if (difficulty) topic.difficulty = difficulty;
    if (order) topic.order = order;
    if (isActive !== undefined) topic.isActive = isActive;

    await topic.save();

    // Include course data in response
    const updatedTopicWithCourse = await Topic.findByPk(topic.id, {
      include: [
        {
          model: Course,
          as: 'course',
          attributes: ['id', 'name', 'category', 'color', 'icon'],
        }
      ],
    });

    res.json({
      success: true,
      message: 'Konu başarıyla güncellendi',
      data: { topic: updatedTopicWithCourse },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      const validationErrors = error.errors.map(e => e.message);
      res.status(400).json({
        success: false,
        error: { message: `Doğrulama hatası: ${validationErrors.join(', ')}` },
      });
      return;
    }
    next(error);
  }
};

export const deleteTopic = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const topic = await Topic.findByPk(id);

    if (!topic) {
      res.status(404).json({
        success: false,
        error: { message: 'Konu bulunamadı' },
      });
      return;
    }

    // Soft delete - set isActive to false instead of actually deleting
    topic.isActive = false;
    await topic.save();

    res.json({
      success: true,
      message: 'Konu başarıyla silindi',
    });
  } catch (error) {
    next(error);
  }
};

export const reorderTopics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { courseId } = req.params;
    const { topicOrders } = req.body; // Array of { id, order }

    if (!Array.isArray(topicOrders)) {
      res.status(400).json({
        success: false,
        error: { message: 'topicOrders array gerekli' },
      });
      return;
    }

    // Check if course exists
    const course = await Course.findByPk(courseId);
    if (!course) {
      res.status(404).json({
        success: false,
        error: { message: 'Ders bulunamadı' },
      });
      return;
    }

    // Update all topic orders in a transaction
    const updatePromises = topicOrders.map(({ id, order }) =>
      Topic.update({ order }, { where: { id, courseId } })
    );

    await Promise.all(updatePromises);

    // Get updated topics
    const updatedTopics = await Topic.findAll({
      where: { courseId, isActive: true },
      order: [['order', 'ASC']],
      include: [
        {
          model: Course,
          as: 'course',
          attributes: ['id', 'name', 'category', 'color', 'icon'],
        }
      ],
    });

    res.json({
      success: true,
      message: 'Konu sıralaması başarıyla güncellendi',
      data: { topics: updatedTopics },
    });
  } catch (error) {
    next(error);
  }
};