// backend/config/database.js
const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');
require('dotenv').config();

const cleanEnvVar = (val) => {
  if (!val) return val;
  let cleaned = val.trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || 
      (cleaned.startsWith('\'') && cleaned.endsWith('\''))) {
    cleaned = cleaned.slice(1, -1);
  }
  return cleaned.trim();
};

const dbName = cleanEnvVar(process.env.DB_NAME) || 'postgres';
const dbUser = cleanEnvVar(process.env.DB_USER) || 'postgres';
const dbPassword = cleanEnvVar(process.env.DB_PASSWORD || process.env.DB_PASS) || '';
const dbHost = cleanEnvVar(process.env.DB_HOST) || 'localhost';
const dbPort = parseInt(cleanEnvVar(process.env.DB_PORT) || '6543', 10);

const sequelize = new Sequelize(
  dbName,
  dbUser,
  dbPassword,
  {
    host:    dbHost,
    port:    dbPort,
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: { max: 10, min: 2, acquire: 30000, idle: 10000 },
  }
);

const connectDB = async () => {
  try {
    console.log(`[DIAGNOSTIC] Attempting database connection to Host: ${dbHost}, Port: ${dbPort}, User: ${dbUser}, DB Name: ${dbName}`);
    await sequelize.authenticate();
    logger.info('Database connected successfully');
    if (process.env.DB_SYNC === 'true' && process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ force: false });
      logger.info('Database models synchronized');
    }
  } catch (error) {
    logger.error('Database connection failed:', {
      message: error.message
    });
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
