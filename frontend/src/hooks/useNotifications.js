import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/config/supabaseClient';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { acceptGroupInvite, declineGroupInvite } from '@/services/groupInviteService';
import { acceptFriendRequest as acceptRealFriend, removeFriend as declineRealFriend } from '@/services/friendService';
import { approveJoinRequest, rejectJoinRequest } from '@/services/groupService';
import { fetchAllNotifications } from './notificationQueries';

export default function useNotifications(userId) {
  const [notifs, setNotifs] = useState([]);
  const [seen, setSeen] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.NOTIF_SEEN);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [processing, setProcessing] = useState({});

  const myGroupIdsRef = useRef([]);
  const myPostIdsRef = useRef([]);
  const myCommentIdsRef = useRef([]);
  const myCreatedGroupIdsRef = useRef([]);

  const groupNamesRef = useRef({});
  const userNamesCacheRef = useRef({});

  // â•â•â• OPTIMIZED REFRESH â€” parallel queries via notificationQueries.js â•â•â•
  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const uid = parseInt(userId, 10);
      const now = new Date();
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      const cutoff = new Date(now.getTime() - ONE_DAY_MS).toISOString();

      const result = await fetchAllNotifications(uid, cutoff, now, ONE_DAY_MS, groupNamesRef);

      // Update refs for realtime listener filtering
      myGroupIdsRef.current = result.joinedIds.map(Number);
      myCreatedGroupIdsRef.current = result.myCreatedGroupIds;
      myPostIdsRef.current = result.myPostIds.map(Number);

      result.notifsList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setNotifs(result.notifsList);

      // Refresh seen set from localStorage
      try {
        setSeen(new Set(JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIF_SEEN)) || []));
      } catch {
        setSeen(new Set());
      }
    } catch (e) {
      if (import.meta.env.DEV) console.error('Error fetching notifications:', e);
    }
  }, [userId]);


  const addIncrementalNotif = useCallback((newNotif) => {
    setNotifs(prev => {
      if (prev.some(n => n.key === newNotif.key)) return prev;
      const updated = [newNotif, ...prev];
      return updated.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    });
  }, []);

  const getGroupName = async (groupId) => {
    if (groupNamesRef.current[groupId]) return groupNamesRef.current[groupId];
    try {
      const { data } = await supabase.from('study_groups').select('name').eq('id', groupId).single();
      if (data?.name) {
        groupNamesRef.current[groupId] = data.name;
      }
      return data?.name || 'NhĂ³m há»c';
    } catch {
      return 'NhĂ³m há»c';
    }
  };

  const getUserName = async (userId) => {
    if (userNamesCacheRef.current[userId]) return userNamesCacheRef.current[userId];
    try {
      const { data } = await supabase.from('users').select('full_name').eq('id', userId).single();
      if (data?.full_name) {
        userNamesCacheRef.current[userId] = data.full_name;
      }
      return data?.full_name || 'ThĂ nh viĂªn';
    } catch {
      return 'ThĂ nh viĂªn';
    }
  };

  const debounceRef = useRef(null);

  const refreshDebounced = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      refresh();
    }, 2000);
  }, [refresh]);

  useEffect(() => {
    if (!userId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();

    // Channel name unique má»—i mount Ä‘á»ƒ trĂ¡nh duplicate subscription
    const notifChannel = supabase
      .channel(`notif-${userId}`)
      // friendships
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const f = payload.new;
            if (!f) return;
            if (f.status === 'pending' && String(f.to_user_id) === String(userId)) {
              getUserName(f.from_user_id).then(senderName => {
                addIncrementalNotif({
                  key: `friendreq:${f.id}`,
                  type: 'friendreq',
                  title: 'Lá»i má»i káº¿t báº¡n',
                  body: `${senderName} muá»‘n káº¿t báº¡n vá»›i báº¡n.`,
                  createdAt: f.created_at,
                  requestId: f.id.toString(),
                  fromUserId: f.from_user_id,
                  fromUserName: senderName,
                });
              });
            } else if (f.status === 'accepted' && String(f.from_user_id) === String(userId)) {
              getUserName(f.to_user_id).then(userName => {
                addIncrementalNotif({
                  key: `friendaccept:${f.id}`,
                  type: 'friendaccept',
                  title: 'Káº¿t báº¡n thĂ nh cĂ´ng',
                  body: `${userName} Ä‘Ă£ Ä‘á»“ng Ă½ lá»i má»i káº¿t báº¡n.`,
                  createdAt: f.accepted_at || f.created_at,
                });
              });
            }
          }
        }
      )
      // group_invites
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'group_invites' },
        (payload) => {
          const inv = payload.new;
          if (!inv) return;
          if (String(inv.invitee_id) !== String(userId)) return;
          if (inv.status !== 'pending') return;
          Promise.all([getUserName(inv.inviter_id), getGroupName(Number(inv.group_id))]).then(([inviterName, groupName]) => {
            addIncrementalNotif({
              key: `groupinvite:${inv.id}`,
              type: 'groupinvite',
              title: 'Lá»i má»i vĂ o nhĂ³m',
              body: `${inviterName} má»i báº¡n tham gia nhĂ³m "${groupName}".`,
              createdAt: inv.created_at,
              inviteId: inv.id.toString(),
              groupId: inv.group_id.toString(),
              groupName: groupName,
            });
          });
        }
      )
      // group_members
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_members' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const m = payload.new;
            if (!m) return;
            getGroupName(Number(m.group_id)).then(groupName => {
              if (String(m.user_id) === String(userId)) {
                if (!myGroupIdsRef.current.includes(Number(m.group_id))) {
                  myGroupIdsRef.current.push(Number(m.group_id));
                }
                if (m.role === 'member') {
                  addIncrementalNotif({
                    key: `groupjoin:${m.group_id}`,
                    type: 'groupjoin',
                    title: 'Gia nháº­p nhĂ³m thĂ nh cĂ´ng',
                    body: `Báº¡n Ä‘Ă£ tham gia nhĂ³m há»c táº­p "${groupName}".`,
                    createdAt: m.joined_at || new Date().toISOString(),
                    groupId: m.group_id.toString(),
                  });
                } else if (m.role === 'admin') {
                  addIncrementalNotif({
                    key: `groupdeputy:${m.group_id}`,
                    type: 'groupdeputy',
                    title: 'Bá»• nhiá»‡m PhĂ³ nhĂ³m',
                    body: `Báº¡n Ä‘Ă£ Ä‘Æ°á»£c bá»• nhiá»‡m lĂ m PhĂ³ nhĂ³m cá»§a "${groupName}".`,
                    createdAt: m.joined_at || new Date().toISOString(),
                    groupId: m.group_id.toString(),
                  });
                }
              } else {
                if (!myGroupIdsRef.current.includes(Number(m.group_id))) return;
                getUserName(m.user_id).then(userName => {
                  addIncrementalNotif({
                    key: `othergroupjoin:${m.group_id}:${m.user_id}`,
                    type: 'othergroupjoin',
                    title: 'ThĂ nh viĂªn má»›i',
                    body: `${userName} vá»«a tham gia nhĂ³m "${groupName}".`,
                    createdAt: m.joined_at || new Date().toISOString(),
                    groupId: m.group_id.toString(),
                  });
                });
              }
            });
          }
        }
      )
      // schedules
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'schedules' },
        (payload) => {
          const s = payload.new;
          if (!s) return;
          if (!myGroupIdsRef.current.includes(Number(s.group_id))) return;
          getGroupName(Number(s.group_id)).then(groupName => {
            addIncrementalNotif({
              key: `schedule:${s.id}`,
              type: 'schedule',
              title: 'Lá»‹ch há»c nhĂ³m má»›i',
              body: `NhĂ³m "${groupName}" há»c: ${s.topic} Â· ${new Date(s.date_time).toLocaleString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`,
              createdAt: s.created_at,
              groupId: s.group_id.toString(),
            });
          });
        }
      )
      // deadlines
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'deadlines' },
        (payload) => {
          const d = payload.new;
          if (!d) return;
          if (!myGroupIdsRef.current.includes(Number(d.group_id))) return;
          if (d.assignee_id && String(d.assignee_id) !== String(userId)) return;
          const isPersonal = d.assignee_id;
          getGroupName(Number(d.group_id)).then(groupName => {
            addIncrementalNotif({
              key: `deadline:${d.id}`,
              type: 'deadline',
              title: 'Háº¡n ná»™p má»›i',
              body: `${isPersonal ? 'Giao riĂªng cho báº¡n' : 'Cáº£ nhĂ³m ' + groupName} Â· ${d.title} (Háº¡n: ${new Date(d.due_date).toLocaleDateString('vi-VN')})`,
              createdAt: d.created_at,
              groupId: d.group_id.toString(),
            });
          });
        }
      )
      // messages (private)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${userId}` },
        (payload) => {
          const m = payload.new;
          if (!m) return;
          const senderId = m.sender_id;
          if (String(senderId) === String(userId)) return;

          if (m.content?.startsWith('[chat_background]:')) return;

          if (import.meta.env.DEV) {
            console.log(`[useNotifications] Nháº­n tin nháº¯n riĂªng realtime:`, m);
          }

          getUserName(senderId).then(senderName => {
            if (m.content?.startsWith('đŸ“µ')) {
              if (import.meta.env.DEV) {
                console.log(`[useNotifications] Táº¡o thĂ´ng bĂ¡o cuá»™c gá»i nhá»¡ (realtime): missedcall:in:${m.id}`);
              }
              addIncrementalNotif({
                key: `missedcall:in:${m.id}`,
                type: 'missedcall',
                title: 'Cuá»™c gá»i nhá»¡',
                body: `Cuá»™c gá»i nhá»¡ tá»« ${senderName}.`,
                createdAt: m.created_at,
                senderId: m.sender_id.toString(),
              });
            } else {
              const displayContent = (m.content?.startsWith('data:image') || (m.content?.startsWith('http') && m.content?.match(/\.(jpeg|jpg|gif|png)/i)))
                ? 'ÄĂ£ gá»­i má»™t áº£nh'
                : m.content || '';
              addIncrementalNotif({
                key: `privatemsg:${m.id}`,
                type: 'privatemsg',
                title: `Tin nháº¯n tá»« ${senderName}`,
                body: displayContent?.length > 80 ? displayContent.slice(0, 80) + 'â€¦' : displayContent,
                createdAt: m.created_at,
                senderId: m.sender_id.toString(),
              });
            }
          }).catch(err => {
            if (import.meta.env.DEV) {
              console.error(`[useNotifications] Lá»—i khi láº¥y tĂªn ngÆ°á»i gá»­i:`, err);
            }
          });
        }
      )
      // NOTE: Group chat messages realtime is intentionally excluded from
      // the global notification bell. Group-internal messages are handled
      // by the unreadChatCount badge inside useGroupDetail.
      // files
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'files' },
        (payload) => {
          const rf = payload.new;
          if (!rf) return;
          if (String(rf.user_id) === String(userId)) return;
          if (!myGroupIdsRef.current.includes(Number(rf.group_id))) return;
          Promise.all([getUserName(rf.user_id), getGroupName(Number(rf.group_id))]).then(([userName, groupName]) => {
            addIncrementalNotif({
              key: `file:upload:${rf.id}`,
              type: 'fileupload',
              title: 'TĂ i liá»‡u nhĂ³m má»›i',
              body: `${userName} Ä‘Ă£ chia sáº» "${rf.file_name}" táº¡i "${groupName}".`,
              createdAt: rf.created_at,
              groupId: rf.group_id.toString(),
            });
          });
        }
      )
      // group_join_requests
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'group_join_requests' },
        (payload) => {
          const r = payload.new;
          if (!r) return;
          if (!myCreatedGroupIdsRef.current.includes(Number(r.group_id))) return;
          if (r.status !== 'pending') return;
          Promise.all([getUserName(r.user_id), getGroupName(Number(r.group_id))]).then(([requesterName, groupName]) => {
            addIncrementalNotif({
              key: `joinrequest:${r.id}`,
              type: 'joinrequest',
              title: 'YĂªu cáº§u tham gia',
              body: `${requesterName} xin gia nháº­p nhĂ³m "${groupName}".`,
              createdAt: r.created_at,
              requestId: r.id.toString(),
              groupId: r.group_id.toString(),
              fromUserId: r.user_id,
              requesterName: requesterName,
            });
          });
        }
      )
      // post_tags
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'post_tags' },
        (payload) => {
          const t = payload.new;
          if (!t) return;
          supabase
            .from('posts')
            .select('user_id, users(full_name)')
            .eq('id', t.post_id)
            .single()
            .then(({ data: postData }) => {
              if (!postData) return;
              const taggerName = postData.users?.full_name || 'Ai Ä‘Ă³';
              const isCreator = String(postData.user_id) === String(userId);
              if (isCreator) return;

              if (t.target_type === 'user' && String(t.target_id) === String(userId)) {
                addIncrementalNotif({
                  key: `posttag:db:${t.id}`,
                  type: 'posttag_user',
                  title: 'ÄÆ°á»£c nháº¯c tĂªn',
                  body: `${taggerName} Ä‘Ă£ tag báº¡n trong má»™t bĂ i viáº¿t.`,
                  createdAt: t.created_at,
                  postId: String(t.post_id),
                });
              } else if (t.target_type === 'group' && myGroupIdsRef.current.includes(Number(t.target_id))) {
                getGroupName(Number(t.target_id)).then(gName => {
                  addIncrementalNotif({
                    key: `posttagg:db:${t.id}`,
                    type: 'posttag_group',
                    title: 'Nháº¯c tĂªn nhĂ³m',
                    body: `${taggerName} Ä‘Ă£ nháº¯c Ä‘áº¿n nhĂ³m "${gName}" trong bĂ i viáº¿t.`,
                    createdAt: t.created_at,
                    postId: String(t.post_id),
                    groupId: String(t.target_id),
                  });
                });
              }
            });
        }
      )
      .subscribe();

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    }, 1800000); // fallback 30 phĂºt
    
    return () => {
      clearInterval(interval);
      supabase.removeChannel(notifChannel);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [refresh, refreshDebounced, userId, addIncrementalNotif]);

  const markAllRead = useCallback(() => {
    const newSeen = new Set([...seen, ...notifs.map(n => n.key)]);
    setSeen(newSeen);
    // LÆ°u vĂ o localStorage Ä‘á»ƒ tá»“n qua cĂ¡c láº§n refresh()
    try {
      localStorage.setItem(STORAGE_KEYS.NOTIF_SEEN, JSON.stringify([...newSeen]));
    } catch (err) {
      if (import.meta.env.DEV) console.warn('Error saving seen notifications:', err);
    }
  }, [seen, notifs]);

  const acceptInvite = useCallback(async (inviteId) => {
    setProcessing(p => ({ ...p, [inviteId]: 'accepting' }));
    try {
      await acceptGroupInvite(inviteId);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Error accepting group invite:', err);
    } finally {
      setProcessing(p => ({ ...p, [inviteId]: null }));
      refresh();
    }
  }, [refresh]);

  const declineInvite = useCallback(async (inviteId) => {
    setProcessing(p => ({ ...p, [inviteId]: 'declining' }));
    try {
      await declineGroupInvite(inviteId);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Error declining group invite:', err);
    } finally {
      setProcessing(p => ({ ...p, [inviteId]: null }));
      refresh();
    }
  }, [refresh]);

  const acceptFriendRequest = useCallback(async (requestId) => {
    setProcessing(p => ({ ...p, [requestId]: 'accepting' }));
    try {
      await acceptRealFriend(requestId);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Error accepting friend request:', err);
    } finally {
      setProcessing(p => ({ ...p, [requestId]: null }));
      refresh();
    }
  }, [refresh]);

  const declineFriendRequest = useCallback(async (requestId) => {
    setProcessing(p => ({ ...p, [requestId]: 'declining' }));
    try {
      await declineRealFriend(requestId);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Error declining friend request:', err);
    } finally {
      setProcessing(p => ({ ...p, [requestId]: null }));
      refresh();
    }
  }, [refresh]);

  const acceptJoinReq = useCallback(async (requestId, groupId, requesterId) => {
    setProcessing(p => ({ ...p, [requestId]: 'accepting' }));
    try {
      await approveJoinRequest(requestId, groupId, requesterId);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Error approving join request:', err);
    } finally {
      setProcessing(p => ({ ...p, [requestId]: null }));
      refresh();
    }
  }, [refresh]);

  const declineJoinReq = useCallback(async (requestId) => {
    setProcessing(p => ({ ...p, [requestId]: 'declining' }));
    try {
      await rejectJoinRequest(requestId);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Error declining join request:', err);
    } finally {
      setProcessing(p => ({ ...p, [requestId]: null }));
      refresh();
    }
  }, [refresh]);

  const unreadCount = notifs.filter(n => !seen.has(n.key)).length;

  return {
    notifs,
    seen,
    unreadCount,
    processing,
    refresh,
    markAllRead,
    acceptInvite,
    declineInvite,
    acceptFriendRequest,
    declineFriendRequest,
    acceptJoinReq,
    declineJoinReq
  };
}
