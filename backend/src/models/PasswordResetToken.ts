import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

/** One-time password reset credential; only the SHA-256 hash of the token is stored. */
export class PasswordResetToken extends Model {
  declare id: number;
  declare userId: number;
  declare tokenHash: string;
  declare issuedBy: 'self' | 'admin';
  declare expiresAt: Date;
  declare usedAt: Date | null;
  declare createdAt: Date;
}
PasswordResetToken.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
    tokenHash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    issuedBy: { type: DataTypes.ENUM('self', 'admin'), allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    usedAt: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize, tableName: 'password_reset_tokens', updatedAt: false, indexes: [{ fields: ['userId'] }] },
);
