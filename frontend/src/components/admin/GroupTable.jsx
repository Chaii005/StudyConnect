export default function GroupTable({ filteredGroups, groupSearch, setGroupSearch, users, onEdit, onDelete, onViewMembers, onCreateNew }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '28px 32px', boxShadow: 'var(--shadow), var(--shadow-glow)', backdropFilter: 'blur(16px)' }}>
      {/* Header: Search + CTA — luôn nằm cùng hàng, không wrap */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'nowrap', overflow: 'hidden' }}>
        <div style={{ flex: '0 1 340px', minWidth: 0 }} className="form-input-wrap">
          <input
            type="text"
            className="form-input"
            placeholder=" Nhập chính xác mã ID phòng (6 số)..."
            value={groupSearch}
            onChange={(e) => setGroupSearch(e.target.value)}
          />
        </div>
        <button
          className="btn btn-primary"
          style={{ flexShrink: 0, whiteSpace: 'nowrap', padding: '9px 20px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13.5px' }}
          onClick={onCreateNew}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Tạo phòng học mới
        </button>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed', minWidth: '960px' }}>
          <colgroup>
            <col style={{ width: '190px' }} /> {/* Tên phòng học */}
            <col style={{ width: '170px' }} /> {/* Môn học */}
            <col style={{ width: '100px' }} /> {/* Hình thức */}
            <col style={{ width: '160px' }} /> {/* Trưởng nhóm */}
            <col style={{ width: '160px' }} /> {/* Phó nhóm */}
            <col style={{ width: '100px' }} /> {/* Thành viên */}
            <col style={{ width: '95px' }} />  {/* Ngày lập */}
            <col style={{ width: '160px' }} /> {/* Thao tác */}
          </colgroup>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)' }}>
              {['Tên phòng học', 'Môn học', 'Hình thức', 'Trưởng nhóm', 'Phó nhóm', 'Thành viên', 'Ngày lập', 'Thao tác'].map((h, i) => (
                <th
                  key={h}
                  style={{
                    padding: '11px 12px',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--text-muted)',
                    textAlign: i === 7 ? 'right' : 'left',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                  }}
                >{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredGroups.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                  {groupSearch.trim().length > 0 && groupSearch.trim().length < 6
                    ? '⌨️ Vui lòng nhập đủ 6 chữ số ID phòng học...'
                    : groupSearch.trim().length >= 6
                      ? '🔍 Không tìm thấy phòng học nào phù hợp.'
                      : '📭 Chưa có phòng học nào được tạo.'}
                </td>
              </tr>
            ) : filteredGroups.map((g) => {
              const isOnline = !g.meetingMode || g.meetingMode === 'online';
              const creator = users.find((u) => u.id === g.creatorId);
              const groupDeputies = g.deputyIds
                ? g.deputyIds.map(id => users.find(u => u.id === id)).filter(Boolean)
                : (g.deputyId ? [users.find((u) => u.id === g.deputyId)].filter(Boolean) : []);

              return (
                <tr
                  key={g.id}
                  className="table-row-hover"
                  style={{ borderBottom: '1px solid var(--border)', verticalAlign: 'middle', transition: 'background 0.15s' }}
                >
                  {/* Tên phòng học */}
                  <td style={{ padding: '14px 12px' }}>
                    <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      ID: <strong style={{ color: 'var(--text-secondary)' }}>{g.id}</strong>
                    </div>
                    {g.description && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {g.description}
                      </div>
                    )}
                  </td>

                  {/* Môn học */}
                  <td style={{ padding: '14px 12px' }}>
                    <span style={{
                      display: 'inline-block',
                      background: 'rgba(0,0,0,0.06)',
                      color: 'var(--text-primary)',
                      padding: '4px 10px',
                      borderRadius: '10px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      maxWidth: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>{g.subject || '—'}</span>
                  </td>

                  {/* Hình thức */}
                  <td style={{ padding: '14px 12px' }}>
                    {isOnline
                      ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(52,211,153,0.12)', color: '#34d399', padding: '4px 10px', borderRadius: '20px', fontSize: '11.5px', fontWeight: 700 }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
                          Online
                        </span>
                      : <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)', padding: '4px 10px', borderRadius: '20px', fontSize: '11.5px', fontWeight: 700 }}>
                          Offline
                        </span>
                    }
                  </td>

                  {/* Trưởng nhóm */}
                  <td style={{ padding: '14px 12px' }}>
                    {creator ? (
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {creator.fullName || creator.email}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {creator.email}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>ID: {g.creatorId || '—'}</span>
                    )}
                  </td>

                  {/* Phó nhóm */}
                  <td style={{ padding: '14px 12px' }}>
                    {groupDeputies.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {groupDeputies.slice(0, 2).map((dep, idx) => (
                          <div key={dep.id || idx}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {dep.fullName || dep.email}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {dep.email}
                            </div>
                          </div>
                        ))}
                        {groupDeputies.length > 2 && (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>+{groupDeputies.length - 2} khác</span>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>—</span>
                    )}
                  </td>

                  {/* Thành viên */}
                  <td style={{ padding: '14px 12px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                      </svg>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '13.5px' }}>{g.members?.length || 0}</strong>
                    </div>
                  </td>

                  {/* Ngày lập */}
                  <td style={{ padding: '14px 12px', color: 'var(--text-muted)', fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                    {g.createdAt ? new Date(g.createdAt).toLocaleDateString('vi-VN') : '—'}
                  </td>

                  {/* Thao tác */}
                  <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '5px 10px', fontSize: '12px', minWidth: 'auto', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                        onClick={() => onViewMembers(g)}
                        title="Xem thành viên"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                        </svg>
                        Xem
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '5px 10px', fontSize: '12px', minWidth: 'auto', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                        onClick={() => onEdit(g)}
                        title="Chỉnh sửa"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                        </svg>
                        Sửa
                      </button>
                      <button
                        className="btn btn-danger"
                        style={{ padding: '5px 10px', fontSize: '12px', minWidth: 'auto', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                        onClick={() => onDelete(g.id, g.name)}
                        title="Xóa phòng học"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
