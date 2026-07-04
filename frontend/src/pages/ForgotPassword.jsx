// src/pages/ForgotPassword.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../services/authService';
import studyconectLogo from '@/assets/studyconect_logo.png';

export default function ForgotPassword() {
  const [mode, setMode] = useState('forgot'); // 'forgot' | 'sent'
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleForgot = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }
    setLoading(true);
    try {
      await forgotPassword(email);
      setMessage('Liên kết khôi phục mật khẩu đã được gửi thành công. Vui lòng kiểm tra hộp thư email của bạn (bao gồm cả thư rác/spam).');
      setMode('sent');
    } catch (err) {
      setError(err.message || 'Gửi yêu cầu thất bại.');
    } finally {
      setLoading(false);
    }
  };

  // Progress Steps Bar Renderer
  const renderSteps = (currentStep) => {
    const steps = [
      { title: 'Nhập Email', modeKey: 'forgot' },
      { title: 'Gửi Email', modeKey: 'sent' }
    ];
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', padding: '0 8px', position: 'relative' }}>
        {/* Progress Line */}
        <div style={{ position: 'absolute', top: '15px', left: '32px', right: '32px', height: '2px', background: 'rgba(255,255,255,0.06)', zIndex: 0 }}>
          <div style={{
            height: '100%',
            background: 'linear-gradient(to right, var(--primary-light), var(--secondary))',
            width: currentStep === 'forgot' ? '0%' : '100%',
            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
          }} />
        </div>
        
        {steps.map((s, idx) => {
          const isCompleted = currentStep === 'sent' && idx < 1;
          const isActive = (currentStep === 'forgot' && idx === 0) || (currentStep === 'sent' && idx === 1);
          
          return (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, gap: '6px' }}>
              <div style={{
                width: '32px', height: '32px',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isCompleted || isActive ? 'linear-gradient(135deg, var(--primary), var(--secondary))' : 'rgba(20,20,35,0.8)',
                border: isActive ? '2.5px solid rgba(255,255,255,0.8)' : isCompleted ? 'none' : '1px solid rgba(255,255,255,0.1)',
                color: isCompleted || isActive ? '#fff' : 'var(--text-muted)',
                fontSize: '12px', fontWeight: 800,
                boxShadow: isActive ? '0 0 16px rgba(0, 0, 0, 0.25)' : 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}>
                {isCompleted ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : idx + 1}
              </div>
              <span style={{
                fontSize: '11px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                transition: 'all 0.3s'
              }}>
                {s.title}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="auth-page">
      {/* Dynamic Background blobs */}
      <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(0,0,0,0.02) 0%, transparent 60%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(17,24,39,0.03) 0%, transparent 60%)', pointerEvents: 'none' }} />

      <div className="auth-card" style={{ animation: 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)', backdropFilter: 'blur(20px)' }}>
        {/* Brand Header */}
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <img src={studyconectLogo} alt="Logo" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
          </div>
          <div className="auth-logo-text">
            <h2>StudyConnect</h2>
            <span>Học nhóm hiệu quả hơn</span>
          </div>
        </div>

        {/* Step progress */}
        {renderSteps(mode)}

        {/* Global Error message */}
        {error && (
          <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', animation: 'shake 0.3s ease' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" x2="12" y1="8" y2="12"/>
              <line x1="12" x2="12.01" y1="16" y2="16"/>
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Email Form */}
        {mode === 'forgot' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className="auth-header" style={{ marginBottom: '24px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>Quên mật khẩu?</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', lineHeight: 1.5 }}>Nhập email liên kết với tài khoản của bạn. Chúng tôi sẽ gửi hướng dẫn khôi phục mật khẩu.</p>
            </div>

            <form onSubmit={handleForgot} noValidate>
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label" htmlFor="forgot-email" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Email tài khoản</label>
                <div className="form-input-wrap" style={{ position: 'relative' }}>
                  <span className="input-icon" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', color: 'var(--text-muted)', transition: 'color 0.2s' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="16" x="2" y="4" rx="2"/>
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                    </svg>
                  </span>
                  <input
                    id="forgot-email"
                    type="email"
                    className="form-input"
                    placeholder="example@email.com"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(''); }}
                    style={{ width: '100%', padding: '12px 16px 12px 42px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', transition: 'all 0.2s' }}
                    onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.08)'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--primary), var(--primary-light))', border: 'none', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.15)', transition: 'all 0.25s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.15)'; }}
              >
                {loading ? <span className="spinner" style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> : null}
                {loading ? 'Đang gửi...' : 'Gửi link khôi phục'}
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: Success Sent */}
        {mode === 'sent' && (
          <div style={{ animation: 'fadeIn 0.3s ease', textAlign: 'center' }}>
            <div className="success-checkmark" style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--success)', filter: 'drop-shadow(0 0 8px rgba(16,185,129,0.3))' }}>
                <circle cx="12" cy="12" r="10" fill="rgba(16,185,129,0.1)"/>
                <polyline points="7.5 12 10.5 15 16.5 9" />
              </svg>
            </div>

            <div className="auth-header" style={{ marginBottom: '24px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Đã gửi email khôi phục
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', lineHeight: 1.6 }}>
                {message}
              </p>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setMode('forgot')}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '13.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-input)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" x2="5" y1="12" y2="12"/>
                <polyline points="12 19 5 12 12 5"/>
              </svg>
              Gửi lại yêu cầu
            </button>
          </div>
        )}

        {/* Card Footer Link */}
        <div className="auth-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '24px', paddingTop: '18px', textAlign: 'center' }}>
          <Link
            to="/login"
            className="auth-link"
            style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '13px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--primary-light)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" x2="5" y1="12" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
            Quay lại đăng nhập
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(28px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .form-input:focus ~ .input-icon {
          color: var(--primary-light) !important;
        }
      `}</style>
    </div>
  );
}