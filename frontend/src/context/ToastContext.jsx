// TODO: App hiện có 2 hệ thống toast (Toast.jsx và ToastContext.jsx) làm việc tương tự nhau.
// Nên hợp nhất thành 1 trong lần refactor sau để tránh nhầm lẫn — không làm trong task này.
import { createContext, useContext, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

function stripEmojis(str) {
  if (!str || typeof str !== 'string') return str;
  return str
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, '')
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
    .replace(/[\u{1F000}-\u{1F02F}]/gu, '')
    .replace(/[\u{1F0A0}-\u{1F0FF}]/gu, '')
    .replace(/[\u{1F100}-\u{1F1FF}]/gu, '')
    .replace(/[\u{1F200}-\u{1F2FF}]/gu, '')
    .replace(/[\u{1FA00}-\u{1FAFF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

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
      <div className="toast-container">
        {toasts.map((toast) => {
          const msgLower = (toast.message || '').toLowerCase();
          const isError = toast.type === 'error' || toast.type === 'warning' || toast.type === 'delete' || toast.type === 'cancel' ||
                          msgLower.includes('xóa') || msgLower.includes('hủy') || msgLower.includes('từ chối') || msgLower.includes('lỗi') || msgLower.includes('thất bại');
          const isSuccess = toast.type === 'success' || toast.type === 'approve' || toast.type === 'accept' ||
                            msgLower.includes('duyệt') || msgLower.includes('thành công') || msgLower.includes('chấp nhận');
          const isMessage = toast.type === 'message';
          
          let borderLeftColor = '#000000';
          if (isError) {
            borderLeftColor = '#ef4444';
          } else if (isSuccess) {
            borderLeftColor = '#22c55e';
          } else if (isMessage) {
            borderLeftColor = '#3b82f6';
          }

          return (
            <div
              key={toast.id}
              className={`toast-card ${toast.isDismissing ? 'dismissing' : ''}`}
              style={{
                border: '1px solid var(--border)',
                borderLeft: `4px solid ${borderLeftColor}`,
                cursor: toast.link ? 'pointer' : 'default',
              }}
              onClick={() => {
                if (toast.link) {
                  navigate(toast.link);
                  dismissToast(toast.id);
                }
              }}
            >
              <span style={{ flex: 1, lineHeight: 1.4 }}>{stripEmojis(toast.message)}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeToast(toast.id);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  padding: '2px 4px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'opacity 0.2s',
                  lineHeight: 1,
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = 0.6; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = 1; }}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
      <style>{`
        .toast-container {
          position: fixed;
          top: 92px;
          right: 20px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 10px;
          pointer-events: none;
        }
        .toast-card {
          pointer-events: auto;
          background: var(--bg-card);
          color: var(--text-primary);
          padding: 12px 18px;
          border-radius: 12px;
          box-shadow: 0 12px 40px rgba(0,0,0,0.12);
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 13.5px;
          font-weight: 600;
          min-width: 300px;
          max-width: 420px;
          position: relative;
          overflow: hidden;
          transition: transform 0.2s ease;
          animation: slideIn 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55) forwards;
        }
        .toast-card.dismissing {
          animation: slideOut 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55) forwards;
        }
        
        @keyframes slideIn {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(120%); opacity: 0; }
        }
        
        @media (max-width: 576px) {
          .toast-container {
            top: 80px;
            left: auto;
            right: 16px;
            align-items: flex-end;
          }
          .toast-card {
            min-width: 0;
            width: auto;
            max-width: 290px;
            margin: 0;
            padding: 8px 14px;
            border-radius: 30px;
            font-size: 12.5px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.15);
            box-sizing: border-box;
            animation: slideInMobile 0.3s ease forwards;
          }
          .toast-card.dismissing {
            animation: slideOutMobile 0.3s ease forwards;
          }
        }
        
        .is-native-app .toast-container {
          top: 105px !important;
        }
        
        @keyframes slideInMobile {
          from { transform: translateX(50px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutMobile {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(50px); opacity: 0; }
        }
      `}</style>
    </ToastContext.Provider>
  );
};
