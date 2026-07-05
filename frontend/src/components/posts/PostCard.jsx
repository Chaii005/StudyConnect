import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Avatar from '@/components/common/Avatar';
import { timeAgo } from '@/utils';
import LikeCommentBar from './LikeCommentBar';
import CommentRow from './CommentRow';
import { sendFriendRequest } from '@/services/friendService';
import { SafeInput, SafeTextarea } from '@/components/common/SafeInput';
import { supabase } from '@/config/supabaseClient';

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

export default function PostCard({ post, currentUser, friends = [], onLike, onDelete, onComment, onEdit }) {
  const navigate = useNavigate();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState(null); // { id, name }
  const [expanded, setExpanded] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(post?.content || '');
  const commentsEndRef = useRef(null);
  const [hoveredItem, setHoveredItem] = useState(null);

  const handleUserMouseEnter = async (uid, name, isFriend) => {
    if (!uid) return;
    setHoveredItem({ type: 'user', id: uid, name, loading: true, isFriend });
    try {
      const { data, error } = await supabase
        .from('users')
        .select('avatar, university, major, full_name')
        .eq('id', parseInt(uid, 10))
        .single();
      if (!error && data) {
        setHoveredItem(prev => {
          if (prev && prev.type === 'user' && prev.id === uid) {
            return {
              ...prev,
              loading: false,
              avatar: data.avatar,
              university: data.university,
              major: data.major,
              fullName: data.full_name
            };
          }
          return prev;
        });
      } else {
        setHoveredItem(prev => (prev && prev.id === uid ? { ...prev, loading: false } : prev));
      }
    } catch {
      setHoveredItem(prev => (prev && prev.id === uid ? { ...prev, loading: false } : prev));
    }
  };

  const handleGroupMouseEnter = async (gid, name) => {
    if (!gid) return;
    setHoveredItem({ type: 'group', id: gid, name, loading: true });
    try {
      const { data, error } = await supabase
        .from('study_groups')
        .select(`
          id, name, subject, meeting_mode, max_members,
          group_members (user_id)
        `)
        .eq('id', parseInt(gid, 10))
        .single();

      if (!error && data) {
        const membersList = (data.group_members || []).map(m => m.user_id);
        const isMem = membersList.some(m => Number(m) === Number(currentUser?.id));
        setHoveredItem(prev => {
          if (prev && prev.type === 'group' && prev.id === gid) {
            return {
              ...prev,
              loading: false,
              subject: data.subject,
              meetingMode: data.meeting_mode,
              maxMembers: data.max_members,
              memberCount: membersList.length,
              isMember: isMem
            };
          }
          return prev;
        });
      } else {
        setHoveredItem(prev => (prev && prev.id === gid ? { ...prev, loading: false } : prev));
      }
    } catch {
      setHoveredItem(prev => (prev && prev.id === gid ? { ...prev, loading: false } : prev));
    }
  };

  const handleMouseLeave = () => {
    setHoveredItem(null);
  };

  // Build a Set of friend user IDs for O(1) lookup
  const friendIdSet = new Set((friends || []).map(f => String(f.userId)));

  // Map taggedUserNames → their IDs from post.taggedUsers
  // post.taggedUsers  = [id1, id2, ...]  (same order as taggedUserNames)
  // post.taggedUserNames = [name1, name2, ...]
  const getTaggedUserId = (index) => {
    const ids = post.taggedUsers || [];
    return ids[index] ? String(ids[index]) : null;
  };

  const getTaggedGroupId = (index) => {
    const ids = post.taggedGroups || [];
    return ids[index] ? String(ids[index]) : null;
  };

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
        overflow: 'visible',
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
            <SafeTextarea
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
                    ? 'var(--primary)'
                    : 'var(--bg-input)',
                  border: editText.trim() ? 'none' : '1.5px solid var(--border)',
                  color: editText.trim() ? '#ffffff' : 'var(--text-muted)',
                  cursor: editText.trim() ? 'pointer' : 'not-allowed',
                  padding: '6px 16px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 700,
                  boxShadow: 'none',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (editText.trim()) {
                    e.currentTarget.style.background = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (editText.trim()) {
                    e.currentTarget.style.background = 'var(--primary)';
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
        <div style={{ padding: '0 18px 12px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', position: 'relative' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginRight: '2px' }}>Cùng với:</span>

          {(post.taggedUserNames || []).map((name, i) => {
            const uid = getTaggedUserId(i);
            const isFriend = uid && (friendIdSet.has(uid) || String(currentUser?.id) === uid);
            const isOwn = String(currentUser?.id) === uid;
            const isHovered = hoveredItem && hoveredItem.type === 'user' && hoveredItem.id === uid;

            return (
              <span
                key={`tu:${i}`}
                style={{ position: 'relative', display: 'inline-block' }}
                onMouseLeave={handleMouseLeave}
              >
                <span
                  onClick={() => {
                    if (uid) {
                      navigate(isOwn ? '/profile' : `/friends/${uid}`);
                    }
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.85';
                    handleUserMouseEnter(uid, name, isFriend);
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                  style={{
                    display: 'inline-flex', alignItems: 'center',
                    padding: '3px 10px', borderRadius: '20px',
                    background: isFriend ? '#E0F2FE' : 'rgba(0,0,0,0.05)',
                    color: isFriend ? '#0369A1' : 'var(--text-primary)',
                    fontSize: '12px', fontWeight: 700,
                    cursor: 'pointer',
                    border: isFriend ? '1px solid #BAE6FD' : '1px solid var(--border)',
                    transition: 'all 0.15s',
                  }}
                >
                  @{name}
                </span>

                {isHovered && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      paddingTop: '6px',
                      zIndex: 9999,
                      minWidth: '240px'
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      top: '1px',
                      left: '20px',
                      width: '10px',
                      height: '10px',
                      background: 'var(--bg-card)',
                      borderLeft: '1.5px solid var(--border)',
                      borderTop: '1.5px solid var(--border)',
                      transform: 'rotate(45deg)',
                      zIndex: 10000
                    }} />

                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        if (uid) {
                          navigate(isOwn ? '/profile' : `/friends/${uid}`);
                        }
                      }}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1.5px solid var(--border)',
                        borderRadius: '14px',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.16)',
                        padding: '14px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      {hoveredItem.loading ? (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Đang tải...</span>
                      ) : (hoveredItem.isFriend || isOwn) ? (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {hoveredItem.avatar ? (
                              <img src={hoveredItem.avatar} alt="avatar" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800 }}>
                                {(hoveredItem.fullName || name)[0].toUpperCase()}
                              </div>
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>{hoveredItem.fullName}</span>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>@{name}</span>
                            </div>
                          </div>
                          {(hoveredItem.university || hoveredItem.major) && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderTop: '1px solid var(--border)', paddingTop: '6px', marginTop: '2px' }}>
                              {hoveredItem.university && <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>🏫 {hoveredItem.university}</span>}
                              {hoveredItem.major && <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>🎓 {hoveredItem.major}</span>}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>@{name}</span>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Bạn chưa kết bạn với người này. Nhấp để kết bạn.</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </span>
            );
          })}

          {(post.taggedGroupNames || []).map((name, i) => {
            const gid = getTaggedGroupId(i);
            const isHovered = hoveredItem && hoveredItem.type === 'group' && hoveredItem.id === gid;

            return (
              <span
                key={`tg:${i}`}
                style={{ position: 'relative', display: 'inline-block' }}
                onMouseLeave={handleMouseLeave}
              >
                <span
                  onClick={() => {
                    if (gid) {
                      navigate(`/groups/${gid}`);
                    }
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(42, 117, 118, 0.12)';
                    handleGroupMouseEnter(gid, name);
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(42, 117, 118, 0.06)';
                  }}
                  style={{
                    display: 'inline-flex', alignItems: 'center',
                    padding: '3px 10px', borderRadius: '20px',
                    background: 'rgba(42, 117, 118, 0.06)',
                    border: '1px solid rgba(42, 117, 118, 0.18)',
                    color: 'var(--primary)',
                    fontSize: '12px', fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  Nhóm: @{name}
                </span>

                {isHovered && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      paddingTop: '6px',
                      zIndex: 9999,
                      minWidth: '240px'
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      top: '1px',
                      left: '20px',
                      width: '10px',
                      height: '10px',
                      background: 'var(--bg-card)',
                      borderLeft: '1.5px solid var(--border)',
                      borderTop: '1.5px solid var(--border)',
                      transform: 'rotate(45deg)',
                      zIndex: 10000
                    }} />

                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        if (gid) {
                          navigate(`/groups/${gid}`);
                        }
                      }}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1.5px solid var(--border)',
                        borderRadius: '14px',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.16)',
                        padding: '14px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      {hoveredItem.loading ? (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Đang tải...</span>
                      ) : hoveredItem.isMember ? (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(42, 117, 118, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                              </svg>
                            </div>
                            <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>{name}</span>
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Môn học: {hoveredItem.subject}</span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '2px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>👥 Sĩ số: {hoveredItem.memberCount}/{hoveredItem.maxMembers} thành viên</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>🌐 Hình thức: {hoveredItem.meetingMode === 'offline' ? 'Offline' : 'Online'}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(42, 117, 118, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                              </svg>
                            </div>
                            <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>{name}</span>
                          </div>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Bạn chưa tham gia nhóm này. Nhấp để gửi yêu cầu tham gia.</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </span>
            );
          })}
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
            
            const getDescendants = (parentComment, allComments) => {
              let results = [];
              const directReplies = allComments
                .filter((c) => c.parentId === parentComment.id)
                .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
              for (const reply of directReplies) {
                results.push(reply);
                results = results.concat(getDescendants(reply, allComments));
              }
              return results;
            };

            return (
              <div 
                ref={commentsEndRef}
                className="comments-scroll-container"
                style={{ 
                  maxHeight: '320px', 
                  overflowY: 'auto', 
                  marginBottom: '16px', 
                  paddingRight: '6px',
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '16px',
                  scrollBehavior: 'smooth'
                }}
              >
                {roots.map((root) => {
                  const descendants = getDescendants(root, post.comments);
                  return (
                    <div key={root.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <CommentRow
                        comment={root}
                        onReply={() => {
                          setReplyTo({ id: root.id, name: root.userFullName });
                          setShowComments(true);
                          setTimeout(
                            () => document.getElementById(`comment-input-${post.id}`)?.focus(),
                            80
                          );
                        }}
                      />
                      {descendants.length > 0 && (
                        <div
                          style={{
                            marginLeft: '28px',
                            paddingLeft: '14px',
                            borderLeft: '1.5px solid var(--border)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            marginTop: '4px'
                          }}
                        >
                          {descendants.map((desc) => (
                            <CommentRow
                              key={desc.id}
                              comment={desc}
                              onReply={() => {
                                setReplyTo({ id: desc.id, name: desc.userFullName });
                                setShowComments(true);
                                setTimeout(
                                  () => document.getElementById(`comment-input-${post.id}`)?.focus(),
                                  80
                                );
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
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
                  <SafeInput
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
                        ? 'var(--primary)'
                        : 'transparent',
                      border: commentText.trim() ? 'none' : '1.5px solid var(--border)',
                      cursor: commentText.trim() ? 'pointer' : 'default',
                      padding: '0 18px',
                      color: commentText.trim() ? '#ffffff' : 'var(--text-muted)',
                      fontSize: '13px',
                      fontWeight: 700,
                      fontFamily: 'inherit',
                      borderRadius: '20px',
                      margin: '4px',
                      boxShadow: 'none',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onMouseEnter={(e) => {
                      if (commentText.trim()) {
                        e.currentTarget.style.background = 'var(--text-primary)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (commentText.trim()) {
                        e.currentTarget.style.background = 'var(--primary)';
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
