import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Avatar from '@/components/common/Avatar';
import { timeAgo } from '@/utils';
import LikeCommentBar from './LikeCommentBar';
import CommentRow from './CommentRow';

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

export default function PostCard({ post, currentUser, onLike, onDelete, onComment, onEdit }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState(null); // { id, name }
  const [expanded, setExpanded] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(post?.content || '');
  const commentsEndRef = useRef(null);

  const scrollToBottom = () => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollTo({
        top: commentsEndRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    if (showComments) {
      setTimeout(scrollToBottom, 100);
    }
  }, [post?.comments?.length, showComments]);

  useEffect(() => {
    setEditText(post?.content || '');
  }, [post?.content]);

  // ── Clean up tagged names from text content for rendering ──
  let renderContent = post?.content || '';
  if (Array.isArray(post?.taggedUserNames)) {
    post.taggedUserNames.forEach((name) => {
      const escapedName = name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`@${escapedName}\\s?`, 'gi');
      renderContent = renderContent.replace(regex, '');
    });
  }
  if (Array.isArray(post?.taggedGroupNames)) {
    post.taggedGroupNames.forEach((name) => {
      const escapedName = name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`@${escapedName}\\s?`, 'gi');
      renderContent = renderContent.replace(regex, '');
    });
  }
  renderContent = renderContent.trim();

  const isLong = renderContent.length > 200;
  const myLike = Array.isArray(post?.likes)
    ? post.likes.find((l) => (typeof l === 'object' ? String(l.userId) : String(l)) === String(currentUser?.id))
    : null;
  const isLiked = !!myLike;
  const likedEmoji = typeof myLike === 'object' ? myLike?.emoji : null;
  const isOwner = post?.userId === currentUser?.id;
  const profileUrl = isOwner ? '/profile' : `/friends/${post.userId}`;

  const handleComment = () => {
    if (!commentText.trim()) return;
    const finalText = commentText.trim();
    onComment(post.id, finalText, replyTo ? { id: replyTo.id, name: replyTo.name } : null);
    setCommentText('');
    setReplyTo(null);
    setTimeout(scrollToBottom, 120);
  };

  const handleSave = async () => {
    if (!editText.trim()) return;
    try {
      if (onEdit) {
        await onEdit(post.id, editText.trim());
      }
      setIsEditing(false);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Lỗi khi sửa bài viết:', err);
    }
  };

  const handleCancel = () => {
    setEditText(post?.content || '');
    setIsEditing(false);
  };



  return (
    <article
      style={{
        background: 'var(--bg-card)',
        border: '1.5px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        marginBottom: '14px',
        overflow: 'hidden',
        transition: 'border-color 0.25s, box-shadow 0.25s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(42, 117, 118, 0.35)';
        e.currentTarget.style.boxShadow = '0 4px 24px rgba(42, 117, 118, 0.06)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Author row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 18px 0' }}>
        <Link to={profileUrl} style={{ textDecoration: 'none' }}>
          <Avatar src={post.userAvatar} initial={post.userFullName || 'U'} size={46} />
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Link to={profileUrl} style={{ textDecoration: 'none' }}>
              <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', cursor: 'pointer' }}
                onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
              >
                {post.userFullName}
              </span>
            </Link>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '6px',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.2)',
              }}
            >
              Thông báo
            </span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>
            {timeAgo(post.createdAt)}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          {isOwner && !isEditing && (
            <>
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  fontSize: '12px',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  transition: 'color 0.15s, background 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.background = 'rgba(0, 0, 0, 0.03)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-muted)';
                  e.currentTarget.style.background = 'none';
                }}
              >
                Sửa
              </button>
              <button
                onClick={() => onDelete(post.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#ef4444',
                  fontSize: '12px',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  transition: 'color 0.15s, background 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#dc2626';
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#ef4444';
                  e.currentTarget.style.background = 'none';
                }}
              >
                Xóa
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '12px 18px 14px' }}>
        {isEditing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '12px 16px',
                background: 'var(--bg-input)',
                border: '1.5px solid var(--border)',
                borderRadius: '12px',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                fontSize: '15px',
                lineHeight: 1.6,
                outline: 'none',
                resize: 'vertical',
                transition: 'border-color 0.25s, box-shadow 0.25s',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(42, 117, 118, 0.15)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              placeholder="Nhập nội dung bài viết..."
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={handleCancel}
                style={{
                  background: 'none',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 600,
                  transition: 'background 0.25s, color 0.25s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 0, 0, 0.03)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'none';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                disabled={!editText.trim()}
                style={{
                  background: editText.trim()
                    ? 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)'
                    : 'var(--border)',
                  border: 'none',
                  color: editText.trim() ? '#ffffff' : 'var(--text-muted)',
                  cursor: editText.trim() ? 'pointer' : 'not-allowed',
                  padding: '6px 16px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 700,
                  boxShadow: editText.trim() ? '0 2px 8px rgba(42, 117, 118, 0.25)' : 'none',
                  transition: 'all 0.25s ease',
                }}
                onMouseEnter={(e) => {
                  if (editText.trim()) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(42, 117, 118, 0.35)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (editText.trim()) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(42, 117, 118, 0.25)';
                  }
                }}
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        ) : (
          <>
            <p style={{ fontSize: '15px', lineHeight: 1.75, color: 'var(--text-primary)', margin: 0, whiteSpace: 'pre-wrap' }}>
              {isLong && !expanded ? renderContent.slice(0, 200) + '…' : renderContent}
            </p>
            {isLong && (
              <button
                onClick={() => setExpanded((v) => !v)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '13px',
                  padding: '4px 0 0',
                  fontFamily: 'inherit',
                }}
              >
                {expanded ? '▲ Thu gọn' : '▼ Xem thêm'}
              </button>
            )}
          </>
        )}
      </div>

      {/* Tagged users / groups chips */}
      {((post.taggedUsers && post.taggedUsers.length > 0) || (post.taggedGroups && post.taggedGroups.length > 0)) && (
        <div style={{ padding: '0 18px 12px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginRight: '2px' }}>Cùng với:</span>
          {(post.taggedUserNames || []).map((name, i) => (
            <span key={`tu:${i}`} style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '3px 10px', borderRadius: '20px',
              background: '#E0F2FE',
              color: '#0369A1', fontSize: '12px', fontWeight: 700,
            }}>
              @{name}
            </span>
          ))}
          {(post.taggedGroupNames || []).map((name, i) => (
            <span key={`tg:${i}`} style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '3px 10px', borderRadius: '20px',
              background: 'rgba(17, 24, 39, 0.04)', border: '1px solid var(--border)',
              color: 'var(--text-primary)', fontSize: '12px', fontWeight: 700,
            }}>
              @{name}
            </span>
          ))}
        </div>
      )}

      {/* Stats row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 18px 10px',
          fontSize: '12px',
          color: 'var(--text-muted)',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {post.likes && post.likes.length > 0 && (
            <>
              <span>❤️</span>
              <span>{post.likes.length} lượt thích</span>
            </>
          )}
        </span>
        <span style={{ cursor: 'pointer' }} onClick={() => setShowComments((v) => !v)}>
          {post.comments && post.comments.length > 0 && `${post.comments.length} bình luận`}
        </span>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'var(--border)', margin: '0 18px' }} />

      {/* Action buttons */}
      <LikeCommentBar
        post={post}
        isLiked={isLiked}
        likedEmoji={likedEmoji}
        showComments={showComments}
        onLike={(em, e) => onLike(post.id, em, e)}
        onToggleComments={() => setShowComments((v) => !v)}
      />

      {/* Comments section */}
      {showComments && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 18px 14px' }}>
          {/* Threaded comments tree */}
          {post.comments && post.comments.length > 0 && (() => {
            const roots = post.comments.filter((c) => !c.parentId);
            const repliesOf = (pid) => post.comments.filter((c) => c.parentId === pid);
            const renderComment = (c, depth = 0) => {
              const replies = repliesOf(c.id);
              return (
                <div key={c.id}>
                  <CommentRow
                    comment={c}
                    onReply={() => {
                      setReplyTo({ id: c.id, name: c.userFullName });
                      setShowComments(true);
                      setTimeout(
                        () => document.getElementById(`comment-input-${post.id}`)?.focus(),
                        80
                      );
                    }}
                  />
                  {replies.length > 0 && (
                    <div
                      style={{
                        marginLeft: depth < 1 ? '40px' : '20px',
                        marginTop: '8px',
                        paddingLeft: '12px',
                        borderLeft: '2px solid var(--border)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      {replies.map((r) => renderComment(r, depth + 1))}
                    </div>
                  )}
                </div>
              );
            };
            return (
              <div 
                ref={commentsEndRef}
                className="comments-scroll-container"
                style={{ 
                  maxHeight: '280px', 
                  overflowY: 'auto', 
                  marginBottom: '16px', 
                  paddingRight: '6px',
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px',
                  scrollBehavior: 'smooth'
                }}
              >
                {roots.map((c) => renderComment(c))}
              </div>
            );
          })()}

          {/* Write comment */}
          {currentUser && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {replyTo && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(0, 0, 0, 0.05)',
                  borderLeft: '3px solid var(--text-primary)',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  marginLeft: '40px',
                  transition: 'all 0.2s ease',
                }}>
                  <span style={{ fontSize: '12.5px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ReplyIcon /> Trả lời
                    </span>
                    <strong style={{ color: 'var(--text-primary)' }}>{replyTo.name}</strong>
                  </span>
                  <button
                    onClick={() => setReplyTo(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      fontSize: '14px',
                      padding: '4px',
                      lineHeight: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      transition: 'background 0.2s, color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.color = '#ef4444';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'none';
                      e.currentTarget.style.color = 'var(--text-muted)';
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <Avatar
                  src={currentUser.avatar}
                  initial={currentUser.fullName || 'U'}
                  size={30}
                />
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    background: isInputFocused ? 'rgba(0, 0, 0, 0.03)' : 'var(--bg-input)',
                    border: isInputFocused ? '1px solid var(--text-primary)' : '1px solid var(--border)',
                    borderRadius: '24px',
                    overflow: 'hidden',
                    boxShadow: isInputFocused ? '0 0 12px rgba(0, 0, 0, 0.12)' : 'none',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  <input
                    id={`comment-input-${post.id}`}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                    placeholder={replyTo ? `Trả lời ${replyTo.name}...` : 'Viết bình luận...'}
                    style={{
                      flex: 1,
                      background: 'none',
                      border: 'none',
                      outline: 'none',
                      padding: '10px 18px',
                      color: 'var(--text-primary)',
                      fontSize: '13.5px',
                      fontFamily: 'inherit',
                      transition: 'all 0.2s',
                    }}
                  />
                  <button
                    onClick={handleComment}
                    disabled={!commentText.trim()}
                    style={{
                      background: commentText.trim()
                        ? 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)'
                        : 'transparent',
                      border: 'none',
                      cursor: commentText.trim() ? 'pointer' : 'default',
                      padding: '0 18px',
                      color: commentText.trim() ? '#ffffff' : 'var(--text-muted)',
                      fontSize: '13px',
                      fontWeight: 700,
                      fontFamily: 'inherit',
                      borderRadius: '20px',
                      margin: '4px',
                      boxShadow: commentText.trim() ? '0 2px 8px rgba(0, 0, 0, 0.25)' : 'none',
                      transition: 'all 0.25s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onMouseEnter={(e) => {
                      if (commentText.trim()) {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (commentText.trim()) {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.25)';
                      }
                    }}
                  >
                    Gửi
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
