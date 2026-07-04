import { useState } from 'react';
import Avatar from '../common/Avatar';

export default function ShareModal({ message, friends, onSend, onClose }) {
  const [selected, setSelected] = useState([]);
  const [sent, setSent] = useState(false);

  const toggle = (uid) => 
    setSelected(prev => 
      prev.includes(uid) ? prev.filter(x => x !== uid) : [...prev, uid]
    );

  const handleSend = async () => {
    if (selected.length === 0) return;
    await Promise.all(selected.map(uid => onSend(uid, message)));
    setSent(true);
    setTimeout(onClose, 1200);
  };

  return (
    <div 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        background: 'rgba(10, 10, 20, 0.75)', 
        backdropFilter: 'blur(12px)',
        zIndex: 9999, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '20px',
        animation: 'shareFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }} 
      onClick={onClose}
    >
      <div 
        style={{ 
          background: 'var(--bg-card)', 
          border: '1px solid var(--border)',
          borderRadius: '24px', 
          padding: '24px', 
          width: '380px', 
          maxWidth: '100%', 
          maxHeight: '80vh', 
          display: 'flex', 
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)',
        }} 
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/>
              <circle cx="6" cy="12" r="3"/>
              <circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            Chia sẻ tin nhắn
          </h3>
          <button 
            onClick={onClose} 
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer', 
              fontSize: '18px', 
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            ✕
          </button>
        </div>

        {/* Preview content */}
        <div 
          style={{ 
            background: 'var(--bg-input)', 
            border: '1px solid var(--border)',
            borderRadius: '12px', 
            padding: '12px 16px', 
            marginBottom: '18px', 
            fontSize: '13.5px', 
            color: 'var(--text-secondary)', 
            maxHeight: '80px', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis',
            lineHeight: 1.4,
          }}
        >
          {message.type === 'image' || message.content?.startsWith('data:image') ? '🖼️ Hình ảnh' : message.content}
        </div>

        <div 
          style={{ 
            flex: 1, 
            overflowY: 'auto', 
            overscrollBehavior: 'contain', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '8px', 
            marginBottom: '18px',
            paddingRight: '4px',
          }}
        >
          {friends.map(f => {
            const isSelected = selected.includes(String(f.userId));
            return (
              <button 
                key={f.userId} 
                onClick={() => toggle(String(f.userId))} 
                style={{
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  padding: '10px 12px',
                  borderRadius: '12px', 
                  border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                  background: isSelected ? 'var(--bg-input)' : 'transparent',
                  cursor: 'pointer', 
                  textAlign: 'left', 
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'var(--bg-input)';
                    e.currentTarget.style.borderColor = 'var(--text-secondary)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }
                }}
              >
                <Avatar src={f.avatar} initial={f.initial} size={36} />
                <span style={{ flex: 1, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{f.fullName}</span>
                <div 
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isSelected ? 'var(--primary)' : 'transparent',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {isSelected && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <button 
          onClick={handleSend} 
          disabled={selected.length === 0 || sent} 
          style={{
            padding: '14px', 
            background: sent 
              ? 'linear-gradient(135deg, #10b981, #059669)' 
              : selected.length > 0 
                ? 'linear-gradient(135deg, var(--primary), var(--primary-light))' 
                : 'var(--bg-input)',
            border: 'none', 
            borderRadius: '14px', 
            color: selected.length > 0 || sent ? 'white' : 'var(--text-muted)',
            fontWeight: 800, 
            fontFamily: 'inherit', 
            cursor: selected.length > 0 && !sent ? 'pointer' : 'default', 
            fontSize: '14px', 
            transition: 'all 0.2s',
            boxShadow: selected.length > 0 && !sent ? '0 4px 12px rgba(0, 0, 0, 0.15)' : 'none',
            transform: 'translateY(0)',
          }}
          onMouseDown={e => { if (selected.length > 0 && !sent) e.currentTarget.style.transform = 'translateY(1px)'; }}
          onMouseUp={e => { if (selected.length > 0 && !sent) e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          {sent ? 'Đã gửi!' : `Gửi tin nhắn${selected.length > 0 ? ` (${selected.length})` : ''}`}
        </button>
      </div>
      <style>{`
        @keyframes shareFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
