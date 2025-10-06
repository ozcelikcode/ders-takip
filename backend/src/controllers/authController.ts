import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { generateTokens, verifyRefreshToken } from '../utils/jwt';
import { Op } from 'sequelize';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { username, email, password, firstName, lastName } = req.body;

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
    });

    const tokenPayload = {
      id: user.id.toString(),
      email: user.email,
      role: user.role,
    };

    const tokens = generateTokens(tokenPayload);

    user.lastLogin = new Date();
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
      profileImage: user.profileImage,
      preferences: user.preferences,
      createdAt: user.createdAt,
    };

    res.status(201).json({
      success: true,
      message: 'Hesap başarıyla oluşturuldu',
      data: {
        user: userResponse,
        tokens,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      where: { email },
      attributes: { include: ['password'] }
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: { message: 'E-posta veya şifre hatalı' },
      });
      return;
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        error: { message: 'E-posta veya şifre hatalı' },
      });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({
        success: false,
        error: { message: 'Hesabınız deaktif durumda. Lütfen yöneticiyle iletişime geçin' },
      });
      return;
    }

    const tokenPayload = {
      id: user.id.toString(),
      email: user.email,
      role: user.role,
    };

    const tokens = generateTokens(tokenPayload);

    user.lastLogin = new Date();
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
      profileImage: user.profileImage,
      preferences: user.preferences,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
    };

    res.json({
      success: true,
      message: 'Giriş başarılı',
      data: {
        user: userResponse,
        tokens,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(401).json({
        success: false,
        error: { message: 'Refresh token zorunludur' },
      });
      return;
    }

    const decoded = verifyRefreshToken(refreshToken);

    const user = await User.findByPk(decoded.id);

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        error: { message: 'Geçersiz refresh token' },
      });
      return;
    }

    const tokenPayload = {
      id: user.id.toString(),
      email: user.email,
      role: user.role,
    };

    const tokens = generateTokens(tokenPayload);

    res.json({
      success: true,
      message: 'Token yenilendi',
      data: { tokens },
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: { message: 'Geçersiz refresh token' },
    });
    return;
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json({
      success: true,
      message: 'Çıkış başarılı',
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user;

    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.getFullName(),
      role: user.role,
      isActive: user.isActive,
      profileImage: user.profileImage,
      preferences: user.preferences,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.json({
      success: true,
      data: { user: userResponse },
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, username, profileImage, preferences } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        error: { message: 'Kullanıcı bulunamadı' },
      });
      return;
    }

    // Check if username is already taken (if trying to change)
    if (username && username !== user.username) {
      const existingUser = await User.findOne({
        where: { username },
      });

      if (existingUser) {
        res.status(400).json({
          success: false,
          error: { message: 'Bu kullanıcı adı zaten kullanılıyor' },
        });
        return;
      }

      user.username = username;
    }

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (profileImage !== undefined) user.profileImage = profileImage;
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
      profileImage: user.profileImage,
      preferences: user.preferences,
      updatedAt: user.updatedAt,
    };

    res.json({
      success: true,
      message: 'Profil başarıyla güncellendi',
      data: { user: userResponse },
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    const user = await User.findByPk(userId, {
      attributes: { include: ['password'] }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: { message: 'Kullanıcı bulunamadı' },
      });
      return;
    }

    const isCurrentPasswordValid = await user.comparePassword(currentPassword);

    if (!isCurrentPasswordValid) {
      res.status(400).json({
        success: false,
        error: { message: 'Mevcut şifre hatalı' },
      });
      return;
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Şifre başarıyla değiştirildi',
    });
  } catch (error) {
    next(error);
  }
};