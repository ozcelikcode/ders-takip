import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs-extra';
import { sequelize } from '../config/database';
import { Backup, Settings, User, Course, Category, Topic, Plan, StudySession } from '../models';

const DB_PATH = path.join(__dirname, '..', '..', '..', 'database.sqlite');
const BACKUP_DIR = path.join(__dirname, '..', '..', '..', 'backups');

export const getBackups = async (req: Request, res: Response) => {
    try {
        const backups = await Backup.findAll({
            order: [['createdAt', 'DESC']],
        });
        return res.json({ success: true, data: backups });
    } catch (error: any) {
        return res.status(500).json({ success: false, error: { message: error.message } });
    }
};

export const createManualBackup = async (req: Request, res: Response) => {
    try {
        const result = await performBackup('manual');
        return res.json({ success: true, data: result, message: 'Yedekleme başarıyla tamamlandı' });
    } catch (error: any) {
        return res.status(500).json({ success: false, error: { message: error.message } });
    }
};

export const restoreBackup = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const backup = await Backup.findByPk(id);

        if (!backup) {
            return res.status(404).json({ success: false, error: { message: 'Yedek bulunamadı' } });
        }

        const backupPath = path.join(BACKUP_DIR, backup.filename);

        if (!await fs.pathExists(backupPath)) {
            return res.status(404).json({ success: false, error: { message: 'Yedek dosyası sistemde bulunamadı' } });
        }

        console.log(`Restoring from: ${backupPath}`);

        // Close sequelize connection
        await sequelize.close();

        // Copy file back
        await fs.copy(backupPath, DB_PATH);

        res.json({ success: true, message: 'Yedek başarıyla geri yüklendi. Sistem yeniden başlatılıyor...' });

        // Exit after a short delay to allow response to be sent
        setTimeout(() => {
            process.exit(0);
        }, 1000);

        return;
    } catch (error: any) {
        console.error('Restore error:', error);
        return res.status(500).json({ success: false, error: { message: error.message } });
    }
};

export const resetData = async (req: Request, res: Response) => {
    try {
        const { mode } = req.body; // 'settings_only' or 'all'

        if (mode === 'settings_only') {
            await StudySession.destroy({ where: {}, truncate: false });
            await Plan.destroy({ where: {}, truncate: false });
            await Topic.destroy({ where: {}, truncate: false });
            await Category.destroy({ where: {}, truncate: false });
            await Settings.destroy({ where: {}, truncate: false });

        } else if (mode === 'all') {
            await StudySession.destroy({ where: {}, truncate: false });
            await Plan.destroy({ where: {}, truncate: false });
            await Topic.destroy({ where: {}, truncate: false });
            await Course.destroy({ where: {}, truncate: false });
            await Category.destroy({ where: {}, truncate: false });
            await Settings.destroy({ where: {}, truncate: false });

            await User.destroy({
                where: {
                    role: 'student'
                }
            });
        } else {
            return res.status(400).json({ success: false, error: { message: 'Geçersiz mod' } });
        }

        return res.json({ success: true, message: 'Veriler başarıyla sıfırlandı' });
    } catch (error: any) {
        return res.status(500).json({ success: false, error: { message: error.message } });
    }
};

export const performBackup = async (type: 'auto' | 'manual') => {
    await fs.ensureDir(BACKUP_DIR);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${type}-${timestamp}.sqlite`;
    const backupPath = path.join(BACKUP_DIR, filename);

    await fs.copy(DB_PATH, backupPath);

    const stats = await fs.stat(backupPath);

    const backupEntry = await Backup.create({
        filename,
        path: backupPath,
        size: stats.size,
        type,
    });

    const backups = await Backup.findAll({
        order: [['createdAt', 'DESC']],
    });

    if (backups.length > 5) {
        const toDelete = backups.slice(5);
        for (const b of toDelete) {
            const p = path.join(BACKUP_DIR, b.filename);
            if (await fs.pathExists(p)) {
                await fs.remove(p);
            }
            await b.destroy();
        }
    }

    return backupEntry;
};
