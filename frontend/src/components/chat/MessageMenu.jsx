import { useState, useEffect, useRef } from 'react';

function MenuBtn({ icon, label, onClick, danger }) {
  const [hov, setHov] = useState(false);
  return (
    <button 
      onClick={onClick}
      onMouseEnter={() => setHov(true)} 
      onMouseLeave={() => setHov(false)}
      style={{
        width: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '10px',
        padding: '10px 12px', 
        borderRadius: '10px', 
        border: 'none', 
        cursor: 'pointer',
        background: hov ? (danger ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-input)') : 'none',
        color: danger ? '#ef4444' : 'var(--text-primary)',
        fontSize: '13.5px', 
        fontWeight: 700, 
        fontFamily: 'inherit', 
        textAlign: 'left',
        transition: 'all 0.15s ease',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '16px', height: '16px', color: 'inherit' }}>
        {icon}
      </span>
      {label}
    </button>
  );
}

export default function MessageMenu({ clientX, clientY, msg, onSaveImage, onShare, onDelete, onClose, isMine }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ top: clientY - 60, left: clientX });
  const isImage = msg?.type === 'image' || msg?.content?.startsWith('data:image');

  useEffect(() => {
    const handle = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [onClose]);

  // Adjust to keep menu inside viewport
  useEffect(() => {
    if (!ref.current) return;
    const menuW = ref.current.offsetWidth || 190;
    const menuH = ref.current.offsetHeight || 120;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const PADDING = 12;
    let left = clientX;
    let top = clientY - menuH - 8;

    if (left + menuW + PADDING > vw) left = vw - menuW - PADDING;
    if (left < PADDING) left = PADDING;
    if (top < PADDING) top = clientY + 12;
    if (top + menuH + PADDING > vh) top = vh - menuH - PADDING;

    setPos({ top, left });
  }, [clientX, clientY]);

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed', 
        top: pos.top, 
        left: pos.left,
        background: 'var(--bg-card)', 
        border: '1px solid var(--border)',
        borderRadius: '16px', 
        padding: '6px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
        zIndex: 9999, 
        minWidth: '190px',
        animation: 'menuFadeIn 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <MenuBtn 
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"/>
            <circle cx="6" cy="12" r="3"/>
            <circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
        } 
        label="Chia sẻ" 
        onClick={() => { onShare(); onClose(); }} 
      />
      
      {isImage && (
        <MenuBtn 
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          } 
          label="Lưu ảnh" 
          onClick={() => { onSaveImage(); onClose(); }} 
        />
      )}
      
      {isMine && (
        <MenuBtn 
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          } 
          label="Xóa tin nhắn" 
          danger 
          onClick={() => { onDelete(); onClose(); }} 
        />
      )}
      <style>{`
        @keyframes menuFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
