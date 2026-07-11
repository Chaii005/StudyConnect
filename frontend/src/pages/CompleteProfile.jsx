// src/pages/CompleteProfile.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/config/supabaseClient';
import { SafeInput } from '@/components/common/SafeInput';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { hashPassword } from '@/services/authService';
import { HCM_UNIVERSITIES, MAJORS } from '../constants/educationData';
import { VIETNAM_LOCATIONS } from '../constants/locationData';
import studyconectLogo from '@/assets/studyconect_logo.png';

/* ─── Modal danh sách chọn ─── */
function PickerModal({ isOpen, onClose, title, options, value, onSelect }) {
  const [search, setSearch] = useState('');
  useEffect(() => { if (isOpen) setSearch(''); }, [isOpen]);
  if (!isOpen) return null;
  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0,
      background: 'rgba(10,10,20,0.75)', backdropFilter: 'blur(8px)',
      zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-card)', border: '1.5px solid var(--border)',
        borderRadius: '20px', padding: '24px', width: '380px', maxWidth: '100%',
        boxShadow: '0 24px 64px rgba(0,0,0,0.15)', display: 'flex',
        flexDirection: 'column', maxHeight: '75vh',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' }}>{title}</h3>
          <button onClick={onClose} style={{
            background: 'var(--bg-input)', border: 'none', borderRadius: '50%',
            width: '32px', height: '32px', color: 'var(--text-muted)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px'
          }}>✕</button>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'var(--bg-input)', border: '1.5px solid var(--border)',
          borderRadius: '12px', padding: '10px 14px', marginBottom: '16px',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <SafeInput placeholder="Tìm kiếm..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ background: 'none', border: 'none', outline: 'none', flex: 1, color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'inherit' }} />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '6px', scrollbarWidth: 'thin' }}>
          {filtered.length === 0
            ? <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>Không tìm thấy kết quả.</div>
            : filtered.map(opt => {
                const sel = opt === value;
                return (
                  <button key={opt} type="button" onClick={() => { onSelect(opt); onClose(); }} style={{
                    width: '100%', padding: '12px 16px', textAlign: 'left',
                    background: sel ? 'var(--text-primary)' : 'var(--bg-input)',
                    border: sel ? 'none' : '1px solid var(--border)', borderRadius: '12px',
                    color: sel ? '#fff' : 'var(--text-secondary)', fontSize: '14px',
                    fontWeight: sel ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{opt}</span>{sel && <span>✓</span>}
                    </div>
                  </button>
                );
              })
          }
        </div>
      </div>
    </div>
  );
}

/* ─── Modal nhập địa chỉ ─── */
function AddressModal({ isOpen, onClose, province, district, onProvinceChange, onDistrictChange, onDone }) {
  const [openProv, setOpenProv] = useState(false);
  const [openDist, setOpenDist] = useState(false);
  if (!isOpen) return null;
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0,
      background: 'rgba(10,10,20,0.75)', backdropFilter: 'blur(8px)',
      zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-card)', border: '1.5px solid var(--border)',
        borderRadius: '20px', padding: '28px', width: '380px', maxWidth: '100%',
        boxShadow: '0 24px 64px rgba(0,0,0,0.15)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' }}>📍 Khu vực sinh sống</h3>
          <button onClick={onClose} style={{
            background: 'var(--bg-input)', border: 'none', borderRadius: '50%',
            width: '32px', height: '32px', color: 'var(--text-muted)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px'
          }}>✕</button>
        </div>

        {/* Tỉnh / Thành phố */}
        <div className="form-group" style={{ marginBottom: '14px' }}>
          <label className="form-label">Tỉnh / Thành phố</label>
          <div onClick={() => setOpenProv(true)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '13px 16px', height: '48px', boxSizing: 'border-box',
            background: 'var(--bg-input)', border: '1.5px solid var(--border)',
            borderRadius: 'var(--radius-sm)', fontSize: '15px', cursor: 'pointer',
            color: province ? 'var(--text-primary)' : 'var(--text-muted)',
          }}>
            <span>{province || 'Chọn Tỉnh / Thành phố...'}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>▼</span>
          </div>
        </div>

        {/* Quận / Huyện */}
        <div className="form-group" style={{ marginBottom: '24px' }}>
          <label className="form-label">Quận / Huyện</label>
          <div onClick={() => province && setOpenDist(true)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '13px 16px', height: '48px', boxSizing: 'border-box',
            background: 'var(--bg-input)', border: '1.5px solid var(--border)',
            borderRadius: 'var(--radius-sm)', fontSize: '15px',
            cursor: province ? 'pointer' : 'not-allowed', opacity: province ? 1 : 0.5,
            color: district ? 'var(--text-primary)' : 'var(--text-muted)',
          }}>
            <span>{district || (province ? 'Chọn Quận / Huyện...' : 'Chọn Tỉnh / Thành trước')}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>▼</span>
          </div>
        </div>

        <button type="button" onClick={onDone} style={{
          width: '100%', padding: '13px', borderRadius: '12px',
          background: 'var(--text-primary)', color: '#fff', border: 'none',
          fontWeight: 700, fontSize: '15px', cursor: 'pointer', fontFamily: 'inherit',
        }}>Xác nhận</button>
      </div>

      {/* Picker lồng nhau */}
      <PickerModal isOpen={openProv} onClose={() => setOpenProv(false)}
        title="Chọn Tỉnh / Thành phố" options={Object.keys(VIETNAM_LOCATIONS)}
        value={province} onSelect={val => { onProvinceChange(val); onDistrictChange(''); setOpenProv(false); }} />
      <PickerModal isOpen={openDist} onClose={() => setOpenDist(false)}
        title={`Chọn Quận / Huyện`} options={province ? VIETNAM_LOCATIONS[province] : []}
        value={district} onSelect={val => { onDistrictChange(val); setOpenDist(false); }} />
    </div>
  );
}

/* ─── Dropdown trigger button ─── */
function DropdownField({ label, value, placeholder, onClick }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div onClick={onClick} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '13px 16px', height: '48px', boxSizing: 'border-box',
        background: 'var(--bg-input)', border: '1.5px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        color: value ? 'var(--text-primary)' : 'var(--text-muted)',
        fontSize: '15px', cursor: 'pointer', userSelect: 'none', transition: 'all 0.2s',
      }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
      >
        <span>{value || placeholder}</span>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>▼</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════ */
export default function CompleteProfile() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const { addToast } = useToast();

  const [password, setPassword]               = useState('');
  const [showPass, setShowPass]               = useState(false);
  const [university, setUniversity]           = useState('');
  const [customUniversity, setCustomUniversity] = useState('');
  const [major, setMajor]                     = useState('');
  const [customMajor, setCustomMajor]         = useState('');
  const [province, setProvince]               = useState('');
  const [district, setDistrict]               = useState('');
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState('');

  const [openUniversity, setOpenUniversity]   = useState(false);
  const [openMajor, setOpenMajor]             = useState(false);
  const [openAddress, setOpenAddress]         = useState(false);

  const pendingUserId = localStorage.getItem('sc_pending_profile_id');

  useEffect(() => {
    if (!pendingUserId) navigate('/', { replace: true });
  }, [pendingUserId, navigate]);

  const validate = () => {
    if (!password) { setError('Vui lòng nhập mật khẩu.'); return false; }
    if (password.length < 6) { setError('Mật khẩu ít nhất 6 ký tự.'); return false; }
    if (!/[a-zA-Z]/.test(password)) { setError('Mật khẩu phải có chữ cái.'); return false; }
    if (!/\d/.test(password)) { setError('Mật khẩu phải có chữ số.'); return false; }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) { setError('Mật khẩu phải có ký tự đặc biệt.'); return false; }
    if (!university) { setError('Vui lòng chọn trường đại học.'); return false; }
    if (!major) { setError('Vui lòng chọn ngành học.'); return false; }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setLoading(true);
    try {
      const { error: passErr } = await supabase.auth.updateUser({ password });
      if (passErr) throw new Error(`Không thể đặt mật khẩu: ${passErr.message}`);

      const { data: sessionData } = await supabase.auth.getSession();
      const userEmail = sessionData?.session?.user?.email;
      if (!userEmail) throw new Error('Không tìm thấy phiên đăng nhập.');

      const hashedPass      = await hashPassword(password, userEmail.toLowerCase().trim());
      const finalUniversity = university === 'Trường khác...' ? customUniversity : university;
      const finalMajor      = major === 'Ngành khác...'      ? customMajor      : major;
      const bio             = (province && district) ? `[📍 ${province}, ${district}]` : '';

      const { data: updatedUser, error: updateErr } = await supabase
        .from('users')
        .update({ password: hashedPass, university: finalUniversity, major: finalMajor, bio })
        .eq('id', parseInt(pendingUserId))
        .select().single();

      if (updateErr) throw new Error(updateErr.message);

      const safeUser = {
        id: updatedUser.id, fullName: updatedUser.full_name, email: updatedUser.email,
        role: updatedUser.role, university: updatedUser.university || '',
        major: updatedUser.major || '', avatar: updatedUser.avatar || '',
        bio: updatedUser.bio || '', createdAt: updatedUser.created_at,
      };
      localStorage.setItem('sc_session', JSON.stringify(safeUser));
      localStorage.removeItem('sc_pending_profile_id');
      setUser(safeUser);
      sessionStorage.setItem('sc_fireworks', '1');
      addToast('Hồ sơ hoàn tất! Chào mừng đến StudyConnect 🎉', 'success');
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ padding: '24px' }}>

        {/* ─── Header compact ─── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <img src={studyconectLogo} alt="Logo" style={{ width: '36px', height: '36px', objectFit: 'contain', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>Hoàn tất hồ sơ 🎓</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Điền thông tin để bắt đầu học cùng nhóm</div>
          </div>
        </div>

        {error && (
          <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

          {/* Mật khẩu */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="cp-pass" style={{ marginBottom: '4px', fontSize: '12px' }}>Mật khẩu</label>
            <div className="form-input-wrap">
              <SafeInput id="cp-pass" name="password" type={showPass ? 'text' : 'password'}
                className="form-input" placeholder="Chữ + số + ký tự đặc biệt, ≥6 ký tự"
                value={password} onChange={e => { setPassword(e.target.value); setError(''); }} />
              <span className="input-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </span>
              <button type="button" className="password-toggle"
                onClick={() => setShowPass(v => !v)} tabIndex={-1}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {showPass ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
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

          {/* Trường đại học */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ marginBottom: '4px', fontSize: '12px' }}>Trường đại học</label>
            <div onClick={() => setOpenUniversity(true)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0 16px', height: '44px', boxSizing: 'border-box',
              background: 'var(--bg-input)', border: '1.5px solid var(--border)',
              borderRadius: 'var(--radius-sm)', fontSize: '14px', cursor: 'pointer',
              color: university ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <span>{university || 'Chọn trường đại học...'}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>▼</span>
            </div>
          </div>
          {university === 'Trường khác...' && (
            <div className="form-input-wrap" style={{ margin: 0 }}>
              <SafeInput name="customUniversity" type="text" className="form-input"
                placeholder="Nhập tên trường" value={customUniversity}
                onChange={e => setCustomUniversity(e.target.value)} />
            </div>
          )}

          {/* Ngành học */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ marginBottom: '4px', fontSize: '12px' }}>Ngành học</label>
            <div onClick={() => setOpenMajor(true)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0 16px', height: '44px', boxSizing: 'border-box',
              background: 'var(--bg-input)', border: '1.5px solid var(--border)',
              borderRadius: 'var(--radius-sm)', fontSize: '14px', cursor: 'pointer',
              color: major ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <span>{major || 'Chọn ngành học...'}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>▼</span>
            </div>
          </div>
          {major === 'Ngành khác...' && (
            <div className="form-input-wrap" style={{ margin: 0 }}>
              <SafeInput name="customMajor" type="text" className="form-input"
                placeholder="Nhập ngành học" value={customMajor}
                onChange={e => setCustomMajor(e.target.value)} />
            </div>
          )}

          {/* Khu vực sinh sống */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ marginBottom: '4px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Khu vực sinh sống
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>(không bắt buộc)</span>
            </label>
            <button type="button" onClick={() => setOpenAddress(true)} style={{
              width: '100%', padding: '0 16px', height: '44px', boxSizing: 'border-box',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'var(--bg-input)', border: '1.5px solid var(--border)',
              borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              color: (province && district) ? 'var(--text-primary)' : 'var(--text-muted)',
              fontSize: '14px', fontFamily: 'inherit', transition: 'all 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <span>{(province && district) ? `📍 ${province}, ${district}` : 'Bấm để chọn khu vực...'}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
              </svg>
            </button>
          </div>

          {/* Submit */}
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '6px' }}>
            {loading ? <span className="spinner" /> : null}
            {loading ? 'Đang lưu...' : 'Hoàn tất & Vào trang chủ'}
          </button>

        </form>
      </div>

      {/* Modals */}
      <PickerModal isOpen={openUniversity} onClose={() => setOpenUniversity(false)}
        title="Chọn Trường đại học" options={HCM_UNIVERSITIES}
        value={university} onSelect={setUniversity} />

      <PickerModal isOpen={openMajor} onClose={() => setOpenMajor(false)}
        title="Chọn Ngành học" options={MAJORS}
        value={major} onSelect={setMajor} />

      <AddressModal isOpen={openAddress} onClose={() => setOpenAddress(false)}
        province={province} district={district}
        onProvinceChange={setProvince} onDistrictChange={setDistrict}
        onDone={() => setOpenAddress(false)} />
    </div>
  );
}
