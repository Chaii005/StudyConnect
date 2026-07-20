import { useRef, useState, useEffect } from 'react';
import { SafeInput, SafeTextarea } from '../common/SafeInput';

const format24h = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  return `${hours}:${minutes} - ${day}/${month}/${year}`;
};

export default function GroupDeadlines({
  group,
  user,
  deadlines,
  newDeadlineTitle,
  setNewDeadlineTitle,
  newDeadlineDueDate,
  setNewDeadlineDueDate,
  newDeadlineDesc,
  setNewDeadlineDesc,
  newDeadlineAssignee,
  setNewDeadlineAssignee,
  newDeadlineSubmissionType = 'all',
  setNewDeadlineSubmissionType,
  isSubmittingDeadline,
  editingDeadline,
  setEditingDeadline,
  editDeadlineTitle,
  setEditDeadlineTitle,
  editDeadlineDueDate,
  setEditDeadlineDueDate,
  editDeadlineDesc,
  setEditDeadlineDesc,
  editDeadlineAssignee,
  setEditDeadlineAssignee,
  editDeadlineSubmissionType = 'all',
  setEditDeadlineSubmissionType,
  openEditDeadline,
  handleUpdateDeadline,
  handleDeadlineSubmit,
  handleDeadlineDelete,
  submissions,
  showSubmitModal,
  setShowSubmitModal,
  submitNote,
  setSubmitNote,
  submitFile,
  setSubmitFile,
  submitImages = [],
  setSubmitImages,
  isSubmitting,
  showSubmissionsFor,
  setShowSubmissionsFor,
  handleSubmitAssignment,
  handleDeleteSubmission,
  handleRemindDeadline,
  remindingIds,
  membersDetails = [],
}) {
  const submitFileRef = useRef(null);
  const bulkImagesRef = useRef(null);
  const slotInputRefs = useRef([]);
  const deadlineListRef = useRef(null);

  const [submitTab, setSubmitTab] = useState('images'); // 'images' or 'file'
  const [lightboxImg, setLightboxImg] = useState(null);

  const isLeader = String(user?.id) === String(group?.creatorId) || (group?.deputyIds ? group.deputyIds.some(id => String(id) === String(user?.id)) : String(user?.id) === String(group?.deputyId));

  const visibleDeadlines = deadlines.filter((d) => {
    if (isLeader) return true;
    const isAssigned = !d.assigneeId || d.assigneeId === 'all' || String(d.assigneeId) === String(user?.id);
    if (!isAssigned) return false;

    // Check overdue condition for non-leaders: hide if overdue and user has not submitted
    const isOverdue = d.overdue || (d.dueDate && new Date(d.dueDate) < new Date());
    if (isOverdue) {
      const subs = submissions[d.id] || [];
      const mySub = subs.find((s) => String(s.userId) === String(user?.id));
      if (!mySub) return false;
    }
    return true;
  });

  useEffect(() => {
    if (showSubmitModal) {
      const currentDl = deadlines.find((d) => String(d.id) === String(showSubmitModal));
      if (currentDl?.submissionType === 'file') {
        setSubmitTab('file');
      } else {
        setSubmitTab('images');
      }
    }
  }, [showSubmitModal, deadlines]);

  const handleBulkImagesChange = (e) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type?.startsWith('image/'));
    if (files.length === 0) return;
    if (files.length > 6) {
      alert('Chỉ chọn được tối đa 6 tấm ảnh! Hệ thống đã tự chọn 6 tấm ảnh đầu tiên.');
    }
    const chosen = files.slice(0, 6);
    setSubmitImages(chosen);
    setSubmitFile(null);
    e.target.value = '';
  };

  const handleSlotImageChange = (slotIdx, e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type?.startsWith('image/')) return;
    const current = [...(submitImages || [])];
    current[slotIdx] = file;
    setSubmitImages(current.filter(Boolean));
    setSubmitFile(null);
  };

  const handleCloseSubmitModal = () => {
    setShowSubmitModal(null);
    setSubmitFile(null);
    if (setSubmitImages) setSubmitImages([]);
    setSubmitNote('');
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '24px', width: '100%', overflow: 'hidden' }}>
      {isLeader && (
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 20px',
            boxShadow: 'var(--shadow)',
          }}
        >
          <h3 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#ef4444' }}>
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Thêm deadline mới
          </h3>
          <form onSubmit={handleDeadlineSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="grid-2col-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Deadline *</label>
                <div className="form-input-wrap">
                  <SafeInput
                    type="text"
                    className="form-input no-icon"
                    style={{ padding: '7px 12px', fontSize: '13px' }}
                    placeholder="Tên công việc cần hoàn thành"
                    value={newDeadlineTitle}
                    onChange={(e) => setNewDeadlineTitle(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Hạn chót *</label>
                <div className="form-input-wrap">
                  <input
                    type="datetime-local"
                    className="form-input no-icon"
                    style={{ padding: '7px 12px', fontSize: '13px' }}
                    value={newDeadlineDueDate}
                    min={new Date(new Date() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                    max={(() => { const d = new Date(); d.setDate(d.getDate() + 7); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); })()}
                    onChange={(e) => setNewDeadlineDueDate(e.target.value)}
                    required
                  />
                </div>
                <p style={{ margin: '3px 0 0', fontSize: 10, color: 'var(--text-muted)' }}>Chỉ đặt deadline tối đa 7 ngày tới</p>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Yêu cầu cụ thể</label>
              <SafeTextarea
                className="form-textarea"
                style={{ height: '52px', resize: 'none', fontSize: '13px', padding: '7px 12px' }}
                placeholder="Mô tả chi tiết yêu cầu, định dạng nộp bài..."
                value={newDeadlineDesc}
                onChange={(e) => setNewDeadlineDesc(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Giao cho</label>
              <div className="form-input-wrap">
                <select
                  className="form-input no-icon"
                  style={{ padding: '7px 12px', fontSize: '13px', cursor: 'pointer' }}
                  value={newDeadlineAssignee}
                  onChange={(e) => setNewDeadlineAssignee(e.target.value)}
                >
                  <option value="all">Cả nhóm</option>
                  {group?.members.map((memberId) => {
                    const u = membersDetails.find((userObj) => String(userObj.id) === String(memberId));
                    const memberName = u ? u.fullName : memberId;
                    const memberIsLeader = String(memberId) === String(group.creatorId);
                    const memberIsDeputy = group.deputyIds ? group.deputyIds.some(id => String(id) === String(memberId)) : String(memberId) === String(group.deputyId);
                    const role = memberIsLeader ? ' (Trưởng nhóm)' : memberIsDeputy ? ' (Phó nhóm)' : '';
                    return (
                      <option key={memberId} value={memberId}>
                        {memberName}
                        {role}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Yêu cầu dạng bài nộp *
                </label>
                <select
                  value={newDeadlineSubmissionType}
                  onChange={(e) => setNewDeadlineSubmissionType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 36px 10px 14px',
                    background: 'var(--bg-input) url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23888888\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e") no-repeat right 12px center / 16px',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    fontWeight: 500,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                    outline: 'none',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                  }}
                >
                  <option value="image" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>Hình ảnh bài làm</option>
                  <option value="file" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>Tệp tài liệu (Word, PDF, ZIP)</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="btn btn-mono"
              disabled={isSubmittingDeadline}
              style={{
                width: 'max-content',
                alignSelf: 'flex-end',
                padding: '8px 20px',
                fontSize: '13px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {isSubmittingDeadline ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: '12px', height: '12px', border: '2px solid transparent', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite', marginRight: '4px' }}></span>
                  Đang thêm...
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#fff' }}>
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Thêm deadline
                </>
              )}
            </button>
          </form>
        </div>
      )}

      <div id="group-deadline-list" ref={deadlineListRef} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', minWidth: 0 }}>
        <h3 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          Danh sách Deadline ({visibleDeadlines.length})
        </h3>
        {visibleDeadlines.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
            }}
          >
            <p style={{ color: 'var(--text-muted)' }}>Chưa có deadline hay công việc nào được giao.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', minWidth: 0 }}>
            {visibleDeadlines.map((d) => {
              const canDelete = d.creatorId === user.id || group.creatorId === user.id;
              const dueSoon = d.dueSoon;
              const overdue = d.overdue;
              const subs = submissions[d.id] || [];
              const mySubmission = subs.find((s) => String(s.userId) === String(user.id));
              const hasSubmitted = !!mySubmission;
              const isDone = d.completed && hasSubmitted;

              return (
                <div
                  key={d.id}
                  className="deadline-file-row"
                  style={{
                    background: isDone ? 'rgba(255,255,255,0.01)' : 'var(--bg-card)',
                    border: dueSoon
                      ? '1.5px solid var(--error)'
                      : overdue
                      ? '1.5px solid var(--text-muted)'
                      : '1px solid var(--border)',
                    borderRadius: '16px',
                    padding: '16px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    opacity: isDone ? 0.7 : 1,
                    boxShadow: dueSoon ? '0 0 10px rgba(239, 68, 68, 0.1)' : 'none',
                    width: '100%',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '15px',
                          color: isDone ? 'var(--text-muted)' : 'var(--text-primary)',
                          textDecoration: isDone ? 'line-through' : 'none',
                        }}
                      >
                        {d.title}
                      </span>
                      {dueSoon && !isDone && (
                        <span
                          style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: 'var(--error)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          Sắp hết hạn
                        </span>
                      )}
                      {overdue && !isDone && (
                        <span
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            color: 'var(--text-muted)',
                            border: '1px solid var(--border)',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 600,
                          }}
                        >
                          Quá hạn
                        </span>
                      )}
                      {isDone && (
                        <span
                          style={{
                            background: 'rgba(34, 197, 94, 0.15)',
                            color: '#22c55e',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          Đã hoàn thành
                        </span>
                      )}
                      {d.submissionType === 'image' && (
                        <span
                          style={{
                            background: 'rgba(59, 130, 246, 0.12)',
                            color: '#3b82f6',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          Nộp ảnh
                        </span>
                      )}
                      {d.submissionType === 'file' && (
                        <span
                          style={{
                            background: 'rgba(168, 85, 247, 0.12)',
                            color: '#a855f7',
                            border: '1px solid rgba(168, 85, 247, 0.3)',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          Nộp file tài liệu
                        </span>
                      )}
                      {(!d.submissionType || d.submissionType === 'all') && (
                        <span
                          style={{
                            background: 'rgba(255, 255, 255, 0.06)',
                            color: 'var(--text-muted)',
                            border: '1px solid var(--border)',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 600,
                          }}
                        >
                          Nộp ảnh / file
                        </span>
                      )}
                    </div>
                    {d.description && (
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                        {d.description}
                      </p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: 'var(--text-muted)', flexWrap: 'wrap', marginTop: '2px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        Hạn: {format24h(d.dueDate)}
                      </span>
                      {d.assigneeName && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                          Giao cho: {d.assigneeName}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', width: '100%' }}>
                    {isLeader && (
                      <button
                        onClick={() => setShowSubmissionsFor(d.id)}
                        className="btn-mono"
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          borderRadius: '8px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Bài nộp ({subs.length})
                      </button>
                    )}

                    {isLeader && !overdue && !isDone && (
                      <button
                        onClick={() => handleRemindDeadline(d.id)}
                        disabled={remindingIds[d.id]}
                        style={{
                          background: remindingIds[d.id] ? 'rgba(255,255,255,0.05)' : 'rgba(234, 179, 8, 0.12)',
                          border: '1px solid rgba(234, 179, 8, 0.3)',
                          color: '#eab308',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: remindingIds[d.id] ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.2s',
                        }}
                        title="Gửi thông báo nhắc nhở làm deadline tới các thành viên"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                        {remindingIds[d.id] ? 'Đang nhắc...' : 'Nhắc nhở'}
                      </button>
                    )}

                    {(() => {
                      if (hasSubmitted) {
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                background: 'rgba(34, 197, 94, 0.12)',
                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                color: '#22c55e',
                                padding: '6px 12px',
                                borderRadius: '24px',
                                fontSize: '12px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              Đã nộp
                            </span>
                            {!overdue && (
                              <button
                                onClick={() => handleDeleteSubmission(d.id)}
                                style={{
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  border: '1px solid rgba(239, 68, 68, 0.25)',
                                  color: 'var(--error)',
                                  borderRadius: '24px',
                                  padding: '5px 10px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  transition: 'all 0.2s',
                                }}
                                title="Xóa bài nộp hiện tại để nộp lại"
                              >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                                Xóa bài nộp
                              </button>
                            )}
                          </div>
                        );
                      }

                      return (
                        <button
                          onClick={() => {
                            setShowSubmitModal(d.id);
                            setSubmitNote('');
                            setSubmitFile(null);
                            if (setSubmitImages) setSubmitImages([]);
                          }}
                          disabled={overdue}
                          title={overdue ? 'Đã quá hạn, không thể nộp bài' : ''}
                          className={overdue ? "" : "btn-mono"}
                          style={{
                            background: overdue ? 'rgba(255,255,255,0.03)' : undefined,
                            border: overdue ? '1px solid rgba(255,255,255,0.1)' : undefined,
                            color: overdue ? 'var(--text-muted)' : undefined,
                            cursor: overdue ? 'not-allowed' : 'pointer',
                            borderRadius: overdue ? '24px' : undefined,
                            padding: '6px 14px',
                            fontSize: '12px',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            opacity: overdue ? 0.5 : 1,
                            boxShadow: 'none',
                          }}
                        >
                          {overdue ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                              </svg>
                              Đã khóa
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                              </svg>
                              Nộp bài
                            </span>
                          )}
                        </button>
                      );
                    })()}

                    {canDelete && (
                      <button
                        onClick={() => handleDeadlineDelete(d.id)}
                        style={{
                          marginLeft: 'auto',
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: '6px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'color 0.2s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--error)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                        title="Xóa deadline"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit deadline modal */}
      {editingDeadline && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setEditingDeadline(null)}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '28px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: 'var(--shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 700 }}>Sửa deadline</h3>
            <form onSubmit={handleUpdateDeadline} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Tên deadline *
                </label>
                <SafeInput
                  value={editDeadlineTitle}
                  onChange={(e) => setEditDeadlineTitle(e.target.value)}
                  placeholder="Nộp bài tập lớn"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Hạn chót *
                </label>
                <input
                  type="datetime-local"
                  value={editDeadlineDueDate}
                  onChange={(e) => setEditDeadlineDueDate(e.target.value)}
                  min={new Date(new Date() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                  max={(() => { const d = new Date(); d.setDate(d.getDate() + 7); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); })()}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
                <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>Chỉ đặt deadline tối đa 7 ngày tới</p>
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Mô tả
                </label>
                <SafeTextarea
                  value={editDeadlineDesc}
                  onChange={(e) => setEditDeadlineDesc(e.target.value)}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Giao cho
                </label>
                <select
                  value={editDeadlineAssignee}
                  onChange={(e) => setEditDeadlineAssignee(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="all">Cả nhóm</option>
                  {group &&
                    group.members.map((memberId) => {
                      const u = membersDetails.find((userObj) => String(userObj.id) === String(memberId));
                      const memberName = u ? u.fullName : memberId;
                      const memberIsLeader = String(memberId) === String(group.creatorId);
                      const memberIsDeputy = String(memberId) === String(group.deputyId);
                      const role = memberIsLeader ? ' (Trưởng nhóm)' : memberIsDeputy ? ' (Phó nhóm)' : '';
                      return (
                        <option key={memberId} value={memberId}>
                          {memberName}
                          {role}
                        </option>
                      );
                    })}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Yêu cầu dạng bài nộp *
                </label>
                <select
                  value={editDeadlineSubmissionType}
                  onChange={(e) => setEditDeadlineSubmissionType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 36px 10px 14px',
                    background: 'var(--bg-input) url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23888888\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e") no-repeat right 12px center / 16px',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    fontWeight: 500,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                    outline: 'none',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                  }}
                >
                  <option value="image" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>Hình ảnh bài làm</option>
                  <option value="file" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>Tệp tài liệu (Word, PDF, ZIP)</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setEditingDeadline(null)}
                  className="btn-mono"
                  style={{
                    padding: '10px 20px',
                    fontFamily: 'inherit',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDeadline}
                  className="btn-mono"
                  style={{
                    padding: '10px 24px',
                    fontFamily: 'inherit',
                    fontSize: '14px',
                    fontWeight: 700,
                  }}
                >
                  {isSubmittingDeadline ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assignment Upload Modal */}
      {showSubmitModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            boxSizing: 'border-box',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseSubmitModal();
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '20px',
              padding: '24px',
              width: '100%',
              maxWidth: '520px',
              maxHeight: 'calc(100vh - 48px)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              boxSizing: 'border-box',
            }}
          >
            {/* 1. Header (Fixed Top) */}
            <div style={{ flexShrink: 0, marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Nộp bài tập
                </h3>
                <button
                  type="button"
                  onClick={handleCloseSubmitModal}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    fontSize: '18px',
                    lineHeight: 1,
                    padding: '4px 8px',
                    borderRadius: '6px',
                  }}
                  title="Đóng modal"
                >
                  ✕
                </button>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                {deadlines.find((d) => String(d.id) === String(showSubmitModal))?.title}
              </p>
            </div>

            {/* 2. Middle Body (Scrollable if needed) */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column' }}>
              {/* Mode Header */}
              {(() => {
                const currentDl = deadlines.find((d) => String(d.id) === String(showSubmitModal));
                const allowedType = currentDl?.submissionType || 'image';

                if (allowedType === 'file') {
                  return (
                    <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', padding: '10px 14px', borderRadius: '10px', marginBottom: '16px', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center' }}>
                      Yêu cầu bài nộp: Tệp tài liệu (Word, PDF, ZIP)
                    </div>
                  );
                }

                return (
                  <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', padding: '10px 14px', borderRadius: '10px', marginBottom: '16px', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center' }}>
                    Yêu cầu bài nộp: Hình ảnh bài làm
                  </div>
                );
              })()}

              {submitTab === 'images' ? (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', gap: '8px', flexWrap: 'wrap' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                      Danh sách hình ảnh ({submitImages.length}/6)
                    </label>
                    <label
                      htmlFor="bulk-images-upload-input"
                      style={{
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-block',
                        margin: 0,
                        userSelect: 'none',
                      }}
                    >
                      Chọn ảnh bài làm
                    </label>
                    <input
                      id="bulk-images-upload-input"
                      ref={bulkImagesRef}
                      type="file"
                      multiple
                      accept="image/*,image/png,image/jpeg,image/jpg,image/webp,image/heic"
                      style={{ display: 'none' }}
                      onChange={handleBulkImagesChange}
                    />
                  </div>

                  {/* 6 Slot Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {[0, 1, 2, 3, 4, 5].map((slotIdx) => {
                      const imgFile = submitImages[slotIdx];
                      const objectUrl = imgFile
                        ? (typeof imgFile === 'string' ? imgFile : URL.createObjectURL(imgFile))
                        : null;

                      return (
                        <div
                          key={slotIdx}
                          style={{
                            position: 'relative',
                            height: '84px',
                            borderRadius: '10px',
                            border: objectUrl ? '1.5px solid var(--primary)' : '2px dashed var(--border)',
                            background: 'var(--bg-input)',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onClick={() => {
                            if (!objectUrl) {
                              slotInputRefs.current[slotIdx]?.click();
                            }
                          }}
                        >
                          {objectUrl ? (
                            <>
                              <img
                                src={objectUrl}
                                alt={`Ảnh ${slotIdx + 1}`}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLightboxImg(objectUrl);
                                }}
                              />
                              <span
                                style={{
                                  position: 'absolute',
                                  top: 4,
                                  left: 4,
                                  background: 'rgba(0,0,0,0.65)',
                                  color: '#fff',
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                }}
                              >
                                Ảnh {slotIdx + 1}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const next = [...submitImages];
                                  next.splice(slotIdx, 1);
                                  setSubmitImages(next);
                                }}
                                style={{
                                  position: 'absolute',
                                  top: 4,
                                  right: 4,
                                  background: 'rgba(239, 68, 68, 0.85)',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '50%',
                                  width: '22px',
                                  height: '22px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                }}
                                title="Xóa tấm ảnh này"
                              >
                                ✕
                              </button>
                            </>
                          ) : (
                            <div style={{ textAlign: 'center', padding: '6px', color: 'var(--text-muted)' }}>
                              <div style={{ fontSize: '12px', fontWeight: 600 }}>+ Ảnh {slotIdx + 1}</div>
                            </div>
                          )}
                          <input
                            ref={(el) => (slotInputRefs.current[slotIdx] = el)}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => handleSlotImageChange(slotIdx, e)}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <p style={{ margin: '6px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                    💡 Chọn tối đa 6 tấm ảnh bằng nút bên trên, hoặc nhấp trực tiếp từng ô để chọn lẻ.
                  </p>
                </div>
              ) : (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
                    Tệp đính kèm (Word, PDF, ZIP...)
                  </label>
                  <div
                    onClick={() => submitFileRef.current?.click()}
                    style={{
                      border: '2px dashed var(--border)',
                      borderRadius: '12px',
                      padding: '16px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s',
                      background: 'var(--bg-input)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    {submitFile ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>
                          {submitFile.name}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSubmitFile(null);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            fontSize: '16px',
                            lineHeight: 1,
                            padding: '0 4px',
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>Nhấn để chọn tệp tài liệu</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          PDF, Word, Excel, ZIP...
                        </div>
                      </div>
                    )}
                  </div>
                  <input
                    ref={submitFileRef}
                    type="file"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      setSubmitFile(e.target.files[0] || null);
                      setSubmitImages([]);
                    }}
                  />
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
                  Ghi chú
                </label>
                <SafeTextarea
                  value={submitNote}
                  onChange={(e) => setSubmitNote(e.target.value)}
                  placeholder="Thêm ghi chú cho trưởng nhóm..."
                  rows={2}
                  style={{
                    width: '100%',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* 3. Footer (Fixed Bottom, Always Visible) */}
            <div style={{ flexShrink: 0, paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={handleCloseSubmitModal}
                style={{
                  flex: 1,
                  padding: '10px',
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  fontSize: '14px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                }}
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={handleSubmitAssignment}
                disabled={isSubmitting || (!submitFile && submitImages.length === 0 && !submitNote.trim())}
                className={!submitFile && submitImages.length === 0 && !submitNote.trim() ? "" : "btn-mono"}
                style={{
                  flex: 2,
                  padding: '10px',
                  background: !submitFile && submitImages.length === 0 && !submitNote.trim() ? 'var(--bg-input)' : undefined,
                  border: !submitFile && submitImages.length === 0 && !submitNote.trim() ? '1px solid var(--border)' : undefined,
                  color: !submitFile && submitImages.length === 0 && !submitNote.trim() ? 'var(--text-muted)' : undefined,
                  fontWeight: 700,
                  cursor: !submitFile && submitImages.length === 0 && !submitNote.trim() ? 'not-allowed' : 'pointer',
                  borderRadius: '10px',
                  fontFamily: 'inherit',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                }}
              >
                {isSubmitting ? 'Đang nộp...' : 'Xác nhận nộp bài'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leader Submissions modal */}
      {showSubmissionsFor && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSubmissionsFor(null);
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '18px',
              padding: '20px 24px',
              width: '100%',
              maxWidth: '560px',
              maxHeight: 'calc(100vh - 80px)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 8px 40px rgba(0,0,0,0.45)',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Danh sách bài nộp
              </h3>
              <button
                type="button"
                onClick={() => setShowSubmissionsFor(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  fontSize: '20px',
                  lineHeight: 1,
                  padding: '4px 8px',
                  borderRadius: '8px',
                }}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              {deadlines.find((d) => d.id === showSubmissionsFor)?.title}
            </p>
            <div style={{ overflowY: 'auto', overscrollBehavior: 'contain', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(submissions[showSubmissionsFor] || []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px', color: 'var(--text-muted)' }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </div>
                  <div>Chưa có thành viên nào nộp bài.</div>
                </div>
              ) : (
                (submissions[showSubmissionsFor] || []).map((s, idx) => (
                  <div
                    key={idx}
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 16px' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--text-muted), #666)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: 'white',
                            flexShrink: 0,
                          }}
                        >
                          {s.userInitial}
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                          {s.userName}
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {format24h(s.submittedAt)}
                      </span>
                    </div>

                    {s.note && (
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 8px', lineHeight: 1.5 }}>
                        {s.note}
                      </p>
                    )}

                    {/* Multi-Image Submission Gallery */}
                    {s.images && s.images.length > 0 ? (
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                          </svg>
                          {s.images.length} ảnh bài nộp (Nhấp để phóng to):
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px' }}>
                          {s.images.map((img, i) => (
                            <div
                              key={i}
                              onClick={() => setLightboxImg(img.fileData)}
                              style={{
                                height: '76px',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                cursor: 'pointer',
                                border: '1px solid var(--border)',
                                position: 'relative',
                                background: 'rgba(0,0,0,0.2)',
                              }}
                            >
                              <img
                                src={img.fileData}
                                alt={img.fileName || `Ảnh ${i + 1}`}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                              <span
                                style={{
                                  position: 'absolute',
                                  bottom: 2,
                                  right: 2,
                                  background: 'rgba(0,0,0,0.65)',
                                  color: '#fff',
                                  fontSize: '9px',
                                  fontWeight: 700,
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                }}
                              >
                                #{i + 1}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : s.fileName ? (
                      <a
                        href={s.fileData}
                        download={s.fileName}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'rgba(0,0,0,0.06)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          padding: '5px 12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          textDecoration: 'none',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.1)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.06)')}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        {s.fileName}
                      </a>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}