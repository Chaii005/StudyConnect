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

    // Ensure all data payload values are stringified for FCM specification compliance
    const stringifiedData = {};
    if (data && typeof data === 'object') {
      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && data[key] !== null) {
          stringifiedData[key] = String(data[key]);
        }
      });
    }

    // Build FCM multicast message
    const message = {
      notification: {
        title,
        body
      },
      data: {
        ...stringifiedData,
        click_action: 'FLUTTER_NOTIFICATION_CLICK', // standard compatibility
      },
      android: {
        priority: 'high',
        notification: {
          channelId,
          sound: 'default',
          defaultSound: true,
          defaultVibrateTimings: true,
          notificationPriority: isCall ? 'PRIORITY_MAX' : 'PRIORITY_HIGH',
          visibility: 'PUBLIC',
          ...(isCall ? {
            sticky: true,
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
