import { useEffect, useRef } from 'react';

const EMOJI_LIST = [
  '😀','😂','😍','🥰','😎','🤩','😢','😭','😡','🤔',
  '😅','😇','🥳','😴','🤯','🥺','😏','😬','🤗','😤',
  '👍','👎','👏','🙏','🤝','✌️','🤞','💪','🫶','❤️',
  '🧡','💛','💚','💙','💜','🖤','🤍','💔','💯','🔥',
  '⭐','🌟','✨','🎉','🎊','🎁','🏆','🥇','🚀','💡',
  '😺','😸','🐶','🐱','🐸','🦄','🐼','🦊','🍎','🍕',
];

export default function EmojiPicker({ onSelect, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div 
      ref={ref} 
      style={{
        position: 'absolute', 
        bottom: '64px', 
        left: 0,
        background: 'var(--bg-card)', 
        border: '1px solid var(--border)',
        borderRadius: '16px', 
        padding: '12px',
        width: '320px', 
        height: '240px',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
        zIndex: 100, 
        display: 'flex', 
        flexDirection: 'column',
        animation: 'emojiFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div 
        style={{
          overflowY: 'auto', 
          overflowX: 'hidden', 
          flex: 1,
          display: 'grid', 
          gridTemplateColumns: 'repeat(8, 1fr)',
          gap: '4px',
          scrollbarWidth: 'thin', 
          scrollbarColor: 'var(--border) transparent',
          overscrollBehavior: 'contain',
        }}
      >
        {EMOJI_LIST.map(em => (
          <button 
            key={em} 
            onClick={() => onSelect(em)} 
            onMouseDown={e => e.preventDefault()} 
            style={{
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              fontSize: '22px', 
              padding: '6px', 
              borderRadius: '8px',
              transition: 'all 0.1s ease', 
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            {em}
          </button>
        ))}
      </div>
      <style>{`
        @keyframes emojiFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
