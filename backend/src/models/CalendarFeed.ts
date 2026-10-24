import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

/** One calendar subscription per person. Only the key's SHA-256 is stored; renewing replaces it. */
export class CalendarFeed extends Model {
  declare userId: number;
  declare tokenHash: string;
  declare createdAt: Date;
}
CalendarFeed.init({
  userId: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
  tokenHash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
}, { sequelize, tableName: 'calendar_feeds', updatedAt: false });
