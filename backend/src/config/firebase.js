// backend/src/config/firebase.js
const admin = require('firebase-admin');
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

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    
    firebaseMessaging = admin.messaging();
    logger.info('Firebase Admin SDK initialized successfully 🔔');
  } else {
    logger.warn('Firebase Admin SDK credentials missing. Push notifications are disabled in this environment.');
  }
} catch (error) {
  logger.error('Firebase Admin SDK initialization failed:', { message: error.message });
}

module.exports = { admin, firebaseMessaging };
