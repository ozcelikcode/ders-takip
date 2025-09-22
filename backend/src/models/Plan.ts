import { DataTypes, Model, Optional, Association } from 'sequelize';
import { sequelize } from '../config/database';

interface PlanAttributes {
  id: number;
  userId: number;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  goals: {
    dailyHours: number;
    weeklyHours: number;
    targetTopics: number;
    priority: 'low' | 'medium' | 'high';
  };
  createdAt: Date;
  updatedAt: Date;
}

interface PlanCreationAttributes extends Optional<PlanAttributes, 'id' | 'description' | 'isActive' | 'createdAt' | 'updatedAt'> {}

export class Plan extends Model<PlanAttributes, PlanCreationAttributes> implements PlanAttributes {
  public id!: number;
  public userId!: number;
  public title!: string;
  public description?: string;
  public startDate!: Date;
  public endDate!: Date;
  public isActive!: boolean;
  public goals!: {
    dailyHours: number;
    weeklyHours: number;
    targetTopics: number;
    priority: 'low' | 'medium' | 'high';
  };
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Association
  public studySessions?: any[];

  public static override associations: {
    studySessions: Association<Plan, any>;
  };
}

Plan.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 100],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isAfterStartDate(value: Date) {
          if (value <= (this as any).startDate) {
            throw new Error('End date must be after start date');
          }
        },
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    goals: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {
        dailyHours: 4,
        weeklyHours: 28,
        targetTopics: 10,
        priority: 'medium',
      },
      validate: {
        isValidGoals(value: any) {
          if (!value || typeof value !== 'object') {
            throw new Error('Goals must be an object');
          }
          const goals = value as any;
          if (typeof goals.dailyHours !== 'number' || goals.dailyHours < 0 || goals.dailyHours > 24) {
            throw new Error('Daily hours must be between 0 and 24');
          }
          if (typeof goals.weeklyHours !== 'number' || goals.weeklyHours < 0 || goals.weeklyHours > 168) {
            throw new Error('Weekly hours must be between 0 and 168');
          }
          if (typeof goals.targetTopics !== 'number' || goals.targetTopics < 0) {
            throw new Error('Target topics must be a positive number');
          }
          if (!['low', 'medium', 'high'].includes(goals.priority)) {
            throw new Error('Priority must be low, medium, or high');
          }
        },
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'plans',
    timestamps: true,
    indexes: [
      {
        fields: ['userId'],
      },
      {
        fields: ['startDate', 'endDate'],
      },
      {
        fields: ['isActive'],
      },
    ],
  }
);

export default Plan;