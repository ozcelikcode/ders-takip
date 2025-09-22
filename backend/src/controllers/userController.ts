import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { Op } from 'sequelize';

export const getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      role,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = req.query;

    const where: any = {};

    if (search) {
      where[Op.or] = [
        { firstName: { [Op.like]: `%${search}%` } },
        { lastName: { [Op.like]: `%${search}%` } },
        { username: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const { count, rows: users } = await User.findAndCountAll({
      where,
      order: [[sortBy as string, sortOrder as string]],
      limit: limitNum,
      offset,
      attributes: { exclude: ['password'] },
    });

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          current: pageNum,
          pages: Math.ceil(count / limitNum),
          total: count,
          limit: limitNum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: { message: 'Kullanıcı bulunamadı' },
      });
      return;
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { username, email, password, firstName, lastName, role = 'student' } = req.body;

    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ email }, { username }],
      },
    });

    if (existingUser) {
      res.status(400).json({
        success: false,
        error: {
          message: existingUser.email === email
            ? 'Bu e-posta adresi zaten kullanılıyor'
            : 'Bu kullanıcı adı zaten alınmış',
        },
      });
      return;
    }

    const user = await User.create({
      username,
      email,
      password,
      firstName,
      lastName,
      role,
    });

    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.getFullName(),
      role: user.role,
      isActive: user.isActive,
      preferences: user.preferences,
      createdAt: user.createdAt,
    };

    res.status(201).json({
      success: true,
      message: 'Kullanıcı başarıyla oluşturuldu',
      data: { user: userResponse },
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { firstName, lastName, role, isActive, preferences } = req.body;

    const user = await User.findByPk(id);

    if (!user) {
      res.status(404).json({
        success: false,
        error: { message: 'Kullanıcı bulunamadı' },
      });
      return;
    }

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (role) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    if (preferences) user.preferences = { ...user.preferences, ...preferences };

    await user.save();

    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.getFullName(),
      role: user.role,
      isActive: user.isActive,
      preferences: user.preferences,
      updatedAt: user.updatedAt,
    };

    res.json({
      success: true,
      message: 'Kullanıcı başarıyla güncellendi',
      data: { user: userResponse },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (req.user.id.toString() === id) {
      res.status(400).json({
        success: false,
        error: { message: 'Kendi hesabınızı silemezsiniz' },
      });
      return;
    }

    const user = await User.findByPk(id);

    if (!user) {
      res.status(404).json({
        success: false,
        error: { message: 'Kullanıcı bulunamadı' },
      });
      return;
    }

    await user.destroy();

    res.json({
      success: true,
      message: 'Kullanıcı başarıyla silindi',
    });
  } catch (error) {
    next(error);
  }
};