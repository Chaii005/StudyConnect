// backend/scripts/sync_db.js
require('dotenv').config();
const { sequelize, connectDB } = require('../src/config/database');
const logger = require('../src/utils/logger');

// Load models
require('../src/models/User');
require('../src/models/UserPushToken');

const sync = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connected successfully for sync');
    
    // Sync models
    await sequelize.sync({ alter: true });
    logger.info('Database models synchronized successfully (alter: true)');
    process.exit(0);
  } catch (error) {
    logger.error('Failed to sync database models:', error);
    process.exit(1);
  }
};

sync();
