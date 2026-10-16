import Joi from 'joi';

export const registerSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(20)
    .required()
    .messages({
      'string.alphanum': 'Kullanıcı adı yalnızca harf ve rakam içerebilir',
      'string.min': 'Kullanıcı adı en az 3 karakter olmalıdır',
      'string.max': 'Kullanıcı adı en fazla 20 karakter olabilir',
      'any.required': 'Kullanıcı adı zorunludur',
    }),
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Geçerli bir e-posta adresi giriniz',
      'any.required': 'E-posta zorunludur',
    }),
  password: Joi.string()
    .min(12)
    .max(72)
    .custom((value: string, helpers) => Buffer.byteLength(value, 'utf8') <= 72 ? value : helpers.error('string.max'))
    .required()
    .messages({
      'string.min': 'Şifre en az 12 karakter olmalıdır',
      'string.max': 'Şifre en fazla 72 UTF-8 baytı olabilir',
      'any.required': 'Şifre zorunludur',
    }),
  firstName: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'Ad en az 2 karakter olmalıdır',
      'string.max': 'Ad en fazla 50 karakter olabilir',
      'any.required': 'Ad zorunludur',
    }),
  lastName: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'Soyad en az 2 karakter olmalıdır',
      'string.max': 'Soyad en fazla 50 karakter olabilir',
      'any.required': 'Soyad zorunludur',
    }),
  role: Joi.string()
    .valid('student', 'admin')
    .optional()
    .messages({
      'any.only': 'Rol student veya admin olmalıdır',
    }),
  isActive: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'Aktiflik durumu boolean olmalıdır',
    }),
});

export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Geçerli bir e-posta adresi giriniz',
      'any.required': 'E-posta zorunludur',
    }),
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Şifre zorunludur',
    }),
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Mevcut şifre zorunludur',
    }),
  newPassword: Joi.string()
    .min(12)
    .max(72)
    .custom((value: string, helpers) => Buffer.byteLength(value, 'utf8') <= 72 ? value : helpers.error('string.max'))
    .required()
    .messages({
      'string.min': 'Yeni şifre en az 12 karakter olmalıdır',
      'string.max': 'Yeni şifre en fazla 72 UTF-8 baytı olabilir',
      'any.required': 'Yeni şifre zorunludur',
    }),
});

export const updateProfileSchema = Joi.object({
  firstName: Joi.string()
    .min(2)
    .max(50)
    .messages({
      'string.min': 'Ad en az 2 karakter olmalıdır',
      'string.max': 'Ad en fazla 50 karakter olabilir',
    }),
  lastName: Joi.string()
    .min(2)
    .max(50)
    .messages({
      'string.min': 'Soyad en az 2 karakter olmalıdır',
      'string.max': 'Soyad en fazla 50 karakter olabilir',
    }),
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(20)
    .messages({
      'string.alphanum': 'Kullanıcı adı yalnızca harf ve rakam içerebilir',
      'string.min': 'Kullanıcı adı en az 3 karakter olmalıdır',
      'string.max': 'Kullanıcı adı en fazla 20 karakter olabilir',
    }),
  profileImage: Joi.string()
    .uri({ scheme: ['http', 'https', 'data'] })
    .allow('', null)
    .optional()
    .messages({
      'string.uri': 'Geçerli bir URL giriniz',
    }),
  preferences: Joi.object().optional(),
});

export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error } = schema.validate(req.body);

    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      return res.status(400).json({
        success: false,
        error: {
          message: 'Doğrulama hatası',
          details: errorMessages,
        },
      });
    }

    next();
  };
};