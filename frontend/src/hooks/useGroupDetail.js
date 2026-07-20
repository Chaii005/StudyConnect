/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { formatBytes } from '@/utils';
import { compressImage } from '@/utils/imageCompress';
import { getGroupById, assignDeputy, removeDeputy, kickMember, joinGroup, requestJoinGroup } from '@/services/groupService';
import { sendFriendRequest } from '@/services/friendService';
import { supabase } from '@/config/supabaseClient';
import { useOnlineUsers } from '@/context/OnlineUsersContext';
import {
  getFiles,
  uploadFile,
  deleteFile,
  getSchedules,
  createSchedule,
  deleteSchedule,
  updateSchedule,
  getDeadlines,
  createDeadline,
  toggleDeadline,
  deleteDeadline,
  updateDeadline,
  getChatMessages,
  sendChatMessage,
  deleteChatMessage,
  togglePinChatMessage
} from '@/services/interactionService';

const getProcessedDeadlines = (deadList) => {
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  return deadList.map(d => {
    const due = new Date(d.dueDate).getTime();
    return {
      ...d,
      dueSoon: !d.completed && due > now && (due - now) <= oneDayMs,
      overdue: !d.completed && due < now
    };
  });
};

const sanitizeForStorage = (str) => {
  if (!str) return 'file';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-zA-Z0-9.-]/g, '_');
};


export default function useGroupDetail(groupId, user, addToast) {
  const navigate = useNavigate();
  const location = useLocation();

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('documents');
  const [isMember, setIsMember] = useState(true);
  const [joinRequestStatus, setJoinRequestStatus] = useState(null);
  const [joining, setJoining] = useState(false);

  // Members management state
  const [isAssigningDeputy, setIsAssigningDeputy] = useState(false);
  const [friendRequestingIds, setFriendRequestingIds] = useState({});
  const [kickingIds, setKickingIds] = useState({});
  const [membersDetails, setMembersDetails] = useState([]);
  const [friendships, setFriendships] = useState([]);
  const onlineUserIds = useOnlineUsers();

  // Documents state
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [customFileName, setCustomFileName] = useState('');
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  // Schedule state
  const [schedules, setSchedules] = useState([]);
  const [newScheduleTopic, setNewScheduleTopic] = useState('');
  const [newScheduleDateTime, setNewScheduleDateTime] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [newScheduleLocation, setNewScheduleLocation] = useState('');
  const [newScheduleDesc, setNewScheduleDesc] = useState('');
  const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [editScheduleTopic, setEditScheduleTopic] = useState('');
  const [editScheduleDateTime, setEditScheduleDateTime] = useState('');
  const [editScheduleLocation, setEditScheduleLocation] = useState('');
  const [editScheduleDesc, setEditScheduleDesc] = useState('');
  const [overrideLocation, setOverrideLocation] = useState(false);

  // Deadline state
  const [deadlines, setDeadlines] = useState([]);
  const [newDeadlineTitle, setNewDeadlineTitle] = useState('');
  const [newDeadlineDueDate, setNewDeadlineDueDate] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [newDeadlineDesc, setNewDeadlineDesc] = useState('');
  const [newDeadlineAssignee, setNewDeadlineAssignee] = useState('all');
  const [newDeadlineSubmissionType, setNewDeadlineSubmissionType] = useState('image');
  const [isSubmittingDeadline, setIsSubmittingDeadline] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState(null);
  const [editDeadlineTitle, setEditDeadlineTitle] = useState('');
  const [editDeadlineDueDate, setEditDeadlineDueDate] = useState('');
  const [editDeadlineDesc, setEditDeadlineDesc] = useState('');
  const [editDeadlineAssignee, setEditDeadlineAssignee] = useState('all');
  const [editDeadlineSubmissionType, setEditDeadlineSubmissionType] = useState('image');
  const [urgentDeadlinesCount, setUrgentDeadlinesCount] = useState(0);

  // Submission state
  const [submissions, setSubmissions] = useState({});
  const [showSubmitModal, setShowSubmitModal] = useState(null);
  const [submitNote, setSubmitNote] = useState('');
  const [submitFile, setSubmitFile] = useState(null);
  const [submitImages, setSubmitImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmissionsFor, setShowSubmissionsFor] = useState(null);

  // Reminders state
  const [remindingIds, setRemindingIds] = useState({});

  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatAttachedFile, setChatAttachedFile] = useState(null);
  const [isSendingChatMessage, setIsSendingChatMessage] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [msgReactions, setMsgReactions] = useState({});
  const [chatLastSeenTime, setChatLastSeenTime] = useState(() => {
    // Load persisted last-seen for this group on first render
    if (groupId && user?.id) {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.chatLastSeen(groupId, user.id));
        if (saved) return saved;
      } catch { /* ignore */ }
    }
    return new Date(0).toISOString();
  });
  const [confirmConfig, setConfirmConfig] = useState(null);

  // Tab data cache: { [tabKey]: { data, ts } } — ngăn re-fetch mỗi lần chuyển tab
  const tabCacheRef = useRef({});
  const TAB_CACHE_TTL = 5 * 60 * 1000; // 5 phút

  // Cache membersDetails cho việc append realtime message (tránh fetch user trong callback)
  const membersDetailsCacheRef = useRef({});

  // Reset/sync states from localStorage cache when groupId changes
  useEffect(() => {
    if (!groupId) return;
    setGroup(null);
    setLoading(true);
    setMembersDetails([]);
    setFriendships([]);
    setFiles([]);
    setSchedules([]);
    setDeadlines([]);
    setChatMessages([]);
    // Xóa cache tab khi đổi nhóm
    tabCacheRef.current = {};
    membersDetailsCacheRef.current = {};
    // Restore last-seen timestamp for new group
    if (user?.id) {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.chatLastSeen(groupId, user.id));
        setChatLastSeenTime(saved || new Date(0).toISOString());
      } catch {
        setChatLastSeenTime(new Date(0).toISOString());
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const fetchGroupSchedules = useCallback(async () => {
    if (!groupId) return;
    try {
      const schedulesData = await getSchedules(groupId);
      setSchedules(schedulesData);
    } catch (err) {
      addToast(err.message || 'Lỗi tải danh sách lịch học', 'error');
    }
  }, [groupId, addToast]);

  const fetchGroupDeadlines = useCallback(async () => {
    if (!groupId) return;
    try {
      const deadlinesData = await getDeadlines(groupId);
      const processed = getProcessedDeadlines(deadlinesData);
      setDeadlines(processed);
    } catch (err) {
      addToast(err.message || 'Lỗi tải danh sách deadline', 'error');
    }
  }, [groupId, addToast]);

  const loadSubmissions = useCallback(() => {
    if (!groupId) return {};
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.submissions(groupId));
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }, [groupId]);

  const saveSubmissions = useCallback((data) => {
    if (!groupId) return;
    try {
      localStorage.setItem(STORAGE_KEYS.submissions(groupId), JSON.stringify(data));
    } catch { /* empty */ }
  }, [groupId]);

  const fetchChatMessages = useCallback(async () => {
    if (!groupId) return;
    try {
      const messages = await getChatMessages(groupId);
      setChatMessages(messages);
    } catch (err) {
      addToast(err.message || 'Lỗi tải tin nhắn', 'error');
    }
  }, [groupId, addToast]);

  const fetchGroupFiles = useCallback(async () => {
    if (!groupId) return;
    try {
      const filesData = await getFiles(groupId);
      setFiles(filesData);
    } catch (err) {
      addToast(err.message || 'Lỗi tải danh sách tài liệu', 'error');
    }
  }, [groupId, addToast]);

  const fetchGroupMembersDetails = useCallback(async (membersList) => {
    if (!membersList || membersList.length === 0) return;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, avatar')
        .in('id', membersList.map(id => parseInt(id, 10)));
      
      if (!error && data) {
        const mapped = data.map(u => ({
          id: u.id.toString(),
          fullName: u.full_name,
          email: u.email,
          avatar: u.avatar
        }));
        setMembersDetails(mapped);
        // Cập nhật cache member để dùng trong realtime append
        mapped.forEach(m => {
          membersDetailsCacheRef.current[m.id] = m;
        });
      }
    } catch (err) {
      if (import.meta.env.DEV) console.warn('Lỗi tải thông tin thành viên:', err);
    }
  }, []);

  const fetchGroupFriendships = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select('id, from_user_id, to_user_id, status')
        .or(`from_user_id.eq.${parseInt(user.id, 10)},to_user_id.eq.${parseInt(user.id, 10)}`);
      
      if (!error && data) {
        setFriendships(data);
      }
    } catch (err) {
      if (import.meta.env.DEV) console.warn('Lỗi tải quan hệ bạn bè:', err);
    }
  }, [user]);

  const fetchGroupDetails = useCallback(async () => {
    try {
      setLoading(true);
      const groupData = await getGroupById(groupId);
      if (!groupData) {
        addToast('Không tìm thấy nhóm học này!', 'error');
        navigate('/groups');
        return;
      }
      
      const isMem = groupData.members.some(m => Number(m) === Number(user?.id));
      setIsMember(isMem);
      setGroup(groupData);
      setLoading(false); // Render the group layout/tab structure immediately!

      if (isMem) {
        // Concurrently execute secondary fetches in the background
        Promise.all([
          fetchGroupMembersDetails(groupData.members),
          fetchGroupFriendships(),
          fetchGroupDeadlines()
        ]).catch(err => {
          if (import.meta.env.DEV) console.warn('[useGroupDetail] Background fetches encountered errors:', err);
        });
      } else {
        // Fetch join request status if not a member
        const { data: req } = await supabase
          .from('group_join_requests')
          .select('status')
          .eq('group_id', parseInt(groupId, 10))
          .eq('user_id', parseInt(user?.id, 10))
          .eq('status', 'pending')
          .maybeSingle();
        setJoinRequestStatus(req?.status || null);
      }
    } catch (err) {
      addToast(err.message || 'Lỗi tải thông tin nhóm', 'error');
      navigate('/groups');
      setLoading(false);
    }
  }, [groupId, user?.id, navigate, addToast, fetchGroupDeadlines, fetchGroupMembersDetails, fetchGroupFriendships]);

  const handleJoinGroup = async () => {
    if (!user?.id || !groupId) return;
    setJoining(true);
    try {
      if (group.isPrivate) {
        await requestJoinGroup(user.id, groupId);
        setJoinRequestStatus('pending');
        addToast('Đã gửi yêu cầu tham gia nhóm!', 'success');
      } else {
        await joinGroup(user.id, groupId);
        setIsMember(true);
        addToast('Đã tham gia nhóm thành công!', 'success');
        fetchGroupDetails();
      }
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setJoining(false);
    }
  };

  useEffect(() => {
    fetchGroupDetails();
  }, [fetchGroupDetails]);



  // Load appropriate data when tab changes — có cache 5 phút
  useEffect(() => {
    if (!group) return;
    const now = Date.now();
    const isFresh = (key) => {
      const c = tabCacheRef.current[key];
      return c && (now - c.ts) < TAB_CACHE_TTL;
    };
    if (activeTab === 'documents') {
      if (!isFresh('documents')) fetchGroupFiles().then(() => { tabCacheRef.current['documents'] = { ts: Date.now() }; });
    } else if (activeTab === 'schedule') {
      if (!isFresh('schedule')) fetchGroupSchedules().then(() => { tabCacheRef.current['schedule'] = { ts: Date.now() }; });
    } else if (activeTab === 'deadlines') {
      if (!isFresh('deadlines')) fetchGroupDeadlines().then(() => { tabCacheRef.current['deadlines'] = { ts: Date.now() }; });
    } else if (activeTab === 'chat') {
      if (!isFresh('chat')) fetchChatMessages().then(() => { tabCacheRef.current['chat'] = { ts: Date.now() }; });
      // Mark all messages as read when the user opens the chat tab
      const now = new Date().toISOString();
      setChatLastSeenTime(now);
      if (user?.id) {
        try {
          localStorage.setItem(STORAGE_KEYS.chatLastSeen(groupId, user.id), now);
        } catch { /* ignore */ }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group, activeTab]);

  // Chat messaging Realtime listener — append từ payload thay vì re-fetch toàn bộ
  useEffect(() => {
    if (!group || !groupId) return;

    // Initial fetch (chỉ 1 lần khi mount)
    if (!tabCacheRef.current['chat']) {
      fetchChatMessages().then(() => { tabCacheRef.current['chat'] = { ts: Date.now() }; });
    }

    const chatChannel = supabase
      .channel(`group-chat-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `group_id=eq.${groupId}`
        },
        (payload) => {
          const msg = payload.new;
          if (!msg) return;

          // Dùng cache member hoặc fallback
          const senderId = msg.sender_id?.toString();
          const cachedMember = membersDetailsCacheRef.current[senderId];
          const newMsg = {
            id: msg.id?.toString(),
            groupId: msg.group_id?.toString(),
            userId: msg.sender_id,
            userFullName: cachedMember?.fullName || 'Thành viên',
            userAvatar: cachedMember?.avatar || '',
            content: msg.content,
            meetroom_id: msg.meetroom_id || null,
            fileAttachment: msg.file_attachment || null,
            replyTo: msg.reply_to || null,
            isPinned: msg.is_pinned || false,
            createdAt: msg.created_at
          };
          setChatMessages(prev => {
            // Tránh duplicate
            if (prev.some(m => m.id === newMsg.id)) return prev;
            
            const optimisticIndex = prev.findIndex(m => m.isOptimistic && String(m.userId) === String(newMsg.userId) && m.content === newMsg.content);
            if (optimisticIndex !== -1) {
              const updated = [...prev];
              updated[optimisticIndex] = {
                ...newMsg,
                localId: prev[optimisticIndex].localId || prev[optimisticIndex].id
              };
              return updated.length > 50 ? updated.slice(updated.length - 50) : updated;
            } else {
              const updated = [...prev, newMsg];
              return updated.length > 50 ? updated.slice(updated.length - 50) : updated;
            }
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          if (!payload.old?.id) return;
          setChatMessages(prev => prev.filter(m => m.id !== payload.old.id?.toString()));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chatChannel);
    };
  // fetchChatMessages cố tình không có trong deps để tránh re-subscribe mỗi lần render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group, groupId]);

  // Group members and roles Realtime listener
  useEffect(() => {
    if (!groupId) return;

    const memberChannel = supabase
      .channel(`group-members-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_members',
          filter: `group_id=eq.${groupId}`
        },
        async (payload) => {
          if (payload.eventType === 'DELETE') {
            const oldMember = payload.old;
            if (oldMember && oldMember.user_id && String(oldMember.user_id) === String(user?.id)) {
              if (sessionStorage.getItem('leaving_group') === 'true') {
                return;
              }
              // Check if group itself still exists
              try {
                const { data: grpData } = await supabase
                  .from('study_groups')
                  .select('id')
                  .eq('id', parseInt(groupId, 10))
                  .maybeSingle();
                
                if (!grpData) {
                  addToast('Nhóm học tập này đã bị giải tán!', 'warning');
                } else {
                  addToast('Bạn đã bị xóa khỏi nhóm học tập này!', 'warning');
                }
              } catch {
                addToast('Bạn không còn ở trong nhóm học tập này!', 'warning');
              }
              navigate('/groups');
              return;
            }
          }

          // Fetch the updated group details to sync all roles and members list
          try {
            const updatedGroup = await getGroupById(groupId);
            if (updatedGroup) {
              const isStillMember = updatedGroup.members.some(m => String(m) === String(user?.id));
              if (!isStillMember) {
                if (sessionStorage.getItem('leaving_group') === 'true') {
                  return;
                }
                addToast('Bạn đã bị mời ra khỏi nhóm học tập này!', 'warning');
                navigate('/groups');
                return;
              }
              setGroup(updatedGroup);
              fetchGroupMembersDetails(updatedGroup.members);
            } else {
              // Group was deleted
              if (sessionStorage.getItem('leaving_group') === 'true') {
                return;
              }
              addToast('Nhóm học tập này đã bị giải tán!', 'warning');
              navigate('/groups');
            }
          } catch (err) {
            if (import.meta.env.DEV) console.warn('Lỗi đồng bộ thông tin nhóm Realtime:', err);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(memberChannel);
    };
  }, [groupId, user?.id, navigate, addToast, fetchGroupMembersDetails]);

  // Deadlines and Schedules Realtime subscription
  useEffect(() => {
    if (!groupId) return;

    const detailChannel = supabase
      .channel(`group-details-updates-${groupId}`)
      // Deadlines
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'deadlines',
          filter: `group_id=eq.${groupId}`
        },
        (payload) => {
          const newDl = payload.new;
          if (!newDl) return;

          const assigneeId = newDl.assignee_id?.toString();
          const cachedMember = membersDetailsCacheRef.current[assigneeId];
          const assigneeName = cachedMember?.fullName || null;

          const formatted = {
            id: newDl.id.toString(),
            groupId: newDl.group_id.toString(),
            title: newDl.title,
            dueDate: newDl.due_date,
            description: newDl.description || '',
            creatorId: newDl.creator_id,
            assigneeId: newDl.assignee_id || null,
            assigneeName,
            completed: newDl.completed || false,
            createdAt: newDl.created_at
          };

          setDeadlines(prev => {
            if (prev.some(d => d.id === formatted.id)) return prev;
            const updated = [...prev, formatted];
            return getProcessedDeadlines(updated).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'deadlines',
          filter: `group_id=eq.${groupId}`
        },
        (payload) => {
          const updatedDl = payload.new;
          if (!updatedDl) return;

          const assigneeId = updatedDl.assignee_id?.toString();
          const cachedMember = membersDetailsCacheRef.current[assigneeId];
          const assigneeName = cachedMember?.fullName || null;

          const formatted = {
            id: updatedDl.id.toString(),
            groupId: updatedDl.group_id.toString(),
            title: updatedDl.title,
            dueDate: updatedDl.due_date,
            description: updatedDl.description || '',
            creatorId: updatedDl.creator_id,
            assigneeId: updatedDl.assignee_id || null,
            assigneeName,
            completed: updatedDl.completed || false,
            createdAt: updatedDl.created_at
          };

          setDeadlines(prev => {
            const updated = prev.map(d => d.id === formatted.id ? formatted : d);
            return getProcessedDeadlines(updated).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'deadlines'
        },
        (payload) => {
          if (!payload.old?.id) return;
          setDeadlines(prev => prev.filter(d => d.id !== payload.old.id.toString()));
        }
      )
      // Schedules
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'schedules',
          filter: `group_id=eq.${groupId}`
        },
        (payload) => {
          const newSched = payload.new;
          if (!newSched) return;

          const formatted = {
            id: newSched.id.toString(),
            groupId: newSched.group_id.toString(),
            topic: newSched.topic,
            dateTime: newSched.date_time,
            location: newSched.location || 'Online',
            description: newSched.description || '',
            creatorId: newSched.creator_id,
            createdAt: newSched.created_at
          };

          setSchedules(prev => {
            if (prev.some(s => s.id === formatted.id)) return prev;
            const updated = [...prev, formatted];
            return updated.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'schedules',
          filter: `group_id=eq.${groupId}`
        },
        (payload) => {
          const updatedSched = payload.new;
          if (!updatedSched) return;

          const formatted = {
            id: updatedSched.id.toString(),
            groupId: updatedSched.group_id.toString(),
            topic: updatedSched.topic,
            dateTime: updatedSched.date_time,
            location: updatedSched.location || 'Online',
            description: updatedSched.description || '',
            creatorId: updatedSched.creator_id,
            createdAt: updatedSched.created_at
          };

          setSchedules(prev => {
            const updated = prev.map(s => s.id === formatted.id ? formatted : s);
            return updated.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'schedules'
        },
        (payload) => {
          if (!payload.old?.id) return;
          setSchedules(prev => prev.filter(s => s.id !== payload.old.id.toString()));
        }
      )
      // Files Realtime subscription
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'files',
          filter: `group_id=eq.${groupId}`
        },
        () => {
          fetchGroupFiles();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(detailChannel);
    };
  }, [groupId, fetchGroupFiles]);


  // Sync last seen chat time when chat is active
  useEffect(() => {
    if (activeTab === 'chat' && groupId) {
      const nowStr = new Date().toISOString();
      setChatLastSeenTime(nowStr);
    }
  }, [activeTab, groupId, chatMessages]);

  // Handle invite search params
  useEffect(() => {
    if (!group) return;
    const params = new URLSearchParams(location.search);
    if (params.get('tab') === 'schedule') {
      setTimeout(() => setActiveTab('schedule'), 0);
    }
    if (params.get('tab') === 'deadlines') {
      setTimeout(() => setActiveTab('deadlines'), 0);
    }
  }, [group, location.search]);

  // Populate submissions on mount
  useEffect(() => {
    if (!groupId) return;
    setSubmissions(loadSubmissions());
  }, [groupId, loadSubmissions]);

  // Sync urgent deadline alarms
  useEffect(() => {
    let count = 0;
    if (group && deadlines.length > 0) {
      const isLeader = String(user?.id) === String(group.creatorId) || (group.deputyIds ? group.deputyIds.some(id => String(id) === String(user?.id)) : String(user?.id) === String(group.deputyId));
      count = deadlines.filter(d => {
        if (!d.dueSoon) return false;
        if (isLeader) return true;
        if (!d.assigneeId || d.assigneeId === 'all') return true;
        return String(d.assigneeId) === String(user?.id);
      }).length;
    }
    setUrgentDeadlinesCount(count);
  }, [deadlines, group, user?.id]);

  const handleAssignDeputy = async (targetUserId) => {
    const currentDeputyIds = group.deputyIds || [];
    if (currentDeputyIds.length >= 2) {
      const deputy1Info = membersDetails.find(u => Number(u.id) === Number(currentDeputyIds[0]));
      const deputy2Info = membersDetails.find(u => Number(u.id) === Number(currentDeputyIds[1]));
      const targetUser = membersDetails.find(u => Number(u.id) === Number(targetUserId));
      const targetName = targetUser?.fullName || 'Thành viên mới';

      let selectedDeputyId = currentDeputyIds[0];

      const ReplacementSelector = () => {
        const [selected, setSelected] = useState(currentDeputyIds[0]);
        
        const handleChange = (id) => {
          setSelected(id);
          selectedDeputyId = id;
        };

        // eslint-disable-next-line no-undef
        return React.createElement(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '14px' } },
          // eslint-disable-next-line no-undef
          React.createElement(
            'p',
            { style: { margin: '0 0 8px 0', fontSize: '14px', color: 'var(--text-secondary)' } },
            'Nhóm đã có đủ tối đa 2 phó nhóm. Chọn một phó nhóm để tước quyền và thay thế bằng ',
            // eslint-disable-next-line no-undef
            React.createElement('strong', null, targetName),
            ':'
          ),
          // eslint-disable-next-line no-undef
          deputy1Info && React.createElement(
            'label',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: selected === currentDeputyIds[0] ? 'rgba(0,0,0,0.06)' : 'var(--bg-input)',
                border: selected === currentDeputyIds[0] ? '1.5px solid var(--primary-light)' : '1px solid var(--border)',
                cursor: 'pointer',
              },
            },
            // eslint-disable-next-line no-undef
            React.createElement('input', {
              type: 'radio',
              name: 'deputy-to-replace',
              checked: selected === currentDeputyIds[0],
              onChange: () => handleChange(currentDeputyIds[0]),
              style: { accentColor: 'var(--primary)' },
            }),
            // eslint-disable-next-line no-undef
            React.createElement(
              'span',
              { style: { fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' } },
              deputy1Info.fullName
            )
          ),
          // eslint-disable-next-line no-undef
          deputy2Info && React.createElement(
            'label',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: selected === currentDeputyIds[1] ? 'rgba(0,0,0,0.06)' : 'var(--bg-input)',
                border: selected === currentDeputyIds[1] ? '1.5px solid var(--primary-light)' : '1px solid var(--border)',
                cursor: 'pointer',
              },
            },
            // eslint-disable-next-line no-undef
            React.createElement('input', {
              type: 'radio',
              name: 'deputy-to-replace',
              checked: selected === currentDeputyIds[1],
              onChange: () => handleChange(currentDeputyIds[1]),
              style: { accentColor: 'var(--primary)' },
            }),
            // eslint-disable-next-line no-undef
            React.createElement(
              'span',
              { style: { fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' } },
              deputy2Info.fullName
            )
          )
        );
      };

      setConfirmConfig({
        title: 'Thay thế Phó nhóm',
        // eslint-disable-next-line no-undef
        message: React.createElement(ReplacementSelector),
        confirmText: 'Xác nhận thay thế',
        cancelText: 'Huỷ',
        variant: 'warning',
        onConfirm: async () => {
          const replaceId = selectedDeputyId;
          setConfirmConfig(null);
          try {
            setIsAssigningDeputy(true);
            await removeDeputy(groupId, user.id, replaceId);
            const updatedGroup = await assignDeputy(groupId, user.id, targetUserId);
            setGroup(updatedGroup);
            await fetchGroupMembersDetails(updatedGroup.members);
            addToast('Đã thay đổi phó nhóm thành công!', 'success');
          } catch (err) {
            addToast(err.message || 'Lỗi thay đổi phó nhóm', 'error');
          } finally {
            setIsAssigningDeputy(false);
          }
        },
        onCancel: () => setConfirmConfig(null),
      });
      return;
    }

    try {
      setIsAssigningDeputy(true);
      const updatedGroup = await assignDeputy(groupId, user.id, targetUserId);
      setGroup(updatedGroup);
      await fetchGroupMembersDetails(updatedGroup.members);
      addToast('Đã phân quyền phó nhóm thành công!', 'success');
    } catch (err) {
      addToast(err.message || 'Lỗi phân quyền phó nhóm', 'error');
    } finally {
      setIsAssigningDeputy(false);
    }
  };

  const handleRemoveDeputy = (targetUserId) => {
    setConfirmConfig({
      title: 'Thu hồi quyền Phó nhóm',
      message: 'Bạn có chắc chắn muốn thu hồi quyền phó nhóm không?',
      confirmText: 'Thu hồi',
      cancelText: 'Giữ lại',
      variant: 'warning',
      onConfirm: async () => {
        setConfirmConfig(null);
        try {
          setIsAssigningDeputy(true);
          const updatedGroup = await removeDeputy(groupId, user.id, targetUserId);
          setGroup(updatedGroup);
          await fetchGroupMembersDetails(updatedGroup.members);
          addToast('Đã thu hồi quyền phó nhóm!', 'success');
        } catch (err) {
          addToast(err.message || 'Lỗi thu hồi quyền phó nhóm', 'error');
        } finally { setIsAssigningDeputy(false); }
      },
      onCancel: () => setConfirmConfig(null),
    });
  };

  const handleSendFriendRequest = async (targetId) => {
    const tid = String(targetId);
    try {
      setFriendRequestingIds(prev => ({ ...prev, [tid]: true }));
      await sendFriendRequest(String(user.id), tid);
      addToast('Đã gửi lời mời kết bạn!', 'success');
      await fetchGroupFriendships();
    } catch (err) {
      addToast(err.message || 'Lỗi gửi lời mời kết bạn', 'error');
    } finally {
      setFriendRequestingIds(prev => ({ ...prev, [tid]: false }));
    }
  };

  const handleKickMember = (targetUserId) => {
    const tid = String(targetUserId);
    setConfirmConfig({
      title: 'Mời thành viên rời nhóm',
      message: 'Bạn có chắc chắn muốn mời thành viên này rời khỏi nhóm học tập không?',
      confirmText: 'Mời rời nhóm',
      cancelText: 'Giữ lại',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmConfig(null);
        try {
          setKickingIds(prev => ({ ...prev, [tid]: true }));
          const updated = await kickMember(groupId, user.id, tid);
          setGroup(updated);
          await fetchGroupMembersDetails(updated.members);
          addToast('Đã mời thành viên ra khỏi nhóm thành công!', 'success');
        } catch (err) {
          addToast(err.message || 'Lỗi khi mời thành viên rời nhóm', 'error');
        } finally { setKickingIds(prev => ({ ...prev, [tid]: false })); }
      },
      onCancel: () => setConfirmConfig(null),
    });
  };

  const openEditSchedule = (sched) => {
    setEditingSchedule(sched);
    setEditScheduleTopic(sched.topic);
    const dateObj = new Date(sched.dateTime);
    setEditScheduleDateTime(sched.dateTime ? new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');
    setEditScheduleLocation(sched.location || '');
    setEditScheduleDesc(sched.description || '');
  };

  const handleUpdateSchedule = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!editScheduleTopic.trim() || !editScheduleDateTime) {
      addToast('Vui lòng nhập chủ đề và thời gian.', 'error');
      return;
    }
    // Validate: schedule must be within 7 days from now
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 7);

    const [dateP, timeP] = editScheduleDateTime.split('T');
    const [y, m, d] = dateP.split('-');
    const [h, min] = timeP.split(':');
    const scheduleDateObj = new Date(y, m - 1, d, h, min);

    if (scheduleDateObj > maxDate) {
      addToast('Thời gian học không được vượt quá 7 ngày kể từ hôm nay!', 'error');
      return;
    }
    try {
      setIsSubmittingSchedule(true);
      await updateSchedule(editingSchedule.id, {
        topic: editScheduleTopic.trim(),
        dateTime: scheduleDateObj.toISOString(),
        location: editScheduleLocation.trim(),
        description: editScheduleDesc.trim(),
      });
      addToast('Cập nhật lịch học thành công!', 'success');
      setEditingSchedule(null);
      fetchGroupSchedules();
    } catch (err) {
      addToast(err.message || 'Lỗi cập nhật lịch học', 'error');
    } finally {
      setIsSubmittingSchedule(false);
    }
  };

  const openEditDeadline = (dl) => {
    setEditingDeadline(dl);
    setEditDeadlineTitle(dl.title);
    const dateObj = new Date(dl.dueDate);
    setEditDeadlineDueDate(dl.dueDate ? new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');
    setEditDeadlineDesc(dl.description || '');
    setEditDeadlineAssignee(dl.assigneeId || 'all');
    setEditDeadlineSubmissionType(dl.submissionType || 'all');
  };

  const handleUpdateDeadline = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!editDeadlineTitle.trim() || !editDeadlineDueDate) {
      addToast('Vui lòng nhập tiêu đề và hạn chót.', 'error');
      return;
    }
    // Validate: deadline must be within 7 days from now
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 7);

    const [dateP, timeP] = editDeadlineDueDate.split('T');
    const [y, m, d] = dateP.split('-');
    const [h, min] = timeP.split(':');
    const deadlineDateObj = new Date(y, m - 1, d, h, min);

    if (deadlineDateObj > maxDate) {
      addToast('Hạn chót không được vượt quá 7 ngày kể từ hôm nay!', 'error');
      return;
    }
    try {
      setIsSubmittingDeadline(true);
      const assigneeMember = editDeadlineAssignee !== 'all' ? (() => {
        const u = membersDetails.find(u => String(u.id) === String(editDeadlineAssignee));
        return u ? u.fullName : null;
      })() : null;
      await updateDeadline(editingDeadline.id, {
        title: editDeadlineTitle.trim(),
        dueDate: deadlineDateObj.toISOString(),
        description: editDeadlineDesc.trim(),
        assigneeId: editDeadlineAssignee !== 'all' ? editDeadlineAssignee : null,
        assigneeName: assigneeMember,
        submissionType: editDeadlineSubmissionType || 'all',
      });
      addToast('Cập nhật deadline thành công!', 'success');
      setEditingDeadline(null);
      fetchGroupDeadlines();
    } catch (err) {
      addToast(err.message || 'Lỗi cập nhật deadline', 'error');
    } finally {
      setIsSubmittingDeadline(false);
    }
  };

  const hasNsfwKeyword = (fileName) => {
    const nsfwKeywords = /nsfw|18\+|adult|porn|sex|nude|khieu-dam|dam-my|loan-luan|trom-cu/i;
    return nsfwKeywords.test(fileName);
  };

  const checkImageNsfw = (file) => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        return resolve(false);
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const maxDim = 120;
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > maxDim) {
              height *= maxDim / width;
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width *= maxDim / height;
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          try {
            const imgData = ctx.getImageData(0, 0, width, height);
            const data = imgData.data;
            let skinPixels = 0;
            const totalPixels = width * height;

            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];

              // Thuật toán màu da sinh học
              const isSkin = r > 95 && g > 40 && b > 20 &&
                             (r - g) > 15 && r > b &&
                             (Math.max(r, g, b) - Math.min(r, g, b)) > 15;
              if (isSkin) {
                skinPixels++;
              }
            }

            const skinRatio = skinPixels / totalPixels;
            resolve(skinRatio > 0.45);
          // eslint-disable-next-line no-unused-vars
          } catch (e) {
            resolve(false);
          }
        };
        img.onerror = () => resolve(false);
        img.src = event.target.result;
      };
      reader.onerror = () => resolve(false);
      reader.readAsDataURL(file);
    });
  };

  const handleNsfwViolation = async (userId) => {
    try {
      const { data: userData, error: fetchErr } = await supabase
        .from('users')
        .select('warn_count')
        .eq('id', userId)
        .single();
      
      if (fetchErr) throw fetchErr;

      const newWarnCount = (userData.warn_count || 0) + 1;

      if (newWarnCount >= 3) {
        await supabase
          .from('users')
          .update({ warn_count: newWarnCount, is_banned: true })
          .eq('id', userId);
        
        addToast('Tài khoản của bạn đã bị khóa vĩnh viễn do vi phạm chính sách cộng đồng (đăng tải nội dung không lành mạnh 3 lần).', 'error');
        
        setTimeout(() => {
          localStorage.removeItem('sc_session');
          localStorage.removeItem('sc_admin_session');
          window.location.href = '/login';
        }, 3000);
      } else {
        await supabase
          .from('users')
          .update({ warn_count: newWarnCount })
          .eq('id', userId);
        
        addToast(`Cảnh báo: Tài liệu bạn tải lên chứa hình ảnh hoặc nội dung không phù hợp với thuần phong mỹ tục (${newWarnCount}/3 lần vi phạm). Tài khoản của bạn sẽ bị khóa vĩnh viễn nếu tiếp tục vi phạm chính sách cộng đồng!`, 'error');
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('Lỗi cập nhật vi phạm NSFW:', err);
    }
  };

  const handleFileUpload = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedFile) {
      return addToast('Vui lòng chọn một tài liệu để upload!', 'error');
    }

    const MAX_DOC_SIZE = 25 * 1024 * 1024; // 25MB
    if (selectedFile.size > MAX_DOC_SIZE) {
      return addToast('Tài liệu quá lớn! Vui lòng chọn tài liệu nhỏ hơn hoặc bằng 25MB.', 'error');
    }

    try {
      setIsUploadingFile(true);

      // Kiểm duyệt NSFW
      const isNsfwKey = hasNsfwKeyword(customFileName || selectedFile.name);
      const isNsfwImage = await checkImageNsfw(selectedFile);
      
      if (isNsfwKey || isNsfwImage) {
        addToast('Tài liệu chứa hình ảnh không lành mạnh hoặc nội dung không phù hợp với thuần phong mỹ tục. Thao tác tải lên đã bị từ chối.', 'error');
        await handleNsfwViolation(user.id);
        setIsUploadingFile(false);
        return;
      }
      let fileToUpload = selectedFile;
      // Compress ảnh trước khi upload (PDF/docx giữ nguyên)
      if (selectedFile.type.startsWith('image/')) {
        try {
          fileToUpload = await compressImage(selectedFile, { maxWidth: 1280, maxHeight: 1280, quality: 0.78 });
        } catch {
          fileToUpload = selectedFile; // fallback
        }
      }
      const safeName = sanitizeForStorage(fileToUpload.name || selectedFile.name);
      const fileName = `${groupId}/${Date.now()}_${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(fileName, fileToUpload, { cacheControl: '2592000', upsert: true });

      if (uploadError) {
        if (import.meta.env.DEV) {
          console.error('[Upload] Supabase Storage error:', uploadError.message);
        }
        throw new Error('Không thể tải tài liệu lên máy chủ. Vui lòng thử lại sau.');
      }

      const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(fileName);
      let fileUrlValue = publicUrl;

      const finalSubject = group?.subject || 'Chung';
      const cleanFileName = customFileName.trim() || selectedFile.name;
      const prefixedName = `[${finalSubject}] ${cleanFileName}`;

      await uploadFile(groupId, {
        fileName: prefixedName,
        fileSize: fileToUpload.size,
        fileType: selectedFile.type,
        fileData: fileUrlValue,
        userId: user.id,
        userFullName: user.fullName
      });
      addToast('Tải tài liệu lên thành công! Tài liệu của bạn đã được chuyển đến hệ thống kiểm duyệt và đang chờ Admin phê duyệt để hiển thị trong nhóm học.', 'success');
      setSelectedFile(null);
      setCustomFileName('');
      const fileInput = document.getElementById('file-upload-input');
      if (fileInput) fileInput.value = '';
      fetchGroupFiles();
    } catch (err) {
      addToast(err.message || 'Lỗi upload tài liệu', 'error');
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleFileDelete = (fileId) => {
    setConfirmConfig({
      title: 'Xóa tài liệu',
      message: 'Bạn có chắc chắn muốn xóa tài liệu này không?',
      confirmText: 'Xóa',
      cancelText: 'Giữ lại',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmConfig(null);
        try { await deleteFile(fileId); addToast('Đã xóa tài liệu!', 'success'); fetchGroupFiles(); }
        catch (err) { addToast(err.message || 'Lỗi xóa tài liệu', 'error'); }
      },
      onCancel: () => setConfirmConfig(null),
    });
  };

  const handleScheduleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newScheduleTopic.trim()) return addToast('Chủ đề học nhóm không được để trống!', 'error');
    if (!newScheduleDateTime) return addToast('Vui lòng chọn thời gian học!', 'error');
    // Validate: schedule must be within 7 days from now
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 7);
    // Robust parsing for datetime-local string (YYYY-MM-DDTHH:mm) to local Date
    const [dateP, timeP] = newScheduleDateTime.split('T');
    const [y, m, d] = dateP.split('-');
    const [h, min] = timeP.split(':');
    const scheduleDateObj = new Date(y, m - 1, d, h, min);

    if (scheduleDateObj > maxDate) {
      return addToast('Thời gian học không được vượt quá 7 ngày kể từ hôm nay!', 'error');
    }
    const isOfflineWithLocation = group?.meetingMode === 'offline' && group?.location && !overrideLocation;
    const locationValue = isOfflineWithLocation
      ? (group.location.name + (group.location.address ? ` — ${group.location.address}` : ''))
      : newScheduleLocation.trim();
    if (!locationValue) return addToast('Vui lòng nhập địa điểm hoặc link phòng học!', 'error');
    try {
      setIsSubmittingSchedule(true);
      await createSchedule(groupId, {
        topic: newScheduleTopic.trim(),
        dateTime: scheduleDateObj.toISOString(),
        location: locationValue,
        locationLat: null,
        locationLng: null,
        description: newScheduleDesc.trim(),
        creatorId: user.id,
        creatorName: user.fullName
      });
      addToast('Tạo lịch học nhóm thành công!', 'success');
      setNewScheduleTopic('');
      setNewScheduleDateTime('');
      setNewScheduleLocation('');
      setNewScheduleDesc('');
      setOverrideLocation(false);
      fetchGroupSchedules();
    } catch (err) {
      addToast(err.message || 'Lỗi khi tạo lịch học', 'error');
    } finally {
      setIsSubmittingSchedule(false);
    }
  };

  const handleScheduleDelete = (scheduleId) => {
    setConfirmConfig({
      title: 'Xóa lịch học',
      message: 'Bạn có chắc chắn muốn xóa buổi học này không?',
      confirmText: 'Xóa',
      cancelText: 'Giữ lại',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmConfig(null);
        try { await deleteSchedule(scheduleId); addToast('Đã xóa lịch học nhóm!', 'success'); fetchGroupSchedules(); }
        catch (err) { addToast(err.message || 'Lỗi khi xóa lịch học', 'error'); }
      },
      onCancel: () => setConfirmConfig(null),
    });
  };

  const handleDeadlineSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newDeadlineTitle.trim()) return addToast('Tiêu đề công việc không được để trống!', 'error');
    if (!newDeadlineDueDate) return addToast('Vui lòng chọn hạn chót (due date)!', 'error');
    // Validate: deadline must be within 7 days from now
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 7);

    const [dateP, timeP] = newDeadlineDueDate.split('T');
    const [y, m, d] = dateP.split('-');
    const [h, min] = timeP.split(':');
    const deadlineDateObj = new Date(y, m - 1, d, h, min);

    if (deadlineDateObj > maxDate) {
      return addToast('Hạn chót không được vượt quá 7 ngày kể từ hôm nay!', 'error');
    }
    try {
      setIsSubmittingDeadline(true);
      const assigneeMemberNew = newDeadlineAssignee !== 'all' ? (() => {
        const u = membersDetails.find(u => String(u.id) === String(newDeadlineAssignee));
        return u ? u.fullName : null;
      })() : null;
      await createDeadline(groupId, {
        title: newDeadlineTitle.trim(),
        dueDate: deadlineDateObj.toISOString(),
        description: newDeadlineDesc.trim(),
        creatorId: user.id,
        assigneeId: newDeadlineAssignee !== 'all' ? newDeadlineAssignee : null,
        assigneeName: assigneeMemberNew,
        submissionType: newDeadlineSubmissionType || 'image',
      });
      addToast('Thêm deadline mới thành công!', 'success');
      setNewDeadlineTitle('');
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setNewDeadlineDueDate(now.toISOString().slice(0, 16));
      setNewDeadlineDesc('');
      setNewDeadlineAssignee('all');
      setNewDeadlineSubmissionType('image');
      fetchGroupDeadlines();
    } catch (err) {
      addToast(err.message || 'Lỗi khi thêm deadline', 'error');
    } finally {
      setIsSubmittingDeadline(false);
    }
  };

  const handleDeadlineDelete = (deadlineId) => {
    setConfirmConfig({
      title: 'Xóa Deadline',
      message: 'Bạn có chắc chắn muốn xóa deadline này không?',
      confirmText: 'Xóa',
      cancelText: 'Giữ lại',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmConfig(null);
        try { await deleteDeadline(deadlineId); addToast('Đã xóa deadline!', 'success'); fetchGroupDeadlines(); }
        catch (err) { addToast(err.message || 'Lỗi khi xóa deadline', 'error'); }
      },
      onCancel: () => setConfirmConfig(null),
    });
  };

  const handleRemindDeadline = async (deadline) => {
    if (remindingIds[deadline.id]) return;
    setRemindingIds(prev => ({ ...prev, [deadline.id]: true }));
    try {
      const dueStr = new Date(deadline.dueDate).toLocaleString('vi-VN');
      const senderName = user.fullName || user.email || 'Trưởng/Phó nhóm';
      const reminderText = `🔔 NHẮC NHỞ DEADLINE\n📌 Công việc: "${deadline.title}"\n⏰ Hạn chót: ${dueStr}\n${deadline.description ? `📝 Ghi chú: ${deadline.description}\n` : ''}👉 Các thành viên vui lòng hoàn thành đúng hạn! — ${senderName}`;
      await sendChatMessage(groupId, {
        content: reminderText,
        fileAttachment: null,
        userId: user.id,
        userFullName: user.fullName,
        userAvatar: user.avatar
      });

      // Save reminder to LocalStorage removed to comply with quota limits

      addToast('Đã gửi nhắc nhở đến chat nhóm!', 'success');
    } catch (err) {
      addToast(err.message || 'Lỗi khi gửi nhắc nhở', 'error');
    } finally {
      setRemindingIds(prev => ({ ...prev, [deadline.id]: false }));
    }
  };

  const handleSubmitAssignment = async () => {
    if (!showSubmitModal) return;
    setIsSubmitting(true);
    try {
      let fileData = null, fileName = null;
      let uploadedImages = [];

      const validImages = (submitImages || []).filter(Boolean).slice(0, 6);
      if (validImages.length > 0) {
        const MAX_SUBMIT_SIZE = 25 * 1024 * 1024;
        for (let i = 0; i < validImages.length; i++) {
          const imgFile = validImages[i];
          if (imgFile.size > MAX_SUBMIT_SIZE) {
            addToast(`Ảnh ${i + 1} quá lớn! Vui lòng chọn file <= 25MB.`, 'error');
            setIsSubmitting(false);
            return;
          }
          let fileToUpload = imgFile;
          try {
            fileToUpload = await compressImage(imgFile, { maxWidth: 1280, maxHeight: 1280, quality: 0.78 });
          } catch {
            fileToUpload = imgFile;
          }
          const rawName = fileToUpload.name || imgFile.name || `image_${i + 1}.jpg`;
          const safeName = sanitizeForStorage(rawName);
          const storageFileName = `submissions/${groupId}/${user.id}_${Date.now()}_img${i + 1}_${safeName}`;
          const { error: uploadError } = await supabase.storage
            .from('attachments')
            .upload(storageFileName, fileToUpload, { cacheControl: '2592000', upsert: true });

          if (uploadError) {
            if (import.meta.env.DEV) {
              console.error('[Submit] Storage image error:', uploadError.message);
            }
            throw new Error(`Không thể tải ảnh thứ ${i + 1} lên máy chủ.`);
          }

          const { data: { publicUrl } } = supabase.storage
            .from('attachments')
            .getPublicUrl(storageFileName);

          uploadedImages.push({
            fileName: rawName,
            fileData: publicUrl,
          });
        }

        if (uploadedImages.length > 0) {
          fileName = `${uploadedImages.length} ảnh bài làm`;
          fileData = uploadedImages[0].fileData;
        }
      } else if (submitFile) {
        const MAX_SUBMIT_SIZE = 25 * 1024 * 1024; // 25MB
        if (submitFile.size > MAX_SUBMIT_SIZE) {
          addToast('File bài nộp quá lớn! Vui lòng chọn file nhỏ hơn hoặc bằng 25MB.', 'error');
          setIsSubmitting(false);
          return;
        }
        let fileToUpload = submitFile;
        if (submitFile.type?.startsWith('image/')) {
          try {
            fileToUpload = await compressImage(submitFile, { maxWidth: 1280, maxHeight: 1280, quality: 0.78 });
          } catch {
            fileToUpload = submitFile;
          }
        }
        fileName = fileToUpload.name || submitFile.name;
        const safeName = sanitizeForStorage(fileName);
        const storageFileName = `submissions/${groupId}/${user.id}_${Date.now()}_${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(storageFileName, fileToUpload, { cacheControl: '2592000', upsert: true });

        if (uploadError) {
          if (import.meta.env.DEV) {
            console.error('[Submit] Supabase Storage error:', uploadError.message);
          }
          throw new Error('Không thể tải file bài nộp lên máy chủ. Vui lòng thử lại sau.');
        }

        const { data: { publicUrl } } = supabase.storage
          .from('attachments')
          .getPublicUrl(storageFileName);
        fileData = publicUrl;
      }

      const all = loadSubmissions();
      const list = all[showSubmitModal] || [];
      const existingIdx = list.findIndex(s => String(s.userId) === String(user.id));
      const entry = {
        userId: user.id,
        userName: user.fullName,
        userInitial: (user.fullName || 'U')[0].toUpperCase(),
        note: submitNote.trim(),
        fileName,
        fileData,
        images: uploadedImages.length > 0 ? uploadedImages : null,
        submittedAt: new Date().toISOString(),
      };
      if (existingIdx >= 0) list[existingIdx] = entry;
      else list.push(entry);
      all[showSubmitModal] = list;
      saveSubmissions(all);
      setSubmissions({ ...all });
      const targetDl = deadlines.find(d => String(d.id) === String(showSubmitModal));
      if (targetDl && !targetDl.completed) {
        try {
          await toggleDeadline(showSubmitModal);
        } catch {
          // Safe check
        }
      }
      fetchGroupDeadlines();
      addToast('Nộp bài thành công! ✅', 'success');
      setShowSubmitModal(null);
      setSubmitNote('');
      setSubmitFile(null);
      setSubmitImages([]);
    } catch (err) {
      addToast(err.message || 'Lỗi khi nộp bài', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubmission = async (deadlineId) => {
    if (!deadlineId || !user?.id) return;
    const targetDl = deadlines.find(d => String(d.id) === String(deadlineId));
    if (targetDl) {
      const isOverdue = targetDl.overdue || new Date(targetDl.dueDate) < new Date();
      if (isOverdue) {
        addToast('Deadline đã quá hạn, không thể xóa bài nộp!', 'error');
        return;
      }
    }
    try {
      const all = loadSubmissions();
      const list = all[deadlineId] || [];
      const updatedList = list.filter(s => String(s.userId) !== String(user.id));
      all[deadlineId] = updatedList;
      saveSubmissions(all);
      setSubmissions({ ...all });

      if (targetDl && targetDl.completed) {
        try {
          await toggleDeadline(deadlineId);
        } catch {
          // Safe check
        }
        await fetchGroupDeadlines();
      }

      addToast('Đã xóa bài nộp! Bạn có thể chọn file để nộp lại.', 'success');
      if (showSubmitModal === deadlineId) {
        setSubmitNote('');
        setSubmitFile(null);
        setSubmitImages([]);
      }
    } catch {
      addToast('Lỗi khi xóa bài nộp', 'error');
    }
  };

  const handleMsgReact = (msgId, emoji) => {
    setMsgReactions(prev => {
      const updated = { ...prev };
      const list = [...(updated[msgId] || [])];
      const myIdx = list.findIndex(r => r.userId === user.id && r.emoji === emoji);
      if (myIdx >= 0) list.splice(myIdx, 1);
      else list.push({ userId: user.id, emoji });
      updated[msgId] = list;
      return updated;
    });
  };

  const handleMsgDelete = async (msgId) => {
    try {
      await deleteChatMessage(msgId, user.id);
      setChatMessages(prev => prev.filter(m => m.id !== msgId));
      addToast('Đã xóa tin nhắn', 'success');
    } catch (err) {
      addToast(err.message || 'Lỗi khi xóa tin nhắn', 'error');
    }
  };

  const handleMsgPin = async (msgId) => {
    try {
      const newPinned = await togglePinChatMessage(msgId);
      // Cập nhật state trực tiếp, không re-fetch
      setChatMessages(prev => prev.map(m =>
        m.id === msgId ? { ...m, isPinned: newPinned } : m
      ));
      addToast('Đã thay đổi trạng thái ghim tin nhắn!', 'success');
    } catch (err) {
      addToast(err.message || 'Lỗi khi ghim tin nhắn', 'error');
    }
  };

  const handleSendChatMessage = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!chatInput.trim() && !chatAttachedFile) return;

    const messageContent = chatInput.trim();
    const currentAttachedFile = chatAttachedFile;
    const currentReplyTo = replyTo;
    const optimisticId = `optimistic-${Date.now()}`;

    // Khóa input và hiển thị spinner chỉ khi upload file
    if (currentAttachedFile) {
      setIsSendingChatMessage(true);
    }

    // Xóa input ngay lập tức để người dùng có thể gõ tin nhắn tiếp theo không bị khựng
    if (!currentAttachedFile) {
      setChatInput('');
      setReplyTo(null);
    }

    // Tạo tin nhắn hiển thị tạm thời (Optimistic UI)
    const optimisticMsg = {
      id: optimisticId,
      localId: optimisticId,
      groupId: groupId.toString(),
      userId: user.id,
      userFullName: user.fullName || 'Bạn',
      userAvatar: user.avatar || '',
      content: messageContent,
      meetroom_id: null,
      fileAttachment: currentAttachedFile ? {
        fileName: currentAttachedFile.name,
        fileType: currentAttachedFile.type,
        fileData: '',
        fileSize: formatBytes(currentAttachedFile.size),
        name: currentAttachedFile.name,
        type: currentAttachedFile.type,
        data: '',
      } : null,
      replyTo: currentReplyTo ? {
        id: currentReplyTo.id,
        userFullName: currentReplyTo.userFullName,
        content: currentReplyTo.content,
      } : null,
      isPinned: false,
      createdAt: new Date().toISOString(),
      isOptimistic: true
    };

    setChatMessages(prev => {
      const updated = [...prev, optimisticMsg];
      return updated.length > 50 ? updated.slice(updated.length - 50) : updated;
    });

    try {
      let fileAttachment = null;
      if (currentAttachedFile) {
        const MAX_CHAT_FILE_SIZE = 25 * 1024 * 1024; // 25MB
        if (currentAttachedFile.size > MAX_CHAT_FILE_SIZE) {
          addToast('File đính kèm chat quá lớn! Vui lòng chọn file nhỏ hơn hoặc bằng 25MB.', 'error');
          setChatMessages(prev => prev.filter(m => m.id !== optimisticId));
          setIsSendingChatMessage(false);
          return;
        }

        let fileToUpload = currentAttachedFile;
        if (currentAttachedFile.type.startsWith('image/')) {
          try {
            fileToUpload = await compressImage(currentAttachedFile, { maxWidth: 1280, maxHeight: 1280, quality: 0.78 });
          } catch {
            fileToUpload = currentAttachedFile;
          }
        }
        const safeName = sanitizeForStorage(fileToUpload.name || currentAttachedFile.name);
        const chatFileName = `chat/${groupId}/${Date.now()}_${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(chatFileName, fileToUpload, { cacheControl: '2592000', upsert: true });

        if (uploadError) {
          if (import.meta.env.DEV) {
            console.error('[Chat] Supabase Storage error:', uploadError.message);
          }
          throw new Error('Không thể tải file đính kèm lên máy chủ. Vui lòng thử lại sau.');
        }

        const { data: { publicUrl: chatFileUrl } } = supabase.storage
          .from('attachments')
          .getPublicUrl(chatFileName);

        fileAttachment = {
          fileName: currentAttachedFile.name,
          fileType: currentAttachedFile.type,
          fileData: chatFileUrl,
          fileSize: formatBytes(fileToUpload.size),
          name: currentAttachedFile.name,
          type: currentAttachedFile.type,
          data: chatFileUrl,
        };

        // Cập nhật đường dẫn file cho tin nhắn tạm thời
        setChatMessages(prev => prev.map(m => m.id === optimisticId ? { ...m, fileAttachment } : m));
      }

      const sentMsg = await sendChatMessage(groupId, {
        content: messageContent,
        fileAttachment,
        userId: user.id,
        userFullName: user.fullName,
        userAvatar: user.avatar,
        replyTo: currentReplyTo ? {
          id: currentReplyTo.id,
          userFullName: currentReplyTo.userFullName,
          content: currentReplyTo.content,
        } : null
      });

      // Cập nhật ID thực tế từ database sau khi gửi thành công để khớp với Realtime event sau này
      setChatMessages(prev => prev.map(m => m.id === optimisticId ? {
        ...m,
        id: sentMsg.id,
        isOptimistic: false
      } : m));

      if (currentAttachedFile) {
        setChatAttachedFile(null);
        const fileInput = document.getElementById('chat-file-input');
        if (fileInput) fileInput.value = '';
      }
    } catch (err) {
      addToast(err.message || 'Lỗi gửi tin nhắn', 'error');
      // Nếu lỗi, xóa tin nhắn tạm thời khỏi giao diện
      setChatMessages(prev => prev.filter(m => m.id !== optimisticId));
    } finally {
      setIsSendingChatMessage(false);
    }
  };

  const currentUserRole = group
    ? (String(group.creatorId) === String(user?.id)
      ? 'creator'
      : ((group.deputyIds?.some(id => String(id) === String(user?.id)) || String(group.deputyId) === String(user?.id)) ? 'admin' : 'member'))
    : 'member';

  const unreadChatCount = chatMessages.filter(msg => {
    return String(msg.userId) !== String(user?.id) && new Date(msg.createdAt) > new Date(chatLastSeenTime);
  }).length;

  return {
    group,
    currentUserRole,
    loading,
    activeTab,
    setActiveTab,
    isAssigningDeputy,
    friendRequestingIds,
    kickingIds,
    membersDetails,
    friendships,
    files,
    selectedFile,
    setSelectedFile,
    customFileName,
    setCustomFileName,
    isUploadingFile,
    schedules,
    newScheduleTopic,
    setNewScheduleTopic,
    newScheduleDateTime,
    setNewScheduleDateTime,
    newScheduleLocation,
    setNewScheduleLocation,
    newScheduleDesc,
    setNewScheduleDesc,
    isSubmittingSchedule,
    editingSchedule,
    setEditingSchedule,
    editScheduleTopic,
    setEditScheduleTopic,
    editScheduleDateTime,
    setEditScheduleDateTime,
    editScheduleLocation,
    setEditScheduleLocation,
    editScheduleDesc,
    setEditScheduleDesc,
    overrideLocation,
    setOverrideLocation,
    deadlines,
    newDeadlineTitle,
    setNewDeadlineTitle,
    newDeadlineDueDate,
    setNewDeadlineDueDate,
    newDeadlineDesc,
    setNewDeadlineDesc,
    newDeadlineAssignee,
    setNewDeadlineAssignee,
    newDeadlineSubmissionType,
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
    editDeadlineSubmissionType,
    setEditDeadlineSubmissionType,
    urgentDeadlinesCount,
    submissions,
    showSubmitModal,
    setShowSubmitModal,
    submitNote,
    setSubmitNote,
    submitFile,
    setSubmitFile,
    submitImages,
    setSubmitImages,
    isSubmitting,
    showSubmissionsFor,
    setShowSubmissionsFor,
    remindingIds,
    chatMessages,
    chatInput,
    setChatInput,
    chatAttachedFile,
    setChatAttachedFile,
    isSendingChatMessage,
    contextMenu,
    setContextMenu,
    replyTo,
    setReplyTo,
    msgReactions,
    handleAssignDeputy,
    handleRemoveDeputy,
    handleSendFriendRequest,
    handleKickMember,
    openEditSchedule,
    handleUpdateSchedule,
    openEditDeadline,
    handleUpdateDeadline,
    handleFileUpload,
    handleFileDelete,
    handleScheduleSubmit,
    handleScheduleDelete,
    handleDeadlineSubmit,
    handleDeadlineDelete,
    handleRemindDeadline,
    handleSubmitAssignment,
    handleDeleteSubmission,
    handleMsgReact,
    handleMsgDelete,
    handleMsgPin,
    handleSendChatMessage,
    unreadChatCount,
    confirmConfig,
    setConfirmConfig,
    onlineUserIds,
    isMember,
    joinRequestStatus,
    joining,
    handleJoinGroup,
  };
}
