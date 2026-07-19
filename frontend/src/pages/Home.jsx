/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getPosts, deletePost, createComment, toggleLikePost, togglePinPost, updatePost } from '@/services/interactionService';
import { getFriends } from '@/services/friendService';
import { supabase } from '@/config/supabaseClient';

import Avatar from '@/components/common/Avatar';
import PostList from '@/components/posts/PostList';
import CreatePostModal from '@/components/posts/CreatePostModal';
import ConfirmModal from '@/components/ConfirmModal';
import { Typewriter } from '@/components/common/Typewriter';



export default function Home() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState(null);
  const [friends, setFriends] = useState([]);
  const [myLeaderGroups, setMyLeaderGroups] = useState([]);
  const [particles, setParticles] = useState([]); // { id, x, y, char, delay, leftOffset }

  const spawnParticles = (emoji, clientX, clientY) => {
    // Spawn 6 fixed-positioned emoji particles
    const newParticles = Array.from({ length: 6 }).map((_, i) => ({
      id: Date.now() + Math.random() + i,
      x: clientX,
      y: clientY - 10,
      char: emoji,
      delay: i * 0.05,
      leftOffset: (Math.random() - 0.5) * 100
    }));

    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 1500);
  };

  // Fetch friends list
  useEffect(() => {
    if (!user?.id) return;
    const uid = parseInt(user.id, 10);
    const loadFriendsAndGroups = async () => {
      try {
        const list = await getFriends(user.id);
        setFriends(list);
      } catch (err) {
        if (import.meta.env.DEV) console.warn('Error fetching friends:', err);
      }
      try {
        const { data: memberGroupsData } = await supabase
          .from('group_members')
          .select(`
            group_id,
            study_groups (
              id,
              name,
              creator_id,
              group_members (
                user_id,
                role
              )
            )
          `)
          .eq('user_id', uid)
          .limit(30);

        if (memberGroupsData) {
          const mapped = memberGroupsData
            .filter(m => m.study_groups)
            .map(m => {
              const g = m.study_groups;
              return {
                id: g.id.toString(),
                name: g.name,
                creatorId: g.creator_id,
                members: (g.group_members || []).map(gm => gm.user_id)
              };
            });
          setMyLeaderGroups(mapped);
        }
      } catch (err) {
        if (import.meta.env.DEV) console.warn('Error fetching groups:', err);
      }
    };
    loadFriendsAndGroups();
  }, [user?.id]);

  // Fetch database posts
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const fetchPosts = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await getPosts(user.id);
      setPosts(data);
    } catch (err) {
      if (import.meta.env.DEV) console.warn('Error fetching posts:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    fetchPosts();

    // Polling fallback 2 phút để cải thiện UX feed mà không vi phạm egress quota
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchPosts();
      }
    }, 120000); // 2 phút

    // Đăng ký Realtime channel để cập nhật feed câu hỏi & bình luận thời gian thực
    const channelName = `home-feed-realtime-${user.id}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        () => {
          fetchPosts();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments' },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchPosts, user?.id]);

  // Post handlers
  const handleLikePost = async (postId, emoji, e) => {
    if (!user) return;
    try {
      if (emoji && e && e.clientX && e.clientY) {
        spawnParticles(emoji, e.clientX, e.clientY);
      }
      const updatedLikes = await toggleLikePost(postId, user.id, emoji);
      setPosts(posts.map((p) => {
        if (p.id !== postId) return p;
        return { ...p, likes: updatedLikes };
      }));
    } catch (err) {
      if (import.meta.env.DEV) console.error('Error liking post:', err);
    }
  };

  const handleDeletePost = (postId) => {
    setConfirmConfig({
      title: 'Xóa câu hỏi',
      message: 'Bạn có chắc chắn muốn xóa câu hỏi này? Hành động này không thể hoàn tác.',
      confirmText: 'Xóa',
      cancelText: 'Giữ lại',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmConfig(null);
        try {
          await deletePost(postId);
          setPosts(posts.filter((p) => p.id !== postId));
        } catch (err) {
          if (import.meta.env.DEV) console.error(`Xóa thất bại: ${err.message}`);
        }
      },
      onCancel: () => setConfirmConfig(null),
    });
  };

  const handleCommentPost = async (postId, content, replyTo = null) => {
    if (!user) return;
    try {
      const newComment = await createComment(postId, {
        content,
        userId: user.id,
        parentId: replyTo?.id || null
      });
      if (replyTo) {
        newComment.replyToName = replyTo.name;
      }
      setPosts(posts.map((p) => {
        if (p.id !== postId) return p;
        const comments = Array.isArray(p.comments) ? [...p.comments] : [];
        comments.push(newComment);
        return { ...p, comments };
      }));
    } catch (err) {
      alert(`Bình luận thất bại: ${err.message}`);
    }
  };

  const handlePinPost = async (postId) => {
    try {
      const isPinned = await togglePinPost(postId);
      setPosts(posts.map((p) => {
        if (p.id !== postId) return p;
        return { ...p, isPinned };
      }));
    } catch (err) {
      if (import.meta.env.DEV) console.error('Error toggling pin on post:', err);
    }
  };

  const handleEditPost = async (postId, newContent, tagData = {}) => {
    try {
      await updatePost(postId, newContent, tagData);
      setPosts(posts.map((p) => {
        if (p.id !== postId) return p;
        return {
          ...p,
          content: newContent,
          taggedUsers: tagData.taggedUsers ?? p.taggedUsers,
          taggedGroups: tagData.taggedGroups ?? p.taggedGroups,
          taggedUserNames: tagData.taggedUserNames ?? p.taggedUserNames,
          taggedGroupNames: tagData.taggedGroupNames ?? p.taggedGroupNames,
        };
      }));
    } catch (err) {
      if (import.meta.env.DEV) console.error('Error updating post:', err);
      throw err;
    }
  };

  const sortedPosts = [...posts].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });



  return (
    <>
      <style>{`
        @keyframes floatEmojiUpFixed {
          0% {
            transform: translate3d(-50%, 0, 0) scale(0.3) rotate(0deg);
            opacity: 0;
          }
          12% {
            transform: translate3d(-50%, -20px, 0) scale(1.4) rotate(15deg);
            opacity: 1;
          }
          50% {
            transform: translate3d(calc(-50% + var(--dx) * 0.5), -80px, 0) scale(1.1) rotate(-15deg);
            opacity: 0.95;
          }
          100% {
            transform: translate3d(calc(-50% + var(--dx)), -160px, 0) scale(0.6) rotate(35deg);
            opacity: 0;
          }
        }
        .emoji-particle-fixed {
          position: fixed;
          pointer-events: none;
          font-size: 32px;
          z-index: 999999;
          animation: floatEmojiUpFixed 1.3s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          user-select: none;
        }
        @keyframes sc-float-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .sc-card-animated {
          animation: sc-float-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .sc-card-hover {
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .sc-card-hover:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(35, 97, 95, 0.12);
        }
        @keyframes sc-pulse-dot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.25); opacity: 0.7; }
        }
        .sc-online-dot {
          animation: sc-pulse-dot 1.8s ease-in-out infinite;
        }
        .sc-avatar-hover {
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer;
        }
        .sc-avatar-hover:hover {
          transform: scale(1.08) rotate(-3deg);
        }
      `}</style>

      {particles.map(p => (
        <span
          key={p.id}
          className="emoji-particle-fixed"
          style={{
            left: `${p.x}px`,
            top: `${p.y}px`,
            animationDelay: `${p.delay}s`,
            '--dx': `${p.leftOffset}px`
          }}
        >
          {p.char}
        </span>
      ))}
      <div className="home-feed-container">
        {/* MIDDLE COLUMN: Feed */}
        <div className="home-feed-main">
          {/* Create Question Box - Fixed Top */}
          <div className="home-create-box-wrapper">
            <div className="home-create-box sc-card-animated">
              <Avatar src={user?.avatar} initial={user?.fullName || 'U'} size={42} />
              <button
                onClick={() => setShowCreateModal(true)}
                className="home-create-btn"
                style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '24px', padding: '12px 18px', color: 'var(--text-muted)', fontSize: '14px', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center' }}
              >
                <Typewriter
                  text={[
                    'Bạn muốn chia sẻ điều gì hôm nay?',
                    'Hôm nay học gì rồi?',
                    'Đặt câu hỏi cho nhóm học của bạn...',
                  ]}
                />
              </button>
            </div>
          </div>

          {/* Post List - Scrollable Area */}
          <div className="no-scrollbar sc-card-animated home-feed-scroll-area" style={{ flex: 1, height: 0, overflowY: 'auto', animationDelay: '0.05s' }}>
            <PostList
              posts={sortedPosts}
              currentUser={user}
              friends={friends}
              myLeaderGroups={myLeaderGroups}
              onLike={handleLikePost}
              onDelete={handleDeletePost}
              onComment={handleCommentPost}
              onPin={handlePinPost}
              onEdit={handleEditPost}
            />
          </div>
        </div>
      </div>

      {showCreateModal && (
        <CreatePostModal
          user={user}
          friends={friends}
          myLeaderGroups={myLeaderGroups}
          onClose={() => setShowCreateModal(false)}
          onSubmit={() => {}}
        />
      )}

      <ConfirmModal
        isOpen={!!confirmConfig}
        title={confirmConfig?.title}
        message={confirmConfig?.message}
        confirmText={confirmConfig?.confirmText}
        cancelText={confirmConfig?.cancelText}
        variant={confirmConfig?.variant}
        onConfirm={confirmConfig?.onConfirm}
        onCancel={confirmConfig?.onCancel || (() => setConfirmConfig(null))}
      />
    </>
  );
}