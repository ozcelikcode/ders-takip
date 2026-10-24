import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * A weekly routine. Its sessions exist as ordinary study sessions (linked by `seriesId` and the routine date
 * they stand for) up to `generatedThrough`; a daily job extends them. `exceptionDates` are routine dates the
 * person changed or removed one by one, which routine edits and regeneration leave alone.
 */
export class SessionSeries extends Model {
  declare id: number;
  declare userId: number;
  declare title: string;
  declare description: string | null;
  declare courseId: number | null;
  declare topicId: number | null;
  declare sessionType: 'study' | 'break' | 'pomodoro' | 'review';
  declare color: string | null;
  declare pomodoroSettings: { workDuration: number; shortBreak: number; longBreak: number; cyclesBeforeLongBreak: number; currentCycle: number } | null;
  declare weekdays: number[];
  declare startTime: string;
  declare durationMinutes: number;
  declare startsOn: string;
  declare endsOn: string | null;
  declare timezone: string;
  declare generatedThrough: string | null;
  declare exceptionDates: string[];
  declare createdAt: Date;
  declare updatedAt: Date;
}

SessionSeries.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
    title: { type: DataTypes.STRING, allowNull: false, validate: { len: [1, 200] } },
    description: { type: DataTypes.TEXT, allowNull: true },
    courseId: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'courses', key: 'id' }, onDelete: 'SET NULL' },
    topicId: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'topics', key: 'id' }, onDelete: 'SET NULL' },
    sessionType: { type: DataTypes.ENUM('study', 'break', 'pomodoro', 'review'), allowNull: false, defaultValue: 'study' },
    color: { type: DataTypes.STRING(7), allowNull: true },
    pomodoroSettings: { type: DataTypes.JSON, allowNull: true },
    weekdays: { type: DataTypes.JSON, allowNull: false },
    startTime: { type: DataTypes.STRING(5), allowNull: false },
    durationMinutes: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 1440 } },
    startsOn: { type: DataTypes.STRING(10), allowNull: false },
    endsOn: { type: DataTypes.STRING(10), allowNull: true },
    timezone: { type: DataTypes.STRING(100), allowNull: false },
    generatedThrough: { type: DataTypes.STRING(10), allowNull: true },
    exceptionDates: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
  },
  {
    sequelize,
    tableName: 'session_series',
    hooks: {
      beforeUpdate(series, options) {
        // The daily horizon job saves silently: extending sessions is not an edit a person has to reload for.
        if (options.silent) return;
        // Keep the optimistic version distinct even for writes in the same millisecond.
        const previous = series.previous('updatedAt');
        series.setDataValue('updatedAt', new Date(Math.max(Date.now(), (previous?.getTime() ?? 0) + 1)));
      },
    },
    indexes: [{ fields: ['userId'] }, { fields: ['generatedThrough'] }],
  },
);
