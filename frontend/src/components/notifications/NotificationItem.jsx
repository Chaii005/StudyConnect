import { timeAgo } from '@/utils';

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
  const isActionable = n.type !== 'groupinvite' && n.type !== 'friendreq' && n.type !== 'joinrequest';

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
        {n.title}
      </div>

      {n.body && (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 4 }}>
          {n.body}
        </div>
      )}

      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
        {timeAgo(n.createdAt)}
      </div>

      {isUrgentDeadline && (
        <button
          onClick={() => onActionClick(n)}
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
            onClick={() => onAccept(n)}
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
            onClick={() => onDecline(n)}
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
            onClick={() => onAcceptFriend(n)}
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
            onClick={() => onDeclineFriend(n)}
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
            onClick={() => onAcceptJoinRequest(n)}
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
            onClick={() => onDeclineJoinRequest(n)}
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
