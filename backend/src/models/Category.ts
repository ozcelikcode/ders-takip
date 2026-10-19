import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface CategoryAttributes {
  id: number;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  order: number;
  isActive: boolean;
  /** Owner of a personal category; null marks a shared category managed by admins. */
  userId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

interface CategoryCreationAttributes extends Optional<CategoryAttributes, 'id' | 'createdAt' | 'updatedAt' | 'description' | 'icon' | 'isActive' | 'userId'> {}

export class Category extends Model<CategoryAttributes, CategoryCreationAttributes> implements CategoryAttributes {
  public id!: number;
  public name!: string;
  public description?: string;
  public color!: string;
  public icon?: string;
  public order!: number;
  public isActive!: boolean;
  public userId!: number | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Category.init(
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
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
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
    modelName: 'Category',
    tableName: 'categories',
    // Name uniqueness is per owner; migration 008 creates the partial unique indexes.
    indexes: [
      { fields: ['userId'] },
      { fields: ['order'] },
      { fields: ['isActive'] },
    ],
  }
);
