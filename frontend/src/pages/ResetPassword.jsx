// src/pages/ResetPassword.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import { hashPassword } from '../services/authService';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    setLoading(true);
    try {
      // 1. Get current logged in user from recovery session
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
      if (userError || !authUser || !authUser.email) {
        throw new Error('Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
      }

      // 2. Hash the new password and update public.users
      const hashedPasswordValue = await hashPassword(password, authUser.email);
      const { error: dbError } = await supabase
        .from('users')
        .update({ password: hashedPasswordValue })
        .eq('email', authUser.email.toLowerCase().trim());

      if (dbError) {
        throw new Error(`Cập nhật cơ sở dữ liệu thất bại: ${dbError.message}`);
      }

      // 3. Update password in Supabase Auth
      const { error: authError } = await supabase.auth.updateUser({ password });
      if (authError) throw authError;

      setSuccess(true);
      // Wait 3 seconds and navigate to login
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.message || 'Đặt lại mật khẩu thất bại.');
    } finally {
      setLoading(false);
    }
  };

  // Progress Steps Bar Renderer
  const renderSteps = (currentStep) => {
    const steps = [
      { title: 'Gửi Email' },
      { title: 'Đặt mật khẩu' }
    ];
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', padding: '0 8px', position: 'relative' }}>
        {/* Progress Line */}
        <div style={{ position: 'absolute', top: '15px', left: '32px', right: '32px', height: '2px', background: 'rgba(255,255,255,0.06)', zIndex: 0 }}>
          <div style={{
            height: '100%',
            background: 'linear-gradient(to right, var(--primary-light), var(--secondary))',
            width: currentStep === 'reset' ? '50%' : '100%',
            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
          }} />
        </div>
        
        {steps.map((s, idx) => {
          const isCompleted = currentStep === 'done' || (currentStep === 'reset' && idx < 1);
          const isActive = (currentStep === 'reset' && idx === 1);
          
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
                boxShadow: isActive ? '0 0 16px rgba(108, 99, 255, 0.45)' : 'none',
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
      <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(108,99,255,0.06) 0%, transparent 60%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(17,24,39,0.03) 0%, transparent 60%)', pointerEvents: 'none' }} />

      <div className="auth-card" style={{ animation: 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)', backdropFilter: 'blur(20px)' }}>
        {/* Brand Header */}
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <img src="/studyconect_logo.png" alt="Logo" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
          </div>
          <div className="auth-logo-text">
            <h2>Studyconect</h2>
            <span>Học nhóm hiệu quả hơn</span>
          </div>
        </div>

        {/* Step progress */}
        {renderSteps(success ? 'done' : 'reset')}

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

        {!success ? (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className="auth-header" style={{ marginBottom: '20px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>Thiết lập mật khẩu mới</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', lineHeight: 1.5 }}>Nhập mật khẩu mới bảo mật cho tài khoản của bạn.</p>
            </div>

            <form onSubmit={handleReset} noValidate>
              {/* Password Input */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" htmlFor="new-pass" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Mật khẩu mới</label>
                <div className="form-input-wrap" style={{ position: 'relative' }}>
                  <span className="input-icon" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </span>
                  <input
                    id="new-pass"
                    type={showPass ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Mật khẩu từ 8 ký tự"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    style={{ width: '100%', padding: '12px 42px 12px 42px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', transition: 'all 0.2s' }}
                    onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(108,99,255,0.15)'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPass(v => !v)}
                    tabIndex={-1}
                    style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-muted)', transition: 'color 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                  >
                    {showPass ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
                        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
                        <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
                        <line x1="2" x2="22" y1="2" y2="22"/>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password Input */}
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label" htmlFor="confirm-new-pass" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Xác nhận mật khẩu mới</label>
                <div className="form-input-wrap" style={{ position: 'relative' }}>
                  <span className="input-icon" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </span>
                  <input
                    id="confirm-new-pass"
                    type={showPass ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Nhập lại mật khẩu mới"
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                    style={{ width: '100%', padding: '12px 16px 12px 42px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', transition: 'all 0.2s' }}
                    onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(108,99,255,0.15)'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--primary), var(--primary-light))', border: 'none', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(108,99,255,0.25)', transition: 'all 0.25s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(108,99,255,0.35)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(108,99,255,0.25)'; }}
              >
                {loading ? <span className="spinner" style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> : null}
                {loading ? 'Đang lưu...' : 'Xác nhận thay đổi'}
              </button>
            </form>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '16px 0', animation: 'scaleUpCheck 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
            <div className="success-checkmark" style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--success)', filter: 'drop-shadow(0 0 10px rgba(16,185,129,0.3))' }}>
                <circle cx="12" cy="12" r="10" fill="rgba(16,185,129,0.1)"/>
                <polyline points="7.5 12 10.5 15 16.5 9" />
              </svg>
            </div>
            
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '10px' }}>Thành công!</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '32px', lineHeight: 1.5 }}>Mật khẩu tài khoản của bạn đã được đặt lại thành công. Bạn đang được chuyển hướng về trang đăng nhập...</p>
            
            <Link
              to="/login"
              className="btn btn-primary"
              style={{ textDecoration: 'none', width: '100%', padding: '12px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--primary), var(--primary-light))', border: 'none', color: '#fff', fontWeight: 700, fontSize: '14.5px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(108,99,255,0.25)', transition: 'all 0.25s' }}
            >
              Đăng nhập ngay
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" x2="19" y1="12" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </Link>
          </div>
        )}
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
        @keyframes scaleUpCheck {
          0% { transform: scale(0.85); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
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
