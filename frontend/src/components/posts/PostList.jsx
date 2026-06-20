import PostCard from './PostCard';

export default function PostList({ posts, currentUser, onLike, onDelete, onComment, onPin }) {
  if (!posts || posts.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '48px 24px',
          color: 'var(--text-muted)',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '18px',
          fontSize: '14px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px'
        }}
      >
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style={{ marginBottom: '8px' }}>
          <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" fill="rgba(108,99,255,0.15)" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M16.1 16a6 6 0 1 0-2.2 2.2L13 20Z" fill="rgba(62,207,207,0.1)" stroke="var(--primary-light)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 8a1.5 1.5 0 1 1 2 2c-.5.5-.5 1-.5 1.5" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="9.5" cy="14" r="0.75" fill="var(--primary)" />
        </svg>
        <span>Chưa có câu hỏi nào. Hãy là người đầu tiên đặt câu hỏi!</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          currentUser={currentUser}
          onLike={onLike}
          onDelete={onDelete}
          onComment={onComment}
          onPin={onPin}
        />
      ))}
    </div>
  );
}
