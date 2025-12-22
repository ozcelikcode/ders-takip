import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface BackupAttributes {
    id: number;
    filename: string;
    path: string;
    size: number;
    type: 'auto' | 'manual';
    createdAt: Date;
    updatedAt: Date;
}

interface BackupCreationAttributes extends Optional<BackupAttributes, 'id' | 'createdAt' | 'updatedAt'> { }

export class Backup extends Model<BackupAttributes, BackupCreationAttributes> implements BackupAttributes {
    public id!: number;
    public filename!: string;
    public path!: string;
    public size!: number;
    public type!: 'auto' | 'manual';

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Backup.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        filename: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        path: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        size: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        type: {
            type: DataTypes.ENUM('auto', 'manual'),
            allowNull: false,
            defaultValue: 'manual',
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
        modelName: 'Backup',
        tableName: 'backups',
        indexes: [
            { fields: ['createdAt'] },
        ],
    }
);

export default Backup;
