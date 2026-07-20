// backend/src/services/pushNotificationService.js
const { firebaseMessaging } = require('../config/firebase');
const UserPushToken = require('../models/UserPushToken');
const logger = require('../utils/logger');

/**
 * Sends a push notification to specific user(s)
 * @param {number|number[]} userIds - User ID or array of User IDs
 * @param {object} payload - Notification payload { title, body, data }
 */
const sendPushToUsers = async (userIds, { title, body, data = {} }) => {
  if (!firebaseMessaging) {
    logger.debug('Push Notifications are disabled (FCM not initialized).');
    return;
  }

  const ids = Array.isArray(userIds) ? userIds : [userIds];
  if (ids.length === 0) return;

  try {
    // Find all device tokens for these users
    const tokensRecord = await UserPushToken.findAll({
      where: { user_id: ids }
    });

    if (tokensRecord.length === 0) {
      logger.debug(`No device tokens registered for users: ${ids.join(', ')}`);
      return;
    }

    const tokens = tokensRecord.map(t => t.device_token);

    const isCall = data && data.type === 'incoming_call';
    const channelId = isCall ? 'calls' : 'default';

    // Build FCM multicast message
    const message = {
      notification: {
        title,
        body
      },
      data: {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK', // standard compatibility
      },
      android: {
        priority: 'high',
        notification: {
          channelId,
          sound: 'default',
          defaultSound: true,
          defaultVibrateTimings: true,
          priority: isCall ? 'MAX' : 'HIGH',
          visibility: 'PUBLIC',
          ...(isCall ? {
            category: 'call',
            sticky: true,
            // Android vibration pattern for calls: 1s vibrate, 0.5s pause
            vibrateTimings: ['0s', '1s', '0.5s', '1s', '0.5s', '1s', '0.5s', '1s', '0.5s', '1s']
          } : {})
        }
      },
      tokens
    };

    const response = await firebaseMessaging.sendEachForMulticast(message);
    
    // Prune invalid tokens
    const invalidTokens = [];
    response.responses.forEach((res, index) => {
      if (!res.success) {
        const error = res.error;
        if (
          error.code === 'messaging/invalid-registration-token' ||
          error.code === 'messaging/registration-token-not-registered'
        ) {
          invalidTokens.push(tokens[index]);
        }
        logger.error(`FCM send failure for token index ${index}:`, { code: error.code, message: error.message });
      }
    });

    if (invalidTokens.length > 0) {
      await UserPushToken.destroy({
        where: { device_token: invalidTokens }
      });
      logger.info(`Pruned ${invalidTokens.length} expired or invalid device tokens.`);
    }

    logger.info(`Push notification sent successfully to ${response.successCount} devices.`);
  } catch (error) {
    logger.error('Error sending multicast push notification:', { message: error.message });
  }
};

module.exports = {
  sendPushToUsers
};
