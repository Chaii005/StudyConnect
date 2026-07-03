import { useRef, useEffect, useState } from 'react';
import { formatBytes } from '../../utils';
import MessageMenu from './MessageMenu';

const EMOJI_LIST = [
  '😊','😂','🥰','😎','🤔','😅','🙏','👍','❤️','🔥','✨','🎉',
  '😢','😮','🤣','💪','👏','🥳','😤','🫠','😴','🤯','😇','🤩',
  '😏','😬','🫡','🥺','😭','🤧','😷','🤓','👀','💯','🎯','📚',
  '✅','⚡','🚀','💡',
];

const downloadBaseFile = async (dataUrl, fileName) => {
  try {
    if (!dataUrl) return;
    if (!dataUrl.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    
    // Use fetch to safely parse base64 data URLs into a Blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Delay revocation so the browser has time to start the download
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch (err) {
    if (import.meta.env.DEV) console.error('Lỗi download file:', err);
    window.open(dataUrl, '_blank');
  }
};

export default function GroupChatPanel({
  user,
  chatMessages,
  chatInput,
  setChatInput,
  chatAttachedFile,
  setChatAttachedFile,
  isSendingChatMessage,
  contextMenu,
  setContextMenu,
  replyTo,
  setReplyTo,
  msgReactions,
  handleMsgReact,
  handleMsgDelete,
  handleMsgPin,
  handleSendChatMessage,
  group,
  membersDetails = [],
}) {
  const chatEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // @ mention state
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionStartIdx, setMentionStartIdx] = useState(-1);

  const filteredMentions = showMentionList
    ? membersDetails.filter(
        (m) =>
          String(m.id) !== String(user?.id) &&
          m.fullName?.toLowerCase().includes(mentionQuery.toLowerCase())
      )
    : [];

  const scrollContainerRef = useRef(null);
  const isFirstRender = useRef(true);
  const prevLastMsgIdRef = useRef(null);
  const chatInputRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const container = scrollContainerRef.current;
    const lastMsg = chatMessages[chatMessages.length - 1];

    if (!lastMsg) return;

    if (isFirstRender.current) {
      chatEndRef.current?.scrollIntoView({ behavior: 'auto' });
      isFirstRender.current = false;
      prevLastMsgIdRef.current = lastMsg.id;
      return;
    }

    if (prevLastMsgIdRef.current !== lastMsg.id) {
      prevLastMsgIdRef.current = lastMsg.id;
      const isMyLastMsg = String(lastMsg.userId) === String(user?.id);

      if (isMyLastMsg) {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        return;
      }

      if (container) {
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
        if (isNearBottom) {
          chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
  }, [chatMessages, user?.id]);

  const openContextMenu = (e, msg) => {
    e.preventDefault();
    const container = chatContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    setContextMenu({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      msg,
    });
  };

  const handleChatFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setChatAttachedFile(file);
  };

  const removeChatAttachment = () => {
    setChatAttachedFile(null);
    const el = document.getElementById('chat-file-input');
    if (el) el.value = '';
  };

  const handleChatSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setShowMentionList(false);
    handleSendChatMessage(e);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setChatInput(val);

    // Detect @ trigger
    const cursor = e.target.selectionStart;
    const textBefore = val.slice(0, cursor);
    const atMatch = textBefore.match(/@(\S*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setMentionStartIdx(cursor - atMatch[0].length);
      setShowMentionList(true);
    } else {
      setShowMentionList(false);
      setMentionQuery('');
    }
  };

  const insertMention = (member) => {
    const before = chatInput.slice(0, mentionStartIdx);
    const after = chatInput.slice(mentionStartIdx + 1 + mentionQuery.length);
    const newVal = `${before}@${member.fullName} ${after}`;
    setChatInput(newVal);
    setShowMentionList(false);
    setMentionQuery('');
  };

  return (
    <div
      ref={chatContainerRef}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        flexDirection: 'column',
        height: '480px',
        maxHeight: 'calc(100vh - 260px)',
        boxShadow: 'var(--shadow)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border)',
          background: 'rgba(255,255,255,0.01)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Phòng trò chuyện nhóm
          </h3>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }} />
        </div>
        <span
          style={{
            fontSize: '12px',
            background: 'rgba(74,222,128,0.15)',
            color: '#4ade80',
            padding: '4px 10px',
            borderRadius: '12px',
            fontWeight: 600,
          }}
        >
          ● Trực tuyến
        </span>
      </div>

      <style>{`
        .chat-scroll::-webkit-scrollbar { display: none; }
        .chat-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Pinned Messages Banner */}
      {(() => {
        const pinnedList = chatMessages.filter(m => m.isPinned);
        if (pinnedList.length === 0) return null;
        const lastPinned = pinnedList[pinnedList.length - 1];
        return (
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.04)',
              borderBottom: '1px solid var(--border)',
              padding: '10px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              zIndex: 5,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: 'var(--text-primary)' }}>
                <line x1="12" y1="17" x2="12" y2="22" />
                <path d="M5 17h14v-1.76a2 2 0 0 0-.44-1.24l-2.78-3.5A2 2 0 0 1 15 9.26V5a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4.26a2 2 0 0 1-.78 1.24l-2.78 3.5A2 2 0 0 0 5 15.24z" />
              </svg>
              <div style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Tin nhắn đã ghim:</strong>{' '}
                {lastPinned.content || (lastPinned.fileAttachment ? `📎 [Tệp] ${lastPinned.fileAttachment.fileName}` : 'Tin nhắn trống')}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById(`msg-${lastPinned.id}`);
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    const bubble = el.querySelector('.chat-bubble-container');
                    if (bubble) {
                      const origBg = bubble.style.background;
                      const origBorder = bubble.style.border;
                      bubble.style.background = 'rgba(0, 0, 0, 0.12)';
                      bubble.style.border = '1px solid var(--primary)';
                      setTimeout(() => {
                        bubble.style.background = origBg;
                        bubble.style.border = origBorder;
                      }, 2000);
                    }
                  }
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 700,
                  textDecoration: 'underline',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
              >
                Xem
              </button>
              {(String(user.id) === String(group?.creatorId) ||
                String(user.id) === String(group?.deputyId) ||
                lastPinned.userId === user.id) && (
                <button
                  type="button"
                  onClick={() => handleMsgPin(lastPinned.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    padding: '0 4px',
                  }}
                  title="Bỏ ghim"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        className="chat-scroll"
        style={{
          flex: 1,
          padding: '20px 24px',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          background: 'rgba(0,0,0,0.05)',
        }}
        onClick={() => setContextMenu(null)}
      >
        {chatMessages.length === 0 ? (
          <div style={{ margin: 'auto', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <p style={{ margin: 0, fontSize: '15px' }}>Chưa có tin nhắn</p>
          </div>
        ) : (
          chatMessages.map((msg) => {
            const isMe = msg.userId === user.id;
            const senderInitials =
              msg.userFullName
                ?.split(' ')
                .map((w) => w[0])
                .slice(-2)
                .join('')
                .toUpperCase() || '?';
            const reactions = msgReactions[msg.id] || [];
            const reactionCounts = reactions.reduce((acc, r) => {
              acc[r.emoji] = (acc[r.emoji] || 0) + 1;
              return acc;
            }, {});

            const isMeetroomMsg = msg.meetroom_id || msg.content?.startsWith('[meetroom:');
            let meetroomId = msg.meetroom_id;
            let meetroomText = msg.content;
            if (msg.content?.startsWith('[meetroom:')) {
              const match = msg.content.match(/^\[meetroom:([^\]]+)\]/);
              if (match) {
                meetroomId = match[1];
                meetroomText = msg.content.replace(/^\[meetroom:[^\]]+\]\s*/, '');
              }
            }

            return (
              <div
                key={msg.id}
                id={`msg-${msg.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  flexDirection: isMe ? 'row-reverse' : 'row',
                  maxWidth: isMeetroomMsg ? '85%' : '78%',
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                  transition: 'background 0.5s ease',
                  padding: '4px 8px',
                  borderRadius: '12px',
                }}
              >
                {/* Avatar */}
                {msg.userAvatar ? (
                  <img
                    src={msg.userAvatar}
                    alt="avatar"
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '1.5px solid var(--border)',
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      background: isMe ? 'var(--primary)' : 'var(--border)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {senderInitials}
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isMe ? 'flex-end' : 'flex-start',
                    gap: '3px',
                  }}
                >
                  {/* Name + time */}
                  <div style={{ display: 'flex', gap: '7px', alignItems: 'center', fontSize: '11px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {isMe ? 'Bạn' : msg.userFullName}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {msg.isPinned && (
                      <span title="Tin nhắn đã ghim" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--text-primary)', fontWeight: 600 }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="17" x2="12" y2="22" />
                          <path d="M5 17h14v-1.76a2 2 0 0 0-.44-1.24l-2.78-3.5A2 2 0 0 1 15 9.26V5a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4.26a2 2 0 0 1-.78 1.24l-2.78 3.5A2 2 0 0 0 5 15.24z" />
                        </svg>
                        Đã ghim
                      </span>
                    )}
                  </div>

                  {/* Bubble */}
                  <div
                    className="chat-bubble-container"
                    onContextMenu={(e) => openContextMenu(e, msg)}
                    onDoubleClick={(e) => openContextMenu(e, msg)}
                    style={{
                      background: isMeetroomMsg 
                        ? 'rgba(16, 185, 129, 0.1)' 
                        : (isMe ? 'var(--primary)' : 'rgba(255,255,255,0.05)'),
                      border: isMeetroomMsg 
                        ? '1.5px solid rgba(16, 185, 129, 0.3)' 
                        : (isMe ? 'none' : '1px solid var(--border)'),
                      color: isMe && !isMeetroomMsg ? '#fff' : 'var(--text-primary)',
                      padding: '12px 16px',
                      borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                      fontSize: '14px',
                      lineHeight: 1.5,
                      wordBreak: 'break-word',
                      boxShadow: isMeetroomMsg ? '0 4px 12px rgba(16, 185, 129, 0.15)' : '0 2px 8px rgba(0,0,0,0.12)',
                      cursor: 'context-menu',
                      transition: 'background 0.3s ease, border-color 0.3s ease',
                      minWidth: isMeetroomMsg ? '240px' : undefined,
                    }}
                  >
                    {isMeetroomMsg ? (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#10b981', fontWeight: 700 }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M23 7l-7 5 7 5V7z" />
                            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                          </svg>
                          <span>Cuộc gọi nhóm học tập</span>
                        </div>
                        <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                          {meetroomText || 'Cuộc gọi nhóm học tập đã bắt đầu.'}
                        </p>
                        {meetroomId && (
                          <a
                            href={`/room/${meetroomId}?group=${encodeURIComponent(group?.name || '')}&groupId=${group?.id || ''}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: 'linear-gradient(135deg, #10b981, #059669)',
                              color: '#fff',
                              textDecoration: 'none',
                              padding: '8px 16px',
                              borderRadius: '8px',
                              fontSize: '13.5px',
                              fontWeight: 700,
                              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                              transition: 'opacity 0.2s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = 0.9}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = 1}
                          >
                            Tham gia cuộc gọi
                          </a>
                        )}
                      </div>
                    ) : (
                      <>
                        {/* Reply preview */}
                    {msg.replyTo && (
                      <div
                        style={{
                          background: isMe ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.06)',
                          borderLeft: '3px solid rgba(0,0,0,0.25)',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          marginBottom: '8px',
                          fontSize: '12px',
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 700,
                            color: isMe ? 'rgba(255,255,255,0.8)' : 'var(--primary-light)',
                            marginBottom: '2px',
                          }}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="9 17 4 12 9 7" />
                              <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                            </svg>
                            {msg.replyTo.userFullName}
                          </span>
                        </div>
                        <div
                          style={{
                            color: isMe ? 'rgba(255,255,255,0.65)' : 'var(--text-muted)',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {msg.replyTo.content}
                        </div>
                      </div>
                    )}

                    {msg.content && <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>}

                    {/* File attachment */}
                    {msg.fileAttachment &&
                      (() => {
                        const fileName = msg.fileAttachment.fileName || msg.fileAttachment.name || 'Tài liệu';
                        const fileType = msg.fileAttachment.fileType || msg.fileAttachment.type || '';
                        const fileData = msg.fileAttachment.fileData || msg.fileAttachment.data || '';
                        const fileSize = msg.fileAttachment.fileSize || '';
                        const isImage = fileType?.startsWith('image/');

                        return isImage ? (
                          <div style={{ marginTop: msg.content ? '8px' : 0 }}>
                            <img
                              src={fileData}
                              alt={fileName}
                              style={{
                                maxWidth: '260px',
                                maxHeight: '200px',
                                borderRadius: '10px',
                                display: 'block',
                                objectFit: 'cover',
                                cursor: 'pointer',
                              }}
                              onClick={() => downloadBaseFile(fileData, fileName)}
                            />
                            <button
                              type="button"
                              onClick={() => downloadBaseFile(fileData, fileName)}
                              style={{
                                display: 'inline-block',
                                marginTop: '5px',
                                fontSize: '11px',
                                color: isMe ? 'rgba(255,255,255,0.75)' : 'var(--text-muted)',
                                textDecoration: 'underline',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 0,
                              }}
                            >
                              {fileName}
                            </button>
                          </div>
                        ) : (
                          <div
                            style={{
                              marginTop: msg.content ? '10px' : 0,
                              background: isMe ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.03)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '8px',
                              padding: '10px 12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              minWidth: '200px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-primary)' }}>
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                                <polyline points="10 9 9 9 8 9" />
                              </svg>
                            </div>
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                              <div
                                style={{
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  textOverflow: 'ellipsis',
                                  overflow: 'hidden',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {fileName}
                              </div>
                              <div style={{ fontSize: '11px', color: isMe ? 'rgba(255,255,255,0.65)' : 'var(--text-muted)' }}>
                                {fileSize}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => downloadBaseFile(fileData, fileName)}
                              style={{
                                background: isMe ? '#fff' : 'var(--primary)',
                                color: isMe ? 'var(--primary)' : '#fff',
                                padding: '5px 10px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                border: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              Tải về
                            </button>
                          </div>
                        );
                      })()}
                      </>
                    )}
                  </div>

                  {/* Reaction counts */}
                  {Object.keys(reactionCounts).length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                      {Object.entries(reactionCounts).map(([emoji, count]) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleMsgReact(msg.id, emoji)}
                          style={{
                            background: 'rgba(255,255,255,0.07)',
                            border: '1px solid var(--border)',
                            borderRadius: '20px',
                            padding: '2px 8px',
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: 'var(--text-primary)',
                            fontFamily: 'inherit',
                            transition: '0.15s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.08)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                        >
                          <span>{emoji}</span>
                          {count > 1 && <span style={{ fontSize: '11px', fontWeight: 600 }}>{count}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Context menu */}
      {contextMenu && (
        <MessageMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isMine={String(contextMenu.msg.userId) === String(user.id)}
          isPinned={contextMenu.msg.isPinned}
          canPin={
            String(user.id) === String(group?.creatorId) ||
            String(user.id) === String(group?.deputyId) ||
            String(contextMenu.msg.userId) === String(user.id)
          }
          onDelete={() => handleMsgDelete(contextMenu.msg.id)}
          onPin={() => handleMsgPin(contextMenu.msg.id)}
          onReply={() =>
            setReplyTo({
              id: contextMenu.msg.id,
              userFullName: contextMenu.msg.userFullName,
              content:
                contextMenu.msg.content ||
                (contextMenu.msg.fileAttachment ? contextMenu.msg.fileAttachment.fileName : ''),
            })
          }
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Input area */}
      <form
        onSubmit={handleChatSubmit}
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border)',
          background: 'rgba(255,255,255,0.01)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          position: 'relative',
        }}
      >
        {/* Reply preview */}
        {replyTo && (
          <div
            style={{
              background: 'rgba(0,0,0,0.04)',
              border: '1.5px dashed rgba(0,0,0,0.2)',
              padding: '8px 14px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
            }}
          >
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 17 4 12 9 7" />
                  <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                </svg>
                Trả lời {replyTo.userFullName}
              </span>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                }}
              >
                {replyTo.content}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: '16px', fontWeight: 700, flexShrink: 0 }}
            >
              ✕
            </button>
          </div>
        )}

        {/* File attachment preview */}
        {chatAttachedFile && (
          <div
            style={{
              background: 'rgba(0,0,0,0.04)',
              border: '1.5px dashed var(--border)',
              padding: '8px 14px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-primary)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              </div>
              <div>
                <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{chatAttachedFile.name}</strong>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                  ({formatBytes(chatAttachedFile.size)})
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={removeChatAttachment}
              style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: '16px', fontWeight: 700 }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Input row */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Emoji picker */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => {
                const picker = document.getElementById('emoji-picker-popup');
                if (picker) picker.style.display = picker.style.display === 'none' ? 'flex' : 'none';
              }}
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                width: '40px',
                height: '40px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                flexShrink: 0,
                color: 'var(--text-muted)',
              }}
              title="Chèn emoji"
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M8 13s1.5 2 4 2 4-2 4-2"/>
                <line x1="9" y1="9" x2="9.01" y2="9"/>
                <line x1="15" y1="9" x2="15.01" y2="9"/>
              </svg>
            </button>
            <div
              id="emoji-picker-popup"
              style={{
                display: 'none',
                position: 'absolute',
                bottom: '48px',
                left: 0,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                padding: '10px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                zIndex: 999,
                flexWrap: 'wrap',
                gap: '4px',
                width: '280px',
                maxHeight: '200px',
                overflowY: 'auto',
                overscrollBehavior: 'contain',
              }}
            >
              {EMOJI_LIST.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    const inp = chatInputRef.current;
                    if (inp) {
                      const start = inp.selectionStart;
                      const end = inp.selectionEnd;
                      const newVal = chatInput.substring(0, start) + emoji + chatInput.substring(end);
                      setChatInput(newVal);
                      setTimeout(() => {
                        inp.focus();
                        inp.setSelectionRange(start + emoji.length, start + emoji.length);
                      }, 0);
                    } else {
                      setChatInput((v) => v + emoji);
                    }
                    document.getElementById('emoji-picker-popup').style.display = 'none';
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '22px',
                    padding: '4px',
                    borderRadius: '6px',
                    lineHeight: 1,
                    transition: '0.1s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.06)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* File attach */}
          <label
            htmlFor="chat-file-input"
            style={{
              flexShrink: 0,
              cursor: 'pointer',
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              color: 'var(--text-muted)',
            }}
            title="Đính kèm file"
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
            <input type="file" id="chat-file-input" onChange={handleChatFileChange} style={{ display: 'none' }} />
          </label>

          {/* @ Mention dropdown */}
          {showMentionList && filteredMentions.length > 0 && (
            <div
              style={{
                position: 'absolute',
                bottom: '64px',
                left: '12px',
                right: '12px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                boxShadow: '0 -4px 24px rgba(0,0,0,0.4)',
                zIndex: 200,
                overflow: 'hidden',
                maxHeight: '220px',
                overflowY: 'auto',
                overscrollBehavior: 'contain',
              }}
            >
              <div style={{ padding: '6px 14px 4px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                THÀNH VIÊN
              </div>
              {filteredMentions.map((m) => {
                const initials = m.fullName?.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase() || '?';
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => insertMention(m)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.06)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 14px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                      transition: 'background 0.1s',
                    }}
                  >
                    {m.avatar ? (
                      <img src={m.avatar} alt={m.fullName} style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
                        {initials}
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{m.fullName}</div>
                      {m.email && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{m.email}</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Text input */}
          <input
            ref={chatInputRef}
            type="text"
            placeholder="Nhập tin nhắn... (@ để tag thành viên)"
            value={chatInput}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setShowMentionList(false); return; }
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (showMentionList && filteredMentions.length > 0) {
                  insertMention(filteredMentions[0]);
                } else {
                  handleChatSubmit(e);
                }
              }
            }}
            style={{
              flex: 1,
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              borderRadius: '20px',
              padding: '10px 16px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 0.2s',
              minWidth: 0,
            }}
            disabled={isSendingChatMessage}
            onClick={() => {
              const picker = document.getElementById('emoji-picker-popup');
              if (picker) picker.style.display = 'none';
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
          />

          {/* Send button */}
          <button
            type="submit"
            disabled={isSendingChatMessage || (!chatInput.trim() && !chatAttachedFile)}
            style={{
              flexShrink: 0,
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: 'none',
              background:
                chatInput.trim() || chatAttachedFile
                  ? 'linear-gradient(135deg, var(--primary), #3A3A3A)'
                  : 'var(--bg-input)',
              color: chatInput.trim() || chatAttachedFile ? 'white' : 'var(--text-muted)',
              cursor: chatInput.trim() || chatAttachedFile ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              opacity: chatInput.trim() || chatAttachedFile ? 1 : 0.4,
              boxShadow: chatInput.trim() || chatAttachedFile ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
            }}
            title="Gửi"
          >
            {isSendingChatMessage ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ animation: 'spin 1s linear infinite' }}
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
