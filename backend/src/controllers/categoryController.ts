import { Request, Response } from 'express';
import { Category } from '../models/Category';
import { Course } from '../models/Course';

// Get all categories
export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await Category.findAll({
      order: [['order', 'ASC']],
    });

    res.json({
      success: true,
      data: { categories },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Kategoriler getirilirken hata oluştu',
        details: error.message,
      },
    });
  }
};

// Get single category
export const getCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const category = await Category.findByPk(id);

    if (!category) {
      res.status(404).json({
        success: false,
        error: { message: 'Kategori bulunamadı' },
      });
      return;
    }

    res.json({
      success: true,
      data: { category },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Kategori getirilirken hata oluştu',
        details: error.message,
      },
    });
  }
};

// Create category
export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, color, icon, order, isActive } = req.body;

    // Check if category name already exists
    const existingCategory = await Category.findOne({ where: { name } });
    if (existingCategory) {
      res.status(400).json({
        success: false,
        error: { message: 'Bu isimde bir kategori zaten mevcut' },
      });
      return;
    }

    const category = await Category.create({
      name,
      description,
      color: color || '#3b82f6',
      icon,
      order: order || 1,
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json({
      success: true,
      data: { category },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Kategori oluşturulurken hata oluştu',
        details: error.message,
      },
    });
  }
};

// Update category
export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, color, icon, order, isActive } = req.body;

    const category = await Category.findByPk(id);

    if (!category) {
      res.status(404).json({
        success: false,
        error: { message: 'Kategori bulunamadı' },
      });
      return;
    }

    // Check if new name conflicts with existing category
    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({ where: { name } });
      if (existingCategory) {
        res.status(400).json({
          success: false,
          error: { message: 'Bu isimde bir kategori zaten mevcut' },
        });
        return;
      }
    }

    await category.update({
      name: name || category.name,
      description: description !== undefined ? description : category.description,
      color: color || category.color,
      icon: icon !== undefined ? icon : category.icon,
      order: order || category.order,
      isActive: isActive !== undefined ? isActive : category.isActive,
    });

    res.json({
      success: true,
      data: { category },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Kategori güncellenirken hata oluştu',
        details: error.message,
      },
    });
  }
};

// Delete category
export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { migrateToCategoryId } = req.body; // Optional: ID of category to migrate courses to

    const category = await Category.findByPk(id);

    if (!category) {
      res.status(404).json({
        success: false,
        error: { message: 'Kategori bulunamadı' },
      });
      return;
    }

    // Check if there are courses with this category's name (TYT/AYT)
    const coursesCount = await Course.count({
      where: { category: category.name as any },
    });

    if (coursesCount > 0) {
      if (migrateToCategoryId) {
        // Migrate courses to another category
        const targetCategory = await Category.findByPk(migrateToCategoryId);

        if (!targetCategory) {
          res.status(400).json({
            success: false,
            error: { message: 'Hedef kategori bulunamadı' },
          });
          return;
        }

        // Update all courses - set category to target category name
        await Course.update(
          { category: targetCategory.name as any },
          { where: { category: category.name as any } }
        );
      } else {
        // Set courses to "Kategorisiz" - but since we have ENUM, we need to handle this differently
        res.status(400).json({
          success: false,
          error: {
            message: `Bu kategoride ${coursesCount} ders bulunmaktadır. Lütfen önce dersleri başka bir kategoriye taşıyın veya migrateToCategoryId parametresi ile hedef kategori belirtin.`,
          },
        });
        return;
      }
    }

    await category.destroy();

    res.json({
      success: true,
      data: {
        message: 'Kategori başarıyla silindi',
        migratedCoursesCount: coursesCount,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Kategori silinirken hata oluştu',
        details: error.message,
      },
    });
  }
};
