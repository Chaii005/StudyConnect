// TODO: App hiện có 2 hệ thống toast (Toast.jsx và ToastContext.jsx) làm việc tương tự nhau.
// Nên hợp nhất thành 1 trong lần refactor sau để tránh nhầm lẫn — không làm trong task này.
import { createContext, useContext, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const ToastContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const navigate = useNavigate();

  const dismissToast = useCallback((id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isDismissing: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  const addToast = useCallback((message, type = 'success', duration = 6000, link = null) => {
    const id = Date.now();
    // Replace any existing toast instantly (only show 1 at a time)
    setToasts([{ id, message, type, link, isDismissing: false }]);
    
    // Auto-remove after duration (default 6 seconds)
    setTimeout(() => {
      dismissToast(id);
    }, duration);
  }, [dismissToast]);

  const removeToast = useCallback((id) => {
    dismissToast(id);
  }, [dismissToast]);

  return (
    <ToastContext.Provider value={{ addToast, toasts }}>
      {children}
      
      {/* Toast Overlay Container */}
      <div 
        style={{
          position: 'fixed',
          top: '92px',
          right: '20px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          pointerEvents: 'none'
        }}
      >
        {toasts.map((toast) => {
          const isError = toast.type === 'error';
          const isWarning = toast.type === 'warning';
          
          let icon = (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          );
          if (isError) {
            icon = (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            );
          } else if (isWarning) {
            icon = (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            );
          }

          return (
            <div
              key={toast.id}
              style={{
                pointerEvents: 'auto',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: isError 
                  ? '1px solid rgba(239, 68, 68, 0.3)' 
                  : isWarning 
                  ? '1px solid rgba(245, 158, 11, 0.3)' 
                  : '1px solid var(--border)',
                padding: '12px 18px',
                borderRadius: '12px',
                boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '13.5px',
                fontWeight: 600,
                minWidth: '300px',
                maxWidth: '420px',
                cursor: toast.link ? 'pointer' : 'default',
                animation: toast.isDismissing 
                  ? 'slideOut 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55) forwards'
                  : 'slideIn 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55) forwards',
                position: 'relative',
                overflow: 'hidden',
                transition: 'transform 0.2s ease'
              }}
              onClick={() => {
                if (toast.link) {
                  navigate(toast.link);
                  dismissToast(toast.id);
                }
              }}
            >
              {/* Custom keyframes injection for slideIn/slideOut */}
              <style>{`
                @keyframes slideIn {
                  from { transform: translateX(120%); opacity: 0; }
                  to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                  from { transform: translateX(0); opacity: 1; }
                  to { transform: translateX(120%); opacity: 0; }
                }
              `}</style>

              {icon}
              <span style={{ flex: 1, lineHeight: 1.4 }}>{toast.message}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevent trigger link navigation on click close
                  removeToast(toast.id);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '16px',
                  padding: '0 4px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = 0.7; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = 1; }}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
