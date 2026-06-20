import { useEffect, useRef, useState } from 'react';

export default function MessageMenu({ x, y, isMine, isPinned, canPin, onDelete, onReply, onPin, onClose }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ top: y, left: x });

  useEffect(() => {
    const handle = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [onClose]);

  useEffect(() => {
    if (!ref.current) return;
    const parent = ref.current.offsetParent;
    const menuW = ref.current.offsetWidth || 200;
    const menuH = ref.current.offsetHeight || (isMine ? 160 : 120);
    const containerW = parent ? parent.offsetWidth : window.innerWidth;
    const containerH = parent ? parent.offsetHeight : window.innerHeight;
    const PADDING = 8;

    let left = x;
    let top = y;

    if (left + menuW + PADDING > containerW) left = containerW - menuW - PADDING;
    if (left < PADDING) left = PADDING;
    if (top + menuH + PADDING > containerH) top = containerH - menuH - PADDING;
    if (top < PADDING) top = PADDING;

    setPos({ top, left });
  }, [x, y, isMine]);

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        top: pos.top,
        left: pos.left,
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '14px',
        padding: '8px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        zIndex: 100,
        minWidth: '180px',
        animation: 'fadeIn 0.12s ease',
      }}
    >
      {/* Actions */}
      <button
        onClick={() => {
          onReply();
          onClose();
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(108,99,255,0.1)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 10px',
          borderRadius: '8px',
          border: 'none',
          cursor: 'pointer',
          background: 'none',
          color: 'var(--text-primary)',
          fontSize: '13px',
          fontWeight: 600,
          fontFamily: 'inherit',
          textAlign: 'left',
          transition: 'background 0.12s',
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <polyline points="9 17 4 12 9 7" />
          <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
        </svg>
        Trả lời
      </button>

      {canPin && (
        <button
          onClick={() => {
            onPin();
            onClose();
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(108,99,255,0.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 10px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            background: 'none',
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontWeight: 600,
            fontFamily: 'inherit',
            textAlign: 'left',
            transition: 'background 0.12s',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <line x1="18" y1="8" x2="22" y2="12" />
            <line x1="12" y1="2" x2="22" y2="12" />
            <path d="M12 2 2 12h5l9 9v-5l5-5Z" />
          </svg>
          {isPinned ? 'Bỏ ghim tin nhắn' : 'Ghim tin nhắn'}
        </button>
      )}

      {isMine && (
        <button
          onClick={() => {
            onDelete();
            onClose();
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 10px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            background: 'none',
            color: '#ef4444',
            fontSize: '13px',
            fontWeight: 600,
            fontFamily: 'inherit',
            textAlign: 'left',
            transition: 'background 0.12s',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
          Xóa tin nhắn
        </button>
      )}
    </div>
  );
}
