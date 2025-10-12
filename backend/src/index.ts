import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import os from 'os';

import dotenv from 'dotenv';

import { connectDB } from './config/database';
import './models'; // Initialize models and associations
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import courseRoutes from './routes/courses';
import topicRoutes from './routes/topics';
import planRoutes from './routes/planRoutes';
import studySessionRoutes from './routes/studySessionRoutes';
import settingsRoutes from './routes/settingsRoutes';

dotenv.config();

// Get local network IP address
const getNetworkIP = (): string => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const nets = interfaces[name];
    if (nets) {
      for (const net of nets) {
        // Skip internal (localhost) and non-IPv4 addresses
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }
  }
  return 'localhost';
};

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10000'), // 10000 requests per minute for development
  message: {
    error: 'Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['http://localhost:3000', 'http://localhost:3001']
    : true, // Allow all origins in development for mobile testing
  credentials: true,
}));
// Only apply rate limiter in production
if (process.env.NODE_ENV === 'production') {
  app.use(limiter);
}
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Ders Takip Sistemi API çalışıyor',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/topics', topicRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/study-sessions', studySessionRoutes);
app.use('/api/settings', settingsRoutes);

app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
  try {
    await connectDB();

    const networkIP = getNetworkIP();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚀 Server ${PORT} portunda çalışıyor`);
      console.log(`🌐 Local:   http://localhost:${PORT}/api`);
      console.log(`🌐 Network: http://${networkIP}:${PORT}/api`);
      console.log(`📊 Health:  http://localhost:${PORT}/api/health`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV}`);
      console.log(`\n📱 Telefon için: http://${networkIP}:${PORT}/api\n`);
    });
  } catch (error) {
    console.error('❌ Server başlatma hatası:', error);
    process.exit(1);
  }
};

startServer();

export default app;