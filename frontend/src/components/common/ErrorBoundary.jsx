// src/components/common/ErrorBoundary.jsx
// React Error Boundary — ngăn toàn app crash khi 1 component lỗi

import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log lỗi nếu cần gửi lên error tracking service
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, errorInfo);
    }
  }

  handleReset = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '300px',
            padding: '40px',
            textAlign: 'center',
            gap: '16px',
          }}
        >
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 10px rgba(239,68,68,0.35))' }}>
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Đã xảy ra lỗi hệ thống
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '400px' }}>
            Ứng dụng đã gặp sự cố ngoài ý muốn. Vui lòng tải lại trang để thử lại.
          </div>
          <button
            onClick={this.handleReset}
            style={{
              padding: '10px 24px',
              background: 'linear-gradient(135deg, var(--primary), #3A3A3A)',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '14px',
            }}
          >
            Tải lại trang
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
