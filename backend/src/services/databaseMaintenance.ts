import type { NextFunction, Request, Response } from 'express';

const requests = new Set<Response>();
let exclusive = false;
let unavailable = false;
export const isDatabaseUnavailable = () => exclusive || unavailable;
export const keepDatabaseUnavailable = () => { unavailable = true; };

export const trackDatabaseRequests = (_request: Request, response: Response, next: NextFunction): void => {
  if (isDatabaseUnavailable()) {
    response.setHeader('Retry-After', '5');
    response.status(503).json({ success: false, error: { message: 'Veritabanı bakım işlemi sürüyor. Lütfen tekrar deneyin' } });
    return;
  }
  requests.add(response);
  const release = () => requests.delete(response);
  response.once('finish', release);
  response.once('close', release);
  next();
};

export class MaintenanceConflict extends Error {}
export const withDatabaseMaintenance = async <T>(operation: () => Promise<T>, currentResponse?: Response): Promise<T> => {
  if (isDatabaseUnavailable()) throw new MaintenanceConflict('Database maintenance is already active');
  exclusive = true;
  try {
    const pending = [...requests].filter(response => response !== currentResponse);
    await Promise.all(pending.map(response => new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => { cleanup(); reject(new MaintenanceConflict('Active requests did not finish')); }, 10000);
      const done = () => { cleanup(); resolve(); };
      const cleanup = () => { clearTimeout(timer); response.off('finish', done); response.off('close', done); };
      response.once('finish', done); response.once('close', done);
      if (response.writableFinished || response.destroyed) done();
    })));
    return await operation();
  } finally { exclusive = false; }
};
