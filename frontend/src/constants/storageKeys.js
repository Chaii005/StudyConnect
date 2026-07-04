// src/constants/storageKeys.js
// Tập trung tất cả localStorage keys — tránh hardcode rải rác

export const STORAGE_KEYS = {
  // Auth
  SESSION: 'sc_session',
  ADMIN_SESSION: 'sc_admin_session',

  // Notifications
  NOTIF_SEEN: 'sc_notif_seen',

  // Submissions (dynamic — append groupId)
  submissions: (groupId) => `sc_submissions_${groupId}`,

  // Group chat last-seen timestamp (dynamic — append groupId + userId)
  chatLastSeen: (groupId, userId) => `sc_chat_last_seen_${groupId}_${userId}`,
};
