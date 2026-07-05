// backend/src/config/firebase.js
const { initializeApp, cert } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
const logger = require('../utils/logger');
require('dotenv').config();

let firebaseMessaging = null;

try {
  const cleanEnvVar = (val) => {
    if (!val) return val;
    let cleaned = val.trim();
    if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || 
        (cleaned.startsWith('\'') && cleaned.endsWith('\''))) {
      cleaned = cleaned.slice(1, -1);
    }
    return cleaned.trim();
  };

  let projectId = cleanEnvVar(process.env.FIREBASE_PROJECT_ID);
  let clientEmail = cleanEnvVar(process.env.FIREBASE_CLIENT_EMAIL);
  let privateKey = cleanEnvVar(process.env.FIREBASE_PRIVATE_KEY);

  if (projectId && clientEmail && privateKey) {
    // Handle formatting of private key (newline characters)
    privateKey = privateKey.replace(/\\n/g, '\n');

    const app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    
    firebaseMessaging = getMessaging(app);
    logger.info('Firebase Admin SDK initialized successfully 🔔');
  } else {
    logger.warn('Firebase Admin SDK credentials missing. Push notifications are disabled in this environment.');
  }
} catch (error) {
  logger.error('Firebase Admin SDK initialization failed:', { message: error.message });
}

module.exports = { firebaseMessaging };
