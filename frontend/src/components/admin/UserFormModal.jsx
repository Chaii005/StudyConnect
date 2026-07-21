import { useState, useEffect, useRef } from 'react';
import { HCM_UNIVERSITIES, MAJORS, getMajorIdByName } from '@/constants/educationData';
import { SafeInput, SafeTextarea } from '@/components/common/SafeInput';

const IS = { // inputStyle shorthand
  width: '100%', boxSizing: 'border-box',
  background: 'var(--bg-input)', border: '1.5px solid var(--border)',
  borderRadius: '10px', padding: '10px 13px',
  color: 'var(--text-primary)', fontSize: '13px',
  outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.2s',
};

function CustomSelect({ value, onChange, options, placeholder = "Chọn...", disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    const clickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (!isOpen) setSearch('');
  }

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', zIndex: isOpen ? 1000 : 1 }}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 13px',
          background: 'var(--bg-input)',
          border: '1.5px solid var(--border)',
          borderRadius: '10px',
          color: value ? 'var(--text-primary)' : 'var(--text-muted)',
          fontSize: '13px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          userSelect: 'none',
          opacity: disabled ? 0.6 : 1,
          transition: 'all 0.2s',
          height: '40px',
          boxSizing: 'border-box'
        }}
      >
        <span>{value || placeholder}</span>
        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
      </div>
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
            overflow: 'hidden',
            zIndex: 9999,
          }}
        >
          {/* Ô tìm kiếm nhanh */}
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 10 }}>
            <SafeInput
              type="text"
              placeholder="Tìm kiếm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit'
              }}
            />
          </div>
          {filteredOptions.length === 0 ? (
            <div style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center' }}>
              Không tìm thấy kết quả
            </div>
          ) : (
            <div style={{ maxHeight: '120px', overflowY: 'auto', overscrollBehavior: 'contain', scrollbarWidth: 'thin', scrollbarColor: 'var(--primary) transparent' }}>
              {filteredOptions.map((opt) => (
                <div
                  key={opt}
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                  }}
                  style={{
                    padding: '10px 16px',
                    fontSize: '13px',
                    color: opt === value ? 'var(--primary)' : 'var(--text-primary)',
                    background: opt === value ? 'rgba(35, 97, 95, 0.12)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    textAlign: 'left'
                  }}
                  onMouseEnter={e => {
                    if (opt !== value) e.currentTarget.style.background = 'var(--bg-input)';
                  }}
                  onMouseLeave={e => {
                    if (opt !== value) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {opt}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function UserFormModal({ show, onClose, currentEditUser, userForm, setUserForm, onSubmit, submitting }) {
  if (!show) return null;

  const roleLabel = userForm.role === 'admin' ? 'Quản trị viên' : 'Học sinh / Sinh viên';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '16px' }}
      onClick={onClose}>
      <div style={{ background: 'var(--bg-card)', width: '100%', maxWidth: '520px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: '0 24px 80px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 48px)', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'linear-gradient(135deg, var(--primary), #3A3A3A)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {currentEditUser ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              )}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)' }}>{currentEditUser ? 'Cập nhật tài khoản' : 'Tạo tài khoản mới'}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>{currentEditUser ? 'Chỉnh sửa thông tin người dùng' : 'Điền thông tin thành viên mới'}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '10px', width: 32, height: 32, cursor: 'pointer', fontSize: '16px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', overscrollBehavior: 'contain', flex: 1, padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Full name + Role */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Họ và tên *</label>
              <SafeInput type="text" style={IS} placeholder="Nhập họ và tên đầy đủ" value={userForm.fullName} onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Vai trò</label>
              <CustomSelect
                value={roleLabel}
                onChange={(val) => setUserForm({ ...userForm, role: val === 'Quản trị viên' ? 'admin' : 'user' })}
                options={['Học sinh / Sinh viên', 'Quản trị viên']}
                placeholder="Chọn vai trò..."
              />
            </div>
          </div>

          {/* Email + Password */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Email *</label>
              <SafeInput type="email" style={IS} placeholder="Nhập địa chỉ email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required disabled={!!currentEditUser} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                {currentEditUser ? 'Mật khẩu mới (tùy chọn)' : 'Mật khẩu *'}
              </label>
              <SafeInput type="text" style={IS} placeholder={currentEditUser ? 'Để trống nếu không đổi' : 'Tối thiểu 6 ký tự'}
                value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} required={!currentEditUser} />
            </div>
          </div>


          {/* Major */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ngành học</label>
              {userForm.major && getMajorIdByName(userForm.major) && (
                <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-muted)' }}>
                  (Mã ngành: {getMajorIdByName(userForm.major)})
                </span>
              )}
            </div>
            <CustomSelect
              value={userForm.major ? (getMajorIdByName(userForm.major) ? `${userForm.major} (Mã ngành: ${getMajorIdByName(userForm.major)})` : userForm.major) : ''}
              onChange={(val) => {
                const cleanMajor = val ? val.replace(/\s*\(Mã ngành:\s*\d+\)$/, '') : '';
                setUserForm({ ...userForm, major: cleanMajor });
              }}
              options={MAJORS.map(m => {
                const mId = getMajorIdByName(m);
                return mId ? `${m} (Mã ngành: ${mId})` : m;
              })}
              placeholder="-- Chọn ngành học --"
            />
            {userForm.major === 'Ngành khác...' && (
              <SafeInput type="text" style={{ ...IS, marginTop: '8px' }} placeholder="Nhập ngành học của bạn"
                value={userForm.majorCustom || ''} onChange={(e) => setUserForm({ ...userForm, majorCustom: e.target.value })} />
            )}
          </div>

          {/* University */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Trường đại học</label>
            <CustomSelect
              value={userForm.university}
              onChange={(val) => setUserForm({ ...userForm, university: val })}
              options={HCM_UNIVERSITIES}
              placeholder="-- Chọn trường đại học --"
            />
            {userForm.university === 'Trường khác...' && (
              <SafeInput type="text" style={{ ...IS, marginTop: '8px' }} placeholder="Nhập tên trường đại học"
                value={userForm.universityCustom || ''} onChange={(e) => setUserForm({ ...userForm, universityCustom: e.target.value })} />
            )}
          </div>

          {/* Bio */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Giới thiệu ngắn</label>
            <SafeTextarea style={{ ...IS, height: '72px', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
              placeholder="Viết giới thiệu về người dùng..." value={userForm.bio}
              onChange={(e) => setUserForm({ ...userForm, bio: e.target.value })} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px 18px', borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', gap: '10px' }}>
          <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1, padding: '11px', borderRadius: '12px' }}>Hủy</button>
          <button type="button" onClick={onSubmit} disabled={submitting} className="btn btn-primary" style={{ flex: 1, padding: '11px', borderRadius: '12px' }}>
            {submitting ? 'Đang xử lý...' : currentEditUser ? 'Lưu thay đổi' : 'Tạo tài khoản'}
          </button>
        </div>
      </div>
    </div>
  );
}
