import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { Category } from './Category';

interface CourseAttributes {
  id: number;
  name: string;
  categoryId: number;
  description?: string;
  color: string;
  icon?: string;
  order: number;
  isActive: boolean;
  userId?: number | null;
  isGlobal: boolean;
  createdAt: Date;
  updatedAt: Date;
  category?: Category;
}

interface CourseCreationAttributes extends Optional<CourseAttributes, 'id' | 'createdAt' | 'updatedAt' | 'description' | 'icon' | 'isActive' | 'userId' | 'isGlobal'> { }

export class Course extends Model<CourseAttributes, CourseCreationAttributes> implements CourseAttributes {
  public id!: number;
  public name!: string;
  public categoryId!: number;
  public description?: string;
  public color!: string;
  public icon?: string;
  public order!: number;
  public isActive!: boolean;
  public userId?: number | null;
  public isGlobal!: boolean;
  public category?: Category;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Course.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        len: [1, 100],
      },
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'categories',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    color: {
      type: DataTypes.STRING(7),
      allowNull: false,
      defaultValue: '#3b82f6',
      validate: {
        is: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
      },
    },
    icon: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    isGlobal: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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
    modelName: 'Course',
    tableName: 'courses',
    indexes: [
      { fields: ['name'] },
      { fields: ['categoryId'] },
      { fields: ['userId'] },
      { fields: ['isGlobal'] },
      { fields: ['order'] },
      { fields: ['isActive'] },
      { fields: ['categoryId', 'order'] },
    ],
  }
);