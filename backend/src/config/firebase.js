// backend/src/config/firebase.js
const { initializeApp, cert } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
const logger = require('../utils/logger');
require('dotenv').config();

let firebaseMessaging = null;

try {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

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
