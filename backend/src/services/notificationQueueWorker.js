// backend/src/services/notificationQueueWorker.js
const { sequelize } = require('../config/database');
const { sendPushToUsers } = require('./pushNotificationService');
const logger = require('../utils/logger');

let workerIntervalId = null;
let isPolling = false;

// Helper database queries using raw SQL to avoid model complexity
async function getUserName(userId) {
  try {
    const rows = await sequelize.query('SELECT full_name FROM users WHERE id = :userId LIMIT 1', {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT
    });
    return rows && rows.length > 0 ? rows[0].full_name : 'Thành viên';
  } catch (err) {
    logger.error('Error fetching user name in queue worker:', err);
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
    logger.error('Error fetching group name in queue worker:', err);
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
    logger.error('Error fetching group members in queue worker:', err);
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
    logger.error('Error fetching group creator in queue worker:', err);
    return null;
  }
}

/**
 * Process a single notification queue item
 */
async function processQueueItem(item) {
  const { table_name: table, op_type: type, record, old_record } = item;
  
  logger.debug(`Processing queue notification: ID=${item.id}, table=${table}, type=${type}`);

  switch (table) {
    case 'messages': {
      if (type === 'INSERT') {
        const senderName = await getUserName(record.sender_id);
        
        // Ignore chat background messages
        if (record.content && record.content.startsWith('[chat_background]:')) return;

        let displayContent = record.content || 'Đã gửi một tệp đính kèm';
        if (displayContent.startsWith('data:image') || (displayContent.startsWith('http') && displayContent.match(/\.(jpeg|jpg|gif|png)/i))) {
          displayContent = 'Đã gửi một ảnh';
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
          body: `${senderName} muốn kết bạn với bạn.`,
          data: { type: 'friendreq', requestId: String(record.id) }
        });
      } else if (type === 'UPDATE' && old_record && old_record.status === 'pending' && record.status === 'accepted') {
        // Friend request accepted
        const receiverName = await getUserName(record.to_user_id);
        await sendPushToUsers(record.from_user_id, {
          title: 'Kết bạn thành công',
          body: `${receiverName} đã đồng ý lời mời kết bạn.`,
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
          body: `${senderName} mời bạn tham gia nhóm "${groupName}".`,
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
            title: 'Yêu cầu tham gia',
            body: `${requesterName} xin gia nhập nhóm "${groupName}".`,
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
          title: 'Lịch học nhóm mới',
          body: `Nhóm "${groupName}" học: ${record.topic} · ${formattedTime}`,
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
            title: 'Hạn nộp mới',
            body: `Giao cho bạn · ${record.title} (Hạn: ${formattedTime})`,
            data: { type: 'deadline', groupId: String(record.group_id) }
          });
        } else {
          const members = await getGroupMembers(record.group_id, 0);
          await sendPushToUsers(members, {
            title: 'Hạn nộp mới',
            body: `Cả nhóm · ${record.title} (Hạn: ${formattedTime})`,
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
          body: `${uploaderName} đã chia sẻ "${record.file_name}" tại "${groupName}".`,
          data: { type: 'fileupload', groupId: String(record.group_id) }
        });
      }
      break;
    }

    case 'call_signals': {
      if (type === 'INSERT') {
        const callerName = await getUserName(record.caller_id);
        await sendPushToUsers(record.receiver_id, {
          title: 'Cuộc gọi đến',
          body: `${callerName} đang gọi cho bạn. Nhấp để tham gia.`,
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
      logger.debug(`Queue worker: Unhandled table: ${table}`);
  }
}

/**
 * Polls the database and processes pending notifications
 */
async function pollAndProcess(source = 'fallback') {
  if (isPolling) return;
  isPolling = true;

  const transaction = await sequelize.transaction();
  try {
    // 1. Fetch pending items using FOR UPDATE SKIP LOCKED
    const [items] = await sequelize.query(`
      SELECT id, table_name, op_type, record, old_record, status, attempts
      FROM public.notification_queue
      WHERE status = 'pending' AND attempts < 5
      ORDER BY id ASC
      LIMIT 10
      FOR UPDATE SKIP LOCKED;
    `, { transaction });

    if (items.length === 0) {
      await transaction.commit();
      isPolling = false;
      return;
    }

    logger.info(`Notification queue worker: found ${items.length} pending items to process (source: ${source})`);

    // 2. Mark fetched items as processing in transaction
    const ids = items.map(item => item.id);
    await sequelize.query(`
      UPDATE public.notification_queue
      SET status = 'processing', attempts = attempts + 1
      WHERE id IN (:ids)
    `, { replacements: { ids }, transaction });

    await transaction.commit();

    // 3. Process each item in isolation
    for (const item of items) {
      try {
        await processQueueItem(item);
        
        // Mark as completed
        await sequelize.query(`
          UPDATE public.notification_queue
          SET status = 'completed', processed_at = NOW()
          WHERE id = :id
        `, { replacements: { id: item.id } });
      } catch (err) {
        logger.error(`Error processing queue item ${item.id}:`, err);
        // Mark as failed
        await sequelize.query(`
          UPDATE public.notification_queue
          SET status = 'failed', error_message = :err
          WHERE id = :id
        `, { replacements: { id: item.id, err: err.message || String(err) } });
      }
    }
  } catch (err) {
    try {
      await transaction.rollback();
    } catch (e) {
      // ignore
    }
    logger.error(`Error in notification queue poll (source: ${source}):`, err);
  } finally {
    isPolling = false;
  }
}

/**
 * Performs cleanup of stuck processing jobs (older than 5 minutes)
 */
async function cleanupStuckJobs() {
  try {
    const [res] = await sequelize.query(`
      UPDATE public.notification_queue
      SET status = 'pending'
      WHERE status = 'processing' AND created_at < NOW() - INTERVAL '5 minutes'
    `);
    if (res && res.affectedRows > 0) {
      logger.info(`Cleaned up ${res.affectedRows} stuck processing jobs in notification queue.`);
    }
  } catch (err) {
    logger.error('Error cleaning up stuck jobs:', err);
  }
}

/**
 * Starts the background queue worker
 */
function startWorker(intervalMs = 3000) {
  if (workerIntervalId) {
    logger.warn('Notification queue worker already running.');
    return;
  }

  logger.info(`Starting notification queue worker (polling every ${intervalMs}ms)...`);
  
  // Set up execution interval
  workerIntervalId = setInterval(async () => {
    await pollAndProcess('fallback');
  }, intervalMs);

  // Set up stuck jobs cleanup interval (every 5 minutes)
  setInterval(async () => {
    await cleanupStuckJobs();
  }, 5 * 60 * 1000);

  // Run initial poll
  pollAndProcess('startup');
}

/**
 * Stops the background queue worker
 */
function stopWorker() {
  if (workerIntervalId) {
    clearInterval(workerIntervalId);
    workerIntervalId = null;
    logger.info('Notification queue worker stopped.');
  }
}

module.exports = {
  startWorker,
  stopWorker,
  pollAndProcess
};
