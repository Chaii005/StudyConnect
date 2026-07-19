// backend/server.js
const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');

require('dotenv').config();
const app              = require('./app');
const { connectDB }    = require('./config/database');
const logger           = require('./utils/logger');

const PORT = parseInt(process.env.PORT || '5000', 10);

const start = async () => {
  try {
    // Load and register models for sync
    require('./models/User');
    require('./models/UserPushToken');

    await connectDB();

    // Sync app settings to database for database-to-worker polling webhook trigger
    const syncAppSettings = async () => {
      const apiUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
      const webhookSecret = process.env.WEBHOOK_SECRET || '';
      
      try {
        const { sequelize } = require('./config/database');
        await sequelize.query(`
          INSERT INTO public.app_settings (key, value, updated_at)
          VALUES ('api_url', :apiUrl, NOW())
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
        `, { replacements: { apiUrl } });

        if (webhookSecret) {
          await sequelize.query(`
            INSERT INTO public.app_settings (key, value, updated_at)
            VALUES ('webhook_secret', :webhookSecret, NOW())
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
          `, { replacements: { webhookSecret } });
        }
        
        logger.info(`Synced app settings to database: api_url = ${apiUrl}`);
      } catch (err) {
        logger.error('Error syncing app settings to database:', err);
      }
    };

    await syncAppSettings();

    // Start background notification queue worker
    const { startWorker } = require('./services/notificationQueueWorker');
    startWorker();

    const server = app.listen(PORT, () => {
      logger.info(`🚀 StudyConnect API running on http://localhost:${PORT}`);
      logger.info(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Graceful shutdown
    const shutdown = (signal) => {
      logger.warn(`${signal} received — shutting down gracefully...`);
      
      try {
        const { stopWorker } = require('./services/notificationQueueWorker');
        stopWorker();
      } catch (err) {
        // ignore
      }

      server.close(() => {
        logger.info('✅ HTTP server closed');
        process.exit(0);
      });
      setTimeout(() => {
        logger.error('Force shutdown after timeout');
        process.exit(1);
      }, 10_000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

  } catch (err) {
    logger.error('Failed to start server:', { message: err.message });
    process.exit(1);
  }
};

start();
