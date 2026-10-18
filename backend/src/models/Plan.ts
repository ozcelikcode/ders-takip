import {
  defaultPlanGoals,
  planGoalsSchema,
  type PlanGoals,
} from '@study-tracker/contracts';
import type { StudySession } from './StudySession';
import type { Course } from './Course';
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
  goals: PlanGoals;
  createdAt: Date;
  updatedAt: Date;
}

interface PlanCreationAttributes extends Optional<
  PlanAttributes,
  'id' | 'description' | 'isActive' | 'createdAt' | 'updatedAt'
> {}

export class Plan
  extends Model<PlanAttributes, PlanCreationAttributes>
  implements PlanAttributes
{
  public id!: number;
  public userId!: number;
  public title!: string;
  public description?: string;
  public startDate!: Date;
  public endDate!: Date;
  public isActive!: boolean;
  public goals!: PlanGoals;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Association
  declare studySessions?: (StudySession & { course?: Course })[];

  public static override associations: {
    studySessions: Association<Plan, StudySession>;
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
        isAfterStartDate(this: Plan, value: Date) {
          if (value <= this.startDate) {
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
      defaultValue: { ...defaultPlanGoals },
      validate: {
        isValidGoals(value: unknown) {
          planGoalsSchema.parse(value);
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
  },
);

