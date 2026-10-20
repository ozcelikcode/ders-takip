import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

/** A browser that agreed to receive Web Push for one account. The endpoint identifies the browser. */
export class PushSubscription extends Model {
  declare id: number;
  declare userId: number;
  declare endpoint: string;
  declare p256dh: string;
  declare auth: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}
PushSubscription.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
    endpoint: { type: DataTypes.STRING(1000), allowNull: false, unique: true },
    p256dh: { type: DataTypes.STRING(200), allowNull: false },
    auth: { type: DataTypes.STRING(100), allowNull: false },
  },
  { sequelize, tableName: 'push_subscriptions', indexes: [{ fields: ['userId'] }] },
);
