import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import { getEnvironment } from './config/environment';
import { trackDatabaseRequests, isDatabaseUnavailable } from './services/databaseMaintenance';

import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import './models'; // Initialize models and associations
import authRoutes from './routes/auth';
import backupRoutes from './routes/backupRoutes';
import categoryRoutes from './routes/categories';
import courseRoutes from './routes/courses';
import planRoutes from './routes/planRoutes';
import settingsRoutes from './routes/settingsRoutes';
import studySessionRoutes from './routes/studySessionRoutes';
import topicRoutes from './routes/topics';
import userRoutes from './routes/users';

const app = express();
const environment = getEnvironment();

app.use(helmet());
app.use(cors({ origin: environment.FRONTEND_URL, credentials: true }));
if (environment.NODE_ENV === 'production') {
  app.use(rateLimit({
    windowMs: environment.RATE_LIMIT_WINDOW_MS,
    limit: environment.RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, error: { message: 'Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.' } },
  }));
  app.use(morgan('combined'));
}
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/api/health', (req, res) => {
  res.status(isDatabaseUnavailable() ? 503 : 200).json({
    status: isDatabaseUnavailable() ? 'MAINTENANCE' : 'OK',
    message: isDatabaseUnavailable() ? 'Veritabanı bakım modunda' : 'Ders Takip Sistemi API çalışıyor',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

app.use(trackDatabaseRequests);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/topics', topicRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/study-sessions', studySessionRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/backup', backupRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
