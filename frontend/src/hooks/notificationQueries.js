// src/hooks/notificationQueries.js
// Parallel notification query helper — fires independent DB queries simultaneously
import { supabase } from '@/config/supabaseClient';

/**
 * Fetches all notification data from Supabase in parallel.
 * Returns { notifsList, joinedIds, userGroupIds, myCreatedGroupIds }
 */
export async function fetchAllNotifications(uid, cutoff, now, ONE_DAY_MS, groupNamesRef) {
  const notifsList = [];
  const userGroupIds = new Set();

  // ═══ WAVE 1: Fire all independent queries simultaneously ═══
  const [
    friendReqsResult,
    acceptedReqsResult,
    invitesResult,
    joinedMembersResult,
    myPostsResult,
    privateMsgsResult,
    createdGroupsResult,
    missedOutResult,
  ] = await Promise.allSettled([
    // Q1: Pending friend requests
    supabase.from('friendships').select('id, from_user_id, status, created_at, users:users!from_user_id(full_name)').eq('to_user_id', uid).eq('status', 'pending'),
    // Q2: Accepted friend requests (24h)
    supabase.from('friendships').select('id, to_user_id, accepted_at, users:users!to_user_id(full_name)').eq('from_user_id', uid).eq('status', 'accepted'),
    // Q3: Pending group invites
    supabase.from('group_invites').select('id, group_id, inviter_id, status, created_at, study_groups(name), users:users!inviter_id(full_name)').eq('invitee_id', uid).eq('status', 'pending'),
    // Q4: Joined groups
    supabase.from('group_members').select('group_id, role, joined_at, study_groups(name)').eq('user_id', uid),
    // Q5: My posts (for comments/likes)
    supabase.from('posts').select('id, content, likes, created_at').eq('user_id', uid).order('created_at', { ascending: false }).limit(20),
    // Q6: Private messages (24h) — only unread
    supabase.from('messages').select('id, sender_id, content, created_at, users:users!sender_id(full_name)').eq('receiver_id', uid).neq('sender_id', uid).is('group_id', null).eq('is_read', false).gte('created_at', cutoff).order('created_at', { ascending: false }).limit(10),
    // Q7: Groups created by user (for join requests)
    supabase.from('study_groups').select('id, name').eq('creator_id', uid),
    // Q8: Outgoing missed calls (24h)
    supabase.from('messages').select('id, receiver_id, content, created_at, users:users!receiver_id(full_name)').eq('sender_id', uid).is('group_id', null).like('content', '📵%').gte('created_at', cutoff).order('created_at', { ascending: false }).limit(5),
  ]);

  // ═══ PROCESS WAVE 1 RESULTS ═══

  // Q1: Friend requests
  if (friendReqsResult.status === 'fulfilled') {
    const { data, error } = friendReqsResult.value;
    if (!error && data) {
      data.forEach(f => {
        const senderName = f.users?.full_name || 'Ai đó';
        notifsList.push({ key: `friendreq:${f.id}`, type: 'friendreq', title: 'Lời mời kết bạn', body: `${senderName} muốn kết bạn với bạn.`, createdAt: f.created_at, requestId: f.id.toString(), fromUserId: f.from_user_id, fromUserName: senderName });
      });
    }
  }

  // Q2: Accepted requests
  if (acceptedReqsResult.status === 'fulfilled') {
    const { data, error } = acceptedReqsResult.value;
    if (!error && data) {
      data.filter(ar => ar.accepted_at && (now - new Date(ar.accepted_at)) < ONE_DAY_MS).forEach(ar => {
        const userName = ar.users?.full_name || 'Người dùng';
        notifsList.push({ key: `friendaccept:${ar.id}`, type: 'friendaccept', title: 'Kết bạn thành công', body: `${userName} đã đồng ý lời mời kết bạn.`, createdAt: ar.accepted_at });
      });
    }
  }

  // Q3: Group invites
  if (invitesResult.status === 'fulfilled') {
    const { data, error } = invitesResult.value;
    if (!error && data) {
      data.forEach(inv => {
        const inviterName = inv.users?.full_name || 'Thành viên';
        const groupName = inv.study_groups?.name || 'Nhóm học';
        notifsList.push({ key: `groupinvite:${inv.id}`, type: 'groupinvite', title: 'Lời mời vào nhóm', body: `${inviterName} mời bạn tham gia nhóm "${groupName}".`, createdAt: inv.created_at, inviteId: inv.id.toString(), groupId: inv.group_id.toString(), groupName });
      });
    }
  }

  // Q4: Joined groups — extract IDs and generate join/deputy notifs
  let joinedIds = [];
  if (joinedMembersResult.status === 'fulfilled') {
    const { data: joinedMembers, error } = joinedMembersResult.value;
    if (!error && joinedMembers && joinedMembers.length > 0) {
      joinedIds = joinedMembers.map(m => m.group_id);
      joinedIds.forEach(id => userGroupIds.add(Number(id)));
      joinedMembers.forEach(m => {
        if (m.study_groups?.name) groupNamesRef.current[Number(m.group_id)] = m.study_groups.name;
      });
      joinedMembers.forEach(m => {
        if (m.joined_at && (now - new Date(m.joined_at)) < ONE_DAY_MS) {
          const groupName = m.study_groups?.name || 'Nhóm học';
          if (m.role === 'member') {
            notifsList.push({ key: `groupjoin:${m.group_id}`, type: 'groupjoin', title: 'Gia nhập nhóm thành công', body: `Bạn đã tham gia nhóm học tập "${groupName}".`, createdAt: m.joined_at, groupId: m.group_id.toString() });
          } else if (m.role === 'admin') {
            notifsList.push({ key: `groupdeputy:${m.group_id}`, type: 'groupdeputy', title: 'Bổ nhiệm Phó nhóm', body: `Bạn đã được bổ nhiệm làm Phó nhóm của "${groupName}".`, createdAt: m.joined_at, groupId: m.group_id.toString() });
          }
        }
      });
    }
  }

  // Q6: Private messages
  if (privateMsgsResult.status === 'fulfilled') {
    const { data, error } = privateMsgsResult.value;
    if (!error && data) {
      data.filter(m => (now - new Date(m.created_at)) < ONE_DAY_MS).forEach(m => {
        if (m.content?.startsWith('[chat_background]:')) return;
        if (m.content?.startsWith('📵')) {
          const senderName = m.users?.full_name || 'Người dùng';
          notifsList.push({ key: `missedcall:in:${m.id}`, type: 'missedcall', title: 'Cuộc gọi nhỡ', body: `Cuộc gọi nhỡ từ ${senderName}.`, createdAt: m.created_at, senderId: m.sender_id.toString() });
          return;
        }
        const senderName = m.users?.full_name || 'Người dùng';
        const displayContent = (m.content?.startsWith('data:image') || (m.content?.startsWith('http') && m.content?.match(/\.(jpeg|jpg|gif|png)/i))) ? 'Đã gửi một ảnh' : m.content || '';
        notifsList.push({ key: `privatemsg:${m.id}`, type: 'privatemsg', title: `Tin nhắn từ ${senderName}`, body: displayContent?.length > 80 ? displayContent.slice(0, 80) + '…' : displayContent, createdAt: m.created_at, senderId: m.sender_id.toString() });
      });
    }
  }

  // Q8: Outgoing missed calls
  if (missedOutResult.status === 'fulfilled') {
    const { data, error } = missedOutResult.value;
    if (!error && data) {
      data.filter(m => (now - new Date(m.created_at)) < ONE_DAY_MS).forEach(m => {
        const key = `missedcall:out:${m.id}`;
        if (notifsList.some(n => n.key === key)) return;
        const receiverName = m.users?.full_name || 'Người dùng';
        notifsList.push({ key, type: 'missedcall', title: m.content?.startsWith('📵 Người nhận đang bận') ? 'Người nhận bận' : 'Cuộc gọi nhỡ', body: `${receiverName} không phản hồi cuộc gọi.`, createdAt: m.created_at, senderId: String(uid) });
      });
    }
  }

  // ═══ WAVE 2: Dependent queries (need joinedIds / myPostIds) — run in parallel ═══
  const wave2Promises = [];

  // Group-dependent queries
  if (joinedIds.length > 0) {
    // Other joined members (24h)
    wave2Promises.push(supabase.from('group_members').select('group_id, user_id, joined_at, users:users(full_name), study_groups(name)').in('group_id', joinedIds).neq('user_id', uid).gte('joined_at', cutoff).limit(20).then(({ data, error }) => {
      if (!error && data) {
        data.filter(om => om.joined_at && (now - new Date(om.joined_at)) < ONE_DAY_MS).forEach(om => {
          notifsList.push({ key: `othergroupjoin:${om.group_id}:${om.user_id}`, type: 'othergroupjoin', title: 'Thành viên mới', body: `${om.users?.full_name || 'Người dùng'} vừa tham gia nhóm "${om.study_groups?.name || 'Nhóm'}".`, createdAt: om.joined_at, groupId: om.group_id.toString() });
        });
      }
    }).catch(() => {}));

    // Schedules
    wave2Promises.push(supabase.from('schedules').select('id, group_id, topic, date_time, created_at, study_groups(name)').in('group_id', joinedIds).gte('date_time', now.toISOString()).limit(50).then(({ data, error }) => {
      if (!error && data) {
        data.filter(s => (now - new Date(s.created_at)) < ONE_DAY_MS).forEach(s => {
          notifsList.push({ key: `schedule:${s.id}`, type: 'schedule', title: 'Lịch học nhóm mới', body: `Nhóm "${s.study_groups?.name || 'Nhóm học'}" học: ${s.topic} · ${new Date(s.date_time).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`, createdAt: s.created_at, groupId: s.group_id.toString() });
        });
      }
    }).catch(() => {}));

    // Deadlines
    wave2Promises.push(supabase.from('deadlines').select('id, group_id, title, due_date, assignee_id, created_at, study_groups(name)').in('group_id', joinedIds).eq('completed', false).limit(50).then(({ data, error }) => {
      if (!error && data) {
        data.filter(d => { if ((now - new Date(d.created_at)) >= ONE_DAY_MS) return false; return !d.assignee_id || String(d.assignee_id) === String(uid); }).forEach(d => {
          const isPersonal = d.assignee_id;
          notifsList.push({ key: `deadline:${d.id}`, type: 'deadline', title: 'Hạn nộp mới', body: `${isPersonal ? 'Giao riêng cho bạn' : 'Cả nhóm ' + (d.study_groups?.name || '')} · ${d.title} (Hạn: ${new Date(d.due_date).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })})`, createdAt: d.created_at, groupId: d.group_id.toString() });
        });
        // Urgent deadlines
        data.filter(d => { const due = new Date(d.due_date).getTime(); const tl = due - now.getTime(); if (!(tl > 0 && tl <= ONE_DAY_MS)) return false; return !d.assignee_id || String(d.assignee_id) === String(uid); }).forEach(d => {
          const due = new Date(d.due_date).getTime(); const tl = due - now.getTime();
          const h = Math.floor(tl / 3600000); const m = Math.floor((tl % 3600000) / 60000);
          const ts = h > 0 ? `${h} giờ ${m} phút` : `${m} phút`;
          notifsList.push({ key: `deadline-urgent:${d.id}`, type: 'deadline-urgent', title: 'Sắp tới hạn', body: `Còn ${ts} để nộp "${d.title}" ${d.assignee_id ? '(giao riêng cho bạn)' : 'trong nhóm ' + (d.study_groups?.name || 'Học tập')}.`, createdAt: new Date(due - ONE_DAY_MS).toISOString(), groupId: d.group_id.toString(), deadlineId: d.id.toString(), dueDate: d.due_date });
        });
      }
    }).catch(() => {}));

    // Files (24h)
    wave2Promises.push(supabase.from('files').select('id, group_id, file_name, created_at, users:users(full_name), study_groups(name)').in('group_id', joinedIds).neq('user_id', uid).gte('created_at', cutoff).limit(20).then(({ data, error }) => {
      if (!error && data) {
        data.filter(rf => rf.created_at && (now - new Date(rf.created_at)) < ONE_DAY_MS).forEach(rf => {
          notifsList.push({ key: `file:upload:${rf.id}`, type: 'fileupload', title: 'Tài liệu nhóm mới', body: `${rf.users?.full_name || 'Thành viên'} đã chia sẻ "${rf.file_name}" tại "${rf.study_groups?.name || 'Nhóm'}".`, createdAt: rf.created_at, groupId: rf.group_id.toString() });
        });
      }
    }).catch(() => {}));

    // Post tags
    const joinedGroupIdsStr = Array.from(userGroupIds).map(String);
    let orFilter = `and(target_type.eq.user,target_id.eq.${uid})`;
    if (joinedGroupIdsStr.length > 0) orFilter += `,and(target_type.eq.group,target_id.in.(${joinedGroupIdsStr.join(',')}))`;
    wave2Promises.push(supabase.from('post_tags').select('id, post_id, target_type, target_id, created_at, posts(user_id, users(full_name))').or(orFilter).limit(50).then(({ data, error }) => {
      if (!error && data) {
        data.filter(t => (now - new Date(t.created_at)) < ONE_DAY_MS).forEach(t => {
          const taggerName = t.posts?.users?.full_name || 'Ai đó';
          if (String(t.posts?.user_id) === String(uid)) return;
          if (t.target_type === 'user' && String(t.target_id) === String(uid)) {
            const key = `posttag:db:${t.id}`;
            if (!notifsList.some(x => x.key === key)) notifsList.push({ key, type: 'posttag_user', title: 'Được nhắc tên', body: `${taggerName} đã tag bạn trong một bài viết.`, createdAt: t.created_at, postId: String(t.post_id) });
          }
          if (t.target_type === 'group' && userGroupIds.has(Number(t.target_id))) {
            const key = `posttagg:db:${t.id}`;
            if (!notifsList.some(x => x.key === key)) notifsList.push({ key, type: 'posttag_group', title: 'Nhắc tên nhóm', body: `${taggerName} đã nhắc đến nhóm "${groupNamesRef.current[Number(t.target_id)] || 'Nhóm học'}" trong bài viết.`, createdAt: t.created_at, postId: String(t.post_id), groupId: String(t.target_id) });
          }
        });
      }
    }).catch(() => {}));
  }

  // Post-dependent queries
  let myPostIds = [];
  if (myPostsResult.status === 'fulfilled') {
    const { data: myPosts, error } = myPostsResult.value;
    if (!error && myPosts && myPosts.length > 0) {
      myPostIds = myPosts.map(p => p.id);

      // Comments on my posts
      wave2Promises.push(supabase.from('comments').select('id, post_id, user_id, content, created_at, users:users!user_id(full_name)').in('post_id', myPostIds).neq('user_id', uid).gte('created_at', cutoff).order('created_at', { ascending: false }).limit(10).then(({ data, error: e }) => {
        if (!e && data) {
          data.filter(c => (now - new Date(c.created_at)) < ONE_DAY_MS).forEach(c => {
            notifsList.push({ key: `comment:${c.id}`, type: 'comment', title: 'Bình luận mới', body: `${c.users?.full_name || 'Người dùng'} đã bình luận bài của bạn: "${c.content?.length > 60 ? c.content.slice(0, 60) + '…' : c.content}"`, createdAt: c.created_at, postId: c.post_id.toString() });
          });
        }
      }).catch(() => {}));

      // Replies to my comments
      wave2Promises.push(supabase.from('comments').select('id').eq('user_id', uid).gte('created_at', cutoff).limit(50).then(async ({ data: myComments, error: e }) => {
        if (e || !myComments || myComments.length === 0) return;
        const myCommentIds = myComments.map(c => c.id);
        const { data: replies, error: rErr } = await supabase.from('comments').select('id, post_id, user_id, content, created_at, users:users!user_id(full_name)').in('parent_id', myCommentIds).neq('user_id', uid).gte('created_at', cutoff).order('created_at', { ascending: false }).limit(10);
        if (!rErr && replies) {
          replies.filter(r => (now - new Date(r.created_at)) < ONE_DAY_MS).forEach(r => {
            if (notifsList.some(n => n.key === `comment:${r.id}`)) return;
            notifsList.push({ key: `reply:${r.id}`, type: 'comment', title: 'Phản hồi bình luận', body: `${r.users?.full_name || 'Người dùng'} đã trả lời bạn: "${r.content?.length > 60 ? r.content.slice(0, 60) + '…' : r.content}"`, createdAt: r.created_at, postId: r.post_id.toString() });
          });
        }
      }).catch(() => {}));

      // Likes
      const likerIds = [];
      myPosts.forEach(p => { if (Array.isArray(p.likes)) p.likes.forEach(lk => { const lkId = typeof lk === 'object' ? parseInt(lk.userId, 10) : parseInt(lk, 10); if (lkId && lkId !== uid) likerIds.push(lkId); }); });
      if (likerIds.length > 0) {
        const uniqueLikerIds = [...new Set(likerIds)];
        wave2Promises.push(supabase.from('users').select('id, full_name').in('id', uniqueLikerIds).then(({ data: usersData, error: e }) => {
          if (e || !usersData) return;
          const likersMap = {};
          usersData.forEach(u => { likersMap[String(u.id)] = u.full_name; });
          myPosts.forEach(p => { if (Array.isArray(p.likes)) p.likes.forEach(lk => { const lkId = typeof lk === 'object' ? String(lk.userId) : String(lk); if (lkId && lkId !== String(uid)) notifsList.push({ key: `like:${p.id}:${lkId}`, type: 'like', title: 'Tương tác mới', body: `${likersMap[lkId] || 'Người dùng'} đã thích bài viết của bạn.`, createdAt: p.created_at, postId: p.id.toString() }); }); });
        }).catch(() => {}));
      }
    }
  }

  // Q7: Join requests for groups I created
  let myCreatedGroupIds = [];
  if (createdGroupsResult.status === 'fulfilled') {
    const { data: myCreatedGroups, error } = createdGroupsResult.value;
    if (!error && myCreatedGroups && myCreatedGroups.length > 0) {
      const myGroupIds = myCreatedGroups.map(g => g.id);
      myCreatedGroupIds = myGroupIds.map(Number);
      myCreatedGroups.forEach(g => { groupNamesRef.current[Number(g.id)] = g.name; });
      wave2Promises.push(supabase.from('group_join_requests').select('id, group_id, user_id, created_at, users:users(full_name), study_groups(name)').in('group_id', myGroupIds).eq('status', 'pending').limit(50).then(({ data, error: e }) => {
        if (!e && data) {
          data.forEach(r => {
            notifsList.push({ key: `joinrequest:${r.id}`, type: 'joinrequest', title: 'Yêu cầu tham gia', body: `${r.users?.full_name || 'Thành viên'} xin gia nhập nhóm "${r.study_groups?.name || 'Nhóm'}".`, createdAt: r.created_at, requestId: r.id.toString(), groupId: r.group_id.toString(), fromUserId: r.user_id, requesterName: r.users?.full_name || 'Thành viên' });
          });
        }
      }).catch(() => {}));
    }
  }

  // Wait for all wave 2 queries to complete
  await Promise.allSettled(wave2Promises);

  // Local storage notifications
  try {
    const localKicks = JSON.parse(localStorage.getItem('studyconect_kicked_notifications') || '[]');
    localKicks.filter(k => (now - new Date(k.createdAt)) < ONE_DAY_MS).forEach(k => {
      const isDisbanded = !!k.isDisbanded;
      notifsList.push({ key: `kick:${k.id}`, type: 'groupkick', title: isDisbanded ? 'Giải tán nhóm' : 'Thay đổi thành viên', body: isDisbanded ? `Nhóm học "${k.groupName}" đã bị giải tán.` : `Bạn đã bị mời ra khỏi nhóm "${k.groupName}".`, createdAt: k.createdAt });
    });
  } catch { /* ignore */ }
  try {
    const localDemotions = JSON.parse(localStorage.getItem('studyconect_demoted_notifications') || '[]');
    localDemotions.filter(d => (now - new Date(d.createdAt)) < ONE_DAY_MS).forEach(d => {
      notifsList.push({ key: `demote:${d.id}`, type: 'groupdemote', title: 'Thu hồi quyền Phó nhóm', body: `Đã thu hồi quyền Phó nhóm tại "${d.groupName}".`, createdAt: d.createdAt });
    });
  } catch { /* ignore */ }

  return { notifsList, joinedIds, userGroupIds, myCreatedGroupIds, myPostIds };
}
