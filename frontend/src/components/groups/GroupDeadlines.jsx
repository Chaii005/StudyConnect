import { useRef } from 'react';
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
  isSubmitting,
  showSubmissionsFor,
  setShowSubmissionsFor,
  handleSubmitAssignment,
  handleRemindDeadline,
  remindingIds,
  membersDetails = [],
}) {
  const submitFileRef = useRef(null);
  const deadlineListRef = useRef(null);

  const isLeader = String(user?.id) === String(group?.creatorId) || (group?.deputyIds ? group.deputyIds.some(id => String(id) === String(user?.id)) : String(user?.id) === String(group?.deputyId));

  const visibleDeadlines = deadlines.filter((d) => {
    if (isLeader) return true;
    if (!d.assigneeId || d.assigneeId === 'all') return true;
    return String(d.assigneeId) === String(user?.id);
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
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

      <div id="group-deadline-list" ref={deadlineListRef} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {visibleDeadlines.map((d) => {
              const canDelete = d.creatorId === user.id || group.creatorId === user.id;
              const dueSoon = d.dueSoon;
              const overdue = d.overdue;
              const subs = submissions[d.id] || [];
              const mySubmission = subs.find((s) => String(s.userId) === String(user.id));
              const hasSubmitted = !!mySubmission;

              return (
                <div
                  key={d.id}
                  className="deadline-file-row"
                  style={{
                    background: d.completed ? 'rgba(255,255,255,0.01)' : 'var(--bg-card)',
                    border: dueSoon
                      ? '1.5px solid var(--error)'
                      : overdue
                      ? '1.5px solid var(--text-muted)'
                      : '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    opacity: d.completed ? 0.7 : 1,
                    boxShadow: dueSoon ? '0 0 10px rgba(239, 68, 68, 0.1)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', overflow: 'hidden' }}>
                    <input
                      type="checkbox"
                      checked={hasSubmitted}
                      readOnly
                      title={overdue && !hasSubmitted ? 'Quá hạn - chưa nộp bài' : ''}
                      style={{
                        width: '20px',
                        height: '20px',
                        marginTop: '3px',
                        cursor: 'not-allowed',
                        accentColor: overdue && !hasSubmitted ? '#666' : 'var(--primary)',
                        opacity: overdue && !hasSubmitted ? 0.5 : 1,
                      }}
                    />
                    <div style={{ overflow: 'hidden' }}>
                      <h4
                        style={{
                          fontSize: '15px',
                          fontWeight: 600,
                          color: hasSubmitted ? 'var(--text-muted)' : 'var(--text-primary)',
                          margin: 0,
                          textDecoration: hasSubmitted ? 'line-through' : 'none',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {d.title}
                      </h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0 2px 0' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: d.assigneeId ? 'rgba(0,0,0,0.06)' : 'rgba(62,207,207,0.10)',
                            color: 'var(--text-primary)',
                            border: `1px solid ${
                              d.assigneeId ? 'var(--border)' : 'rgba(62,207,207,0.25)'
                            }`,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          {d.assigneeId ? (
                            <>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                              </svg>
                              {d.assigneeName || 'Cá nhân'}
                            </>
                          ) : (
                            <>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                              </svg>
                              Cả nhóm
                            </>
                          )}
                        </span>
                      </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: 0 }}>
                      <span style={{ color: overdue ? 'var(--error)' : 'var(--text-muted)', fontWeight: overdue ? 600 : 400 }}>
                        Hạn chót: {format24h(d.dueDate)}
                      </span>
                      {dueSoon && (
                        <span style={{ color: 'var(--error)', marginLeft: '8px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                          </svg>
                          Sắp hết hạn!
                        </span>
                      )}
                      {overdue && !hasSubmitted && (
                        <span style={{ color: 'var(--text-muted)', marginLeft: '8px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                          Quá hạn
                        </span>
                      )}
                    </p>
                      {d.description && (
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '6px 0 0 0', lineHeight: 1.4 }}>
                          {d.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                    {isLeader && !hasSubmitted && (
                      <button
                        onClick={() => handleRemindDeadline(d)}
                        disabled={remindingIds[d.id]}
                        className={remindingIds[d.id] ? "" : "btn-mono"}
                        style={{
                          background: remindingIds[d.id] ? 'rgba(255,255,255,0.05)' : undefined,
                          border: remindingIds[d.id] ? '1px solid rgba(255,255,255,0.1)' : undefined,
                          color: remindingIds[d.id] ? 'var(--text-muted)' : undefined,
                          cursor: remindingIds[d.id] ? 'default' : undefined,
                          borderRadius: remindingIds[d.id] ? '24px' : undefined,
                          padding: '5px 12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {remindingIds[d.id] ? (
                          'Đang nhắc...'
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                            </svg>
                            Nhắc nhở
                          </span>
                        )}
                      </button>
                    )}

                    {canDelete && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => openEditDeadline(d)}
                          className="btn-mono"
                          style={{
                            padding: '5px 12px',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDeadlineDelete(d.id)}
                          className="btn-mono"
                          style={{
                            padding: '5px 12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#ef4444',
                            borderColor: 'rgba(239, 68, 68, 0.3)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#ef4444';
                            e.currentTarget.style.borderColor = '#ef4444';
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#ef4444';
                            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                            e.currentTarget.style.background = 'none';
                          }}
                        >
                          Xóa
                        </button>
                      </div>
                    )}

                    {(() => {
                      if (isLeader) {
                        return (
                          <button
                            onClick={() => setShowSubmissionsFor(d.id)}
                            className="btn-mono"
                            style={{
                              padding: '5px 12px',
                              fontSize: '12px',
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                                <polyline points="10 9 9 9 8 9" />
                              </svg>
                              Bài nộp ({subs.length})
                            </span>
                          </button>
                        );
                      }
                      return (
                        <button
                          onClick={() => {
                            if (overdue && !mySubmission) return;
                            setShowSubmitModal(d.id);
                            setSubmitNote(mySubmission?.note || '');
                            setSubmitFile(null);
                          }}
                          disabled={overdue && !mySubmission}
                          title={overdue && !mySubmission ? 'Đã quá hạn, không thể nộp bài' : ''}
                          className={mySubmission || overdue ? "" : "btn-mono"}
                          style={{
                            background: mySubmission
                              ? 'rgba(34,197,94,0.08)'
                              : overdue
                              ? 'rgba(255,255,255,0.03)'
                              : undefined,
                            border: mySubmission
                              ? '1px solid rgba(34,197,94,0.2)'
                              : overdue
                              ? '1px solid rgba(255,255,255,0.1)'
                              : undefined,
                            color: mySubmission ? '#22c55e' : overdue ? 'var(--text-muted)' : undefined,
                            cursor: overdue && !mySubmission ? 'not-allowed' : 'pointer',
                            borderRadius: mySubmission || overdue ? '24px' : undefined,
                            padding: mySubmission ? '5px 12px' : '6px 14px',
                            fontSize: '12px',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            opacity: overdue && !mySubmission ? 0.5 : 1,
                            boxShadow: 'none',
                          }}
                        >
                          {mySubmission ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              Đã nộp
                            </span>
                          ) : overdue ? (
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
            background: 'rgba(0,0,0,0.6)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSubmitModal(null);
              setSubmitFile(null);
              setSubmitNote('');
            }
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '18px',
              padding: '28px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
              Nộp bài tập
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              {deadlines.find((d) => d.id === showSubmitModal)?.title}
            </p>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
                Tệp đính kèm (tuỳ chọn)
              </label>
              <div
                onClick={() => submitFileRef.current?.click()}
                style={{
                  border: '2px dashed var(--border)',
                  borderRadius: '12px',
                  padding: '20px',
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
                    <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-primary)' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                    </div>
                    <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>
                      {submitFile.name}
                    </span>
                    <button
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
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px', color: 'var(--text-muted)' }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Nhấn để chọn tệp</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      PDF, Word, hình ảnh...
                    </div>
                  </div>
                )}
              </div>
              <input
                ref={submitFileRef}
                type="file"
                style={{ display: 'none' }}
                onChange={(e) => setSubmitFile(e.target.files[0] || null)}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
                Ghi chú
              </label>
              <SafeTextarea
                value={submitNote}
                onChange={(e) => setSubmitNote(e.target.value)}
                placeholder="Thêm ghi chú cho trưởng nhóm..."
                rows={3}
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  setShowSubmitModal(null);
                  setSubmitFile(null);
                  setSubmitNote('');
                }}
                className="btn-mono"
                style={{
                  flex: 1,
                  padding: '11px',
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  fontSize: '14px',
                }}
              >
                Huỷ
              </button>
              <button
                onClick={handleSubmitAssignment}
                disabled={isSubmitting || (!submitFile && !submitNote.trim())}
                className={!submitFile && !submitNote.trim() ? "" : "btn-mono"}
                style={{
                  flex: 2,
                  padding: '11px',
                  background: !submitFile && !submitNote.trim() ? 'var(--bg-input)' : undefined,
                  border: !submitFile && !submitNote.trim() ? '1px solid var(--border)' : undefined,
                  color: !submitFile && !submitNote.trim() ? 'var(--text-muted)' : undefined,
                  fontWeight: 700,
                  cursor: !submitFile && !submitNote.trim() ? 'not-allowed' : 'pointer',
                  borderRadius: !submitFile && !submitNote.trim() ? '24px' : undefined,
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
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
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
              padding: '28px',
              width: '100%',
              maxWidth: '560px',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Danh sách bài nộp
              </h3>
              <button
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
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 6px', lineHeight: 1.5 }}>
                        {s.note}
                      </p>
                    )}
                    {s.fileName && (
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
                    )}
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