// src/services/friendService.js
import { supabase } from '@/config/supabaseClient';

// ─── GỬI LỜI MỜI KẾT BẠN ────────────────────────────────
export const sendFriendRequest = async (fromUserId, toUserId) => {
  if (!fromUserId || !toUserId) throw new Error('Tham số không hợp lệ.');
  const fid = parseInt(fromUserId, 10);
  const tid = parseInt(toUserId, 10);
  if (isNaN(fid) || isNaN(tid)) throw new Error('Tham số không hợp lệ.');

  // Check if relation already exists
  const { data: existing, error: checkError } = await supabase
    .from('friendships')
    .select('id')
    .or(`and(from_user_id.eq.${fid},to_user_id.eq.${tid}),and(from_user_id.eq.${tid},to_user_id.eq.${fid})`)
    .maybeSingle();

  if (checkError) throw new Error('Lỗi kiểm tra quan hệ bạn bè.');
  if (existing) throw new Error('Đã tồn tại mối quan hệ này rồi.');

  const { data: newRequest, error: insertError } = await supabase
    .from('friendships')
    .insert([
      {
        from_user_id: fid,
        to_user_id: tid,
        status: 'pending'
      }
    ])
    .select('id, from_user_id, to_user_id, status, created_at')
    .single();

  if (insertError) {
    throw new Error(`Gửi lời mời kết bạn thất bại: ${insertError.message}`);
  }

  return {
    id: newRequest.id.toString(),
    fromUserId: newRequest.from_user_id.toString(),
    toUserId: newRequest.to_user_id.toString(),
    status: newRequest.status,
    createdAt: newRequest.created_at
  };
};

// ─── CHẤP NHẬN LỜI MỜI ───────────────────────────────────
export const acceptFriendRequest = async (requestId) => {
  const { data: request, error: updateError } = await supabase
    .from('friendships')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString()
    })
    .eq('id', parseInt(requestId, 10))
    .select('id, from_user_id, to_user_id, status, created_at, accepted_at')
    .single();

  if (updateError) {
    throw new Error(`Chấp nhận kết bạn thất bại: ${updateError.message}`);
  }

  return {
    id: request.id.toString(),
    fromUserId: request.from_user_id.toString(),
    toUserId: request.to_user_id.toString(),
    status: request.status,
    createdAt: request.created_at,
    acceptedAt: request.accepted_at
  };
};

// ─── TỪ CHỐI / HỦY LỜI MỜI / HỦY KẾT BẠN ─────────────────
export const removeFriend = async (requestId) => {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', parseInt(requestId, 10));

  if (error) {
    throw new Error(`Xóa quan hệ bạn bè thất bại: ${error.message}`);
  }
};

// ─── LẤY DANH SÁCH BẠN BÈ CỦA USER ─────────────────────
export const getFriends = async (userId, includePending = false) => {
  if (!userId) return [];
  const uid = Number(userId);
  if (isNaN(uid)) return [];

  let query = supabase.from('friendships').select('id, from_user_id, to_user_id, status, created_at, accepted_at').limit(100);
  if (includePending) {
    query = query.in('status', ['accepted', 'pending']);
  } else {
    query = query.eq('status', 'accepted');
  }

  const { data: friendships, error: fetchError } = await query
    .or(`from_user_id.eq.${uid},to_user_id.eq.${uid}`);

  if (fetchError || !friendships || friendships.length === 0) return [];

  const friendIds = friendships.map(f => Number(f.from_user_id) === uid ? Number(f.to_user_id) : Number(f.from_user_id));

  // Fetch users details (safety: no password)
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, full_name, university, major, avatar, bio, created_at')
    .in('id', friendIds);

  if (usersError || !users) return [];

  return friendships.map(f => {
    const friendId = Number(f.from_user_id) === uid ? Number(f.to_user_id) : Number(f.from_user_id);
    const friendUser = users.find(u => Number(u.id) === friendId);
    if (!friendUser) return null;

    return {
      requestId: f.id.toString(),
      userId: friendId.toString(),
      fullName: friendUser.full_name,
      university: friendUser.university || '',
      major: friendUser.major || '',
      avatar: friendUser.avatar || '',
      initial: (friendUser.full_name || 'U')[0].toUpperCase(),
      friendSince: f.accepted_at || f.created_at,
      status: f.status,
      fromUserId: f.from_user_id.toString(),
      toUserId: f.to_user_id.toString()
    };
  }).filter(Boolean);
};

// ─── LỜI MỜI ĐÃ NHẬN (ĐANG CHỜ) ─────────────────────────
export const getPendingRequests = async (userId) => {
  if (!userId) return [];
  const uid = Number(userId);
  if (isNaN(uid)) return [];

  const { data: friendships, error: fetchError } = await supabase
    .from('friendships')
    .select('id, from_user_id, to_user_id, status, created_at')
    .eq('status', 'pending')
    .eq('to_user_id', uid)
    .limit(20);

  if (fetchError || !friendships || friendships.length === 0) return [];

  const senderIds = friendships.map(f => Number(f.from_user_id));

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, full_name, university, major, avatar, bio, created_at')
    .in('id', senderIds);

  if (usersError || !users) return [];

  return friendships.map(f => {
    const sender = users.find(u => Number(u.id) === Number(f.from_user_id));
    if (!sender) return null;

    return {
      requestId: f.id.toString(),
      userId: f.from_user_id.toString(),
      fullName: sender.full_name,
      university: sender.university || '',
      major: sender.major || '',
      avatar: sender.avatar || '',
      initial: (sender.full_name || 'U')[0].toUpperCase(),
      sentAt: f.created_at
    };
  }).filter(Boolean);
};

// ─── LỜI MỜI ĐÃ GỬI (ĐANG CHỜ) ──────────────────────────
export const getSentRequests = async (userId) => {
  if (!userId) return [];
  const uid = Number(userId);
  if (isNaN(uid)) return [];

  const { data: friendships, error: fetchError } = await supabase
    .from('friendships')
    .select('id, from_user_id, to_user_id, status, created_at')
    .eq('status', 'pending')
    .eq('from_user_id', uid)
    .limit(20);

  if (fetchError || !friendships || friendships.length === 0) return [];

  const receiverIds = friendships.map(f => Number(f.to_user_id));

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, full_name, university, major, avatar, bio, created_at')
    .in('id', receiverIds);

  if (usersError || !users) return [];

  return friendships.map(f => {
    const receiver = users.find(u => Number(u.id) === Number(f.to_user_id));
    if (!receiver) return null;

    return {
      requestId: f.id.toString(),
      userId: f.to_user_id.toString(),
      fullName: receiver.full_name,
      university: receiver.university || '',
      major: receiver.major || '',
      avatar: receiver.avatar || '',
      initial: (receiver.full_name || 'U')[0].toUpperCase(),
      sentAt: f.created_at
    };
  }).filter(Boolean);
};

// ─── GỢI Ý KẾT BẠN (người chưa kết bạn) ─────────────────
// Helper to parse location from bio string
const parseUserBioLocation = (bioString) => {
  if (bioString && bioString.startsWith('[📍 ')) {
    const endIdx = bioString.indexOf(']');
    if (endIdx > 0) {
      const locPart = bioString.substring(4, endIdx);
      const parts = locPart.split(', ');
      return { province: parts[0] || '', district: parts[1] || '' };
    }
  }
  return { province: '', district: '' };
};

export const getSuggestions = async (userId) => {
  if (!userId) return [];
  const uid = Number(userId);
  if (isNaN(uid)) return [];

  // 1. Fetch current user major and bio (location) to personalize suggestions
  const { data: currentUser } = await supabase
    .from('users')
    .select('major, bio')
    .eq('id', uid)
    .maybeSingle();

  const userMajor = currentUser?.major;
  const userBio = currentUser?.bio;

  // 2. Fetch existing friendships to filter out already connected/pending users
  const { data: friendships } = await supabase
    .from('friendships')
    .select('from_user_id, to_user_id')
    .or(`from_user_id.eq.${uid},to_user_id.eq.${uid}`)
    .limit(1000);

  const relatedIds = new Set(
    friendships ? friendships.flatMap(f => [Number(f.from_user_id), Number(f.to_user_id)]) : []
  );
  relatedIds.add(uid);

  // 3. Fetch candidate users (exclude admin role)
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, full_name, university, major, avatar, bio')
    .neq('role', 'admin')
    .limit(150);

  if (usersError || !users) return [];

  // Filter candidate list
  const candidates = users.filter(u => !relatedIds.has(Number(u.id)));

  // 4. Personalize and rank candidates based on major and location proximity
  const scoredCandidates = candidates.map(u => {
    let score = 0;
    
    // Major match: high weight
    if (userMajor && u.major && u.major.toLowerCase().trim() === userMajor.toLowerCase().trim()) {
      score += 100;
    }

    // Location match: medium weight for province, extra weight for district
    if (userBio && u.bio) {
      const myLoc = parseUserBioLocation(userBio);
      const theirLoc = parseUserBioLocation(u.bio);
      if (myLoc.province && theirLoc.province && myLoc.province.toLowerCase() === theirLoc.province.toLowerCase()) {
        score += 50;
        if (myLoc.district && theirLoc.district && myLoc.district.toLowerCase() === theirLoc.district.toLowerCase()) {
          score += 30;
        }
      }
    }

    return { user: u, score };
  });

  // Sort by score descending (most relevant first)
  scoredCandidates.sort((a, b) => b.score - a.score);

  // Limit suggestions and map to UI schema
  return scoredCandidates.slice(0, 20).map(item => ({
    userId: item.user.id.toString(),
    fullName: item.user.full_name,
    university: item.user.university || '',
    major: item.user.major || '',
    avatar: item.user.avatar || '',
    bio: item.user.bio || '', // include bio to show real proximity details on UI
    initial: (item.user.full_name || 'U')[0].toUpperCase(),
    score: item.score
  }));
};

// ─── KIỂM TRA TRẠNG THÁI QUAN HỆ ─────────────────────────
export const getFriendshipStatus = async (userId, targetId) => {
  if (!userId || !targetId) return null;
  const uid = Number(userId);
  const tid = Number(targetId);
  if (isNaN(uid) || isNaN(tid)) return null;

  const { data: rel, error } = await supabase
    .from('friendships')
    .select('id, from_user_id, to_user_id, status, created_at, accepted_at')
    .or(`and(from_user_id.eq.${uid},to_user_id.eq.${tid}),and(from_user_id.eq.${tid},to_user_id.eq.${uid})`)
    .maybeSingle();

  if (error || !rel) return null;

  return {
    id: rel.id.toString(),
    fromUserId: rel.from_user_id.toString(),
    toUserId: rel.to_user_id.toString(),
    status: rel.status,
    createdAt: rel.created_at,
    acceptedAt: rel.accepted_at
  };
};