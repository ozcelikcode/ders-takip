import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { trackingCoverageSchema, type SessionStatus, type TrackingCoverage } from '@study-tracker/contracts';
import type { SessionInterval } from './SessionInterval';
import type { PomodoroClock } from './PomodoroClock';
import type { User } from './User';

interface StudySessionAttributes {
  id: number;
  userId: number;
  planId?: number | null;
  topicId?: number | null;
  courseId?: number | null;
  seriesId?: number | null;
  seriesDate?: string | null;
  /** When the person read the notice about this finished session; null while unread. */
  notificationReadAt?: Date | null;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  duration: number; // in minutes
  trackingCoverage: TrackingCoverage;
  status: SessionStatus;
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
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface StudySessionCreationAttributes extends Optional<StudySessionAttributes, 'id' | 'planId' | 'topicId' | 'courseId' | 'seriesId' | 'seriesDate' | 'description' | 'status' | 'color' | 'pomodoroSettings' | 'notes' | 'productivity' | 'completedAt' | 'createdAt' | 'updatedAt' | 'trackingCoverage' | 'notificationReadAt'> {}

export class StudySession extends Model<StudySessionAttributes, StudySessionCreationAttributes> implements StudySessionAttributes {
  public id!: number;
  public userId!: number;
  public planId?: number | null;
  public topicId?: number | null;
  public courseId?: number | null;
  /** The weekly routine this session belongs to, and the routine date it stands for even after a move. */
  public seriesId?: number | null;
  public seriesDate?: string | null;
  public notificationReadAt?: Date | null;
  public title!: string;
  public description?: string;
  public startTime!: Date;
  public endTime!: Date;
  public duration!: number;
  declare trackingCoverage: TrackingCoverage;
  declare activityIntervals?: SessionInterval[];
  declare pomodoroClock?: PomodoroClock | null;
  declare user?: User;
  public status!: SessionStatus;
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
  public completedAt?: Date | null;
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
    seriesId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'session_series',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    seriesDate: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    notificationReadAt: {
      type: DataTypes.DATE,
      allowNull: true,
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
        isAfterStartTime(this: { startTime: Date }, value: Date) {
          if (value <= this.startTime) {
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
    trackingCoverage: { type: DataTypes.ENUM(...trackingCoverageSchema.options), allowNull: false, defaultValue: 'complete' },
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
        isValidPomodoroSettings(value: unknown) {
          if (value === null || value === undefined) return;

          if (typeof value !== 'object') {
            throw new Error('Pomodoro settings must be an object');
          }

          const settings = value as Record<string, unknown>;
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
    hooks: {
      beforeUpdate(session) {
        // Keep the optimistic version distinct even for writes in the same millisecond.
        const previous = session.previous('updatedAt');
        session.setDataValue('updatedAt', new Date(Math.max(Date.now(), (previous?.getTime() ?? 0) + 1)));
      },
    },
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
      // One session per routine date; created by 010 for databases that predate routines.
      {
        name: 'study_sessions_series_date',
        unique: true,
        fields: ['seriesId', 'seriesDate'],
      },
    ],
  }
);

