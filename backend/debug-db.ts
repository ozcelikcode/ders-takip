/// <reference types="node" />
import { sequelize } from './src/config/database';
import './src/models';

async function debug() {
    try {
        await sequelize.authenticate();
        console.log('Connected');
        await sequelize.query('PRAGMA foreign_keys = OFF');
        console.log('Syncing...');
        await sequelize.sync({ alter: true });
        console.log('Synced');
        await sequelize.query('PRAGMA foreign_keys = ON');
    } catch (error: any) {
        console.error('DEBUG ERROR:', error);
        if (error.original) {
            console.error('ORIGINAL ERROR:', error.original);
        }
        if (error.sql) {
            console.error('SQL:', error.sql);
        }
    } finally {
        await sequelize.close();
    }
}

debug();
