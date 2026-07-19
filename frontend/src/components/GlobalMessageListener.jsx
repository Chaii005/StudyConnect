import { useEffect, useCallback, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
export default function GlobalMessageListener() {
  const { user } = useAuth();
  const { addToast: originalAddToast } = useToast();
  const location = useLocation();

  // Cache lookups to prevent N+1 queries during real-time updates
  const userNameCache = useRef({});
  const groupNameCache = useRef({});

  const [userGroupIds, setUserGroupIds] = useState(new Set());
  const [managedGroupIds, setManagedGroupIds] = useState(new Set());

  const getUserName = useCallback(async (id) => {
    if (!id) return 'Ng\u01b0\u1eddi\u0020d\u00f9ng';
    const sId = String(id);
    if (userNameCache.current[sId]) return userNameCache.current[sId];
    try {
      const { data } = await supabase.from('users').select('full_name').eq('id', parseInt(id, 10)).single();
      userNameCache.current[sId] = data?.full_name || 'Ng\u01b0\u1eddi\u0020d\u00f9ng';
    } catch {
      userNameCache.current[sId] = 'Ng\u01b0\u1eddi\u0020d\u00f9ng';
    }
    return userNameCache.current[sId];
  }, []);

  const getGroupName = useCallback(async (groupId) => {
    if (!groupId) return 'Nh\u00f3m';
    const gIdStr = String(groupId);
    if (groupNameCache.current[gIdStr]) return groupNameCache.current[gIdStr];
    try {
      const { data } = await supabase.from('study_groups').select('name').eq('id', parseInt(groupId, 10)).single();
      groupNameCache.current[gIdStr] = data?.name || 'Nh\u00f3m';
    } catch {
      groupNameCache.current[gIdStr] = 'Nh\u00f3m';
    }
    return groupNameCache.current[gIdStr];
  }, []);

  const addToast = useCallback((...args) => {
    // Không xuất hiện thông báo bên phải (toast popup) khi đang họp hoặc đang gọi điện
    const isInsideCallOrMeet = 
      location.pathname.startsWith('/room/') || 
      location.pathname.startsWith('/call/');

    if (isInsideCallOrMeet) {
      return; // Chặn hiển thị Toast bên phải
    }

    if (localStorage.getItem('studyconect_toast_enabled') !== 'false') {
      originalAddToast(...args);
    }
  }, [location.pathname, originalAddToast]);

  // Hook to fetch and listen to user's group list changes
  useEffect(() => {
    if (!user?.id) return;
    const uid = parseInt(user.id, 10);

    const fetchUserGroups = async () => {
      try {
        const { data: memberships } = await supabase
          .from('group_members')
          .select('group_id, role')
          .eq('user_id', uid);

        const groupIds = new Set();
        const managedIds = new Set();

        if (memberships) {
          memberships.forEach(g => {
            groupIds.add(Number(g.group_id));
            if (g.role === 'owner' || g.role === 'admin') {
              managedIds.add(Number(g.group_id));
            }
          });
        }

        const { data: createdGroups } = await supabase
          .from('study_groups')
          .select('id')
          .eq('creator_id', uid);
        if (createdGroups) {
          createdGroups.forEach(g => managedIds.add(Number(g.id)));
        }

        setUserGroupIds(groupIds);
        setManagedGroupIds(managedIds);

        // Batch prefetch user names and group names for all user's groups to cache
        if (groupIds.size > 0) {
          const groupIdsArr = Array.from(groupIds);
          const [mRes, gRes] = await Promise.all([
            supabase
              .from('group_members')
              .select('user_id, users:users!user_id(full_name)')
              .in('group_id', groupIdsArr),
            supabase
              .from('study_groups')
              .select('id, name')
              .in('id', groupIdsArr)
          ]);

          if (mRes.data) {
            mRes.data.forEach(item => {
              if (item.user_id && item.users?.full_name) {
                userNameCache.current[String(item.user_id)] = item.users.full_name;
              }
            });
          }
          if (gRes.data) {
            gRes.data.forEach(item => {
              if (item.id && item.name) {
                groupNameCache.current[String(item.id)] = item.name;
              }
            });
          }
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error('[Realtime] Lỗi tải danh sách nhóm:', err);
        }
      }
    };

    fetchUserGroups();

    // Listen to changes in group memberships for current user to keep group IDs updated in real-time
    const memberChannel = supabase
      .channel(`user-memberships-${uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members', filter: `user_id=eq.${uid}` }, () => {
        fetchUserGroups();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(memberChannel);
    };
  }, [user?.id]);

  // Hook to subscribe to private events, group events, and admin broadcasts
  useEffect(() => {
    if (!user?.id) return;

    const isAdminRoute = location.pathname.startsWith('/admin') || location.pathname === '/admin-login';
    if (isAdminRoute) return;

    const uid = parseInt(user.id, 10);

    // 1. Private Channel
    const privateChannel = supabase
      .channel(`notif-private-${uid}`)
      // ① Tin nhắn cá nhân
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${uid}` }, async (payload) => {
        const msg = payload.new;
        if (String(msg.sender_id) === String(uid)) return;
        const openChat = sessionStorage.getItem('active_chat_friend_id');
        if (location.pathname === '/chat' && String(openChat) === String(msg.sender_id)) return;

        try {
          const nickname = localStorage.getItem(`sc_nickname_${uid}_${msg.sender_id}`);
          const senderName = nickname || await getUserName(msg.sender_id);

          const text = (msg.content?.startsWith('data:image') || msg.content?.match(/\.(jpeg|jpg|gif|png|webp)(\?|$)/i))
            ? '\u0110\u00e3\u0020g\u1eedi\u0020m\u1ed9t\u0020\u1ea3nh'
            : (msg.content || '');
          addToast(`${senderName}: ${text}`, 'message', 6000, `/chat?userId=${msg.sender_id}`);
        } catch { /* ignore */ }
      })
      // ④ Lời mời kết bạn & Chấp nhận kết bạn
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships', filter: `to_user_id=eq.${uid}` }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          const f = payload.new;
          if (f.status !== 'pending') return;
          try {
            const senderName = await getUserName(f.from_user_id);
            addToast(`${senderName}\u0020mu\u1ed1n\u0020k\u1ebft\u0020b\u1ea1n\u0020v\u1edbi\u0020b\u1ea1n`, 'notification', 7000, '/friends');
          } catch { /* ignore */ }
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'friendships', filter: `from_user_id=eq.${uid}` }, async (payload) => {
        const newF = payload.new;
        const oldF = payload.old;
        if (newF.status === 'accepted' && oldF?.status !== 'accepted') {
          try {
            const accepterName = await getUserName(newF.to_user_id);
            addToast(`${accepterName}\u0020\u0111\u00e3\u0020\u0111\u1ed3ng\u0020\u00fd\u0020k\u1ebft\u0020b\u1ea1n`, 'notification', 7000, '/friends');
          } catch { /* ignore */ }
        }
      })
      // ⑤ Lời mời vào nhóm
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_invites', filter: `invitee_id=eq.${uid}` }, async (payload) => {
        const inv = payload.new;
        if (inv.status !== 'pending') return;
        try {
          const [inviterName, groupName] = await Promise.all([
            getUserName(inv.inviter_id),
            getGroupName(inv.group_id)
          ]);
          addToast(
            `${inviterName}\u0020m\u1eddi\u0020b\u1ea1n\u0020v\u00e0o\u0020nh\u00f3m\u0020"${groupName}"`,
            'notification', 7000, '/groups'
          );
        } catch { /* ignore */ }
      })
      // ⑧ Thành viên nhóm (bản thân - để cập nhật thông báo được thăng chức/phó nhóm/kicked)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members', filter: `user_id=eq.${uid}` }, async (payload) => {
        if (payload.eventType === 'UPDATE') {
          const m = payload.new;
          const old = payload.old;
          if (m.role === 'admin' && old?.role !== 'admin') {
            try {
              const groupName = await getGroupName(m.group_id);
              addToast(`B\u1ea1n\u0020\u0111\u01b0\u1ee3c\u0020b\u1ed5\u0020nhi\u1ec7m\u0020l\u00e0m\u0020Ph\u00f3\u0020nh\u00f3m\u0020"${groupName}"`, 'success', 7000, `/groups/${m.group_id}`);
            } catch { /* ignore */ }
          } else if (m.role === 'member' && (old?.role === 'admin' || !old || old.role === undefined)) {
            try {
              const groupName = await getGroupName(m.group_id);
              addToast(`\u0110\u00e3\u0020thu\u0020h\u1ed3i\u0020quy\u1ec1n\u0020ph\u00f3\u0020nh\u00f3m\u0020c\u1ee7a\u0020b\u1ea1n\u0020t\u1ea1i\u0020nh\u00f3m\u0020"${groupName}"`, 'error', 7000, `/groups/${m.group_id}`);
              try {
                const demotions = JSON.parse(localStorage.getItem('studyconect_demoted_notifications') || '[]');
                demotions.push({ id: Date.now().toString(), groupName, createdAt: new Date().toISOString() });
                localStorage.setItem('studyconect_demoted_notifications', JSON.stringify(demotions));
              } catch { /* ignore */ }
            } catch { /* ignore */ }
          }
        } else if (payload.eventType === 'DELETE') {
          const m = payload.old;
          if (sessionStorage.getItem('leaving_group') === 'true') {
            return;
          }
          try {
            const cachedName = groupNameCache.current[String(m.group_id)] || 'Nh\u00f3m';
            
            // Check if the group still exists
            const { data: groupData } = await supabase
              .from('study_groups')
              .select('id, name')
              .eq('id', m.group_id)
              .maybeSingle();

            if (!groupData) {
              // Group disbanded
              addToast(`Nh\u00f3m\u0020h\u1ecdc\u0020"${cachedName}"\u0020\u0111\u00e3\u0020b\u1ecb\u0020gi\u1ea3i\u0020t\u00e1n`, 'error', 8000, '/groups');
            } else {
              // Group still exists, user was kicked
              const realName = groupData.name || cachedName;
              addToast(`B\u1ea1n\u0020\u0111\u00e3\u0020b\u1ecb\u0020m\u1eddi\u0020ra\u0020kh\u1ecfi\u0020nh\u00f3m\u0020"${realName}"`, 'error', 8000, '/groups');
            }
            
            try {
              const kicks = JSON.parse(localStorage.getItem('studyconect_kicked_notifications') || '[]');
              kicks.push({ 
                id: Date.now().toString(), 
                groupName: groupData ? (groupData.name || cachedName) : cachedName, 
                isDisbanded: !groupData,
                createdAt: new Date().toISOString() 
              });
              localStorage.setItem('studyconect_kicked_notifications', JSON.stringify(kicks));
            } catch { /* ignore */ }
          } catch {
            const fallbackName = groupNameCache.current[String(m.group_id)] || 'Nh\u00f3m';
            addToast(`B\u1ea1n\u0020kh\u00f4ng\u0020c\u00f2n\u0020\u1edf\u0020trong\u0020nh\u00f3m\u0020"${fallbackName}"`, 'error', 8000, '/groups');
          }
        }
      })
      // ⑪ Tag trong bài viết (mentions cá nhân)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post_tags', filter: `target_id=eq.${uid}` }, async (payload) => {
        const t = payload.new;
        if (t.target_type !== 'user') return;
        try {
          const { data: post } = await supabase.from('posts').select('user_id').eq('id', t.post_id).single();
          if (!post) return;
          if (String(post.user_id) === String(uid)) return;

          const taggerName = await getUserName(post.user_id);

          addToast(
            `${taggerName}\u0020\u0111\u00e3\u0020tag\u0020b\u1ea1n\u0020trong\u0020b\u00e0i\u0020vi\u1ebft`,
            'notification', 6000, '/'
          );
        } catch { /* ignore */ }
      })
      // ② Bình luận bài viết
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `post_owner_id=eq.${uid}`
        },
        async (payload) => {
          const c = payload.new;
          if (String(c.user_id) === String(uid)) return;
          try {
            const commenterName = await getUserName(c.user_id);
            addToast(`${commenterName}\u0020b\u00ecnh\u0020lu\u1eadn:\u0020"${c.content}"`, 'notification', 6000, '/');
          } catch { /* ignore */ }
        }
      )
      // ③ Thả cảm xúc bài viết
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_reactions',
          filter: `post_owner_id=eq.${uid}`
        },
        async (payload) => {
          if (payload.eventType === 'DELETE') return;
          const r = payload.new;
          if (String(r.user_id) === String(uid)) return;
          try {
            const reactorName = await getUserName(r.user_id);
            addToast(`${reactorName}\u0020\u0111\u00e3\u0020b\u00e0y\u0020t\u1ecf\u0020c\u1ea3m\u0020x\u00fac\u0020v\u1edbi\u0020b\u00e0i\u0020vi\u1ebft\u0020c\u1ee7a\u0020b\u1ea1n`, 'notification', 6000, '/');
          } catch { /* ignore */ }
        }
      )
      .subscribe((status) => {
        if (import.meta.env.DEV) {
          console.log('[Realtime] Kênh riêng tư:', status);
        }
      });

    // 2. Group Channels (One channel per group)
    const activeGroupChannels = [];
    userGroupIds.forEach((gId) => {
      const groupChannel = supabase
        .channel(`group-realtime-${gId}`)
        // ① Tin nhắn nhóm
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `group_id=eq.${gId}` }, async (payload) => {
          const msg = payload.new;
          if (String(msg.sender_id) === String(uid)) return;

          const isViewingChat =
            location.pathname.includes(`/groups/${gId}`) &&
            sessionStorage.getItem('active_group_tab') === 'chat';
          if (isViewingChat) return;

          try {
            const [senderName, groupName] = await Promise.all([
              getUserName(msg.sender_id),
              getGroupName(gId)
            ]);

            const raw = msg.content || '';
            const isMeetroom = msg.meetroom_id || raw.startsWith('[meetroom:');
            if (isMeetroom) {
              const rId = msg.meetroom_id || (raw.match(/^\[meetroom:([^\]]+)\]/)?.[1]);
              if (rId && location.pathname.startsWith(`/room/${rId}`)) return;

              const text = raw.startsWith('[meetroom:') ? raw.replace(/^\[meetroom:[^\]]+\]\s*/, '') : raw;
              addToast(`[Ph\u00f2ng\u0020h\u1ecdp]\u0020${senderName}:\u0020${text}`, 'info', 6000, `/groups/${gId}?tab=chat`);
              return;
            }
            addToast(
              `[${groupName}]\u0020${senderName}:\u0020${raw}`,
              'message', 6000,
              `/groups/${gId}?tab=chat`
            );
          } catch { /* ignore */ }
        })
        // ⑥ Lịch học nhóm mới
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'schedules', filter: `group_id=eq.${gId}` }, async (payload) => {
          const s = payload.new;
          if (String(s.creator_id) === String(uid)) return;
          try {
            const groupName = await getGroupName(gId);
            addToast(
              `L\u1ecbch\u0020h\u1ecdc\u0020m\u1edbi:\u0020"${s.topic}"\u0020\u2014\u0020Nh\u00f3m\u0020"${groupName}"`,
              'notification', 7000, `/groups/${gId}?tab=schedule`
            );
          } catch { /* ignore */ }
        })
        // ⑦ Deadline mới
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'deadlines', filter: `group_id=eq.${gId}` }, async (payload) => {
          const d = payload.new;
          if (d.assignee_id && String(d.assignee_id) !== String(uid)) return;
          try {
            const groupName = await getGroupName(gId);
            const personal = d.assignee_id ? '\u0020(Giao\u0020cho\u0020b\u1ea1n)' : '';
            addToast(
              `Deadline\u0020m\u1edbi:\u0020"${d.title}"\u0020\u2014\u0020${groupName}${personal}`,
              'notification', 7000, `/groups/${gId}?tab=deadlines`
            );
          } catch { /* ignore */ }
        })
        // ⑧ Thành viên khác gia nhập nhóm
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_members', filter: `group_id=eq.${gId}` }, async (payload) => {
          const m = payload.new;
          if (String(m.user_id) === String(uid)) return;
          try {
            const [newUserName, groupName] = await Promise.all([
              getUserName(m.user_id),
              getGroupName(gId)
            ]);
            addToast(`${newUserName}\u0020\u0111\u00e3\u0020tham\u0020gia\u0020nh\u00f3m\u0020"${groupName}"`, 'info', 5000, `/groups/${gId}`);
          } catch { /* ignore */ }
        })
        // ⑨ Tài liệu học tập mới (được duyệt)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'files', filter: `group_id=eq.${gId}` }, async (payload) => {
          const f = payload.new;
          if (!f || !f.approved) return;

          if (payload.eventType === 'UPDATE' && payload.old && payload.old.approved) {
            return;
          }

          if (String(f.user_id) === String(uid)) {
            addToast(
              `T\u00e0i\u0020li\u1ec7u\u0020"${f.file_name}"\u0020c\u1ee7a\u0020b\u1ea1n\u0020\u0111\u00e3\u0020\u0111\u01b0\u1ee3c\u0020Admin\u0020ph\u00ea\u0020duy\u1ec7t!\u0020\ud83c\udf89`,
              'success', 7000, `/groups/${gId}?tab=documents`
            );
            return;
          }

          try {
            const [uploaderName, groupName] = await Promise.all([
              getUserName(f.user_id),
              getGroupName(gId)
            ]);
            addToast(
              `T\u00e0i\u0020li\u1ec7u\u0020m\u1edbi\u0020\u0111\u01b0\u1ee3c\u0020duy\u1ec7t:\u0020"${f.file_name}"\u0020\u2014\u0020\u0110\u0103ng\u0020b\u1edfi\u0020${uploaderName}\u0020trong\u0020nh\u00f3m\u0020${groupName}`,
              'notification', 7000, `/groups/${gId}?tab=documents`
            );
          } catch { /* ignore */ }
        })
        // ⑪ Tag nhóm trong bài viết (mentions nhóm)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post_tags', filter: `target_id=eq.${gId}` }, async (payload) => {
          const t = payload.new;
          if (t.target_type !== 'group') return;
          try {
            const { data: post } = await supabase.from('posts').select('user_id').eq('id', t.post_id).single();
            if (!post) return;
            if (String(post.user_id) === String(uid)) return;

            const taggerName = await getUserName(post.user_id);
            const groupName = await getGroupName(gId);
            addToast(
              `${taggerName}\u0020\u0111\u00e3\u0020tag\u0020nh\u00f3m\u0020"${groupName}"\u0020trong\u0020b\u00e0i\u0020vi\u1ebft`,
              'notification', 6000, '/'
            );
          } catch { /* ignore */ }
        });

      // ⑩ Yêu cầu xin vào nhóm (Chỉ thêm nếu là quản trị viên/chủ nhóm)
      if (managedGroupIds.has(Number(gId))) {
        groupChannel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_join_requests', filter: `group_id=eq.${gId}` }, async (payload) => {
          const req = payload.new;
          if (req.status !== 'pending') return;
          try {
            const [requesterName, groupName] = await Promise.all([
              getUserName(req.user_id),
              getGroupName(gId)
            ]);
            addToast(
              `${requesterName}\u0020xin\u0020tham\u0020gia\u0020nh\u00f3m\u0020"${groupName}"`,
              'notification', 8000, `/groups/${gId}`
            );
          } catch { /* ignore */ }
        });
      }

      groupChannel.subscribe((status) => {
        if (import.meta.env.DEV) {
          console.log(`[Realtime] Kênh nhóm ${gId}:`, status);
        }
      });
      activeGroupChannels.push(groupChannel);
    });

    // 3. Admin Broadcast Channel
    const adminChannel = supabase.channel(`admin-broadcasts-${uid}`);
    adminChannel.on('broadcast', { event: 'file_approved' }, async ({ payload }) => {
      if (!payload) return;
      const { userId, fileName, groupId, groupName, userFullName } = payload;
      
      // Trường hợp A: Người đăng tài liệu
      if (String(userId) === String(uid)) {
        addToast(
          `T\u00e0i\u0020li\u1ec7u\u0020"${fileName}"\u0020c\u1ee7a\u0020b\u1ea1n\u0020\u0111\u00e3\u0020\u0111\u01b0\u1ee3c\u0020Admin\u0020ph\u00ea\u0020duy\u1ec7t!\u0020\ud83c\udf89`,
          'success', 7000, `/groups/${groupId}?tab=documents`
        );
        return;
      }

      // Trường hợp B: Thành viên khác trong nhóm
      if (!userGroupIds.has(Number(groupId))) return;
      
      addToast(
        `T\u00e0i\u0020li\u1ec7u\u0020m\u1edbi\u0020\u0111\u01b0\u1ee3c\u0020duy\u1ec7t:\u0020"${fileName}"\u0020\u2014\u0020\u0110\u0103ng\u0020b\u1edfi\u0020${userFullName || 'Th\u00e0nh\u0020vi\u00ean'}\u0020trong\u0020nh\u00f3m\u0020${groupName || 'Nh\u00f3m\u0020h\u1ecdc'}`,
        'notification', 7000, `/groups/${groupId}?tab=documents`
      );
    });

    adminChannel.on('broadcast', { event: 'file_rejected' }, async ({ payload }) => {
      if (!payload) return;
      const { userId, fileName, groupName } = payload;
      
      // Chỉ thông báo cho người đăng tài liệu bị từ chối
      if (String(userId) === String(uid)) {
        addToast(
          `T\u00e0i\u0020li\u1ec7u\u0020"${fileName}"\u0020c\u1ee7a\u0020b\u1ea1n\u0020trong\u0020nh\u00f3m\u0020"${groupName || 'Nh\u00f3m\u0020h\u1ecdc'}"\u0020\u0111\u00e3\u0020b\u1ecb\u0020Admin\u0020t\u1eeb\u0020ch\u1ed1i\u0020ph\u00ea\u0020duy\u1ec7t\u0020v\u00e0\u0020x\u00f3a\u0020b\u1ecf.\u0020\u274c`,
          'error', 8000, null
        );
      }
    });

    adminChannel.on('broadcast', { event: 'post_approved' }, async ({ payload }) => {
      if (!payload) return;
      const { userId } = payload;
      if (String(userId) === String(uid)) {
        addToast(
          'B\u00e0i\u0020vi\u1ebft\u0020c\u1ee7a\u0020b\u1ea1n\u0020\u0111\u00e3\u0020\u0111\u01b0\u1ee3c\u0020ph\u00ea\u0020duy\u1ec7t\u0020th\u00e0nh\u0020c\u00f4ng!\u0020\ud83c\udf89',
          'success', 7000, '/'
        );
      }
    });
 
    adminChannel.on('broadcast', { event: 'post_rejected' }, async ({ payload }) => {
      if (!payload) return;
      const { userId } = payload;
      if (String(userId) === String(uid)) {
        addToast(
          'B\u00e0i\u0020vi\u1ebft\u0020c\u1ee7a\u0020b\u1ea1n\u0020kh\u00f4ng\u0020\u0111\u01b0\u1ee3c\u0020ph\u00ea\u0020duy\u1ec7t\u0020v\u00e0\u0020\u0111\u00e3\u0020\u0111\u01b0\u1ee3c\u0020g\u1ee1\u0020b\u1ecf.',
          'error', 8000, null
        );
      }
    });

    adminChannel.subscribe();

    return () => {
      supabase.removeChannel(privateChannel);
      supabase.removeChannel(adminChannel);
      activeGroupChannels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [user?.id, location.pathname, addToast, userGroupIds, managedGroupIds, getUserName, getGroupName]);

  return null;
}
