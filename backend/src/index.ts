import cron from 'node-cron';
import app from './app';
import { connectDB, sequelize } from './config/database';
import { getEnvironment } from './config/environment';
import { mirrorBackups, reconcileBackupCatalog, runScheduledBackup } from './services/backups';
import { runDueNotifications } from './services/notifications';
import { assertDatabaseReady } from './database/migrations';
import { runDuePomodoros, startPomodoroScheduler } from './services/pomodoroClocks';


const startServer = async () => {
  const environment = getEnvironment();
  await connectDB();
  await assertDatabaseReady();

  await reconcileBackupCatalog();
  // Catch up on copies a crash or an unreachable copy folder left behind.
  void mirrorBackups();
  await runDuePomodoros();
  const pomodoroScheduler = startPomodoroScheduler();
  const backupJob = cron.schedule('*/5 * * * *', async () => {
    try { await runScheduledBackup(); }
    catch (error) { console.error('Scheduled maintenance failed:', error); }
  }, { timezone: 'Europe/Istanbul', noOverlap: true });
  // Reminders and digests are due per user time zone, so the job runs every minute and decides per user.
  const notificationJob = cron.schedule('* * * * *', async () => {
    try { await runDueNotifications(); }
    catch (error) { console.error('Notification delivery failed:', error); }
  }, { noOverlap: true });

  const server = app.listen(environment.PORT, '0.0.0.0', () => {
    console.log(`API listening on http://localhost:${environment.PORT}/api`);
  });
  const shutdown = () => {
    backupJob.stop();
    notificationJob.stop();
    server.close(() => { void pomodoroScheduler.stop().then(() => sequelize.close()).then(() => process.exit(0)); });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
};

void startServer().catch((error: unknown) => {
  console.error('Server startup failed:', error);
  process.exitCode = 1;
});
