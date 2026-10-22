import { NextFunction, Request, Response } from 'express';
import { Category } from '../models';
import * as catalog from '../services/catalog';

export const getCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const categories = await Category.findAll({ where: catalog.visibleCategoryWhere(req.user!), order: [['order', 'ASC'], ['id', 'ASC']] });
    res.json({ success: true, data: { categories } });
  } catch (error) { next(error); }
};

export const createCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const category = await catalog.createCategory(req.user!, req.body);
    res.status(201).json({ success: true, data: { category } });
  } catch (error) { next(error); }
};

export const updateCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const category = await catalog.updateCategory(req.user!, Number(req.params.id), req.body);
    res.json({ success: true, data: { category } });
  } catch (error) { next(error); }
};

export const deleteCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const migratedCoursesCount = await catalog.deleteCategory(req.user!, Number(req.params.id), req.body);
    res.json({ success: true, data: { migratedCoursesCount } });
  } catch (error) { next(error); }
};
