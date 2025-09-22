import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface StudySessionAttributes {
  id: number;
  userId: number;
  planId?: number;
  topicId?: number;
  courseId?: number;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  duration: number; // in minutes
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'paused';
  sessionType: 'study' | 'break' | 'pomodoro' | 'review';
  color?: string; // hex color code
  pomodoroSettings?: {
    workDuration: number; // minutes
    shortBreak: number; // minutes
    longBreak: number; // minutes
    cyclesBeforeLongBreak: number;
    currentCycle: number;
  };
  notes?: string;
  productivity?: number; // 1-5 rating
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface StudySessionCreationAttributes extends Optional<StudySessionAttributes, 'id' | 'planId' | 'topicId' | 'courseId' | 'description' | 'status' | 'color' | 'pomodoroSettings' | 'notes' | 'productivity' | 'completedAt' | 'createdAt' | 'updatedAt'> {}

export class StudySession extends Model<StudySessionAttributes, StudySessionCreationAttributes> implements StudySessionAttributes {
  public id!: number;
  public userId!: number;
  public planId?: number;
  public topicId?: number;
  public courseId?: number;
  public title!: string;
  public description?: string;
  public startTime!: Date;
  public endTime!: Date;
  public duration!: number;
  public status!: 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'paused';
  public sessionType!: 'study' | 'break' | 'pomodoro' | 'review';
  public color?: string;
  public pomodoroSettings?: {
    workDuration: number;
    shortBreak: number;
    longBreak: number;
    cyclesBeforeLongBreak: number;
    currentCycle: number;
  };
  public notes?: string;
  public productivity?: number;
  public completedAt?: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

StudySession.init(
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
    planId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'plans',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    topicId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'topics',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    courseId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'courses',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 200],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isAfterStartTime(value: Date) {
          if (value <= (this as any).startTime) {
            throw new Error('End time must be after start time');
          }
        },
      },
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 1440, // 24 hours in minutes
      },
    },
    status: {
      type: DataTypes.ENUM('planned', 'in_progress', 'completed', 'cancelled', 'paused'),
      allowNull: false,
      defaultValue: 'planned',
    },
    sessionType: {
      type: DataTypes.ENUM('study', 'break', 'pomodoro', 'review'),
      allowNull: false,
      defaultValue: 'study',
    },
    color: {
      type: DataTypes.STRING(7), // hex color code like #3B82F6
      allowNull: true,
      defaultValue: '#3B82F6',
      validate: {
        is: /^#[0-9A-F]{6}$/i, // hex color validation
      },
    },
    pomodoroSettings: {
      type: DataTypes.JSON,
      allowNull: true,
      validate: {
        isValidPomodoroSettings(value: any) {
          if (value === null || value === undefined) return;

          if (typeof value !== 'object') {
            throw new Error('Pomodoro settings must be an object');
          }

          const settings = value as any;
          const required = ['workDuration', 'shortBreak', 'longBreak', 'cyclesBeforeLongBreak', 'currentCycle'];
          for (const field of required) {
            if (typeof settings[field] !== 'number' || settings[field] < 0) {
              throw new Error(`${field} must be a positive number`);
            }
          }
        },
      },
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    productivity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 5,
      },
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
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
    tableName: 'study_sessions',
    timestamps: true,
    indexes: [
      {
        fields: ['userId'],
      },
      {
        fields: ['planId'],
      },
      {
        fields: ['topicId'],
      },
      {
        fields: ['courseId'],
      },
      {
        fields: ['startTime', 'endTime'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['sessionType'],
      },
    ],
  }
);

export default StudySession;