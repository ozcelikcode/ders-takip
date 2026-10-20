import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export type NotificationKind = 'session-reminder' | 'daily-plan' | 'weekly-summary';

/**
 * One notification that was handled, so the scheduler never sends it twice (restarts, overlapping ticks).
 * `key` names the occasion: a session and its start time, a local date, or a week's first date.
 */
export class NotificationDelivery extends Model {
  declare id: number;
  declare userId: number;
  declare kind: NotificationKind;
  declare key: string;
  declare createdAt: Date;
}
NotificationDelivery.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
    kind: { type: DataTypes.ENUM('session-reminder', 'daily-plan', 'weekly-summary'), allowNull: false },
    key: { type: DataTypes.STRING(100), allowNull: false },
  },
  { sequelize, tableName: 'notification_deliveries', updatedAt: false, indexes: [{ unique: true, fields: ['userId', 'kind', 'key'] }, { fields: ['createdAt'] }] },
);
