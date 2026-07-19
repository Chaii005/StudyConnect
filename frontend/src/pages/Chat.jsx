// src/pages/Chat.jsx
// ── Orchestrator: composes Chat sidebar + ConversationView ─────────
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '../context/AuthContext';
import { useOnlineUsers } from '../context/OnlineUsersContext';
import { getFriends } from '../services/friendService.js';
import {
  getUnreadCount,
  getLastMessages,
  refreshCache,
} from '../services/chatServiceTEMP.js';
import { supabase } from '../config/supabaseClient';

import FriendList from '../components/chat/FriendList';
import ConversationView from '../components/chat/ConversationView';

export default function Chat() {
  const { isAuth, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryUserId = searchParams.get('userId');
  const onlineUserIds = useOnlineUsers();

  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [chatBg, setChatBg] = useState('');
  const [lastMessages, setLastMessages] = useState({});
  const [totalUnread, setTotalUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const friendsRef = useRef([]);
  useEffect(() => { friendsRef.current = friends; }, [friends]);

  // Handle direct navigation via userId query parameter
  useEffect(() => {
    if (friends.length > 0 && queryUserId) {
      const friend = friends.find(f => String(f.userId) === String(queryUserId));
      if (friend) {
        setSelectedFriend(friend);
        // Clear query parameters to avoid resetting selection on unrelated state changes
        setSearchParams({}, { replace: true });
      }
    }
  }, [friends, queryUserId, setSearchParams]);

  // Track active chat friend for GlobalMessageListener
  useEffect(() => {
    if (selectedFriend?.userId) {
      sessionStorage.setItem('active_chat_friend_id', String(selectedFriend.userId));
    } else {
      sessionStorage.removeItem('active_chat_friend_id');
    }
    return () => { sessionStorage.removeItem('active_chat_friend_id'); };
  }, [selectedFriend]);

  // Hide mobile bottom nav when in an active mobile conversation
  useEffect(() => {
    if (selectedFriend && (isMobile || Capacitor.isNativePlatform())) {
      document.body.classList.add('hide-mobile-bottom-nav');
    } else {
      document.body.classList.remove('hide-mobile-bottom-nav');
    }
    return () => {
      document.body.classList.remove('hide-mobile-bottom-nav');
    };
  }, [selectedFriend, isMobile]);

  // Auth guard
  useEffect(() => { if (!isAuth) navigate('/login'); }, [isAuth, navigate]);

  // Responsive listener
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initial data load
  useEffect(() => {
    if (!user?.id || user.id === 'undefined' || user.id === 'null' || isNaN(Number(user.id))) return;
    const refresh = async () => {
      try {
        await refreshCache(user.id);
        const list = await getFriends(String(user.id), true);
        setFriends(list);
        const lm = getLastMessages(user.id);
        setLastMessages(lm);
        const total = list.reduce((acc, f) => acc + getUnreadCount(user.id, f.userId), 0);
        setTotalUnread(total);
      } catch (err) {
        if (import.meta.env.DEV) console.warn('[Chat] Refresh failed:', err);
      } finally {
        setLoading(false);
      }
    };
    refresh();
  }, [user?.id]);

  // Realtime: sidebar overview updates on new message
  useEffect(() => {
    if (!user?.id || user.id === 'undefined' || user.id === 'null' || isNaN(Number(user.id))) return;
    const channel = supabase
      .channel(`chat-overview-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const msg = payload.new;
          if (!msg || msg.group_id) return;
          const senderIdStr = msg.sender_id.toString();
          const receiverIdStr = msg.receiver_id.toString();
          const userIdStr = user.id.toString();

          // Only process messages involving the current user
          if (senderIdStr !== userIdStr && receiverIdStr !== userIdStr) return;

          const friendIdStr = senderIdStr === userIdStr ? receiverIdStr : senderIdStr;
          const hasFriend = friendsRef.current.some(f => String(f.userId) === friendIdStr);
          if (!hasFriend) {
            try {
              await refreshCache(user.id);
              const list = await getFriends(String(user.id), true);
              setFriends(list);
              setLastMessages(getLastMessages(user.id));
              setTotalUnread(list.reduce((acc, f) => acc + getUnreadCount(user.id, f.userId), 0));
            } catch (err) {
              if (import.meta.env.DEV) console.warn('[Chat] Realtime full refresh failed:', err);
            }
          } else {
            await refreshCache(user.id);
            setLastMessages(getLastMessages(user.id));
            setTotalUnread(friendsRef.current.reduce((acc, f) => acc + getUnreadCount(user.id, f.userId), 0));
            setFriends(prev => [...prev]);
          }
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user?.id]);

  // Realtime: friend list updates when friendships table changes (replacing 30-min polling)
  useEffect(() => {
    if (!user?.id || user.id === 'undefined' || user.id === 'null' || isNaN(Number(user.id))) return;

    const refreshFriendList = async () => {
      try {
        const list = await getFriends(String(user.id), true);
        setFriends(list);
        const lm = getLastMessages(user.id);
        setLastMessages(lm);
        const total = list.reduce((acc, f) => acc + getUnreadCount(user.id, f.userId), 0);
        setTotalUnread(total);
      } catch (err) {
        if (import.meta.env.DEV) console.warn('[Chat] Friend list sync failed:', err);
      }
    };

    const channelName = `chat-friendships-${user.id}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `to_user_id=eq.${user.id}`,
        },
        refreshFriendList
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `from_user_id=eq.${user.id}`,
        },
        refreshFriendList
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Listen to sc-messages-read events to instantly update local unread badges
  useEffect(() => {
    if (!user?.id || user.id === 'undefined' || user.id === 'null' || isNaN(Number(user.id))) return;
    const handleReadEvent = (e) => {
      const { userId } = e.detail;
      if (String(userId) === String(user.id)) {
        setFriends(prev => [...prev]);
        const total = friendsRef.current.reduce((acc, f) => acc + getUnreadCount(user.id, f.userId), 0);
        setTotalUnread(total);
      }
    };
    window.addEventListener('sc-messages-read', handleReadEvent);
    return () => window.removeEventListener('sc-messages-read', handleReadEvent);
  }, [user?.id]);

  if (!isAuth || !user) return null;

  return (
    <>
      <div
        className="chat-page-container"
        style={{
          flex: 1,
          maxWidth: '1200px',
          width: '100%',
          margin: isMobile ? '0 auto' : '20px auto',
          padding: isMobile ? '0' : '0 5px',
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '340px 1fr',
          gap: isMobile ? '0' : '5px',
          height: isMobile ? '100%' : 'calc(100vh - 120px)',
          overflowX: 'hidden',
        }}
      >
        {/* ── Sidebar: Friend List ────────────────────────────────────── */}
        {(!isMobile || !selectedFriend) && (
          <div
            className={isMobile ? '' : 'premium-panel'}
            style={{
              padding: 0,
              background: isMobile ? 'var(--bg-card)' : undefined,
              border: isMobile ? 'none' : undefined,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
            }}
          >
            {/* Sidebar header */}
            <div
              style={{
                padding: '14px 16px',
                borderBottom: '1.5px solid var(--border)',
                background: 'var(--bg-input)',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <span style={{ flex: 1, fontWeight: 800, fontSize: '16px', color: 'var(--text-primary)', letterSpacing: '-0.015em' }}>
                Tin nhắn
              </span>

              {totalUnread > 0 && (
                <span
                  style={{
                    background: '#0D9488',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 800,
                    padding: '4px 12px',
                    borderRadius: '20px',
                    boxShadow: '0 2px 8px rgba(13, 148, 136, 0.35)',
                    letterSpacing: '0.3px',
                  }}
                >
                  {totalUnread} mới
                </span>
              )}
            </div>

            {/* Friend list or loading skeleton */}
            {loading ? (
              <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  {/* Skeleton loader - no circular spinners */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', width: '100%' }}>
                    {[0, 1, 2, 3].map(i => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', opacity: 1 - i * 0.2 }}>
                        <div style={{
                          width: '42px', height: '42px', borderRadius: '50%',
                          background: 'var(--bg-input)',
                          animation: 'skeletonPulse 1.5s ease-in-out infinite',
                          animationDelay: `${i * 100}ms`,
                          flexShrink: 0,
                        }} />
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{
                            height: '12px', borderRadius: '8px', background: 'var(--bg-input)',
                            width: `${60 + Math.sin(i) * 20}%`,
                            animation: 'skeletonPulse 1.5s ease-in-out infinite',
                            animationDelay: `${i * 100 + 100}ms`,
                          }} />
                          <div style={{
                            height: '10px', borderRadius: '8px', background: 'var(--bg-input)',
                            width: `${40 + Math.cos(i) * 15}%`,
                            animation: 'skeletonPulse 1.5s ease-in-out infinite',
                            animationDelay: `${i * 100 + 200}ms`,
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <FriendList
                  user={user}
                  friends={friends}
                  onSelect={setSelectedFriend}
                  lastMessages={lastMessages}
                  onlineUserIds={onlineUserIds}
                  selectedFriend={selectedFriend}
                />
              </div>
            )}
          </div>
        )}

        {/* ── Conversation View ─────────────────────────────────────────── */}
        {(selectedFriend || !isMobile) && (
          <div
            className={isMobile ? '' : 'premium-panel'}
            style={{
              padding: 0,
              background: isMobile ? 'var(--bg-card)' : undefined,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              width: '100%',
            }}
          >
            {selectedFriend ? (
              <ConversationView
                user={user}
                friend={selectedFriend}
                friends={friends}
                onBack={() => setSelectedFriend(null)}
                onlineUserIds={onlineUserIds}
                onNicknameChange={() => setFriends(prev => [...prev])}
                onRelationChange={(updatedFriend) => {
                  if (updatedFriend) {
                    setSelectedFriend(updatedFriend);
                    setFriends(prev => prev.map(f => f.userId === updatedFriend.userId ? updatedFriend : f));
                  } else {
                    setSelectedFriend(null);
                    getFriends(String(user.id), true).then(list => setFriends(list)).catch(() => {});
                  }
                }}
                chatBg={chatBg}
                setChatBg={setChatBg}
              />
            ) : (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '40px',
                  textAlign: 'center',
                  background: 'var(--bg-card)',
                  color: 'var(--text-secondary)',
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'var(--bg-input)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px',
                    color: 'var(--primary)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.01)',
                  }}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Trò chuyện
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', maxWidth: '280px', lineHeight: 1.5 }}>
                  Bắt đầu cuộc trò chuyện.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes skeletonPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        .chat-page-container {
          font-family: 'Be Vietnam Pro', system-ui, sans-serif;
        }
        .premium-panel {
          background: var(--bg-card);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1.5px solid var(--border);
          border-radius: 24px;
          box-shadow: var(--shadow);
        }
      `}</style>
    </>
  );
}