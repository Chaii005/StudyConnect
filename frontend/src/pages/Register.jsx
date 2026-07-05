// src/pages/Register.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register, signInWithGoogle } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { HCM_UNIVERSITIES, MAJORS } from '../constants/educationData';
import { VIETNAM_LOCATIONS } from '../constants/locationData';
import studyconectLogo from '@/assets/studyconect_logo.png';

/* ─── LocationModal: Nổi trên web, lướt nội dung, không bể khung ─── */
function LocationModal({ isOpen, onClose, title, options, value, onSelect }) {
  const [search, setSearch] = useState('');

  // Reset search khi mở modal
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isOpen) setSearch('');
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = options.filter(opt =>
    opt.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10, 10, 20, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1.5px solid var(--border)',
          borderRadius: '20px',
          padding: '24px',
          width: '380px',
          maxWidth: '100%',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '75vh',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              background: 'var(--bg-input)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--border)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-input)'}
          >
            ✕
          </button>
        </div>

        {/* Ô tìm kiếm nhanh */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'var(--bg-input)', border: '1.5px solid var(--border)',
          borderRadius: '12px', padding: '10px 14px', marginBottom: '16px',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.3-4.3"/>
          </svg>
          <input
            placeholder="Tìm kiếm nhanh..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ background: 'none', border: 'none', outline: 'none', flex: 1, color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'inherit' }}
          />
        </div>

        {/* Danh sách lựa chọn cuộn mượt */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          marginRight: '-6px',
          paddingRight: '6px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--border) transparent',
        }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
              Không tìm thấy kết quả phù hợp.
            </div>
          ) : (
            filtered.map(opt => {
              const isSelected = opt === value;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { onSelect(opt); onClose(); }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    textAlign: 'left',
                    background: isSelected ? 'var(--text-primary)' : 'var(--bg-input)',
                    border: isSelected ? 'none' : '1px solid var(--border)',
                    borderRadius: '12px',
                    color: isSelected ? '#fff' : 'var(--text-secondary)',
                    fontSize: '14px',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)';
                      e.currentTarget.style.borderColor = 'var(--text-muted)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'var(--bg-input)';
                      e.currentTarget.style.borderColor = 'var(--border)';
                    }
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{opt}</span>
                    {isSelected && <span style={{ fontSize: '14px' }}>✓</span>}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const { addToast } = useToast();

  const [form, setForm] = useState({
    fullName: '', email: '', password: '', confirmPassword: '',
    university: '', major: '', customUniversity: '', customMajor: '',
  });
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');

  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [success, setSuccess] = useState(false);
  const [registeredName, setRegisteredName] = useState('');

  // States mở/đóng Modal chọn vị trí
  const [openProvinceModal, setOpenProvinceModal] = useState(false);
  const [openDistrictModal, setOpenDistrictModal] = useState(false);
  const [openUniversityModal, setOpenUniversityModal] = useState(false);
  const [openMajorModal, setOpenMajorModal] = useState(false);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const validateStep1 = () => {
    if (!form.fullName.trim() || form.fullName.trim().length < 2) {
      setError('Họ tên phải có ít nhất 2 ký tự.'); return false;
    }
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) {
      setError('Email không hợp lệ.'); return false;
    }
    if (!form.password || form.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.'); return false;
    }
    if (form.password !== form.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.'); return false;
    }
    return true;
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (validateStep1()) { setError(''); setStep(2); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const bio = (province && district)
        ? `[📍 ${province}, ${district}]`
        : '';

      const payload = {
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        university: form.university === 'Trường khác...' ? form.customUniversity : form.university,
        major: form.major === 'Ngành khác...' ? form.customMajor : form.major,
        bio,
      };
      const { user, needsConfirmation } = await register(payload);
      setUser(user);
      setRegisteredName(form.fullName.trim().split(' ').pop()); // Lấy tên (từ cuối)
      setSuccess(true);
      addToast('Đăng ký tài khoản thành công! Vui lòng kiểm tra email để kích hoạt tài khoản.', 'success');
      
      // Tự navigate về login sau 10 giây để user đăng nhập sau khi xác thực email
      setTimeout(() => navigate('/login'), 10000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err.message || 'Không thể đăng ký bằng Google.');
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

        {/* SUCCESS SCREEN */}
        {success ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '20px 0 8px', animation: 'successFadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both'
          }}>
            {/* Animated mail icon circle */}
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1.5px solid var(--border)',
              boxShadow: 'none',
              marginBottom: '24px',
              animation: 'checkPop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s both'
            }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
                stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>

            <h2 style={{
              margin: '0 0 8px',
              fontSize: '22px', fontWeight: 800,
              color: 'var(--text-primary)',
              textAlign: 'center'
            }}>
              Xác thực email của bạn! ✉️
            </h2>

            <p style={{
              margin: '0 0 24px',
              fontSize: '14px', color: 'var(--text-secondary)',
              textAlign: 'center', lineHeight: 1.6, maxWidth: '320px'
            }}>
              Đăng ký thành công! Một email xác thực đã được gửi đến <strong>{form.email}</strong>. Vui lòng nhấp vào liên kết trong email để kích hoạt tài khoản của bạn.
            </p>

            <button
              onClick={() => navigate('/login')}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                background: 'var(--text-primary)',
                color: '#fff',
                border: 'none',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                marginBottom: '20px',
                boxShadow: 'none'
              }}
            >
              Quay lại Đăng nhập
            </button>

            {/* Progress bar auto-redirect */}
            <div style={{
              width: '100%', height: '4px', borderRadius: '4px',
              background: 'var(--bg-input)', overflow: 'hidden'
            }}>
              <div style={{
                height: '100%', borderRadius: '4px',
                background: 'var(--primary)',
                animation: 'progressFill 10s linear forwards',
                boxShadow: 'none'
              }} />
            </div>
            <p style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
              Đang chuyển hướng về trang Đăng nhập sau vài giây...
            </p>
          </div>
        ) : (<>

        {/* Header */}
        <div className="auth-header">
          <h1>Tạo tài khoản mới </h1>
          <p>
            {step === 1 ? 'Bước 1/2 – Thông tin đăng nhập' : 'Bước 2/2 – Học tập & Khu vực (tuỳ chọn)'}
          </p>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {[1, 2].map(s => (
            <div key={s} style={{
              flex: 1, height: '4px', borderRadius: '4px',
              background: s <= step ? 'var(--primary)' : 'var(--bg-input)',
              transition: 'all 0.3s ease'
            }} />
          ))}
        </div>

        {error && (
          <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1 */}
        {step === 1 && (
          <form onSubmit={handleNext} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-name">Họ và tên</label>
              <div className="form-input-wrap">
                <input id="reg-name" name="fullName" type="text" className="form-input"
                  placeholder="Họ và tên đầy đủ của bạn" value={form.fullName} onChange={handleChange} />
                <span className="input-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-email">Email</label>
              <div className="form-input-wrap">
                <input id="reg-email" name="email" type="email" className="form-input"
                  placeholder="Email dùng để đăng nhập" value={form.email} onChange={handleChange} />
                <span className="input-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </span>
              </div>
            </div>

            {/* Mật khẩu dài hết ô nhập, xếp dọc */}
            <div className="form-group">
              <label className="form-label" htmlFor="reg-pass">Mật khẩu</label>
              <div className="form-input-wrap">
                <input id="reg-pass" name="password" type={showPass ? 'text' : 'password'}
                  className="form-input" placeholder="Tối thiểu 6 ký tự"
                  value={form.password} onChange={handleChange} />
                <span className="input-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <button type="button" className="password-toggle"
                  onClick={() => setShowPass(v => !v)} tabIndex={-1}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-confirm">Xác nhận mật khẩu</label>
              <div className="form-input-wrap">
                <input id="reg-confirm" name="confirmPassword" type={showConfirm ? 'text' : 'password'}
                  className="form-input" placeholder="Nhập lại mật khẩu"
                  value={form.confirmPassword} onChange={handleChange} />
                <span className="input-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <button type="button" className="password-toggle"
                  onClick={() => setShowConfirm(v => !v)} tabIndex={-1}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {showConfirm ? (
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
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '12px' }}>
              Tiếp theo
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '20px 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>HOẶC</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            </div>

            <button
              type="button"
              onClick={handleGoogleRegister}
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
              Đăng ký bằng Google
            </button>
          </form>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <form onSubmit={handleSubmit} noValidate>
            {/* Trường đại học */}
            <div className="form-group">
              <label className="form-label">Trường đại học</label>
              <div
                onClick={() => setOpenUniversityModal(true)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '13px 16px',
                  background: 'var(--bg-input)', border: '1.5px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: form.university ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontSize: '15px', cursor: 'pointer',
                  userSelect: 'none', transition: 'all 0.2s',
                  height: '48px', boxSizing: 'border-box',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <span>{form.university || 'Chọn trường đại học...'}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>▼</span>
              </div>
            </div>

            {form.university === 'Trường khác...' && (
              <div className="form-group" style={{ marginTop: '12px' }}>
                <label className="form-label" htmlFor="reg-uni-custom">Tên trường đại học khác</label>
                <div className="form-input-wrap">
                  <input id="reg-uni-custom" name="customUniversity" type="text" className="form-input"
                    placeholder="Nhập tên trường đại học của bạn" value={form.customUniversity} onChange={handleChange} />
                  <span className="input-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                      <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
                    </svg>
                  </span>
                </div>
              </div>
            )}

            {/* Ngành học */}
            <div className="form-group" style={{ marginTop: '16px' }}>
              <label className="form-label">Ngành học</label>
              <div
                onClick={() => setOpenMajorModal(true)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '13px 16px',
                  background: 'var(--bg-input)', border: '1.5px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: form.major ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontSize: '15px', cursor: 'pointer',
                  userSelect: 'none', transition: 'all 0.2s',
                  height: '48px', boxSizing: 'border-box',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <span>{form.major || 'Chọn ngành học...'}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>▼</span>
              </div>
            </div>

            {form.major === 'Ngành khác...' && (
              <div className="form-group" style={{ marginTop: '12px' }}>
                <label className="form-label" htmlFor="reg-major-custom">Tên ngành học khác</label>
                <div className="form-input-wrap">
                  <input id="reg-major-custom" name="customMajor" type="text" className="form-input"
                    placeholder="Nhập ngành học của bạn" value={form.customMajor} onChange={handleChange} />
                  <span className="input-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                      <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
                    </svg>
                  </span>
                </div>
              </div>
            )}

            {/* ─── Khu vực sinh sống thiết kế xếp dọc chuẩn chỉnh ─── */}
            <div style={{ marginTop: '24px', marginBottom: '8px' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-primary)', flexShrink: 0 }}>
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                Khu vực sinh sống
              </label>
            </div>
            
            {/* Chọn Tỉnh/Thành */}
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>Tỉnh / Thành phố</label>
              <div
                onClick={() => setOpenProvinceModal(true)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '13px 16px',
                  background: 'var(--bg-input)', border: '1.5px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: province ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontSize: '15px', cursor: 'pointer',
                  userSelect: 'none', transition: 'all 0.2s',
                  height: '48px', boxSizing: 'border-box',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <span>{province || 'Chọn Tỉnh / Thành phố...'}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>▼</span>
              </div>
            </div>

            {/* Chọn Quận/Huyện */}
            <div className="form-group" style={{ marginTop: '14px' }}>
              <label className="form-label" style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>Quận / Huyện</label>
              <div
                onClick={() => province && setOpenDistrictModal(true)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '13px 16px',
                  background: 'var(--bg-input)', border: '1.5px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: district ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontSize: '15px', cursor: province ? 'pointer' : 'not-allowed',
                  userSelect: 'none', transition: 'all 0.2s',
                  opacity: province ? 1 : 0.5,
                  height: '48px', boxSizing: 'border-box',
                }}
                onMouseEnter={e => { if (province) e.currentTarget.style.borderColor = 'var(--primary)'; }}
                onMouseLeave={e => { if (province) e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                <span>{district || (province ? 'Chọn Quận / Huyện...' : 'Vui lòng chọn Tỉnh / Thành trước')}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>▼</span>
              </div>
            </div>

            <div className="form-actions" style={{ marginTop: '28px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
                Quay lại
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <span className="spinner" /> : null}
                {loading ? 'Đang tạo...' : 'Hoàn tất đăng ký'}
              </button>
            </div>
          </form>
        )}

        <div className="auth-footer">
          Đã có tài khoản?{' '}
          <Link to="/login" className="auth-link">Đăng nhập ngay</Link>
        </div>
      </>)}
    </div>

      {/* ─── MODAL CHỌN TỈNH / THÀNH PHỐ ─── */}
      <LocationModal
        isOpen={openProvinceModal}
        onClose={() => setOpenProvinceModal(false)}
        title="Chọn Tỉnh / Thành phố"
        options={Object.keys(VIETNAM_LOCATIONS)}
        value={province}
        onSelect={(val) => {
          setProvince(val);
          setDistrict('');
        }}
      />

      {/* ─── MODAL CHỌN QUẬN / HUYỆN ─── */}
      <LocationModal
        isOpen={openDistrictModal}
        onClose={() => setOpenDistrictModal(false)}
        title={`Chọn Quận / Huyện (thuộc ${province})`}
        options={province ? VIETNAM_LOCATIONS[province] : []}
        value={district}
        onSelect={(val) => setDistrict(val)}
      />

      {/* ─── MODAL CHỌN TRƯỜNG ĐẠI HỌC ─── */}
      <LocationModal
        isOpen={openUniversityModal}
        onClose={() => setOpenUniversityModal(false)}
        title="Chọn Trường đại học"
        options={HCM_UNIVERSITIES}
        value={form.university}
        onSelect={(val) => {
          setForm(prev => ({ ...prev, university: val }));
        }}
      />

      {/* ─── MODAL CHỌN NGÀNH HỌC ─── */}
      <LocationModal
        isOpen={openMajorModal}
        onClose={() => setOpenMajorModal(false)}
        title="Chọn Ngành học"
        options={MAJORS}
        value={form.major}
        onSelect={(val) => {
          setForm(prev => ({ ...prev, major: val }));
        }}
      />

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes successFadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes checkPop {
          from { transform: scale(0); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
        @keyframes checkDraw {
          from { stroke-dasharray: 0 40; }
          to   { stroke-dasharray: 40 0; }
        }
        @keyframes progressFill {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
    </div>
  );
}