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
  handleSaveGrade,
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

  // State for grading modal
  const [gradingTarget, setGradingTarget] = useState(null); // { deadlineId, member, submission }
  const [gradeInput, setGradeInput] = useState('');
  const [feedbackInput, setFeedbackInput] = useState('');

  const isGroupCreator = String(user?.id) === String(group?.creatorId);
  const isDeputy = group?.deputyIds ? group.deputyIds.some(id => String(id) === String(user?.id)) : String(user?.id) === String(group?.deputyId);
  const isLeader = isGroupCreator || isDeputy;

  const getSubmissionTiming = (submittedAt, dueDate) => {
    if (!submittedAt || !dueDate) return null;
    const subTime = new Date(submittedAt).getTime();
    const dueTime = new Date(dueDate).getTime();
    const diffMs = dueTime - subTime;
    const isEarly = diffMs >= 0;
    const absDiff = Math.abs(diffMs);

    const minutes = Math.floor(absDiff / (60 * 1000));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    let timeStr = '';
    if (days > 0) {
      const remHours = hours % 24;
      timeStr = `${days} ngày${remHours > 0 ? ` ${remHours} giờ` : ''}`;
    } else if (hours > 0) {
      const remMins = minutes % 60;
      timeStr = `${hours} giờ${remMins > 0 ? ` ${remMins} phút` : ''}`;
    } else if (minutes > 0) {
      timeStr = `${minutes} phút`;
    } else {
      timeStr = 'đúng hạn';
    }

    return {
      isEarly,
      label: timeStr === 'đúng hạn' ? 'Nộp đúng hạn' : (isEarly ? `Nộp sớm ${timeStr}` : `Nộp trễ ${timeStr}`)
    };
  };

  const openGradingModal = (deadlineId, member, submission) => {
    setGradingTarget({ deadlineId, member, submission });
    setGradeInput(submission?.grade != null ? String(submission.grade) : '');
    setFeedbackInput(submission?.feedback || '');
  };

  const handleSaveGradeClick = () => {
    if (!gradingTarget) return;
    const { deadlineId, member } = gradingTarget;
    if (handleSaveGrade) {
      handleSaveGrade(deadlineId, member.id, gradeInput.trim(), feedbackInput.trim());
    }
    setGradingTarget(null);
  };

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
                  {group?.members
                    .filter((mId) => String(mId) !== String(group?.creatorId))
                    .map((memberId) => {
                      const u = membersDetails.find((userObj) => String(userObj.id) === String(memberId));
                      const memberName = u ? u.fullName : memberId;
                      const memberIsDeputy = group.deputyIds ? group.deputyIds.some(id => String(id) === String(memberId)) : String(memberId) === String(group.deputyId);
                      const role = memberIsDeputy ? ' (Phó nhóm)' : '';
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
                  <option value="image" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>Hình ảnh</option>
                  <option value="file" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>Tệp</option>
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
              const isDone = hasSubmitted;
              const nonCreatorMembersCount = (group?.members || []).filter((mId) => String(mId) !== String(group?.creatorId)).length || 1;
              const totalAssigned = d.assigneeId && d.assigneeId !== 'all' ? 1 : nonCreatorMembersCount;

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
                  {/* Card Header & Content */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', width: '100%' }}>
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
                            Hình ảnh
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
                            Tệp
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
                            Hình ảnh / file
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

                    {/* Delete Deadline button for Leader/Creator on Top Right */}
                    {canDelete && (
                      <button
                        onClick={() => handleDeadlineDelete(d.id)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          color: 'var(--error)',
                          cursor: 'pointer',
                          padding: '6px 8px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.18)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)')}
                        title="Xóa deadline"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    )}
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
                        Bài nộp ({subs.length}/{totalAssigned})
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

                    {!isGroupCreator && (() => {
                      if (hasSubmitted) {
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
                              Đã nộp bài
                            </span>
                            {mySubmission?.grade != null && (
                              <span
                                style={{
                                  background: 'rgba(234, 179, 8, 0.15)',
                                  border: '1px solid rgba(234, 179, 8, 0.4)',
                                  color: '#eab308',
                                  padding: '5px 10px',
                                  borderRadius: '24px',
                                  fontSize: '12px',
                                  fontWeight: 800,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  whiteSpace: 'nowrap',
                                }}
                                title={mySubmission.feedback ? `Nhận xét: "${mySubmission.feedback}"` : 'Điểm đã chấm'}
                              >
                                ⭐ Điểm: {mySubmission.grade}/10
                              </span>
                            )}
                            {!overdue && (
                              <button
                                onClick={() => handleDeleteSubmission(d.id)}
                                style={{
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  border: '1px solid rgba(239, 68, 68, 0.25)',
                                  color: 'var(--error)',
                                  borderRadius: '24px',
                                  padding: '6px 12px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0,
                                  transition: 'all 0.2s',
                                }}
                                title="Xóa bài nộp hiện tại để nộp lại"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                    group.members
                      .filter((mId) => String(mId) !== String(group.creatorId))
                      .map((memberId) => {
                        const u = membersDetails.find((userObj) => String(userObj.id) === String(memberId));
                        const memberName = u ? u.fullName : memberId;
                        const memberIsDeputy = group.deputyIds ? group.deputyIds.some(id => String(id) === String(memberId)) : String(memberId) === String(group.deputyId);
                        const role = memberIsDeputy ? ' (Phó nhóm)' : '';
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
                  <option value="image" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>Hình ảnh</option>
                  <option value="file" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>Tệp</option>
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

      {/* Leader Submissions & Member Progress modal */}
      {showSubmissionsFor && (() => {
        const currDl = deadlines.find((d) => String(d.id) === String(showSubmissionsFor));
        const dlSubmissions = submissions[showSubmissionsFor] || [];
        
        // Determine assigned member list (excluding group creator)
        let assignedMembers = [];
        if (currDl?.assigneeId && currDl.assigneeId !== 'all') {
          const m = membersDetails.find((mem) => String(mem.id) === String(currDl.assigneeId));
          assignedMembers = m ? [m] : [{ id: currDl.assigneeId, fullName: currDl.assigneeName || 'Thành viên' }];
        } else {
          const allMems = membersDetails.length > 0 ? membersDetails : (group?.members || []).map((mId) => ({ id: mId, fullName: mId }));
          assignedMembers = allMems.filter((mem) => String(mem.id) !== String(group?.creatorId));
        }

        const submittedCount = assignedMembers.filter(m => dlSubmissions.some(s => String(s.userId) === String(m.id))).length;

        return (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.65)',
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
                maxWidth: '640px',
                maxHeight: 'calc(100vh - 80px)',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 8px 40px rgba(0,0,0,0.45)',
                boxSizing: 'border-box',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    Danh sách bài nộp & Tiến độ
                  </h3>
                  <span style={{ fontSize: '12px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '2px 10px', borderRadius: '12px', fontWeight: 700 }}>
                    {submittedCount}/{assignedMembers.length} đã nộp
                  </span>
                </div>
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

              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', fontWeight: 500 }}>
                Deadline: <strong style={{ color: 'var(--text-primary)' }}>{currDl?.title}</strong> (Hạn: {format24h(currDl?.dueDate)})
              </p>

              {/* Members submission list */}
              <div style={{ overflowY: 'auto', overscrollBehavior: 'contain', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
                {assignedMembers.map((m) => {
                  const sub = dlSubmissions.find((s) => String(s.userId) === String(m.id));
                  const timing = sub ? getSubmissionTiming(sub.submittedAt, currDl?.dueDate) : null;
                  const isUserLeader = String(m.id) === String(group?.creatorId);
                  const isUserDeputy = group?.deputyIds ? group.deputyIds.some(id => String(id) === String(m.id)) : String(m.id) === String(group?.deputyId);

                  return (
                    <div
                      key={m.id}
                      style={{
                        background: 'var(--bg-input)',
                        border: sub ? '1px solid var(--border)' : '1px dashed var(--border)',
                        borderRadius: '14px',
                        padding: '14px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      {/* Top row: Member Info & Submission timing status */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {m.avatar ? (
                            <img src={m.avatar} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            <div
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, var(--text-muted), #666)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '13px',
                                fontWeight: 700,
                                color: 'white',
                                flexShrink: 0,
                              }}
                            >
                              {m.fullName ? m.fullName.charAt(0).toUpperCase() : (sub?.userInitial || '?')}
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {m.fullName || sub?.userName || 'Thành viên'}
                              {isUserLeader && <span style={{ fontSize: '10px', background: 'rgba(234, 179, 8, 0.2)', color: '#eab308', padding: '1px 6px', borderRadius: '6px' }}>Trưởng nhóm</span>}
                              {isUserDeputy && <span style={{ fontSize: '10px', background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', padding: '1px 6px', borderRadius: '6px' }}>Phó nhóm</span>}
                            </div>
                            {sub && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Thời gian nộp: {format24h(sub.submittedAt)}</div>}
                          </div>
                        </div>

                        {/* Status badges */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          {sub ? (
                            <>
                              <span style={{ fontSize: '11px', background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '3px 8px', borderRadius: '12px', fontWeight: 700 }}>
                                Đã nộp
                              </span>
                              {timing && (
                                <span style={{
                                  fontSize: '11px',
                                  background: timing.isEarly ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                  color: timing.isEarly ? '#22c55e' : '#ef4444',
                                  border: timing.isEarly ? '1px solid rgba(34, 197, 94, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
                                  padding: '3px 8px',
                                  borderRadius: '12px',
                                  fontWeight: 600
                                }}>
                                  {timing.label}
                                </span>
                              )}
                            </>
                          ) : (
                            <span style={{ fontSize: '11px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)', border: '1px solid var(--border)', padding: '3px 8px', borderRadius: '12px', fontWeight: 600 }}>
                              Chưa nộp bài
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Submission Content Details */}
                      {sub && (
                        <div style={{ background: 'rgba(0,0,0,0.18)', padding: '12px 14px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '10px', border: '1px solid var(--border)' }}>
                          {/* File / Image Summary badge */}
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                            {sub.images && sub.images.length > 0 ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#3b82f6' }}>
                                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                  <circle cx="8.5" cy="8.5" r="1.5" />
                                  <polyline points="21 15 16 10 5 21" />
                                </svg>
                                {sub.images.length} ảnh bài làm
                              </span>
                            ) : sub.fileName ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#a855f7' }}>
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                  <polyline points="14 2 14 8 20 8" />
                                </svg>
                                Tệp đính kèm: {sub.fileName}
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                                Bài làm văn bản
                              </span>
                            )}
                          </div>

                          {sub.note && (
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                              <strong style={{ color: 'var(--text-primary)' }}>Ghi chú:</strong> {sub.note}
                            </p>
                          )}

                          {/* Images gallery with interactive preview */}
                          {sub.images && sub.images.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '2px' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px' }}>
                                {sub.images.map((img, i) => (
                                  <div
                                    key={i}
                                    onClick={() => setLightboxImg(img.fileData)}
                                    style={{
                                      height: '75px',
                                      borderRadius: '8px',
                                      overflow: 'hidden',
                                      cursor: 'pointer',
                                      border: '1.5px solid var(--border)',
                                      position: 'relative',
                                      background: '#000',
                                    }}
                                    title="Click vào ảnh để xem kích thước lớn"
                                  >
                                    <img src={img.fileData} alt={`Bài làm ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  </div>
                                ))}
                              </div>
                              <button
                                type="button"
                                onClick={() => setLightboxImg(sub.images[0].fileData)}
                                style={{
                                  alignSelf: 'flex-start',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  background: 'rgba(59, 130, 246, 0.12)',
                                  border: '1px solid rgba(59, 130, 246, 0.3)',
                                  borderRadius: '8px',
                                  padding: '6px 12px',
                                  fontSize: '12px',
                                  color: '#3b82f6',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                                Xem ảnh trực tiếp ({sub.images.length} ảnh)
                              </button>
                            </div>
                          )}

                          {/* File download link for non-image files */}
                          {sub.fileName && sub.fileData && (
                            <div>
                              <a
                                href={sub.fileData}
                                download={sub.fileName}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  background: 'rgba(255,255,255,0.06)',
                                  border: '1px solid var(--border)',
                                  borderRadius: '8px',
                                  padding: '6px 12px',
                                  fontSize: '12px',
                                  color: 'var(--text-primary)',
                                  textDecoration: 'none',
                                  fontWeight: 600,
                                }}
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                  <polyline points="7 10 12 15 17 10" />
                                  <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                                Tải file: {sub.fileName}
                              </a>
                            </div>
                          )}

                          {/* Grade & Feedback Display if graded */}
                          {sub.grade != null && (
                            <div style={{ marginTop: '4px', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', padding: '10px 14px', borderRadius: '10px' }}>
                              <div style={{ fontSize: '13px', fontWeight: 800, color: '#eab308', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                </svg>
                                Điểm số: {sub.grade}/10
                              </div>
                              {sub.feedback && (
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                                  <strong>Nhận xét:</strong> "{sub.feedback}"
                                </div>
                              )}
                            </div>
                          )}

                          {/* Grading Button for Leader/Deputy */}
                          {isLeader && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                              <button
                                type="button"
                                onClick={() => openGradingModal(currDl.id, m, sub)}
                                className="btn-mono"
                                style={{
                                  padding: '6px 14px',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  borderRadius: '8px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  cursor: 'pointer',
                                }}
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                </svg>
                                {sub.grade != null ? 'Sửa điểm & Nhận xét' : 'Chấm điểm'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Leader Grading Modal */}
      {gradingTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setGradingTarget(null);
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '18px',
              padding: '24px',
              width: '100%',
              maxWidth: '460px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Chấm điểm bài nộp
              </h3>
              <button
                type="button"
                onClick={() => setGradingTarget(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '20px',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Thành viên: <strong style={{ color: 'var(--text-primary)' }}>{gradingTarget.member.fullName}</strong>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Chọn điểm số (từ 1 đến 10 điểm):
              </label>
              <select
                value={gradeInput}
                onChange={(e) => setGradeInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 36px 10px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-input) url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23888888\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e") no-repeat right 12px center / 16px',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  boxSizing: 'border-box',
                }}
              >
                <option value="" style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}>-- Chọn điểm số --</option>
                {[10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6, 5.5, 5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5, 0].map((score) => (
                  <option key={score} value={score} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                    {score} điểm
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Nhận xét & Góp ý:
              </label>
              <textarea
                rows={3}
                value={feedbackInput}
                onChange={(e) => setFeedbackInput(e.target.value)}
                placeholder="Nhập lời nhận xét chi tiết..."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setGradingTarget(null)}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveGradeClick}
                className="btn-mono"
                style={{
                  padding: '9px 20px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Lưu điểm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Upload Modal */}
      {showSubmitModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '70px 16px 20px 16px',
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
              borderRadius: '16px',
              padding: '20px 24px',
              width: '100%',
              maxWidth: '480px',
              maxHeight: 'min(580px, calc(100vh - 100px))',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
              boxSizing: 'border-box',
              overflow: 'hidden',
            }}
          >
            {/* 1. Header (Fixed Top) */}
            <div style={{ flexShrink: 0, marginBottom: '14px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Nộp bài tập
                </h3>
                <button
                  type="button"
                  onClick={handleCloseSubmitModal}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    fontSize: '14px',
                    lineHeight: 1,
                    padding: '6px 10px',
                    borderRadius: '8px',
                    transition: 'all 0.2s',
                  }}
                  title="Đóng modal"
                >
                  ✕
                </button>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0', fontWeight: 500 }}>
                {deadlines.find((d) => String(d.id) === String(showSubmitModal))?.title}
              </p>
            </div>

            {/* 2. Scrollable Body */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column' }}>
              {/* Mode Header */}
              {(() => {
                const currentDl = deadlines.find((d) => String(d.id) === String(showSubmitModal));
                const allowedType = currentDl?.submissionType || 'image';

                if (allowedType === 'file') {
                  return (
                    <div style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.25)', padding: '8px 12px', borderRadius: '8px', marginBottom: '14px', fontSize: '12px', fontWeight: 700, color: '#a855f7', textAlign: 'center' }}>
                      Yêu cầu bài nộp: Tệp
                    </div>
                  );
                }

                return (
                  <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', padding: '8px 12px', borderRadius: '8px', marginBottom: '14px', fontSize: '12px', fontWeight: 700, color: '#3b82f6', textAlign: 'center' }}>
                    Yêu cầu bài nộp: Hình ảnh
                  </div>
                );
              })()}

              {submitTab === 'images' ? (
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Hình ảnh làm bài ({submitImages.length}/6)
                    </label>
                    {submitImages.length > 0 && submitImages.length < 6 && (
                      <label
                        htmlFor="bulk-images-upload-input"
                        style={{
                          color: 'var(--primary)',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        + Thêm ảnh
                      </label>
                    )}
                  </div>

                  <input
                    id="bulk-images-upload-input"
                    ref={bulkImagesRef}
                    type="file"
                    multiple
                    accept="image/*,image/png,image/jpeg,image/jpg,image/webp,image/heic"
                    style={{ display: 'none' }}
                    onChange={handleBulkImagesChange}
                  />

                  {/* Clean Dropzone when empty */}
                  {submitImages.length === 0 ? (
                    <div
                      onClick={() => bulkImagesRef.current?.click()}
                      style={{
                        border: '2px dashed var(--border)',
                        borderRadius: '12px',
                        padding: '24px 16px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        background: 'var(--bg-input)',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                    >
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '8px' }}>
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Nhấn để tải lên hình ảnh
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Hỗ trợ PNG, JPG, WEBP, HEIC (Tối đa 6 ảnh)
                      </div>
                    </div>
                  ) : (
                    /* Thumbnail grid list */
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      {submitImages.map((imgFile, slotIdx) => {
                        const objectUrl = typeof imgFile === 'string' ? imgFile : URL.createObjectURL(imgFile);
                        return (
                          <div
                            key={slotIdx}
                            style={{
                              position: 'relative',
                              height: '90px',
                              borderRadius: '10px',
                              border: '1.5px solid var(--border)',
                              background: 'var(--bg-input)',
                              overflow: 'hidden',
                            }}
                          >
                            <img
                              src={objectUrl}
                              alt={`Ảnh ${slotIdx + 1}`}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                              onClick={() => setLightboxImg(objectUrl)}
                            />
                            <span
                              style={{
                                position: 'absolute',
                                bottom: 4,
                                left: 4,
                                background: 'rgba(0,0,0,0.7)',
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
                              onClick={() => {
                                const next = [...submitImages];
                                next.splice(slotIdx, 1);
                                setSubmitImages(next);
                              }}
                              style={{
                                position: 'absolute',
                                top: 4,
                                right: 4,
                                background: 'rgba(239, 68, 68, 0.9)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '50%',
                                width: '20px',
                                height: '20px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '11px',
                                fontWeight: 700,
                              }}
                              title="Xóa tấm ảnh này"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
                    Tệp đính kèm
                  </label>
                  <div
                    onClick={() => submitFileRef.current?.click()}
                    style={{
                      border: '2px dashed var(--border)',
                      borderRadius: '12px',
                      padding: '20px 16px',
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
                          📄 {submitFile.name}
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
                            fontSize: '14px',
                            lineHeight: 1,
                            padding: '0 4px',
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '8px' }}>
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="12" y1="18" x2="12" y2="12" />
                          <line x1="9" y1="15" x2="15" y2="15" />
                        </svg>
                        <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 700 }}>Nhấn để chọn tệp</div>
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

              <div style={{ marginBottom: '14px' }}>
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

            {/* 3. Footer (Fixed Bottom) */}
            <div style={{ flexShrink: 0, paddingTop: '14px', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={handleCloseSubmitModal}
                style={{
                  flex: 1,
                  padding: '9px',
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  fontSize: '13px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  borderRadius: '8px',
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
                  padding: '9px',
                  background: !submitFile && submitImages.length === 0 && !submitNote.trim() ? 'var(--bg-input)' : undefined,
                  border: !submitFile && submitImages.length === 0 && !submitNote.trim() ? '1px solid var(--border)' : undefined,
                  color: !submitFile && submitImages.length === 0 && !submitNote.trim() ? 'var(--text-muted)' : undefined,
                  fontWeight: 700,
                  cursor: !submitFile && submitImages.length === 0 && !submitNote.trim() ? 'not-allowed' : 'pointer',
                  borderRadius: '8px',
                  fontFamily: 'inherit',
                  fontSize: '13px',
                  transition: 'all 0.2s',
                }}
              >
                {isSubmitting ? 'Đang nộp...' : 'Xác nhận nộp bài'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-screen Lightbox Image Preview Modal */}
      {lightboxImg && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.88)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
          onClick={() => setLightboxImg(null)}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '92vw',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxImg(null)}
              style={{
                position: 'absolute',
                top: '-46px',
                right: '0',
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: '#fff',
                fontSize: '18px',
                cursor: 'pointer',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              title="Đóng xem ảnh"
            >
              ✕
            </button>
            <img
              src={lightboxImg}
              alt="Chi tiết bài nộp"
              style={{
                maxWidth: '100%',
                maxHeight: '82vh',
                objectFit: 'contain',
                borderRadius: '12px',
                boxShadow: '0 16px 50px rgba(0,0,0,0.8)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            />
            <div style={{ marginTop: '14px', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <a
                href={lightboxImg}
                download="bai_nop_anh.webp"
                className="btn-mono"
                style={{
                  padding: '7px 18px',
                  fontSize: '13px',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 600,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Tải ảnh về máy
              </a>
              <button
                type="button"
                onClick={() => setLightboxImg(null)}
                style={{
                  padding: '7px 16px',
                  fontSize: '13px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}