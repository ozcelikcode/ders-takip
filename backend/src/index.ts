import cron from 'node-cron';
import app from './app';
import { connectDB, sequelize } from './config/database';
import { getEnvironment } from './config/environment';
import { reconcileBackupCatalog, runScheduledBackup } from './services/backups';
import { assertDatabaseReady } from './database/migrations';


const startServer = async () => {
  const environment = getEnvironment();
  await connectDB();
  await assertDatabaseReady();

  await reconcileBackupCatalog();
  const backupJob = cron.schedule('*/5 * * * *', async () => {
    try { await runScheduledBackup(); }
    catch (error) { console.error('Scheduled maintenance failed:', error); }
  }, { timezone: 'Europe/Istanbul', noOverlap: true });

  const server = app.listen(environment.PORT, '0.0.0.0', () => {
    console.log(`API listening on http://localhost:${environment.PORT}/api`);
  });
  const shutdown = () => {
    backupJob.stop();
    server.close(() => { void sequelize.close().then(() => process.exit(0)); });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
};

void startServer().catch((error: unknown) => {
  console.error('Server startup failed:', error);
  process.exitCode = 1;
});
