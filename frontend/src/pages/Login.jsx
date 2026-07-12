import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { login, signInWithGoogle, signInWithGoogleNative } from '../services/authService';
import { SafeInput } from '@/components/common/SafeInput';
import { useAuth } from '../context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import studyconectLogo from '@/assets/studyconect_logo.png';

export default function Login() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const { addToast } = useToast();
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const errType = searchParams.get('error');
    const errMsg = searchParams.get('message');
    if (errType) {
      if (errType === 'sync_failed') {
        setError(`Đồng bộ tài khoản Google thất bại: ${errMsg || 'Lỗi không xác định'}`);
      } else if (errType === 'no_session') {
        setError(`Không tìm thấy phiên đăng nhập Google: ${errMsg || 'Session không tồn tại'}`);
      } else {
        setError(`Đăng nhập Google thất bại: ${errMsg || errType}`);
      }
    }
  }, [searchParams]);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Vui lòng nhập đầy đủ thông tin.');
      return;
    }

    setLoading(true);
    try {
      const { user } = await login(form);
      if (user.role === 'admin') {
        setError('Tài khoản Quản trị viên không được phép đăng nhập tại trang dành cho học sinh. Vui lòng truy cập trang /admin.');
        return;
      }
      setUser(user);
      addToast('Đăng nhập thành công! Chào mừng bạn quay trở lại.', 'success');
      sessionStorage.setItem('sc_fireworks', '1');
      sessionStorage.setItem('sc_fireworks_name', user.fullName?.split(' ').pop() || '');
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      if (Capacitor.isNativePlatform()) {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '1041742440704-j966ktttu2jjp1kjl6eqtbbqr47cpciv.apps.googleusercontent.com';
        GoogleAuth.initialize({
          clientId: clientId,
          scopes: ['profile', 'email'],
          grantOfflineAccess: true,
        });

        const googleUser = await GoogleAuth.signIn();
        const idToken = googleUser?.authentication?.idToken;
        if (!idToken) {
          throw new Error('Không nhận được token xác thực từ Google.');
        }

        const { user: loggedInUser, isNewUser } = await signInWithGoogleNative(idToken);
        setUser(loggedInUser);
        addToast(isNewUser ? 'Hãy hoàn tất hồ sơ để hoàn thành đăng ký.' : 'Đăng nhập thành công!', isNewUser ? 'info' : 'success');

        if (isNewUser) {
          localStorage.setItem('sc_pending_profile_id', String(loggedInUser.id));
          navigate('/complete-profile', { replace: true });
        } else {
          sessionStorage.setItem('sc_fireworks', '1');
          sessionStorage.setItem('sc_fireworks_name', loggedInUser.fullName?.split(' ').pop() || '');
          navigate('/');
        }
      } else {
        await signInWithGoogle();
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('Google Native Login Error:', err);
      if (err.message?.includes('user cancelled') || err.message?.includes('cancelled')) {
        setError('Đăng nhập đã bị hủy.');
      } else {
        setError(err.message || 'Không thể đăng nhập bằng Google.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <img src={studyconectLogo} alt="Logo" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
          </div>
          <div className="auth-logo-text">
            <h2>StudyConnect</h2>
            <span>Học nhóm hiệu quả hơn</span>
          </div>
        </div>

        {/* Header */}
        <div className="auth-header">
          <h1>Chào mừng trở lại! </h1>
          <p>Đăng nhập để tiếp tục học tập cùng nhóm</p>
        </div>

        {/* Error */}
        {error && (
          <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" x2="12" y1="8" y2="12"/>
              <line x1="12" x2="12.01" y1="16" y2="16"/>
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Email</label>
            <div className="form-input-wrap">
              <SafeInput
                id="login-email"
                name="email"
                type="email"
                className="form-input"
                placeholder="Nhập email của bạn"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
              />
              <span className="input-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Mật khẩu</label>
            <div className="form-input-wrap">
              <SafeInput
                id="login-password"
                name="password"
                type={showPass ? 'text' : 'password'}
                className="form-input"
                placeholder="Nhập mật khẩu"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
              />
              <span className="input-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPass(v => !v)}
                tabIndex={-1}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {showPass ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                )}
              </button>
            </div>
            <Link to="/forgot-password" className="forgot-link">Quên mật khẩu?</Link>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <span className="spinner" /> : null}
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '20px 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>HOẶC</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'all 0.2s',
              outline: 'none'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'var(--text-muted)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-input)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
            Tiếp tục với Google
          </button>

        </form>

        <div className="auth-footer">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="auth-link">Đăng ký ngay</Link>
        </div>
      </div>
    </div>
  );
}