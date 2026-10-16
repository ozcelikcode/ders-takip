import { DataTypes, Model, type Optional } from 'sequelize';
import type { PomodoroPhase } from '@study-tracker/contracts';
import { sequelize } from '../config/database';

interface Attributes {
  sessionId: number; phase: PomodoroPhase; cycle: number; remainingMilliseconds: number;
  deadlineAt: Date | null; autoStartBreaks: boolean; completedWorkCycles: number;
}
export class PomodoroClock extends Model<Attributes, Optional<Attributes, 'deadlineAt' | 'autoStartBreaks' | 'completedWorkCycles'>> implements Attributes {
  declare sessionId: number; declare phase: PomodoroPhase; declare cycle: number; declare remainingMilliseconds: number;
  declare deadlineAt: Date | null; declare autoStartBreaks: boolean; declare completedWorkCycles: number;
}
PomodoroClock.init({
  sessionId: { type: DataTypes.INTEGER, primaryKey: true, references: { model: 'study_sessions', key: 'id' }, onDelete: 'CASCADE', allowNull: false },
  phase: { type: DataTypes.ENUM('work', 'short_break', 'long_break'), allowNull: false },
  cycle: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 10 } },
  remainingMilliseconds: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 0, max: 7_200_000 } },
  deadlineAt: { type: DataTypes.DATE, allowNull: true },
  autoStartBreaks: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  completedWorkCycles: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, validate: { min: 0 } },
}, { sequelize, tableName: 'pomodoro_clocks', timestamps: false, indexes: [{ fields: ['deadlineAt'] }] });
