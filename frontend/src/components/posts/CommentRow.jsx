import Avatar from '@/components/common/Avatar';
import { timeAgo } from '@/utils';

const ReplyIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      color: 'var(--text-primary)',
      display: 'inline-block',
      verticalAlign: 'middle'
    }}
  >
    <polyline points="9 17 4 12 9 7" />
    <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
  </svg>
);

export default function CommentRow({ comment: c, onReply }) {
  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
      <Avatar src={c.userAvatar} initial={c.userFullName || 'U'} size={30} />
      <div style={{ flex: 1 }}>
        <div style={{ background: 'var(--bg-input)', borderRadius: '12px', padding: '8px 12px' }}>
          <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-primary)', marginBottom: '2px' }}>
            {c.userFullName}
          </div>
          {c.replyToName && (
            <div style={{ fontSize: '11px', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ReplyIcon /> Trả lời <strong>{c.replyToName}</strong>
            </div>
          )}
          <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5 }}>{c.content}</div>
        </div>
        {/* Action row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '3px 6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{timeAgo(c.createdAt)}</span>

          <button
            onClick={onReply}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 700,
              padding: '2px 0',
              color: 'var(--text-muted)',
              fontFamily: 'inherit',
            }}
          >
            Trả lời
          </button>
        </div>
      </div>
    </div>
  );
}
