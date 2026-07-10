
export default function LikeCommentBar({ isLiked, likedEmoji, showComments, onLike, onToggleComments }) {
  return (
    <div style={{ display: 'flex', padding: '4px 10px', borderTop: '1px solid var(--border)' }}>

      {/* Heart (Like) Button */}
      <div style={{ flex: 1 }}>
        <button
          onClick={(e) => onLike(isLiked ? null : '❤️', e)}
          style={{
            width: '100%',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '9px 4px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 600,
            color: isLiked ? '#ef4444' : 'var(--text-muted)',
            transition: 'background 0.15s, color 0.15s',
            fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-input)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
        >
          {isLiked ? (
            /* Filled heart */
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          ) : (
            /* Outline heart */
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          )}
          Thích
        </button>
      </div>

      {/* Comment Toggle Button */}
      <button
        onClick={onToggleComments}
        style={{
          flex: 1,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          padding: '9px 4px',
          borderRadius: '10px',
          fontSize: '13px',
          fontWeight: 600,
          color: showComments ? 'var(--text-primary)' : 'var(--text-muted)',
          transition: 'background 0.15s, color 0.15s',
          fontFamily: 'inherit',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-input)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        Bình luận
      </button>
    </div>
  );
}
