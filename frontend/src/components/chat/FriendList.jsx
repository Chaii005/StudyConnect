import { useState } from 'react';
import { Link } from 'react-router-dom';
import Avatar from '../common/Avatar';
import { getUnreadCount } from '../../services/chatServiceTEMP';
import { SafeInput } from '@/components/common/SafeInput';

function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = Date.now() - d;
  if (diff < 60000) return 'vừa xong';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} phút trước`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

export default function FriendList({ user, friends, onSelect, lastMessages, onlineUserIds, selectedFriend }) {
  const [search, setSearch] = useState('');

  const filtered = friends.filter(f =>
    !search.trim() || f.fullName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Search Bar */}
      <div style={{ padding: '16px', flexShrink: 0 }}>
        <div 
          style={{
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            background: 'var(--bg-input)', 
            border: '1.5px solid var(--border)',
            borderRadius: '14px', 
            padding: '10px 14px', 
            transition: 'border-color 0.2s ease',
          }}
        >
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            style={{ color: 'var(--text-secondary)', flexShrink: 0 }}
          >
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.3-4.3"/>
          </svg>
          <SafeInput
            placeholder="Tìm kiếm cuộc trò chuyện..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ 
              background: 'none', 
              border: 'none', 
              outline: 'none', 
              flex: 1, 
              color: 'var(--text-primary)', 
              fontSize: '13.5px', 
              fontFamily: 'inherit',
              fontWeight: 600,
            }}
          />
        </div>
      </div>

      {/* Friends List Container */}
      <div 
        className="msgs-no-scrollbar"
        style={{ 
          flex: 1, 
          minHeight: 0, 
          overflowY: 'auto', 
          overflowX: 'hidden', 
          overscrollBehavior: 'contain', 
          padding: '0 8px 16px',
        }}
      >
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)', fontSize: '14px' }}>
            {friends.length === 0 ? (
              <>
                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--bg-input)', border: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>Chưa có cuộc trò chuyện nào</div>
                <Link to="/friends" style={{ color: 'var(--primary)', textDecoration: 'underline', fontSize: '13px', fontWeight: 700 }}>
                  Tìm kiếm bạn bè ngay
                </Link>
              </>
            ) : 'Không tìm thấy kết quả phù hợp.'}
          </div>
        ) : (() => {
          const sortedFiltered = [...filtered].sort((a, b) => {
            const lastA = lastMessages[String(a.userId)];
            const lastB = lastMessages[String(b.userId)];
            const timeA = lastA ? new Date(lastA.createdAt).getTime() : 0;
            const timeB = lastB ? new Date(lastB.createdAt).getTime() : 0;
            if (timeB !== timeA) return timeB - timeA;

            const aOn = onlineUserIds.includes(String(a.userId)) ? 1 : 0;
            const bOn = onlineUserIds.includes(String(b.userId)) ? 1 : 0;
            return bOn - aOn;
          });

          return sortedFiltered.map((f, index) => {
            const last = lastMessages[String(f.userId)];
            const unread = getUnreadCount(user.id, f.userId);
            const isOnline = onlineUserIds.includes(String(f.userId));
            const nickname = localStorage.getItem(`sc_nickname_${user.id}_${f.userId}`) || f.fullName;
            const isSelected = selectedFriend && String(selectedFriend.userId) === String(f.userId);

            return (
              <button 
                key={f.requestId} 
                onClick={() => onSelect(f)} 
                style={{
                  width: '100%', 
                  background: isSelected ? 'var(--bg-input)' : 'transparent', 
                  border: 'none', 
                  cursor: 'pointer',
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  padding: '12px 14px', 
                  textAlign: 'left', 
                  transition: 'all 0.2s ease',
                  borderRadius: '14px',
                  marginBottom: '4px',
                  position: 'relative',
                  overflow: 'hidden',
                  animation: `itemFadeIn 0.3s ease forwards`,
                  animationDelay: `${index * 20}ms`,
                  opacity: 0,
                }}
                onMouseEnter={e => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'var(--bg-input)';
                    e.currentTarget.style.opacity = '0.9';
                  }
                }}
                onMouseLeave={e => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.opacity = '1';
                  }
                }}
              >
                {/* Active left indicator bar */}
                {isSelected && (
                  <div 
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: '12px',
                      bottom: '12px',
                      width: '3.5px',
                      background: 'var(--primary)',
                      borderRadius: '0 4px 4px 0',
                    }}
                  />
                )}

                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <Avatar src={f.avatar} initial={f.initial} size={42} />
                  <div 
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: isOnline ? '#0D9488' : '#ef4444',
                      border: '2px solid var(--bg-card)',
                    }} 
                  />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span 
                      style={{ 
                        fontWeight: unread > 0 ? 800 : 700, 
                        fontSize: '13.5px', 
                        color: 'var(--text-primary)', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap' 
                      }}
                    >
                      {nickname}
                    </span>
                    {f.status === 'pending' ? (
                      <span 
                        style={{
                          fontSize: '10px',
                          background: 'rgba(13, 148, 136, 0.08)',
                          color: '#0D9488',
                          padding: '2px 8px',
                          borderRadius: '8px',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {f.fromUserId === String(user.id) ? 'Đã gửi' : 'Lời mời'}
                      </span>
                    ) : (
                      last && (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0, fontFamily: 'var(--font-mono, monospace)' }}>
                          {fmtTime(last.createdAt)}
                        </span>
                      )
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                    <span 
                      style={{ 
                        fontSize: '12.5px', 
                        color: unread > 0 ? 'var(--text-primary)' : 'var(--text-secondary)', 
                        fontWeight: unread > 0 ? 700 : 400, 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap', 
                        flex: 1 
                      }}
                    >
                      {last
                        ? (last.content?.startsWith('[chat_background]')
                          ? (String(last.fromUserId) === String(user.id) ? 'Bạn đã thay đổi hình nền' : `${nickname} đã thay đổi hình nền`)
                          : last.content?.startsWith('[chat_nickname]')
                            ? (String(last.fromUserId) === String(user.id) ? 'Bạn đã thay đổi biệt danh' : `${nickname} đã thay đổi biệt danh`)
                                : (() => {
                                    const isMinePrefix = String(last.fromUserId) === String(user.id) ? 'Bạn: ' : '';
                                    if (last.type === 'image' || last.content?.startsWith('data:image')) {
                                      return String(last.fromUserId) === String(user.id) ? 'Bạn đã gửi ảnh' : 'Đã gửi ảnh';
                                    }
                                    if (last.fileAttachment) {
                                      return String(last.fromUserId) === String(user.id) ? 'Bạn đã gửi một tệp' : 'Đã gửi một tệp';
                                    }
                                    if (last.content?.startsWith('📵')) {
                                      const text = last.content.replace(/^\S+\s*/, '');
                                      return (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', verticalAlign: 'middle' }}>
                                          <span>{isMinePrefix}</span>
                                          <span 
                                            style={{
                                              width: '18px',
                                              height: '18px',
                                              borderRadius: '50%',
                                              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              color: '#ffffff',
                                              flexShrink: 0,
                                            }}
                                          >
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                              <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.18 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
                                              <line x1="23" y1="1" x2="1" y2="23" />
                                            </svg>
                                          </span>
                                          <span style={{ color: 'var(--text-secondary)' }}>{text}</span>
                                        </span>
                                      );
                                    }
                                    if (last.content?.startsWith('📹')) {
                                      const text = last.content.replace(/^\S+\s*/, '');
                                      return (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', verticalAlign: 'middle' }}>
                                          <span>{isMinePrefix}</span>
                                          <span 
                                            style={{
                                              width: '18px',
                                              height: '18px',
                                              borderRadius: '50%',
                                              background: 'linear-gradient(135deg, #14b8a6, #0d9488)',
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              color: '#ffffff',
                                              flexShrink: 0,
                                            }}
                                          >
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                              <path d="m22 8-6 4 6 4V8Z" />
                                              <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
                                            </svg>
                                          </span>
                                          <span style={{ color: 'var(--text-secondary)' }}>{text}</span>
                                        </span>
                                      );
                                    }
                                    return isMinePrefix + last.content;
                                  })())
                        : (f.status === 'pending'
                          ? (f.fromUserId === String(user.id) ? '⌛ Chờ chấp nhận kết bạn...' : '🤝 Lời mời kết nối từ đối phương')
                          : 'Bắt đầu nhắn tin...')}
                    </span>
                    
                    {unread > 0 && (
                      <span 
                        style={{ 
                          background: '#0D9488', 
                          color: 'white', 
                          fontSize: '11px', 
                          fontWeight: 800, 
                          padding: '2px 8px', 
                          borderRadius: '10px', 
                          flexShrink: 0, 
                          minWidth: '22px', 
                          textAlign: 'center',
                          boxShadow: '0 2px 6px rgba(13, 148, 136, 0.3)',
                        }}
                      >
                        {unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          });
        })()}
      </div>
      
      <style>{`
        @keyframes itemFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .msgs-no-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .msgs-no-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .msgs-no-scrollbar::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
