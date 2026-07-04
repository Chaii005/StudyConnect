export default function GroupTable({ filteredGroups, groupSearch, setGroupSearch, users, onEdit, onDelete, onViewMembers, onCreateNew }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px 28px', boxShadow: 'var(--shadow), var(--shadow-glow)', backdropFilter: 'blur(16px)' }}>

      {/* ── Header: search LEFT, nút RIGHT, luôn cùng hàng ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '20px' }}>

        {/* Search — cố định chiều rộng, không co giãn */}
        <div className="form-input-wrap" style={{ width: '300px', flexShrink: 0 }}>
          <input
            type="text"
            className="form-input"
            placeholder=" Nhập chính xác mã ID phòng (6 số)..."
            value={groupSearch}
            onChange={(e) => setGroupSearch(e.target.value)}
          />
        </div>

        {/* Nút — compact, tự co theo nội dung */}
        <button
          onClick={onCreateNew}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            background: 'var(--primary)',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Tạo phòng học mới
        </button>
      </div>

      {/* ── Table: vừa khít 100%, không kéo ngang ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--border)' }}>
            {[
              { label: 'Tên phòng học', align: 'left'  },
              { label: 'Môn học',       align: 'left'  },
              { label: 'Hình thức',     align: 'left'  },
              { label: 'Trưởng nhóm',   align: 'left'  },
              { label: 'Phó nhóm',      align: 'left'  },
              { label: 'TV',            align: 'center'},
              { label: 'Ngày lập',      align: 'left'  },
              { label: 'Thao tác',      align: 'right' },
            ].map(({ label, align }) => (
              <th
                key={label}
                style={{
                  padding: '10px 8px',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                  textAlign: align,
                }}
              >{label}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {filteredGroups.length === 0 ? (
            <tr>
              <td colSpan="8" style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                {groupSearch.trim().length > 0 && groupSearch.trim().length < 6
                  ? 'Vui lòng nhập đủ 6 chữ số ID phòng học...'
                  : groupSearch.trim().length >= 6
                    ? 'Không tìm thấy phòng học nào phù hợp.'
                    : 'Chưa có phòng học nào được tạo.'}
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
                style={{ borderBottom: '1px solid var(--border)', verticalAlign: 'middle' }}
              >
                {/* Tên phòng học */}
                <td style={{ padding: '12px 8px', maxWidth: '160px' }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {g.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    ID: <strong style={{ color: 'var(--text-secondary)' }}>{g.id}</strong>
                  </div>
                </td>

                {/* Môn học */}
                <td style={{ padding: '12px 8px', maxWidth: '140px' }}>
                  <span style={{
                    display: 'inline-block', maxWidth: '100%',
                    background: 'rgba(0,0,0,0.06)', color: 'var(--text-primary)',
                    padding: '3px 9px', borderRadius: '8px',
                    fontSize: '11.5px', fontWeight: 600,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {g.subject || '—'}
                  </span>
                </td>

                {/* Hình thức */}
                <td style={{ padding: '12px 8px', whiteSpace: 'nowrap' }}>
                  {isOnline
                    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(52,211,153,0.12)', color: '#34d399', padding: '3px 9px', borderRadius: '20px', fontSize: '11.5px', fontWeight: 700 }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#34d399', display: 'inline-block', flexShrink: 0 }} />
                        Online
                      </span>
                    : <span style={{ display: 'inline-flex', alignItems: 'center', background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)', padding: '3px 9px', borderRadius: '20px', fontSize: '11.5px', fontWeight: 700 }}>
                        Offline
                      </span>
                  }
                </td>

                {/* Trưởng nhóm */}
                <td style={{ padding: '12px 8px', maxWidth: '150px' }}>
                  {creator ? (
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {creator.fullName || creator.email}
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {creator.email}
                      </div>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                  )}
                </td>

                {/* Phó nhóm */}
                <td style={{ padding: '12px 8px', maxWidth: '140px' }}>
                  {groupDeputies.length > 0 ? (
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {groupDeputies[0].fullName || groupDeputies[0].email}
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {groupDeputies[0].email}
                      </div>
                      {groupDeputies.length > 1 && (
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '1px' }}>+{groupDeputies.length - 1} khác</div>
                      )}
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>—</span>
                  )}
                </td>

                {/* Thành viên */}
                <td style={{ padding: '12px 8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                  <strong style={{ color: 'var(--text-primary)', fontSize: '13.5px' }}>{g.members?.length || 0}</strong>
                </td>

                {/* Ngày lập */}
                <td style={{ padding: '12px 8px', color: 'var(--text-muted)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                  {g.createdAt ? new Date(g.createdAt).toLocaleDateString('vi-VN') : '—'}
                </td>

                {/* Thao tác */}
                <td style={{ padding: '12px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'inline-flex', gap: '4px' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '11.5px', minWidth: 'auto', borderRadius: '7px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                      onClick={() => onViewMembers(g)}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                      </svg>
                      Xem
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '11.5px', minWidth: 'auto', borderRadius: '7px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                      onClick={() => onEdit(g)}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                      </svg>
                      Sửa
                    </button>
                    <button
                      className="btn btn-danger"
                      style={{ padding: '4px 8px', fontSize: '11.5px', minWidth: 'auto', borderRadius: '7px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                      onClick={() => onDelete(g.id, g.name)}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
  );
}
