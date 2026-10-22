import { backupRecordSchema, type ResetMode } from '@study-tracker/contracts';
import type { Request, Response } from 'express';
import { clearRefreshCookie } from '../middleware/authCookies';
import { MaintenanceConflict } from '../services/databaseMaintenance';
import {
  listBackups,
  performBackup,
  resetApplicationData,
  restoreSnapshot,
} from '../services/backups';
export { performBackup } from '../services/backups';

const respondFailure = (response: Response, error: unknown) =>
  response
    .status(error instanceof MaintenanceConflict ? 409 : 500)
    .json({
      success: false,
      error: { code: error instanceof MaintenanceConflict ? 'maintenanceBusy' : 'maintenanceFailed' },
    });
export const getBackups = async (_request: Request, response: Response) => {
  try {
    return response.json({ success: true, data: await listBackups() });
  } catch (error) {
    return respondFailure(response, error);
  }
};
export const createManualBackup = async (
  _request: Request,
  response: Response,
) => {
  try {
    const entry = await performBackup('manual', response);
    const data = backupRecordSchema.parse({
      id: entry.id,
      filename: entry.filename,
      size: entry.size,
      type: entry.type,
      createdAt: entry.createdAt.toISOString(),
      verified: true,
    });
    return response.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Snapshot failed:', error);
    return respondFailure(response, error);
  }
};
export const restoreBackup = async (request: Request, response: Response) => {
  const id = Number(request.params.id);
  try {
    await restoreSnapshot(id, response);
    clearRefreshCookie(response);
    return response.json({
      success: true,
    });
  } catch (error) {
    console.error('Restore failed:', error);
    return respondFailure(response, error);
  }
};
export const resetData = async (request: Request, response: Response) => {
  const { mode } = request.body as { mode: ResetMode };
  try {
    return response.json({
      success: true,
      data: await resetApplicationData(mode, response),
    });
  } catch (error) {
    console.error('Reset failed:', error);
    return respondFailure(response, error);
  }
};
