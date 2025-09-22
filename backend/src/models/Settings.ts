import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface SettingsAttributes {
  id: number;
  key: string;
  value: string;
  category: 'general' | 'security' | 'notifications' | 'appearance';
  type: 'string' | 'number' | 'boolean' | 'json';
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface SettingsCreationAttributes extends Optional<SettingsAttributes, 'id' | 'createdAt' | 'updatedAt' | 'description'> {}

export class Settings extends Model<SettingsAttributes, SettingsCreationAttributes> implements SettingsAttributes {
  public id!: number;
  public key!: string;
  public value!: string;
  public category!: 'general' | 'security' | 'notifications' | 'appearance';
  public type!: 'string' | 'number' | 'boolean' | 'json';
  public description?: string;
  
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  
  // Helper method to get typed value
  public getTypedValue(): any {
    switch (this.type) {
      case 'number':
        return Number(this.value);
      case 'boolean':
        return this.value === 'true';
      case 'json':
        try {
          return JSON.parse(this.value);
        } catch {
          return null;
        }
      default:
        return this.value;
    }
  }
}

Settings.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    key: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    category: {
      type: DataTypes.ENUM('general', 'security', 'notifications', 'appearance'),
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('string', 'number', 'boolean', 'json'),
      allowNull: false,
      defaultValue: 'string',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'Settings',
    tableName: 'settings',
    indexes: [
      { fields: ['key'], unique: true },
      { fields: ['category'] },
    ],
  }
);

export default Settings;