import { useState, useEffect } from 'react';
import { MAJORS } from '@/constants/educationData';
import { getSubjectsByMajor } from '@/services/groupService';

export default function GroupFormModal({ 
  show, 
  onClose, 
  currentEditGroup, 
  groupForm, 
  setGroupForm, 
  locationSearchVal, 
  setLocationSearchVal, 
  onSubmit, 
  submitting 
}) {
  const [dbSubjects, setDbSubjects] = useState([]);
  const [subjectDropdownOpen, setSubjectDropdownOpen] = useState(false);
  const [subjectMode, setSubjectMode] = useState('select'); // 'select' | 'custom'
  const [customSubject, setCustomSubject] = useState('');

  useEffect(() => {
    if (!show) return;
    if (!groupForm.major) {
      setDbSubjects([]);
      return;
    }
    let cancelled = false;
    getSubjectsByMajor(groupForm.major).then(subjects => {
      if (!cancelled) {
        setDbSubjects(subjects);
      }
    });
    return () => { cancelled = true; };
  }, [groupForm.major, show]);

  useEffect(() => {
    if (!show) return;
    if (groupForm.subject) {
      if (dbSubjects.length > 0) {
        if (dbSubjects.includes(groupForm.subject)) {
          setSubjectMode('select');
        } else {
          setSubjectMode('custom');
          setCustomSubject(groupForm.subject);
        }
      } else {
        setCustomSubject(groupForm.subject);
      }
    } else {
      setCustomSubject('');
    }
  }, [groupForm.subject, dbSubjects, show]);

  if (!show) return null;

  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '16px' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg-card)', width: '100%', maxWidth: '480px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: '28px', boxShadow: 'var(--shadow-glow)', maxHeight: '90vh', overflowY: 'auto', overscrollBehavior: 'contain' }}>
        
        <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '24px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {currentEditGroup ? (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-light)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              Chỉnh sửa thông tin phòng học
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-light)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              Tạo phòng học mới
            </>
          )}
        </h3>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Tên phòng học */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', display: 'block', fontWeight: 700, color: 'var(--text-secondary)' }}>Tên phòng học *</label>
            <div className="form-input-wrap">
              <input 
                type="text" 
                className="form-input no-icon" 
                placeholder="Nhập tên phòng học của bạn..."
                value={groupForm.name} 
                onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} 
                required 
                style={{ borderRadius: '10px', fontSize: '13.5px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '10px 14px', width: '100%' }}
              />
            </div>
          </div>

          {/* Ngành học / Lĩnh vực */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', display: 'block', fontWeight: 700, color: 'var(--text-secondary)' }}>Ngành học *</label>
            <div className="form-input-wrap" style={{ position: 'relative' }}>
              <select 
                className="form-input no-icon" 
                style={{ padding: '10px 14px', fontSize: '13.5px', borderRadius: 10, cursor: 'pointer', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', width: '100%', appearance: 'none' }}
                value={groupForm.major || ''} 
                onChange={(e) => {
                  const newMajor = e.target.value;
                  setGroupForm(prev => ({ ...prev, major: newMajor, subject: '' }));
                  setSubjectMode('select');
                }}
                required
              >
                <option value="" disabled>-- Chọn ngành học --</option>
                <option value="Chung">Chung / Học phần đại cương</option>
                {MAJORS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>
          </div>

          {/* Môn học / Lĩnh vực */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', display: 'block', fontWeight: 700, color: 'var(--text-secondary)' }}>Môn học *</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ position: 'relative' }}>
                <div 
                  onClick={() => {
                    if (!groupForm.major) return;
                    setSubjectDropdownOpen(!subjectDropdownOpen);
                  }}
                  style={{
                    width: '100%',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: '10px 14px',
                    color: groupForm.major ? 'var(--text-primary)' : 'var(--text-muted)',
                    fontSize: '13.5px',
                    cursor: groupForm.major ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    userSelect: 'none',
                    transition: 'border-color 0.2s',
                  }}
                >
                  <span>
                    {!groupForm.major 
                      ? 'Vui lòng chọn ngành học trước' 
                      : (subjectMode === 'custom' ? 'Môn học khác...' : (groupForm.subject || '-- Chọn môn học --'))}
                  </span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transform: subjectDropdownOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>

                {subjectDropdownOpen && (
                  <div 
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: 6,
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
                      zIndex: 10000,
                      maxHeight: 150,
                      overflowY: 'auto',
                      padding: '6px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                    }}
                  >
                    <div
                      onClick={() => {
                        setSubjectMode('select');
                        setGroupForm({ ...groupForm, subject: '' });
                        setSubjectDropdownOpen(false);
                      }}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: 13,
                        color: 'var(--text-muted)',
                        transition: 'all 0.15s',
                        background: !groupForm.subject && subjectMode === 'select' ? 'var(--bg-input)' : 'transparent',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-input)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = !groupForm.subject && subjectMode === 'select' ? 'var(--bg-input)' : 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                    >
                      -- Chọn môn học --
                    </div>

                    {dbSubjects.map(s => {
                      const isSelected = subjectMode === 'select' && groupForm.subject === s;
                      return (
                        <div
                          key={s}
                          onClick={() => {
                            setSubjectMode('select');
                            setGroupForm({ ...groupForm, subject: s });
                            setSubjectDropdownOpen(false);
                          }}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: 13,
                            color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                            fontWeight: isSelected ? 600 : 400,
                            transition: 'all 0.15s',
                            background: isSelected ? 'var(--bg-input)' : 'transparent',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-input)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'var(--bg-input)' : 'transparent'; e.currentTarget.style.color = isSelected ? 'var(--text-primary)' : 'var(--text-secondary)'; }}
                        >
                          {s}
                        </div>
                      );
                    })}

                    <div
                      onClick={() => {
                        setSubjectMode('custom');
                        setGroupForm({ ...groupForm, subject: customSubject });
                        setSubjectDropdownOpen(false);
                      }}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: 13,
                        color: subjectMode === 'custom' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        transition: 'all 0.15s',
                        background: subjectMode === 'custom' ? 'var(--bg-input)' : 'transparent',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-input)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = subjectMode === 'custom' ? 'var(--bg-input)' : 'transparent'; e.currentTarget.style.color = subjectMode === 'custom' ? 'var(--text-primary)' : 'var(--text-secondary)'; }}
                    >
                      Môn học khác...
                    </div>
                  </div>
                )}
              </div>

              {subjectMode === 'custom' && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    className="form-input"
                    style={{ flex: 1, padding: '10px 14px', fontSize: '13.5px', borderRadius: 10, background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    placeholder="Nhập tên môn học mới..."
                    value={customSubject}
                    onChange={e => {
                      setCustomSubject(e.target.value);
                      setGroupForm({ ...groupForm, subject: e.target.value });
                    }}
                    required
                  />
                  {dbSubjects.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSubjectMode('select');
                        setGroupForm({ ...groupForm, subject: dbSubjects[0] || '' });
                      }}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 10,
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      Quay lại
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Hình thức học */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', display: 'block', fontWeight: 700, color: 'var(--text-secondary)' }}>Hình thức học</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                type="button" 
                onClick={() => setGroupForm({ ...groupForm, meetingMode: 'online' })}
                style={{
                  flex: 1,
                  padding: '11px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  border: groupForm.meetingMode === 'online' ? '1.5px solid var(--text-primary)' : '1.5px solid var(--border)',
                  background: groupForm.meetingMode === 'online' ? 'var(--text-primary)' : 'var(--bg-input)',
                  color: groupForm.meetingMode === 'online' ? 'var(--bg-card)' : 'var(--text-secondary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                Online
              </button>
              <button 
                type="button" 
                onClick={() => setGroupForm({ ...groupForm, meetingMode: 'offline' })}
                style={{
                  flex: 1,
                  padding: '11px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  border: groupForm.meetingMode === 'offline' ? '1.5px solid var(--text-primary)' : '1.5px solid var(--border)',
                  background: groupForm.meetingMode === 'offline' ? 'var(--text-primary)' : 'var(--bg-input)',
                  color: groupForm.meetingMode === 'offline' ? 'var(--bg-card)' : 'var(--text-secondary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                Offline
              </button>
            </div>
          </div>

          {/* Địa điểm học (nếu offline) */}
          {groupForm.meetingMode === 'offline' && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', display: 'block', fontWeight: 700, color: 'var(--text-secondary)' }}>Địa điểm học *</label>
              <div className="form-input-wrap">
                <input 
                  type="text" 
                  className="form-input no-icon" 
                  placeholder="Nhập địa điểm học offline (ví dụ: Highland Cafe, Thư viện...)"
                  value={locationSearchVal || ''} 
                  onChange={(e) => setLocationSearchVal(e.target.value)} 
                  required 
                  style={{ borderRadius: '10px', fontSize: '13.5px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '10px 14px', width: '100%' }}
                />
              </div>
            </div>
          )}

          {/* Mô tả chi tiết */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', display: 'block', fontWeight: 700, color: 'var(--text-secondary)' }}>Mô tả chi tiết</label>
            <textarea 
              className="form-textarea" 
              placeholder="Giới thiệu mục tiêu của phòng học..." 
              style={{ height: '60px', resize: 'vertical', borderRadius: '10px', fontSize: '13.5px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '10px 14px', width: '100%' }}
              value={groupForm.description || ''} 
              onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })} 
            />
          </div>

          {/* Nút thao tác */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button 
              type="button" 
              onClick={onClose}
              style={{ flex: 1, padding: '12px', borderRadius: '24px', cursor: 'pointer', fontWeight: 700, fontSize: '14px', fontFamily: 'inherit', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', transition: 'all 0.15s' }}
            >
              Hủy
            </button>
            <button 
              type="submit" 
              disabled={submitting}
              style={{ flex: 1, padding: '12px', borderRadius: '24px', cursor: 'pointer', fontWeight: 700, fontSize: '14px', fontFamily: 'inherit', border: 'none', background: 'var(--text-primary)', color: 'var(--bg-card)', transition: 'all 0.15s' }}
            >
              {submitting ? 'Đang xử lý...' : currentEditGroup ? 'Lưu thay đổi' : 'Tạo phòng'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
