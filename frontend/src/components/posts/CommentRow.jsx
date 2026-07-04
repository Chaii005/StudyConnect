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
    <div className="comment-row-animated" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
      <Avatar src={c.userAvatar} initial={c.userFullName || 'U'} size={32} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ 
          background: 'var(--bg-input)', 
          border: '1px solid var(--border)', 
          borderRadius: '14px', 
          padding: '10px 14px',
          boxShadow: '2px 2px 0px var(--border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', gap: '8px' }}>
            <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--text-primary)' }}>
              {c.userFullName}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{timeAgo(c.createdAt)}</span>
          </div>
          {c.replyToName && (
            <div style={{ 
              fontSize: '11px', 
              color: 'var(--text-primary)', 
              fontWeight: 700, 
              marginBottom: '6px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px',
              background: 'rgba(0, 0, 0, 0.05)',
              padding: '2px 8px',
              borderRadius: '6px',
              width: 'fit-content'
            }}>
              <ReplyIcon /> Trả lời <strong style={{ textDecoration: 'underline' }}>{c.replyToName}</strong>
            </div>
          )}
          <div style={{ 
            fontSize: '13.5px', 
            color: 'var(--text-primary)', 
            lineHeight: 1.5, 
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>{c.content}</div>
        </div>
        {/* Action row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '4px 8px 0' }}>
          <button
            onClick={onReply}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '11.5px',
              fontWeight: 800,
              padding: '2px 0',
              color: 'var(--text-secondary)',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            <ReplyIcon /> Trả lời
          </button>
        </div>
      </div>
    </div>
  );
}
