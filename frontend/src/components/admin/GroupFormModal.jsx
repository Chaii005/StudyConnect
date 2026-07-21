import { useState, useEffect, useRef } from 'react';
import { MAJORS } from '@/constants/educationData';
import { getSubjectsByMajor } from '@/services/groupService';
import { geocodeAddress, googleMapsSearchUrl, autocompletePlaces, getPlaceDetails } from '@/utils/geocoding';
import { SafeInput, SafeTextarea } from '@/components/common/SafeInput';

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
          padding: '10px 14px',
          background: 'var(--bg-input)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          color: value ? 'var(--text-primary)' : 'var(--text-muted)',
          fontSize: '13.5px',
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
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
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
                fontSize: '13.5px',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit'
              }}
            />
          </div>
          {filteredOptions.length === 0 ? (
            <div style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '13.5px', textAlign: 'center' }}>
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
                    fontSize: '13.5px',
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

export default function GroupFormModal({ 
  show, 
  onClose, 
  currentEditGroup, 
  groupForm, 
  setGroupForm, 
  locationSearchVal, 
  setLocationSearchVal, 
  selectedLocation,
  setSelectedLocation,
  onSubmit, 
  submitting 
}) {
  const [dbSubjects, setDbSubjects] = useState([]);
  const [subjectDropdownOpen, setSubjectDropdownOpen] = useState(false);
  const [subjectMode, setSubjectMode] = useState('select'); // 'select' | 'custom'
  const [customSubject, setCustomSubject] = useState('');

  const [geoLoading, setGeoLoading] = useState(false);
  const [customName, setCustomName] = useState(locationSearchVal || '');
  const [suggestions, setSuggestions] = useState([]);
  const [placesError, setPlacesError] = useState('');
  const ignoreNextAutocompleteRef = useRef(false);
  const ignoreNextGeocodeRef = useRef(false);

  useEffect(() => {
    if (!show) return;
    if (!groupForm.major) {
      Promise.resolve().then(() => setDbSubjects([]));
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
    const updateSubjectState = () => {
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
    };
    Promise.resolve().then(updateSubjectState);
  }, [groupForm.subject, dbSubjects, show]);

  // Sync location text
  useEffect(() => {
    if (show) {
      Promise.resolve().then(() => setCustomName(locationSearchVal || ''));
    }
  }, [locationSearchVal, show]);

  const handleCustomLocationChange = (name) => {
    setCustomName(name);
    setLocationSearchVal(name);
    setSelectedLocation({
      name,
      address: name,
      lat: null,
      lng: null
    });
  };

  // Autocomplete Nominatim
  useEffect(() => {
    if (groupForm.meetingMode !== 'offline' || !customName || customName.trim().length < 2) {
      Promise.resolve().then(() => setSuggestions([]));
      return;
    }
    if (ignoreNextAutocompleteRef.current) {
      ignoreNextAutocompleteRef.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      const res = await autocompletePlaces(customName);
      setPlacesError('');
      setSuggestions(Array.isArray(res) ? res : []);
    }, 400);

    return () => clearTimeout(timer);
  }, [customName, groupForm.meetingMode]);

  const handleSelectSuggestion = async (suggestion) => {
    ignoreNextAutocompleteRef.current = true;
    ignoreNextGeocodeRef.current = true;
    setCustomName(suggestion.text);
    setLocationSearchVal(suggestion.text);
    setSuggestions([]);

    const lat = suggestion.lat || null;
    const lng = suggestion.lng || null;

    let updatedSuggestion = { ...suggestion };
    if (!lat || !lng) {
      setGeoLoading(true);
      const detail = await getPlaceDetails(suggestion.placeId);
      setGeoLoading(false);
      if (detail?.lat) {
        updatedSuggestion = { ...suggestion, lat: detail.lat, lng: detail.lng };
      }
    }

    const parts = updatedSuggestion.text.split(',').map(p => p.trim());
    const province = parts[parts.length - 1] || '';
    const district = parts[parts.length - 2] || '';
    const ward = parts[parts.length - 3] || '';

    setSelectedLocation({
      name: updatedSuggestion.text,
      address: updatedSuggestion.text,
      province,
      district,
      ward,
      lat: updatedSuggestion.lat || null,
      lng: updatedSuggestion.lng || null,
      formattedAddress: updatedSuggestion.text,
    });
  };

  // Fallback geocode
  useEffect(() => {
    if (groupForm.meetingMode !== 'offline' || !customName || customName.trim().length <= 5) return;
    if (ignoreNextGeocodeRef.current) {
      ignoreNextGeocodeRef.current = false;
      return;
    }

    setGeoLoading(true);
    const timer = setTimeout(async () => {
      const geo = await geocodeAddress(customName);
      if (geo) {
        const parts = customName.split(',').map(p => p.trim());
        const province = parts[parts.length - 1] || 'Hà Nội';
        const district = parts[parts.length - 2] || '';
        const ward = parts[parts.length - 3] || '';
        setSelectedLocation(prev => ({
          ...prev,
          province,
          district,
          ward,
          lat: geo.lat,
          lng: geo.lng,
          formattedAddress: geo.formattedAddress
        }));
      }
      setGeoLoading(false);
    }, 1200);

    return () => {
      clearTimeout(timer);
      setGeoLoading(false);
    };
  }, [customName, groupForm.meetingMode, setSelectedLocation]);

  if (!show) return null;

  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '16px' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg-card)', width: '100%', maxWidth: '480px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: '0 24px 80px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 48px)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'linear-gradient(135deg, var(--primary), #3A3A3A)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {currentEditGroup ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              )}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)' }}>{currentEditGroup ? 'Cập nhật phòng học' : 'Tạo phòng học mới'}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>{currentEditGroup ? 'Chỉnh sửa thông tin phòng học' : 'Nhập thông tin phòng học mới'}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '10px', width: 32, height: 32, cursor: 'pointer', fontSize: '16px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', overscrollBehavior: 'contain', flex: 1, padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Tên phòng học */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', display: 'block', fontWeight: 700, color: 'var(--text-secondary)' }}>Tên phòng học *</label>
            <div className="form-input-wrap">
              <SafeInput 
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
            <label className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', display: 'block', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Ngành học * {currentEditGroup && <span style={{ fontSize: '11px', textTransform: 'none', color: 'var(--text-muted)', fontWeight: 400 }}>(Mặc định, không thể sửa)</span>}
            </label>
            <div className="form-input-wrap" style={{ position: 'relative' }}>
              <CustomSelect
                value={groupForm.major}
                onChange={(val) => {
                  setGroupForm(prev => ({ ...prev, major: val, subject: '' }));
                  setSubjectMode('select');
                }}
                options={['Chung', ...MAJORS]}
                placeholder="-- Chọn ngành học --"
                disabled={!!currentEditGroup}
              />
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
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ maxHeight: 120, overflowY: 'auto', overscrollBehavior: 'contain', scrollbarWidth: 'thin', scrollbarColor: 'var(--primary) transparent', padding: '6px', display: 'flex', flexDirection: 'column', gap: 2 }}>
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
                        textAlign: 'left'
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
                            textAlign: 'left'
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
                        textAlign: 'left'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-input)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = subjectMode === 'custom' ? 'var(--bg-input)' : 'transparent'; e.currentTarget.style.color = subjectMode === 'custom' ? 'var(--text-primary)' : 'var(--text-secondary)'; }}
                    >
                      Môn học khác...
                    </div>
                    </div>
                  </div>
                )}
              </div>

              {subjectMode === 'custom' && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <SafeInput
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px 14px', borderRadius: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', display: 'block', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'left' }}>Tên địa điểm học tập *</label>
                <div className="form-input-wrap" style={{ position: 'relative' }}>
                  <SafeInput 
                    type="text" 
                    className="form-input no-icon" 
                    placeholder="Nhập tên quán cà phê, thư viện..."
                    value={customName} 
                    onChange={(e) => handleCustomLocationChange(e.target.value)} 
                    required 
                    style={{ borderRadius: '10px', fontSize: '13.5px', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '10px 14px', width: '100%', boxSizing: 'border-box' }}
                  />

                  {suggestions.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: 4,
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                      zIndex: 1000,
                      maxHeight: 120,
                      overflowY: 'auto',
                      padding: 4
                    }}>
                      {suggestions.map((s, idx) => (
                        <div
                          key={s.placeId || idx}
                          onClick={() => handleSelectSuggestion(s)}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: 12.5,
                            color: 'var(--text-primary)',
                            transition: 'background 0.15s',
                            textAlign: 'left'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                          📍 {s.text}
                        </div>
                      ))}
                    </div>
                  )}

                  {placesError && (
                    <div style={{
                      marginTop: 6,
                      padding: '10px 12px',
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: 10,
                      color: '#f87171',
                      fontSize: 11,
                      lineHeight: 1.4,
                      textAlign: 'left'
                    }}>
                      ⚠️ {placesError}
                    </div>
                  )}
                </div>
              </div>

              {/* Map preview */}
              {geoLoading && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid #10b981', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Đang tìm địa điểm...
                </div>
              )}
              {!geoLoading && selectedLocation && customName.trim() && (
                <div style={{ marginTop: 10, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.05)' }}>
                  {selectedLocation.lat && selectedLocation.lng && (
                    <iframe
                      title="Bản đồ địa điểm"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedLocation.lng - 0.01},${selectedLocation.lat - 0.007},${selectedLocation.lng + 0.01},${selectedLocation.lat + 0.007}&layer=mapnik&marker=${selectedLocation.lat},${selectedLocation.lng}`}
                      style={{ width: '100%', height: 140, border: 'none', display: 'block' }}
                      loading="lazy"
                    />
                  )}
                  <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                        📍 {selectedLocation.name}
                      </div>
                      {selectedLocation.formattedAddress && selectedLocation.formattedAddress !== selectedLocation.name && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{selectedLocation.formattedAddress}</div>
                      )}
                    </div>
                    <a
                      href={googleMapsSearchUrl(selectedLocation.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#10b981,#059669)', padding: '6px 12px', borderRadius: 8, textDecoration: 'none', whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(16,185,129,0.35)' }}
                    >
                      Mở Maps
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mô tả chi tiết */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', display: 'block', fontWeight: 700, color: 'var(--text-secondary)' }}>Mô tả chi tiết</label>
            <SafeTextarea 
              className="form-textarea" 
              placeholder="Giới thiệu mục tiêu của phòng học..." 
              style={{ height: '60px', resize: 'vertical', borderRadius: '10px', fontSize: '13.5px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '10px 14px', width: '100%', boxSizing: 'border-box' }}
              value={groupForm.description || ''} 
              onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })} 
            />
          </div>

        </form>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px 18px', borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', gap: '10px' }}>
          <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1, padding: '11px', borderRadius: '12px' }}>Hủy</button>
          <button type="button" onClick={onSubmit} disabled={submitting} className="btn btn-primary" style={{ flex: 1, padding: '11px', borderRadius: '12px' }}>
            {submitting ? 'Đang xử lý...' : currentEditGroup ? 'Lưu thay đổi' : 'Tạo phòng'}
          </button>
        </div>
      </div>
    </div>
  );
}
