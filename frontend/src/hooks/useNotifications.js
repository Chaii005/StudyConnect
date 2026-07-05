import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/config/supabaseClient';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { acceptGroupInvite, declineGroupInvite } from '@/services/groupInviteService';
import { acceptFriendRequest as acceptRealFriend, removeFriend as declineRealFriend } from '@/services/friendService';
import { approveJoinRequest, rejectJoinRequest } from '@/services/groupService';

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

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const uid = parseInt(userId, 10);
      const now = new Date();
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      // cutoff: chỉ lấy dữ liệu trong 24h qua để giảm egress
      const cutoff = new Date(now.getTime() - ONE_DAY_MS).toISOString();
      const notifsList = [];
      const userGroupIds = new Set();

      // 1. Fetch friend requests from Supabase
      const { data: friendReqs, error: fError } = await supabase
        .from('friendships')
        .select(`
          id,
          from_user_id,
          status,
          created_at,
          users:users!from_user_id (
            full_name
          )
        `)
        .eq('to_user_id', uid)
        .eq('status', 'pending');

      if (!fError && friendReqs) {
        friendReqs
          .filter(f => (now - new Date(f.created_at)) < ONE_DAY_MS)
          .forEach(f => {
            const senderName = f.users?.full_name || 'Ai đó';
            notifsList.push({
              key: `friendreq:${f.id}`,
              type: 'friendreq',
              title: 'Lời mời kết bạn',
              body: `${senderName} muốn kết bạn với bạn`,
              createdAt: f.created_at,
              requestId: f.id.toString(),
              fromUserId: f.from_user_id,
              fromUserName: senderName,
            });
          });
      }

      // 1b. Fetch accepted friend requests from Supabase
      const { data: acceptedReqs } = await supabase
        .from('friendships')
        .select(`
          id,
          to_user_id,
          accepted_at,
          users:users!to_user_id (
            full_name
          )
        `)
        .eq('from_user_id', uid)
        .eq('status', 'accepted');

      if (acceptedReqs) {
        acceptedReqs
          .filter(ar => ar.accepted_at && (now - new Date(ar.accepted_at)) < ONE_DAY_MS)
          .forEach(ar => {
            const userName = ar.users?.full_name || 'Người dùng';
            notifsList.push({
              key: `friendaccept:${ar.id}`,
              type: 'friendaccept',
              title: 'Kết bạn thành công',
              body: `${userName} đã đồng ý lời mời kết bạn của bạn`,
              createdAt: ar.accepted_at,
            });
          });
      }

      // 2. Fetch group invites from Supabase
      const { data: invites, error: iError } = await supabase
        .from('group_invites')
        .select(`
          id,
          group_id,
          inviter_id,
          status,
          created_at,
          study_groups (
            name
          ),
          users:users!inviter_id (
            full_name
          )
        `)
        .eq('invitee_id', uid)
        .eq('status', 'pending');

      if (!iError && invites) {
        invites
          .filter(inv => (now - new Date(inv.created_at)) < ONE_DAY_MS)
          .forEach(inv => {
            const inviterName = inv.users?.full_name || 'Thành viên';
            const groupName = inv.study_groups?.name || 'Nhóm học';
            notifsList.push({
              key: `groupinvite:${inv.id}`,
              type: 'groupinvite',
              title: 'Lời mời vào nhóm',
              body: `${inviterName} mời bạn tham gia nhóm "${groupName}"`,
              createdAt: inv.created_at,
              inviteId: inv.id.toString(),
              groupId: inv.group_id.toString(),
              groupName: groupName,
            });
          });
      }

      // 3. Fetch joined groups to filter schedules, deadlines, and group messages
      const { data: joinedMembers, error: mError } = await supabase
        .from('group_members')
        .select(`
          group_id,
          role,
          joined_at,
          study_groups (
            name
          )
        `)
        .eq('user_id', uid);

      if (!mError && joinedMembers && joinedMembers.length > 0) {
        const joinedIds = joinedMembers.map(m => m.group_id);
        joinedIds.forEach(id => userGroupIds.add(Number(id)));
        myGroupIdsRef.current = joinedIds.map(Number);
        joinedMembers.forEach(m => {
          if (m.study_groups?.name) {
            groupNamesRef.current[Number(m.group_id)] = m.study_groups.name;
          }
        });

        // Notify user about group joins and role upgrades in the notification bell
        joinedMembers.forEach(m => {
          if (m.joined_at && (now - new Date(m.joined_at)) < ONE_DAY_MS) {
            const groupName = m.study_groups?.name || 'Nhóm học';
            if (m.role === 'member') {
              notifsList.push({
                key: `groupjoin:${m.group_id}`,
                type: 'groupjoin',
                title: 'Gia nhập nhóm thành công',
                body: `Bạn đã tham gia nhóm học tập "${groupName}"`,
                createdAt: m.joined_at,
                groupId: m.group_id.toString(),
              });
            } else if (m.role === 'admin') {
              notifsList.push({
                key: `groupdeputy:${m.group_id}`,
                type: 'groupdeputy',
                title: 'Bổ nhiệm phó nhóm',
                body: `Bạn đã được bổ nhiệm làm Phó nhóm của "${groupName}"`,
                createdAt: m.joined_at,
                groupId: m.group_id.toString(),
              });
            }
          }
        });

        // Fetch other members who joined recently (chỉ 24h qua)
        const { data: otherJoinedMembers } = await supabase
          .from('group_members')
          .select(`
            group_id,
            user_id,
            joined_at,
            users:users (
              full_name
            ),
            study_groups (
              name
            )
          `)
          .in('group_id', joinedIds)
          .neq('user_id', uid)
          .gte('joined_at', cutoff)
          .limit(20);

        if (otherJoinedMembers) {
          otherJoinedMembers
            .filter(om => om.joined_at && (now - new Date(om.joined_at)) < ONE_DAY_MS)
            .forEach(om => {
              const userName = om.users?.full_name || 'Người dùng';
              const groupName = om.study_groups?.name || 'Nhóm';
              notifsList.push({
                key: `othergroupjoin:${om.group_id}:${om.user_id}`,
                type: 'othergroupjoin',
                title: 'Thành viên mới gia nhập',
                body: `${userName} đã tham gia nhóm "${groupName}"`,
                createdAt: om.joined_at,
                groupId: om.group_id.toString(),
              });
            });
        }

        // Fetch schedules
        const { data: schedules } = await supabase
          .from('schedules')
          .select(`
            id, group_id, topic, date_time, created_at,
            study_groups (
              name
            )
          `)
          .in('group_id', joinedIds)
          .gte('date_time', now.toISOString())
          .limit(50);

        if (schedules) {
          schedules
            .filter(s => (now - new Date(s.created_at)) < ONE_DAY_MS)
            .forEach(s => {
              notifsList.push({
                key: `schedule:${s.id}`,
                type: 'schedule',
                title: `Lịch học mới: "${s.topic}"`,
                body: `Nhóm ${s.study_groups?.name || 'học'} • ${new Date(s.date_time).toLocaleString('vi-VN')}`,
                createdAt: s.created_at,
                groupId: s.group_id.toString(),
              });
            });
        }

        // Fetch deadlines
        const { data: deadlines } = await supabase
          .from('deadlines')
          .select(`
            id, group_id, title, due_date, assignee_id, created_at,
            study_groups (
              name
            )
          `)
          .in('group_id', joinedIds)
          .eq('completed', false)
          .limit(50);

        if (deadlines) {
          deadlines
            .filter(d => {
              if ((now - new Date(d.created_at)) >= ONE_DAY_MS) return false;
              if (d.assignee_id) {
                return String(d.assignee_id) === String(uid);
              }
              return true;
            })
            .forEach(d => {
              const isPersonal = d.assignee_id;
              notifsList.push({
                key: `deadline:${d.id}`,
                type: 'deadline',
                title: `Deadline mới: "${d.title}"`,
                body: `${isPersonal ? 'Giao cho bạn' : 'Cả nhóm'} • Nhóm ${d.study_groups?.name || 'học'} • Hạn: ${new Date(d.due_date).toLocaleString('vi-VN')}`,
                createdAt: d.created_at,
                groupId: d.group_id.toString(),
              });
            });

          // Fetch urgent deadlines (due in 24 hours)
          deadlines
            .filter(d => {
              const due = new Date(d.due_date).getTime();
              const timeLeft = due - now.getTime();
              if (!(timeLeft > 0 && timeLeft <= ONE_DAY_MS)) return false;
              if (d.assignee_id) {
                return String(d.assignee_id) === String(uid);
              }
              return true;
            })
            .forEach(d => {
              const due = new Date(d.due_date).getTime();
              const timeLeft = due - now.getTime();
              const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
              const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
              const timeStr = hoursLeft > 0 ? `${hoursLeft} giờ ${minutesLeft} phút` : `${minutesLeft} phút`;
              const isPersonal = d.assignee_id;
              notifsList.push({
                key: `deadline-urgent:${d.id}`,
                type: 'deadline-urgent',
                title: `${isPersonal ? 'Deadline của bạn' : 'Deadline nhóm'} sắp đến: "${d.title}"`,
                body: `${isPersonal ? 'Giao cho bạn' : 'Cả nhóm'} • Nhóm ${d.study_groups?.name || 'học'} • Còn ${timeStr} • Hạn: ${new Date(d.due_date).toLocaleString('vi-VN')}`,
                createdAt: new Date(new Date(d.due_date).getTime() - ONE_DAY_MS).toISOString(),
                groupId: d.group_id.toString(),
                deadlineId: d.id.toString(),
                dueDate: d.due_date,
              });
            });
        }

        // NOTE: Group chat messages are intentionally excluded from the global
        // notification bell. Users read them directly inside the group chat tab,
        // which has its own unread badge (unreadChatCount in useGroupDetail).

        // Fetch shared documents/files in groups (24h qua)
        const { data: recentFiles } = await supabase
          .from('files')
          .select(`
            id,
            group_id,
            file_name,
            created_at,
            users:users (
              full_name
            ),
            study_groups (
              name
            )
          `)
          .in('group_id', joinedIds)
          .neq('user_id', uid)
          .gte('created_at', cutoff)
          .limit(20);

        if (recentFiles) {
          recentFiles
            .filter(rf => rf.created_at && (now - new Date(rf.created_at)) < ONE_DAY_MS)
            .forEach(rf => {
              const userName = rf.users?.full_name || 'Thành viên';
              const groupName = rf.study_groups?.name || 'Nhóm';
              notifsList.push({
                key: `file:upload:${rf.id}`,
                type: 'fileupload',
                title: 'Tài liệu nhóm mới',
                body: `${userName} đã tải lên tài liệu "${rf.file_name}" trong nhóm "${groupName}"`,
                createdAt: rf.created_at,
                groupId: rf.group_id.toString(),
              });
            });
        }
      }

      // Custom deadline reminders from LocalStorage removed to comply with quota limits

      // 5. Fetch user's posts to get comments & reactions on them (giới hạn 20 post gần nhất)
      const { data: myPosts } = await supabase
        .from('posts')
        .select('id, content, likes, created_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(20);

      if (myPosts && myPosts.length > 0) {
        const myPostIds = myPosts.map(p => p.id);
        myPostIdsRef.current = myPostIds.map(Number);

        // Fetch comments on user's posts (24h qua)
        const { data: postComments } = await supabase
          .from('comments')
          .select(`
            id,
            post_id,
            user_id,
            content,
            created_at,
            users:users!user_id (
              full_name
            )
          `)
          .in('post_id', myPostIds)
          .neq('user_id', uid)
          .gte('created_at', cutoff)
          .order('created_at', { ascending: false })
          .limit(10);

        if (postComments) {
          postComments
            .filter(c => (now - new Date(c.created_at)) < ONE_DAY_MS)
            .forEach(c => {
              const commenterName = c.users?.full_name || 'Người dùng';
              notifsList.push({
                key: `comment:${c.id}`,
                type: 'comment',
                title: `Bình luận bài viết`,
                body: `${commenterName} đã bình luận: "${c.content}"`,
                createdAt: c.created_at,
                postId: c.post_id.toString(),
              });
            });
        }
        
        // Fetch comments by this user (24h qua) to find replies to them
        const { data: myComments } = await supabase
          .from('comments')
          .select('id')
          .eq('user_id', uid)
          .gte('created_at', cutoff)
          .limit(50);

        if (myComments && myComments.length > 0) {
          const myCommentIds = myComments.map(c => c.id);
          myCommentIdsRef.current = myCommentIds.map(Number);
          const { data: replies } = await supabase
            .from('comments')
            .select(`
              id,
              post_id,
              user_id,
              content,
              created_at,
              users:users!user_id (
                full_name
              )
            `)
            .in('parent_id', myCommentIds)
            .neq('user_id', uid)
            .gte('created_at', cutoff)
            .order('created_at', { ascending: false })
            .limit(10);

          if (replies) {
            replies
              .filter(r => (now - new Date(r.created_at)) < ONE_DAY_MS)
              .forEach(r => {
                // Tránh duplicate nếu bình luận này cũng nằm trên bài viết của chính user
                if (notifsList.some(n => n.key === `comment:${r.id}`)) return;

                const replierName = r.users?.full_name || 'Người dùng';
                notifsList.push({
                  key: `reply:${r.id}`,
                  type: 'comment',
                  title: `Trả lời bình luận`,
                  body: `${replierName} đã trả lời bình luận của bạn: "${r.content}"`,
                  createdAt: r.created_at,
                  postId: r.post_id.toString(),
                });
              });
          }
        }

        // Fetch user information for likes
        const likerIds = [];
        myPosts.forEach(p => {
          if (Array.isArray(p.likes)) {
            p.likes.forEach(lk => {
              const lkId = typeof lk === 'object' ? parseInt(lk.userId, 10) : parseInt(lk, 10);
              if (lkId && lkId !== uid) {
                likerIds.push(lkId);
              }
            });
          }
        });

        if (likerIds.length > 0) {
          const uniqueLikerIds = [...new Set(likerIds)];
          const { data: usersData } = await supabase
            .from('users')
            .select('id, full_name')
            .in('id', uniqueLikerIds);

          const likersMap = {};
          if (usersData) {
            usersData.forEach(u => {
              likersMap[String(u.id)] = u.full_name;
            });
          }

          myPosts.forEach(p => {
            if (Array.isArray(p.likes)) {
              p.likes.forEach(lk => {
                const lkId = typeof lk === 'object' ? String(lk.userId) : String(lk);
                if (lkId && lkId !== String(uid)) {
                  const likerName = likersMap[lkId] || 'Người dùng';
                  notifsList.push({
                    key: `like:${p.id}:${lkId}`,
                    type: 'like',
                    title: `Tương tác bài viết`,
                    body: `${likerName} đã thả cảm xúc vào bài viết của bạn`,
                    createdAt: p.created_at, // Approximation of time
                    postId: p.id.toString(),
                  });
                }
              });
            }
          });
        }
      }

      // 1c. Fetch recent private messages (24h qua, giới hạn 10)
      const { data: privateMsgs } = await supabase
        .from('messages')
        .select(`
          id,
          sender_id,
          content,
          created_at,
          users:users!sender_id (
            full_name
          )
        `)
        .eq('receiver_id', uid)
        .neq('sender_id', uid)
        .is('group_id', null)
        .gte('created_at', cutoff)
        .order('created_at', { ascending: false })
        .limit(10);

      if (privateMsgs) {
        privateMsgs
          .filter(m => (now - new Date(m.created_at)) < ONE_DAY_MS)
          .forEach(m => {
            // Bỏ qua hoàn toàn tin nhắn đổi hình nền - không hiện toast
            if (m.content?.startsWith('[chat_background]:')) return;

            // Tin nhắn cuộc gọi nhỡ → hiển thị kiểu missedcall riêng
            if (m.content?.startsWith('📵')) {
              const senderName = m.users?.full_name || 'Người dùng';
              notifsList.push({
                key: `missedcall:in:${m.id}`,
                type: 'missedcall',
                title: 'Cuộc gọi nhỡ',
                body: `Bạn đã bỏ lỡ cuộc gọi từ ${senderName}`,
                createdAt: m.created_at,
                senderId: m.sender_id.toString(),
              });
              return;
            }

            const senderName = m.users?.full_name || 'Người dùng';
            const displayContent = (m.content?.startsWith('data:image') || (m.content?.startsWith('http') && m.content?.match(/\.(jpeg|jpg|gif|png)/i)))
              ? 'Đã gửi một ảnh'
              : m.content || '';
            notifsList.push({
              key: `privatemsg:${m.id}`,
              type: 'privatemsg',
              title: `Tin nhắn từ ${senderName}`,
              body: displayContent,
              createdAt: m.created_at,
              senderId: m.sender_id.toString(),
            });
          });
      }

      // 2b. Fetch pending group join requests for groups created by current user
      const { data: myCreatedGroups } = await supabase
        .from('study_groups')
        .select('id, name')
        .eq('creator_id', uid);

      if (myCreatedGroups && myCreatedGroups.length > 0) {
        const myGroupIds = myCreatedGroups.map(g => g.id);
        myCreatedGroupIdsRef.current = myGroupIds.map(Number);
        myCreatedGroups.forEach(g => {
          groupNamesRef.current[Number(g.id)] = g.name;
        });
        const { data: pendingRequests } = await supabase
          .from('group_join_requests')
          .select(`
            id,
            group_id,
            user_id,
            created_at,
            users:users (
              full_name
            ),
            study_groups (
              name
            )
          `)
          .in('group_id', myGroupIds)
          .eq('status', 'pending')
          .limit(50);

        if (pendingRequests) {
          pendingRequests
            .filter(r => (now - new Date(r.created_at)) < ONE_DAY_MS)
            .forEach(r => {
              const requesterName = r.users?.full_name || 'Thành viên';
              const groupName = r.study_groups?.name || 'Nhóm';
              notifsList.push({
                key: `joinrequest:${r.id}`,
                type: 'joinrequest',
                title: 'Yêu cầu tham gia nhóm',
                body: `${requesterName} xin tham gia nhóm học tập "${groupName}"`,
                createdAt: r.created_at,
                requestId: r.id.toString(),
                groupId: r.group_id.toString(),
                fromUserId: r.user_id,
                requesterName: requesterName,
              });
            });
        }
      }

      // 2c. Fetch local group kicks
      try {
        const localKicks = JSON.parse(localStorage.getItem('studyconect_kicked_notifications') || '[]');
        localKicks
          .filter(k => (now - new Date(k.createdAt)) < ONE_DAY_MS)
          .forEach(k => {
            notifsList.push({
              key: `kick:${k.id}`,
              type: 'groupkick',
              title: 'Bị xóa khỏi nhóm',
              body: `Bạn đã bị xóa khỏi nhóm học tập "${k.groupName}"`,
              createdAt: k.createdAt,
            });
          });
      } catch (err) {
        if (import.meta.env.DEV) console.warn('Error reading local kicks:', err);
      }

      // 2d. Fetch local group demotions
      try {
        const localDemotions = JSON.parse(localStorage.getItem('studyconect_demoted_notifications') || '[]');
        localDemotions
          .filter(d => (now - new Date(d.createdAt)) < ONE_DAY_MS)
          .forEach(d => {
            notifsList.push({
              key: `demote:${d.id}`,
              type: 'groupdemote',
              title: 'Bị tước quyền phó nhóm',
              body: `Bạn đã bị tước quyền phó nhóm của "${d.groupName}"`,
              createdAt: d.createdAt,
            });
          });
      } catch (err) {
        if (import.meta.env.DEV) console.warn('Error reading local demotions:', err);
      }

      // Post Tag Notifications (from Supabase post_tags)
      try {
        const joinedGroupIdsStr = Array.from(userGroupIds).map(String);
        let orFilter = `and(target_type.eq.user,target_id.eq.${uid})`;
        if (joinedGroupIdsStr.length > 0) {
          orFilter += `,and(target_type.eq.group,target_id.in.(${joinedGroupIdsStr.join(',')}))`;
        }

        const { data: dbTags, error: dbTagsError } = await supabase
          .from('post_tags')
          .select(`
            id,
            post_id,
            target_type,
            target_id,
            created_at,
            posts (
              user_id,
              users (
                full_name
              )
            )
          `)
          .or(orFilter)
          .limit(50);

        if (!dbTagsError && dbTags) {
          dbTags
            .filter(t => (now - new Date(t.created_at)) < ONE_DAY_MS)
            .forEach(t => {
              const taggerName = t.posts?.users?.full_name || 'Ai đó';
              const isCreator = String(t.posts?.user_id) === String(uid);
              if (isCreator) return; // don't notify self

              if (t.target_type === 'user' && String(t.target_id) === String(uid)) {
                const key = `posttag:db:${t.id}`;
                if (!notifsList.some(x => x.key === key)) {
                  notifsList.push({
                    key,
                    type: 'posttag_user',
                    title: 'Bạn được tag trong một bài viết',
                    body: `${taggerName} đã tag bạn trong một bài viết`,
                    createdAt: t.created_at,
                    postId: String(t.post_id),
                  });
                }
              }

              if (t.target_type === 'group' && userGroupIds.has(Number(t.target_id))) {
                const key = `posttagg:db:${t.id}`;
                if (!notifsList.some(x => x.key === key)) {
                  const gMem = joinedMembers && joinedMembers.find(m => Number(m.group_id) === Number(t.target_id));
                  const gName = gMem?.study_groups?.name || 'Nhóm học';
                  notifsList.push({
                    key,
                    type: 'posttag_group',
                    title: `Nhóm "${gName}" được tag`,
                    body: `${taggerName} đã tag nhóm "${gName}" trong một bài viết`,
                    createdAt: t.created_at,
                    postId: String(t.post_id),
                    groupId: String(t.target_id),
                  });
                }
              }
            });
        }
      } catch (err) {
        if (import.meta.env.DEV) console.warn('Error fetching post tag notifications:', err);
      }

      // Fetch outgoing missed call messages (24h qua)
      try {
        const { data: outgoingMissed, error: omError } = await supabase
          .from('messages')
          .select(`
            id,
            receiver_id,
            content,
            created_at,
            users:users!receiver_id (
              full_name
            )
          `)
          .eq('sender_id', uid)
          .is('group_id', null)
          .like('content', '📵%')
          .gte('created_at', cutoff)
          .order('created_at', { ascending: false })
          .limit(5);

        if (!omError && outgoingMissed) {
          outgoingMissed
            .filter(m => (now - new Date(m.created_at)) < ONE_DAY_MS)
            .forEach(m => {
              const key = `missedcall:out:${m.id}`;
              if (notifsList.some(n => n.key === key)) return;
              const receiverName = m.users?.full_name || 'Người dùng';
              notifsList.push({
                key,
                type: 'missedcall',
                title: m.content?.startsWith('📵 Người nhận đang bận') ? 'Người nhận đang bận' : 'Cuộc gọi nhỡ',
                body: `${receiverName} không bắt máy`,
                createdAt: m.created_at,
                senderId: String(uid),
              });
            });
        }
      } catch (err) {
        if (import.meta.env.DEV) console.warn('Error fetching outgoing missed calls:', err);
      }


      notifsList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setNotifs(notifsList);


      // Refresh seen set from localStorage just in case
      try {
        setSeen(new Set(JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIF_SEEN)) || []));
      } catch {
        setSeen(new Set());
      }
    } catch (e) {
      if (import.meta.env.DEV) console.error('Error fetching notifications:', e);
    }
  }, [userId]);

  const groupNamesRef = useRef({});
  const userNamesCacheRef = useRef({});

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
      return data?.name || 'Nhóm học';
    } catch {
      return 'Nhóm học';
    }
  };

  const getUserName = async (userId) => {
    if (userNamesCacheRef.current[userId]) return userNamesCacheRef.current[userId];
    try {
      const { data } = await supabase.from('users').select('full_name').eq('id', userId).single();
      if (data?.full_name) {
        userNamesCacheRef.current[userId] = data.full_name;
      }
      return data?.full_name || 'Thành viên';
    } catch {
      return 'Thành viên';
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

    // Channel name unique mỗi mount để tránh duplicate subscription
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
                  title: 'Lời mời kết bạn',
                  body: `${senderName} muốn kết bạn với bạn`,
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
                  title: 'Kết bạn thành công',
                  body: `${userName} đã đồng ý lời mời kết bạn của bạn`,
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
              title: 'Lời mời vào nhóm',
              body: `${inviterName} mời bạn tham gia nhóm "${groupName}"`,
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
                    title: 'Gia nhập nhóm thành công',
                    body: `Bạn đã tham gia nhóm học tập "${groupName}"`,
                    createdAt: m.joined_at || new Date().toISOString(),
                    groupId: m.group_id.toString(),
                  });
                } else if (m.role === 'admin') {
                  addIncrementalNotif({
                    key: `groupdeputy:${m.group_id}`,
                    type: 'groupdeputy',
                    title: 'Bổ nhiệm phó nhóm',
                    body: `Bạn đã được bổ nhiệm làm Phó nhóm của "${groupName}"`,
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
                    title: 'Thành viên mới gia nhập',
                    body: `${userName} đã tham gia nhóm "${groupName}"`,
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
              title: `Lịch học mới: "${s.topic}"`,
              body: `Nhóm ${groupName} • ${new Date(s.date_time).toLocaleString('vi-VN')}`,
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
              title: `Deadline mới: "${d.title}"`,
              body: `${isPersonal ? 'Giao cho bạn' : 'Cả nhóm'} • Nhóm ${groupName} • Hạn: ${new Date(d.due_date).toLocaleString('vi-VN')}`,
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
            console.log(`[useNotifications] Nhận tin nhắn riêng realtime:`, m);
          }

          getUserName(senderId).then(senderName => {
            if (m.content?.startsWith('📵')) {
              if (import.meta.env.DEV) {
                console.log(`[useNotifications] Tạo thông báo cuộc gọi nhỡ (realtime): missedcall:in:${m.id}`);
              }
              addIncrementalNotif({
                key: `missedcall:in:${m.id}`,
                type: 'missedcall',
                title: 'Cuộc gọi nhỡ',
                body: `Bạn đã bỏ lỡ cuộc gọi từ ${senderName}`,
                createdAt: m.created_at,
                senderId: m.sender_id.toString(),
              });
            } else {
              const displayContent = (m.content?.startsWith('data:image') || (m.content?.startsWith('http') && m.content?.match(/\.(jpeg|jpg|gif|png)/i)))
                ? 'Đã gửi một ảnh'
                : m.content || '';
              addIncrementalNotif({
                key: `privatemsg:${m.id}`,
                type: 'privatemsg',
                title: `Tin nhắn từ ${senderName}`,
                body: displayContent,
                createdAt: m.created_at,
                senderId: m.sender_id.toString(),
              });
            }
          }).catch(err => {
            if (import.meta.env.DEV) {
              console.error(`[useNotifications] Lỗi khi lấy tên người gửi:`, err);
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
              title: 'Tài liệu nhóm mới',
              body: `${userName} đã tải lên tài liệu "${rf.file_name}" trong nhóm "${groupName}"`,
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
              title: 'Yêu cầu tham gia nhóm',
              body: `${requesterName} xin tham gia nhóm học tập "${groupName}"`,
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
              const taggerName = postData.users?.full_name || 'Ai đó';
              const isCreator = String(postData.user_id) === String(userId);
              if (isCreator) return;

              if (t.target_type === 'user' && String(t.target_id) === String(userId)) {
                addIncrementalNotif({
                  key: `posttag:db:${t.id}`,
                  type: 'posttag_user',
                  title: 'Bạn được tag trong một bài viết',
                  body: `${taggerName} đã tag bạn trong một bài viết`,
                  createdAt: t.created_at,
                  postId: String(t.post_id),
                });
              } else if (t.target_type === 'group' && myGroupIdsRef.current.includes(Number(t.target_id))) {
                getGroupName(Number(t.target_id)).then(gName => {
                  addIncrementalNotif({
                    key: `posttagg:db:${t.id}`,
                    type: 'posttag_group',
                    title: `Nhóm "${gName}" được tag`,
                    body: `${taggerName} đã tag nhóm "${gName}" trong một bài viết`,
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
    }, 1800000); // fallback 30 phút
    
    return () => {
      clearInterval(interval);
      supabase.removeChannel(notifChannel);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [refresh, refreshDebounced, userId, addIncrementalNotif]);

  const markAllRead = useCallback(() => {
    const newSeen = new Set([...seen, ...notifs.map(n => n.key)]);
    setSeen(newSeen);
    // Lưu vào localStorage để tồn qua các lần refresh()
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
