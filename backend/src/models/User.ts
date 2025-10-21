import { DataTypes, Model, Optional } from 'sequelize';
import bcrypt from 'bcryptjs';
import { sequelize } from '../config/database';

interface UserAttributes {
  id: number;
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'admin';
  userCategory?: 'student' | 'teacher' | 'employee' | 'developer' | 'freelancer' | 'other';
  isActive: boolean;
  lastLogin?: Date;
  profileImage?: string;
  preferences: {
    theme: 'light' | 'dark';
    notifications: {
      email: boolean;
      push: boolean;
      reminders: boolean;
    };
    workGoals: {
      dailyHours: number;
      weeklyHours: number;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'createdAt' | 'updatedAt' | 'lastLogin' | 'profileImage' | 'role' | 'isActive' | 'preferences'> {}

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public username!: string;
  public email!: string;
  public password!: string;
  public firstName!: string;
  public lastName!: string;
  public role!: 'student' | 'admin';
  public userCategory?: 'student' | 'teacher' | 'employee' | 'developer' | 'freelancer' | 'other';
  public isActive!: boolean;
  public lastLogin?: Date;
  public profileImage?: string;
  public preferences!: {
    theme: 'light' | 'dark';
    notifications: {
      email: boolean;
      push: boolean;
      reminders: boolean;
    };
    workGoals: {
      dailyHours: number;
      weeklyHours: number;
    };
  };

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Instance methods
  public async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
  }

  public getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  // Virtual getter for fullName
  public get fullName(): string {
    return this.getFullName();
  }
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      validate: {
        len: [3, 20],
        isAlphanumeric: true,
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [6, 128],
      },
    },
    firstName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        len: [2, 50],
      },
    },
    lastName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        len: [2, 50],
      },
    },
    role: {
      type: DataTypes.ENUM('student', 'admin'),
      allowNull: false,
      defaultValue: 'student',
    },
    userCategory: {
      type: DataTypes.ENUM('student', 'teacher', 'employee', 'developer', 'freelancer', 'other'),
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    profileImage: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    preferences: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {
        theme: 'light',
        notifications: {
          email: true,
          push: true,
          reminders: true,
        },
        workGoals: {
          dailyHours: 4,
          weeklyHours: 28,
        },
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    indexes: [
      { fields: ['email'] },
      { fields: ['username'] },
      { fields: ['role'] },
      { fields: ['createdAt'] },
    ],
    hooks: {
      beforeSave: async (user: User) => {
        if (user.changed('password')) {
          const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
          user.password = await bcrypt.hash(user.password, saltRounds);
        }
      },
    },
  }
);