import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/roof',
  appOrigin: process.env.APP_ORIGIN || 'http://localhost:5173',
  isProduction: process.env.NODE_ENV === 'production',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'Roof <no-reply@example.com>',
  },
  workerIntervalMs: Number(process.env.WORKER_INTERVAL_MS || 60000),
};
