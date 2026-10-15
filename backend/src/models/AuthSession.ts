import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from 'sequelize';
import { sequelize } from '../config/database';

export class AuthSession extends Model<InferAttributes<AuthSession>, InferCreationAttributes<AuthSession>> {
  declare id: string;
  declare userId: number;
  declare expiresAt: Date;
  declare revokedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
AuthSession.init({
  id: { type: DataTypes.UUID, primaryKey: true },
  userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
  revokedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
  createdAt: DataTypes.DATE,
  updatedAt: DataTypes.DATE,
}, { sequelize, tableName: 'auth_sessions', modelName: 'AuthSession', indexes: [{ fields: ['userId'] }, { fields: ['expiresAt'] }] });

export class RefreshCredential extends Model<InferAttributes<RefreshCredential>, InferCreationAttributes<RefreshCredential>> {
  declare hash: string;
  declare sessionId: string;
  declare consumedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
RefreshCredential.init({
  hash: { type: DataTypes.STRING(64), primaryKey: true },
  sessionId: { type: DataTypes.UUID, allowNull: false, references: { model: 'auth_sessions', key: 'id' }, onDelete: 'CASCADE' },
  consumedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
  createdAt: DataTypes.DATE,
  updatedAt: DataTypes.DATE,
}, { sequelize, tableName: 'refresh_credentials', modelName: 'RefreshCredential', indexes: [{ fields: ['sessionId'] }] });
