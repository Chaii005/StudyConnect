// backend/scripts/test_push.js
require('dotenv').config();
const { firebaseMessaging } = require('../src/config/firebase');
const { sendPushToUsers } = require('../src/services/pushNotificationService');
const UserPushToken = require('../src/models/UserPushToken');

async function main() {
  if (!firebaseMessaging) {
    console.error('Firebase messaging not initialized! Check credentials in .env.');
    return;
  }

  console.log('Firebase initialized successfully.');

  // Create a mock token for user_id 15 (Hai Huynh) to test upsert and notification send
  const mockToken = 'fcm_mock_token_1234567890_test_antigravity';
  
  try {
    // 1. Test database upsert
    console.log('Inserting mock token...');
    await UserPushToken.upsert({
      user_id: 15,
      device_token: mockToken,
      platform: 'android'
    });
    console.log('Mock token upserted successfully.');

    // 2. Test send
    console.log('Sending test push to user 15...');
    await sendPushToUsers(15, {
      title: 'Chào mừng từ StudyConnect',
      body: 'Đây là tin nhắn kiểm tra hệ thống thông báo đẩy!',
      data: { type: 'test' }
    });

    // 3. Clean up mock token
    console.log('Cleaning up mock token...');
    await UserPushToken.destroy({
      where: { device_token: mockToken }
    });
    console.log('Cleanup done.');

  } catch (err) {
    console.error('Error during test:', err);
  }
}

main();
