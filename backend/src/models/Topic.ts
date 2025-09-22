import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface TopicAttributes {
  id: number;
  name: string;
  courseId: number;
  description?: string;
  estimatedTime: number;
  difficulty: 'Kolay' | 'Orta' | 'Zor';
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface TopicCreationAttributes extends Optional<TopicAttributes, 'id' | 'createdAt' | 'updatedAt' | 'description'> {}

export class Topic extends Model<TopicAttributes, TopicCreationAttributes> implements TopicAttributes {
  public id!: number;
  public name!: string;
  public courseId!: number;
  public description?: string;
  public estimatedTime!: number;
  public difficulty!: 'Kolay' | 'Orta' | 'Zor';
  public order!: number;
  public isActive!: boolean;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Topic.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    courseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'courses',
        key: 'id',
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    estimatedTime: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 5,
        max: 480,
      },
    },
    difficulty: {
      type: DataTypes.ENUM('Kolay', 'Orta', 'Zor'),
      allowNull: false,
      defaultValue: 'Orta',
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
    modelName: 'Topic',
    tableName: 'topics',
    indexes: [
      { fields: ['courseId'] },
      { fields: ['name'] },
      { fields: ['order'] },
      { fields: ['difficulty'] },
      { fields: ['isActive'] },
    ],
  }
);