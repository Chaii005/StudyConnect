export default function GroupMembers({
  group,
  user,
  isAssigningDeputy,
  friendRequestingIds,
  kickingIds,
  handleAssignDeputy,
  handleRemoveDeputy,
  handleSendFriendRequest,
  handleKickMember,
  membersDetails = [],
  friendships = [],
  joinRequests = [],
  approvingIds = {},
  rejectingIds = {},
  handleApproveJoin,
  handleRejectJoin,
  onlineUserIds = [],
}) {
  const isLeader = Number(user?.id) === Number(group?.creatorId);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Yêu cầu tham gia — chỉ trưởng nhóm thấy, nhóm riêng tư */}
      {isLeader && group?.isPrivate && joinRequests.length > 0 && (
        <div style={{ background: 'rgba(17, 24, 39, 0.04)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
          <h3 style={{ margin: '0 0 4px 0', fontSize: 16, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Yêu cầu tham gia nhóm
            <span style={{ fontSize: 12, background: 'var(--text-primary)', color: 'var(--bg-card)', borderRadius: 20, padding: '2px 8px', fontWeight: 800 }}>{joinRequests.length}</span>
          </h3>
          <p style={{ margin: '0 0 14px 0', fontSize: 12, color: 'var(--text-muted)' }}>Duyệt hoặc từ chối các yêu cầu tham gia nhóm riêng tư.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {joinRequests.map(req => {
              const initials = req.fullName?.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase() || '?';
              return (
                <div key={req.id} className="join-request-card">
                  {req.avatar
                    ? <img src={req.avatar} alt={req.fullName} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    : <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,var(--primary),var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#fff' }}>{initials}</div>
                  }
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{req.fullName}</div>
                    {req.email && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{req.email}</div>}
                  </div>
                  <div className="join-request-actions">
                    <button
                      onClick={() => handleApproveJoin(req)}
                      disabled={approvingIds[req.id]}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        cursor: 'pointer',
                        background: 'var(--bg-card)',
                        color: 'var(--text-primary)',
                        fontWeight: 700,
                        fontSize: 12,
                        opacity: approvingIds[req.id] ? 0.6 : 1,
                        fontFamily: 'inherit',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => { if(!approvingIds[req.id]) { e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.color = '#10b981'; e.currentTarget.style.background = 'rgba(16, 185, 129, 0.04)'; } }}
                      onMouseLeave={e => { if(!approvingIds[req.id]) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-card)'; } }}
                    >
                      {approvingIds[req.id] ? '...' : 'Duyệt'}
                    </button>
                    <button
                      onClick={() => handleRejectJoin(req)}
                      disabled={rejectingIds[req.id]}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        cursor: 'pointer',
                        background: 'var(--bg-card)',
                        color: 'var(--text-secondary)',
                        fontWeight: 700,
                        fontSize: 12,
                        opacity: rejectingIds[req.id] ? 0.6 : 1,
                        fontFamily: 'inherit',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => { if(!rejectingIds[req.id]) { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.04)'; } }}
                      onMouseLeave={e => { if(!rejectingIds[req.id]) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'var(--bg-card)'; } }}
                    >
                      {rejectingIds[req.id] ? '...' : 'Từ chối'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          boxShadow: 'var(--shadow)',
        }}
      >
        <h3 style={{ margin: '0 0 6px 0', fontSize: '18px' }}>Danh sách thành viên</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
          {group.members.length} thành viên
        </p>
      </div>
      {group.members.map((memberId) => {
        const isLeader = Number(memberId) === Number(group.creatorId);
        const isDeputy = group.deputyIds ? group.deputyIds.some(id => Number(id) === Number(memberId)) : Number(memberId) === Number(group.deputyId);
        const isCurrentUser = Number(memberId) === Number(user?.id);
        const isCurrentUserLeader = Number(user?.id) === Number(group.creatorId);
        const isCurrentUserDeputy = group.deputyIds ? group.deputyIds.some(id => Number(id) === Number(user?.id)) : Number(user?.id) === Number(group.deputyId);
        const memberInfo = membersDetails.find((u) => Number(u.id) === Number(memberId)) || null;
        const displayName = String(memberInfo?.fullName || memberId);
        const displayAvatar = memberInfo?.avatar || null;
        const memberInitials = displayName
          .split(' ')
          .map((w) => w[0])
          .slice(-2)
          .join('')
          .toUpperCase();
        const friendStatus = !isCurrentUser
          ? friendships.find(
              (f) =>
                (Number(f.from_user_id) === Number(user?.id) && Number(f.to_user_id) === Number(memberId)) ||
                (Number(f.from_user_id) === Number(memberId) && Number(f.to_user_id) === Number(user?.id))
            )
          : null;
        const isFriend = friendStatus?.status === 'accepted';
        const isPending = friendStatus?.status === 'pending' && Number(friendStatus?.from_user_id) === Number(user?.id);
        const isMeReceiving = friendStatus?.status === 'pending' && Number(friendStatus?.to_user_id) === Number(user?.id);
        const isRequesting = friendRequestingIds[String(memberId)];

        return (
          <div
            key={memberId}
            className={`member-item-card ${isLeader ? 'is-leader' : isDeputy ? 'is-deputy' : 'is-normal'}`}
          >
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid var(--primary)',
                    display: 'block',
                  }}
                  alt={displayName}
                />
              ) : (
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '15px',
                    color: 'white',
                  }}
                >
                  {memberInitials}
                </div>
              )}
              <span style={{
                position: 'absolute',
                bottom: 1,
                right: 1,
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: onlineUserIds.includes(String(memberId)) ? '#10b981' : '#ef4444',
                border: '2px solid var(--bg-card)',
                boxShadow: onlineUserIds.includes(String(memberId)) ? '0 0 6px #10b981' : 'none'
              }} />
            </div>
            <div className="member-item-info">
              <div className="member-item-info-name-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>
                  {displayName}
                  {isCurrentUser && <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400 }}> (Bạn)</span>}
                </span>
                {isLeader && (
                  <span
                    style={{
                      fontSize: '11px',
                      background: 'rgba(17, 24, 39, 0.04)',
                      color: 'var(--text-primary)',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontWeight: 700,
                      border: '1px solid var(--border)',
                    }}
                  >
                    Trưởng nhóm
                  </span>
                )}
                {isDeputy && (
                  <span
                    style={{
                      fontSize: '11px',
                      background: 'rgba(0, 0, 0, 0.04)',
                      color: 'var(--text-primary)',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontWeight: 700,
                      border: '1px solid var(--border)',
                    }}
                  >
                    Phó nhóm
                  </span>
                )}
              </div>
              {memberInfo?.email && (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {memberInfo.email}
                </div>
              )}
            </div>
            <div className="member-item-actions">
              {!isCurrentUser &&
                (isFriend ? (
                  <span
                    style={{
                      padding: '7px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(0, 0, 0, 0.02)',
                      color: 'var(--text-muted)',
                      fontWeight: 600,
                      fontSize: '13px',
                      border: '1px solid var(--border)',
                    }}
                  >
                    Bạn bè
                  </span>
                ) : isPending ? (
                  <span
                    style={{
                      padding: '7px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(0, 0, 0, 0.02)',
                      color: 'var(--text-muted)',
                      fontWeight: 600,
                      fontSize: '13px',
                      border: '1px solid var(--border)',
                    }}
                  >
                    Chờ phản hồi
                  </span>
                ) : isMeReceiving ? (
                  <span
                    style={{
                      padding: '7px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(0, 0, 0, 0.02)',
                      color: 'var(--text-muted)',
                      fontWeight: 600,
                      fontSize: '13px',
                      border: '1px solid var(--border)',
                    }}
                  >
                    Đã gửi lời mời
                  </span>
                ) : (
                  <button
                    onClick={() => handleSendFriendRequest(String(memberId))}
                    disabled={isRequesting}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      background: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      fontWeight: 600,
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'rgba(0, 0, 0, 0.02)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-card)'; }}
                  >
                    {isRequesting ? '...' : 'Kết bạn'}
                  </button>
                ))}
              {isCurrentUserLeader && !isLeader && (
                isDeputy ? (
                  <button
                    onClick={() => handleRemoveDeputy(memberId)}
                    disabled={isAssigningDeputy}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      cursor: 'pointer',
                      background: 'var(--bg-card)',
                      color: '#ef4444',
                      fontWeight: 600,
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'var(--bg-card)'; }}
                  >
                    {isAssigningDeputy ? '...' : 'Thu hồi phó nhóm'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleAssignDeputy(memberId)}
                    disabled={isAssigningDeputy}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      background: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      fontWeight: 600,
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'rgba(0, 0, 0, 0.02)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-card)'; }}
                  >
                    {isAssigningDeputy ? '...' : (group.deputyIds?.length >= 2 ? 'Đổi phó nhóm' : 'Đặt làm phó nhóm')}
                  </button>
                )
              )}
              {(isCurrentUserLeader || isCurrentUserDeputy) && !isLeader && !isCurrentUser && (
                <button
                  onClick={() => handleKickMember(memberId)}
                  disabled={kickingIds[String(memberId)]}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    cursor: 'pointer',
                    background: 'var(--bg-card)',
                    color: '#ef4444',
                    fontWeight: 600,
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'var(--bg-card)'; }}
                >
                  {kickingIds[String(memberId)] ? '...' : 'Xóa khỏi nhóm'}
                </button>
              )}
            </div>
          </div>
        );
      })}
      <style>{`
        .join-request-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: 10px;
          background: var(--bg-card);
          border: 1px solid var(--border);
        }
        .join-request-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }
        .member-item-card {
          background: var(--bg-card);
          border-radius: var(--radius-md);
          padding: 18px 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          transition: all 0.2s ease;
        }
        .member-item-card.is-leader {
          border: 1.5px solid var(--text-primary);
        }
        .member-item-card.is-deputy {
          border: 1.5px solid var(--border);
        }
        .member-item-card.is-normal {
          border: 1px solid var(--border);
        }
        .member-item-info {
          flex: 1;
          min-width: 0;
        }
        .member-item-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
          align-items: center;
        }
        
        @media (max-width: 991px) {
          .join-request-card {
            flex-direction: column;
            text-align: center;
          }
          .join-request-actions {
            width: 100%;
          }
          .join-request-actions button {
            flex: 1;
            text-align: center;
          }
          .member-item-card {
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding: 20px 16px;
            gap: 14px;
          }
          .member-item-info-name-row {
            justify-content: center;
          }
          .member-item-actions {
            width: 100%;
            flex-direction: row;
            flex-wrap: wrap;
            justify-content: center;
            gap: 8px;
          }
          .member-item-actions button, .member-item-actions span {
            flex: 1 1 calc(50% - 4px) !important;
            min-width: 110px;
            text-align: center;
            box-sizing: border-box;
            justify-content: center;
            display: inline-flex;
          }
        }
      `}</style>
    </div>
  );
}
