import { timeAgo } from '@/utils';

function stripEmojis(str) {
  if (!str || typeof str !== 'string') return str;
  return str
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, '')
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
    .replace(/[\u{1F000}-\u{1F02F}]/gu, '')
    .replace(/[\u{1F0A0}-\u{1F0FF}]/gu, '')
    .replace(/[\u{1F100}-\u{1F1FF}]/gu, '')
    .replace(/[\u{1F200}-\u{1F2FF}]/gu, '')
    .replace(/[\u{1FA00}-\u{1FAFF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function NotificationItem({
  notification: n,
  isUnread,
  isProcessing,
  onAccept,
  onDecline,
  onAcceptFriend,
  onDeclineFriend,
  onAcceptJoinRequest,
  onDeclineJoinRequest,
  onActionClick
}) {
  const isInvite = n.type === 'groupinvite';
  const isUrgentDeadline = n.type === 'deadline-urgent';
  const isActionable = true;

  return (
    <div
      onClick={() => { if (isActionable) onActionClick(n); }}
      style={{
        padding: '12px 18px',
        borderBottom: '1px solid var(--border)',
        background: isUrgentDeadline
          ? (isUnread ? 'rgba(239,68,68,0.07)' : 'rgba(239,68,68,0.03)')
          : (isUnread ? 'rgba(0,0,0,0.025)' : 'transparent'),
        cursor: isActionable ? 'pointer' : 'default',
        transition: 'background 0.15s',
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: (isUnread || isUrgentDeadline) ? 700 : 500,
          color: isUrgentDeadline ? '#ef4444' : 'var(--text-primary)',
          marginBottom: 3,
          lineHeight: 1.4,
        }}
      >
        {stripEmojis(n.title)}
      </div>

      {n.body && (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 4 }}>
          {stripEmojis(n.body)}
        </div>
      )}

      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
        {timeAgo(n.createdAt)}
      </div>

      {isUrgentDeadline && (
        <button
          onClick={(e) => { e.stopPropagation(); onActionClick(n); }}
          style={{
            marginTop: 8,
            padding: '5px 14px',
            borderRadius: 8,
            border: 'none',
            background: 'rgba(239,68,68,0.85)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 12,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Nộp bài ngay
        </button>
      )}

      {isInvite && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button
            onClick={(e) => { e.stopPropagation(); onAccept(n); }}
            disabled={!!isProcessing}
            style={{
              padding: '5px 14px', borderRadius: 8, border: 'none',
              background: isProcessing === 'accepting' ? 'rgba(34,197,94,0.4)' : 'rgba(34,197,94,0.85)',
              color: '#fff', fontWeight: 700, fontSize: 12,
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              opacity: isProcessing ? 0.7 : 1, transition: 'all 0.15s', fontFamily: 'inherit',
            }}
          >
            {isProcessing === 'accepting' ? '...' : 'Chấp nhận'}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDecline(n); }}
            disabled={!!isProcessing}
            style={{
              padding: '5px 14px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 12,
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              opacity: isProcessing ? 0.7 : 1, transition: 'all 0.15s', fontFamily: 'inherit',
            }}
          >
            {isProcessing === 'declining' ? '...' : 'Từ chối'}
          </button>
        </div>
      )}

      {n.type === 'friendreq' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button
            onClick={(e) => { e.stopPropagation(); onAcceptFriend(n); }}
            disabled={!!isProcessing}
            style={{
              padding: '5px 14px', borderRadius: 8, border: 'none',
              background: isProcessing === 'accepting' ? 'rgba(34,197,94,0.4)' : 'rgba(34,197,94,0.85)',
              color: '#fff', fontWeight: 700, fontSize: 12,
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              opacity: isProcessing ? 0.7 : 1, transition: 'all 0.15s', fontFamily: 'inherit',
            }}
          >
            {isProcessing === 'accepting' ? '...' : 'Chấp nhận'}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDeclineFriend(n); }}
            disabled={!!isProcessing}
            style={{
              padding: '5px 14px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 12,
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              opacity: isProcessing ? 0.7 : 1, transition: 'all 0.15s', fontFamily: 'inherit',
            }}
          >
            {isProcessing === 'declining' ? '...' : 'Từ chối'}
          </button>
        </div>
      )}

      {n.type === 'joinrequest' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button
            onClick={(e) => { e.stopPropagation(); onAcceptJoinRequest(n); }}
            disabled={!!isProcessing}
            style={{
              padding: '5px 14px', borderRadius: 8, border: 'none',
              background: isProcessing === 'accepting' ? 'rgba(34,197,94,0.4)' : 'rgba(34,197,94,0.85)',
              color: '#fff', fontWeight: 700, fontSize: 12,
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              opacity: isProcessing ? 0.7 : 1, transition: 'all 0.15s', fontFamily: 'inherit',
            }}
          >
            {isProcessing === 'accepting' ? '...' : 'Duyệt'}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDeclineJoinRequest(n); }}
            disabled={!!isProcessing}
            style={{
              padding: '5px 14px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 12,
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              opacity: isProcessing ? 0.7 : 1, transition: 'all 0.15s', fontFamily: 'inherit',
            }}
          >
            {isProcessing === 'declining' ? '...' : 'Từ chối'}
          </button>
        </div>
      )}
    </div>
  );
}
