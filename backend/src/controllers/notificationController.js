// backend/src/controllers/notificationController.js
const express = require('express');
const { sequelize } = require('../config/database');
const { sendPushToUsers } = require('../services/pushNotificationService');
const logger = require('../utils/logger');
const { apiError, apiSuccess } = require('../utils/apiResponse');

const router = express.Router();

// Helper database queries using raw SQL to avoid model complexity
async function getUserName(userId) {
  try {
    const rows = await sequelize.query('SELECT full_name FROM users WHERE id = :userId LIMIT 1', {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT
    });
    return rows && rows.length > 0 ? rows[0].full_name : 'Thành viên';
  } catch (err) {
    logger.error('Error fetching user name:', err);
    return 'Thành viên';
  }
}

async function getGroupName(groupId) {
  try {
    const rows = await sequelize.query('SELECT name FROM study_groups WHERE id = :groupId LIMIT 1', {
      replacements: { groupId },
      type: sequelize.QueryTypes.SELECT
    });
    return rows && rows.length > 0 ? rows[0].name : 'Nhóm học';
  } catch (err) {
    logger.error('Error fetching group name:', err);
    return 'Nhóm học';
  }
}

async function getGroupMembers(groupId, excludeUserId) {
  try {
    const rows = await sequelize.query('SELECT user_id FROM group_members WHERE group_id = :groupId AND user_id != :excludeUserId', {
      replacements: { groupId, excludeUserId },
      type: sequelize.QueryTypes.SELECT
    });
    return rows.map(r => r.user_id);
  } catch (err) {
    logger.error('Error fetching group members:', err);
    return [];
  }
}

async function getGroupCreator(groupId) {
  try {
    const rows = await sequelize.query('SELECT creator_id FROM study_groups WHERE id = :groupId LIMIT 1', {
      replacements: { groupId },
      type: sequelize.QueryTypes.SELECT
    });
    return rows && rows.length > 0 ? rows[0].creator_id : null;
  } catch (err) {
    logger.error('Error fetching group creator:', err);
    return null;
  }
}

// POST /api/notifications/webhook
router.post('/webhook', async (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const expectedSecret = process.env.WEBHOOK_SECRET;

  if (expectedSecret && signature !== expectedSecret) {
    return res.status(401).json(apiError('Webhook signature invalid', 401));
  }

  const { type, table, record, old_record } = req.body;

  if (!table || !record) {
    return res.status(400).json(apiError('Payload không hợp lệ', 400));
  }

  // Handle asynchronous notifications processing to return 200 OK immediately to Supabase
  res.status(200).json(apiSuccess(null, 'Webhook received'));

  // Run async handler
  (async () => {
    try {
      logger.info(`Processing Supabase Webhook: table=${table}, type=${type}`);
      
      switch (table) {
        case 'messages': {
          if (type === 'INSERT') {
            const senderName = await getUserName(record.sender_id);
            
            // Ignore chat background messages
            if (record.content && record.content.startsWith('[chat_background]:')) return;

            let displayContent = record.content || 'Đã gửi một tệp đính kèm';
            if (displayContent.startsWith('data:image') || (displayContent.startsWith('http') && displayContent.match(/\.(jpeg|jpg|gif|png)/i))) {
              displayContent = '📷 Đã gửi một ảnh';
            }

            if (record.receiver_id) {
              // Private message
              await sendPushToUsers(record.receiver_id, {
                title: `Tin nhắn từ ${senderName}`,
                body: displayContent,
                data: { type: 'privatemsg', senderId: String(record.sender_id) }
              });
            } else if (record.group_id) {
              // Group message
              const groupName = await getGroupName(record.group_id);
              const members = await getGroupMembers(record.group_id, record.sender_id);
              
              await sendPushToUsers(members, {
                title: `${senderName} • ${groupName}`,
                body: displayContent,
                data: { type: 'groupmsg', groupId: String(record.group_id) }
              });
            }
          }
          break;
        }

        case 'friendships': {
          if (type === 'INSERT' && record.status === 'pending') {
            // Friend request sent
            const senderName = await getUserName(record.from_user_id);
            await sendPushToUsers(record.to_user_id, {
              title: 'Lời mời kết bạn',
              body: `${senderName} muốn kết bạn với bạn`,
              data: { type: 'friendreq', requestId: String(record.id) }
            });
          } else if (type === 'UPDATE' && old_record && old_record.status === 'pending' && record.status === 'accepted') {
            // Friend request accepted
            const receiverName = await getUserName(record.to_user_id);
            await sendPushToUsers(record.from_user_id, {
              title: 'Kết bạn thành công',
              body: `${receiverName} đã đồng ý lời mời kết bạn của bạn`,
              data: { type: 'friendaccept' }
            });
          }
          break;
        }

        case 'group_invites': {
          if (type === 'INSERT' && record.status === 'pending') {
            const senderName = await getUserName(record.inviter_id);
            const groupName = await getGroupName(record.group_id);
            await sendPushToUsers(record.invitee_id, {
              title: 'Lời mời vào nhóm',
              body: `${senderName} mời bạn tham gia nhóm "${groupName}"`,
              data: { type: 'groupinvite', inviteId: String(record.id), groupId: String(record.group_id) }
            });
          }
          break;
        }

        case 'group_join_requests': {
          if (type === 'INSERT' && record.status === 'pending') {
            const requesterName = await getUserName(record.user_id);
            const groupName = await getGroupName(record.group_id);
            const creatorId = await getGroupCreator(record.group_id);
            if (creatorId) {
              await sendPushToUsers(creatorId, {
                title: 'Yêu cầu tham gia nhóm',
                body: `${requesterName} xin tham gia nhóm học tập "${groupName}"`,
                data: { type: 'joinrequest', requestId: String(record.id), groupId: String(record.group_id) }
              });
            }
          }
          break;
        }

        case 'schedules': {
          if (type === 'INSERT') {
            const groupName = await getGroupName(record.group_id);
            const members = await getGroupMembers(record.group_id, 0); // push to all members
            const formattedTime = record.date_time ? new Date(record.date_time).toLocaleString('vi-VN') : '';
            await sendPushToUsers(members, {
              title: `Lịch học mới: "${record.topic}"`,
              body: `Nhóm ${groupName} • ${formattedTime}`,
              data: { type: 'schedule', groupId: String(record.group_id) }
            });
          }
          break;
        }

        case 'deadlines': {
          if (type === 'INSERT' && !record.completed) {
            const groupName = await getGroupName(record.group_id);
            const formattedTime = record.due_date ? new Date(record.due_date).toLocaleString('vi-VN') : '';
            
            if (record.assignee_id) {
              await sendPushToUsers(record.assignee_id, {
                title: `Deadline mới: "${record.title}"`,
                body: `Giao cho bạn • Nhóm ${groupName} • Hạn: ${formattedTime}`,
                data: { type: 'deadline', groupId: String(record.group_id) }
              });
            } else {
              const members = await getGroupMembers(record.group_id, 0);
              await sendPushToUsers(members, {
                title: `Deadline nhóm mới: "${record.title}"`,
                body: `Cả nhóm • Nhóm ${groupName} • Hạn: ${formattedTime}`,
                data: { type: 'deadline', groupId: String(record.group_id) }
              });
            }
          }
          break;
        }

        case 'files': {
          if (type === 'INSERT') {
            const uploaderName = await getUserName(record.user_id);
            const groupName = await getGroupName(record.group_id);
            const members = await getGroupMembers(record.group_id, record.user_id);
            await sendPushToUsers(members, {
              title: 'Tài liệu nhóm mới',
              body: `${uploaderName} đã tải lên tài liệu "${record.file_name}" trong nhóm "${groupName}"`,
              data: { type: 'fileupload', groupId: String(record.group_id) }
            });
          }
          break;
        }

        case 'call_signals': {
          if (type === 'INSERT') {
            const callerName = await getUserName(record.caller_id);
            await sendPushToUsers(record.receiver_id, {
              title: `Cuộc gọi đến từ ${callerName}`,
              body: `Nhấp để tham gia cuộc gọi`,
              data: {
                type: 'incoming_call',
                callId: record.call_id,
                callerId: String(record.caller_id),
                callerName: callerName
              }
            });
          }
          break;
        }

        default:
          logger.debug(`Unhandled table webhook: ${table}`);
      }
    } catch (err) {
      logger.error('Error handling notification webhook:', err);
    }
  })();
});

module.exports = router;
