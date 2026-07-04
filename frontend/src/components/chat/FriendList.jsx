import { useState } from 'react';
import { Link } from 'react-router-dom';
import Avatar from '../common/Avatar';
import { getUnreadCount } from '../../services/chatServiceTEMP';

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
          <input
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
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
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
                            : (last.type === 'image' || last.content?.startsWith('data:image')
                              ? (String(last.fromUserId) === String(user.id) ? 'Bạn đã gửi ảnh' : 'Đã gửi ảnh')
                              : last.fileAttachment
                                ? (String(last.fromUserId) === String(user.id) ? 'Bạn đã gửi một tệp' : 'Đã gửi một tệp')
                                : (String(last.fromUserId) === String(user.id) ? 'Bạn: ' : '') + last.content))
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
