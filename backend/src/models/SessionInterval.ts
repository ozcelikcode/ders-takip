import { DataTypes, Model, type Optional } from 'sequelize';
import type { IntervalKind } from '@study-tracker/contracts';
import { sequelize } from '../config/database';

interface Attributes { id: number; sessionId: number; kind: IntervalKind; startedAt: Date; endedAt: Date | null }
export class SessionInterval extends Model<Attributes, Optional<Attributes, 'id' | 'endedAt'>> implements Attributes {
  declare id: number;
  declare sessionId: number;
  declare kind: IntervalKind;
  declare startedAt: Date;
  declare endedAt: Date | null;
}
SessionInterval.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  sessionId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'study_sessions', key: 'id' }, onDelete: 'CASCADE' },
  kind: { type: DataTypes.ENUM('study', 'break', 'pause'), allowNull: false },
  startedAt: { type: DataTypes.DATE, allowNull: false },
  endedAt: { type: DataTypes.DATE, allowNull: true },
}, { sequelize, tableName: 'session_intervals', timestamps: false, indexes: [
  { fields: ['sessionId', 'startedAt'] },
  { name: 'session_intervals_one_open', unique: true, fields: ['sessionId'], where: { endedAt: null } },
] });
