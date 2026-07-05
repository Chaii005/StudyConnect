// src/services/authService.js
import { supabase } from '@/config/supabaseClient';
import { compressAvatar } from '@/utils/imageCompress';

const SESSION_KEY = 'sc_session';
const ADMIN_SESSION_KEY = 'sc_admin_session';

const getSession = () => {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
};

const saveSession = (user) => {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch (err) {
    if (import.meta.env.DEV) console.warn('Error saving session:', err);
  }
};

const clearSession = () => {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(ADMIN_SESSION_KEY);
};

// Hàm hash mật khẩu bảo mật Salted SHA-256 (Client-side)
export const hashPassword = async (password, email) => {
  if (!password) return '';
  const salt = String(email || '').toLowerCase().trim();
  const msgBuffer = new TextEncoder().encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// ─── ĐĂNG KÝ ─────────────────────────────────────────
export const register = async ({ fullName, email, password, university, major, bio }) => {
  const normalizedEmail = email.toLowerCase().trim();
  // Check if email already exists
  const { data: existingUser, error: checkError } = await supabase
    .from('users')
    .select('id, is_banned')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (checkError) {
    throw new Error('Có lỗi xảy ra khi kiểm tra email.');
  }
  if (existingUser) {
    if (existingUser.is_banned) {
      throw new Error('Email này đã bị khóa vĩnh viễn khỏi hệ thống do vi phạm chính sách nội dung khiêu dâm.');
    }
    throw new Error('Email này đã được sử dụng.');
  }

  // 1. Tạo tài khoản trong Supabase Auth (Supabase tự động gửi mail xác nhận)
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: normalizedEmail,
    password: password,
    options: {
      data: {
        full_name: fullName
      }
    }
  });

  if (authError) {
    throw new Error(`Đăng ký thất bại: ${authError.message}`);
  }

  const hashedPassword = await hashPassword(password, normalizedEmail);

  // 2. Thêm thông tin vào bảng public.users để lấy BIGINT ID dùng cho chat/group
  const { data: newUser, error: insertError } = await supabase
    .from('users')
    .insert([
      {
        full_name: fullName,
        email: normalizedEmail,
        password: hashedPassword, // Vẫn lưu password hash để tương thích
        role: 'user',
        university: university || '',
        major: major || '',
        avatar: '',
        bio: bio || '',
        supabase_uid: authData.user?.id || null
      },
    ])
    .select('id, full_name, email, role, university, major, avatar, bio, created_at')
    .single();

  if (insertError) {
    throw new Error(`Đăng ký dữ liệu thất bại: ${insertError.message}`);
  }

  // Vì bật "Confirm email", nên không lưu session lúc này mà bắt người dùng kiểm tra mail
  return { 
    user: null, 
    needsConfirmation: true,
    message: 'Đăng ký thành công! Vui lòng kiểm tra email của bạn để xác thực tài khoản trước khi đăng nhập.'
  };
};

// ─── ĐĂNG NHẬP ──────────────────────────────────────
export const login = async ({ email, password }) => {
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Cố gắng đăng nhập bằng Supabase Auth trước
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password: password
  });

  if (authError) {
    // Nếu chưa xác nhận email, chặn luôn
    if (authError.message.includes('Email not confirmed') || authError.message.includes('email_not_confirmed')) {
      throw new Error('Email của bạn chưa được xác thực. Vui lòng kiểm tra hộp thư email (bao gồm cả spam) để kích hoạt tài khoản.');
    }
    
    // Nếu lỗi đăng nhập khác (ví dụ: người dùng cũ chưa có trong Supabase Auth), ta check tương thích ngược
    const hashedPassword = await hashPassword(password, normalizedEmail);
    const { data: legacyUser, error: legacyError } = await supabase
      .from('users')
      .select('id, full_name, email, password, role, university, major, avatar, bio, created_at, is_banned, supabase_uid')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (legacyError || !legacyUser) {
      throw new Error('Email hoặc mật khẩu không đúng.');
    }

    const isLegacyMatch = legacyUser.password === password;
    const isHashMatch = legacyUser.password === hashedPassword;

    if (!isLegacyMatch && !isHashMatch) {
      throw new Error('Email hoặc mật khẩu không đúng.');
    }

    if (legacyUser.is_banned) {
      throw new Error('Tài khoản này đã bị khóa vĩnh viễn khỏi hệ thống do vi phạm chính sách nội dung khiêu dâm.');
    }

    // Đây là người dùng cũ đăng nhập đúng mật khẩu lần đầu:
    // Tự động tạo tài khoản cho họ trên Supabase Auth
    try {
      const { data: newAuth, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: password,
        options: {
          data: { full_name: legacyUser.full_name }
        }
      });
      
      if (!signUpError && newAuth?.user) {
        // Cập nhật cột supabase_uid
        await supabase
          .from('users')
          .update({ supabase_uid: newAuth.user.id })
          .eq('id', legacyUser.id);
        
        throw new Error('Tài khoản của bạn đã được cập nhật hệ thống bảo mật mới. Vui lòng kiểm tra email để xác thực tài khoản trước khi tiếp tục đăng nhập.');
      } else {
        throw signUpError;
      }
    } catch (err) {
      throw new Error(err.message || 'Lỗi hệ thống khi tự động đồng bộ tài khoản bảo mật.');
    }
  }

  // 2. Đăng nhập Supabase Auth thành công -> Lấy thông tin user có BIGINT ID tương ứng từ public.users
  const { data: user, error: dbError } = await supabase
    .from('users')
    .select('id, full_name, email, role, university, major, avatar, bio, created_at, is_banned, supabase_uid')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (dbError || !user) {
    throw new Error('Đăng nhập thành công nhưng không tìm thấy dữ liệu hồ sơ người dùng.');
  }

  if (user.is_banned) {
    throw new Error('Tài khoản này đã bị khóa vĩnh viễn khỏi hệ thống do vi phạm chính sách nội dung khiêu dâm.');
  }

  // Đồng bộ lại supabase_uid nếu trước đó chưa được gán
  if (!user.supabase_uid && authData.user) {
    await supabase
      .from('users')
      .update({ supabase_uid: authData.user.id })
      .eq('id', user.id);
  }

  const safeUser = {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    role: user.role,
    university: user.university || '',
    major: user.major || '',
    avatar: user.avatar || '',
    bio: user.bio || '',
    createdAt: user.created_at,
  };

  saveSession(safeUser);
  return { user: safeUser };
};

// ─── ĐĂNG NHẬP GOOGLE (OAUTH) ─────────────────────────
export const signInWithGoogle = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  });
  if (error) throw new Error(error.message);
};

// ─── ĐĂNG XUẤT ──────────────────────────────────────
export const logout = async () => {
  await supabase.auth.signOut();
  clearSession();
};

export const adminLogin = async ({ email, password }) => {
  const normalizedEmail = email.toLowerCase().trim();
  const hashedPassword = await hashPassword(password, normalizedEmail);

  const { data: user, error } = await supabase
    .from('users')
    .select('id, full_name, email, password, role, created_at, is_banned')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (error) {
    throw new Error(`Đăng nhập thất bại: ${error.message}`);
  }
  if (!user) {
    throw new Error('Email hoặc mật khẩu không đúng.');
  }
  if (user.role !== 'admin') {
    throw new Error('Tài khoản này không có quyền Quản trị viên hệ thống.');
  }

  // Tương tự, hỗ trợ tự nâng cấp mật khẩu legacy cho admin
  const isLegacyMatch = user.password === password;
  const isHashMatch = user.password === hashedPassword;

  if (!isLegacyMatch && !isHashMatch) {
    throw new Error('Email hoặc mật khẩu không đúng.');
  }

  if (isLegacyMatch && !isHashMatch) {
    try {
      await supabase
        .from('users')
        .update({ password: hashedPassword })
        .eq('id', user.id);
      if (import.meta.env.DEV) console.log(`[Auth] Tự động nâng cấp mật khẩu Admin lên Salted SHA-256`);
    } catch (upgradeErr) {
      if (import.meta.env.DEV) {
        console.warn('[Auth] Không thể nâng cấp mật khẩu Admin:', upgradeErr);
      }
    }
  }

  const safeAdmin = {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    role: user.role,
    university: user.university,
    major: user.major,
    avatar: user.avatar,
    bio: user.bio,
    createdAt: user.created_at,
  };

  try {
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(safeAdmin));
  } catch (err) {
    if (import.meta.env.DEV) console.warn('Error saving admin session:', err);
  }
  return { admin: safeAdmin };
};

// ─── QUÊN MẬT KHẨU ──────────────────────────────────
export const forgotPassword = async (email) => {
  const emailVal = typeof email === 'string' ? email.toLowerCase().trim() : email.email.toLowerCase().trim();
  
  // 1. Kiểm tra xem email có tồn tại trong bảng public.users không
  const { data: dbUser, error: dbError } = await supabase
    .from('users')
    .select('id, full_name, supabase_uid')
    .eq('email', emailVal)
    .maybeSingle();

  if (dbError) {
    throw new Error('Lỗi kiểm tra thông tin tài khoản.');
  }

  if (!dbUser) {
    throw new Error('Email này chưa được đăng ký trong hệ thống.');
  }

  // 2. Nếu là người dùng cũ chưa đồng bộ sang Supabase Auth
  if (!dbUser.supabase_uid) {
    try {
      const tempPass = Math.random().toString(36).substring(2, 15);
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: emailVal,
        password: tempPass,
        options: {
          data: { full_name: dbUser.full_name }
        }
      });
      
      if (!signUpError && authData?.user) {
        await supabase
          .from('users')
          .update({ supabase_uid: authData.user.id })
          .eq('id', dbUser.id);
      }
    } catch (e) {
      if (import.meta.env.DEV) console.warn('Legacy sync in forgot password failed:', e);
    }
  }

  // 3. Gửi yêu cầu reset mật khẩu bằng mã OTP (Sử dụng signInWithOtp)
  const { error } = await supabase.auth.signInWithOtp({
    email: emailVal,
    options: {
      shouldCreateUser: false
    }
  });
  if (error) throw new Error(`Lỗi gửi mã OTP: ${error.message}`);
};

// ─── XÁC THỰC OTP & ĐẶT LẠI MẬT KHẨU ────────────────
export const verifyOtpAndResetPassword = async ({ email, token, password }) => {
  const normalizedEmail = email.toLowerCase().trim();
  
  // 1. Xác thực mã OTP qua Supabase Auth (Sử dụng type 'email' cho OTP)
  const { error: otpError } = await supabase.auth.verifyOtp({
    email: normalizedEmail,
    token: token.trim(),
    type: 'email'
  });

  if (otpError) {
    throw new Error('Mã xác nhận (OTP) không chính xác hoặc đã hết hạn.');
  }

  // 2. Hash mật khẩu mới và cập nhật bảng public.users để đồng bộ
  const hashedPasswordValue = await hashPassword(password, normalizedEmail);
  const { error: dbError } = await supabase
    .from('users')
    .update({ password: hashedPasswordValue })
    .eq('email', normalizedEmail);

  if (dbError) {
    throw new Error(`Cập nhật cơ sở dữ liệu thất bại: ${dbError.message}`);
  }

  // 3. Cập nhật mật khẩu trong Supabase Auth
  const { error: authError } = await supabase.auth.updateUser({ password });
  if (authError) {
    throw new Error(`Cập nhật mật khẩu Auth thất bại: ${authError.message}`);
  }

  // 4. Đăng xuất phiên tạm thời để làm sạch session
  await supabase.auth.signOut();
  clearSession();

  return { message: 'Đặt lại mật khẩu thành công!' };
};


// ─── ĐẶT LẠI MẬT KHẨU ──────────────────────────────
export const resetPassword = async ({ token, password }) => {
  const now = Date.now();
  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('id, email')
    .eq('reset_token', token)
    .gt('reset_expires', now)
    .maybeSingle();

  if (fetchError) {
    throw new Error('Lỗi xác thực token.');
  }
  if (!user) {
    throw new Error('Token không hợp lệ hoặc đã hết hạn (15 phút).');
  }

  const hashedPassword = await hashPassword(password, user.email);

  const { error: updateError } = await supabase
    .from('users')
    .update({
      password: hashedPassword,
      reset_token: null,
      reset_expires: null,
    })
    .eq('id', user.id);

  if (updateError) {
    throw new Error('Lỗi cập nhật mật khẩu.');
  }

  return { message: 'Đặt lại mật khẩu thành công!' };
};

// ─── CẬP NHẬT HỒ SƠ ─────────────────────────────────
export const updateProfile = async ({ id, fullName, university, major, bio, avatarFile }) => {
  // Step 1: Get current user's full data (email, role, avatar, etc.) to preserve fields not being updated
  const { data: currentUser, error: getError } = await supabase
    .from('users')
    .select('id, email, role, avatar, created_at')
    .eq('id', id)
    .single();

  if (getError || !currentUser) {
    throw new Error('Không tìm thấy thông tin tài khoản. Vui lòng đăng nhập lại.');
  }

  // Step 2: Determine avatar value (keep existing if no new file)
  let avatar = currentUser.avatar || '';
  if (avatarFile) {
    if (typeof avatarFile === 'string') {
      avatar = avatarFile;
    } else if (avatarFile instanceof File || avatarFile instanceof Blob) {
      // Compress avatar xuống tối đa 400×400 px trước khi upload
      let uploadFile;
      try {
        uploadFile = await compressAvatar(avatarFile);
      } catch {
        uploadFile = avatarFile; // fallback: upload nguyên nếu compress lỗi
      }
      const ext = (uploadFile.name || uploadFile.type?.split('/')[1] || 'webp').split('.').pop() || 'webp';
      const fileName = `${id}_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, uploadFile, { cacheControl: '2592000', upsert: true });

      if (uploadError) {
        if (import.meta.env.DEV) {
          console.error('[Avatar] Supabase Storage error:', uploadError.message);
        }
        throw new Error('Không thể tải ảnh đại diện lên máy chủ. Vui lòng thử lại sau.');
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      avatar = publicUrl;
    }
  }

  // Step 3: Perform the update
  const { error: updateError } = await supabase
    .from('users')
    .update({
      full_name: fullName,
      university: university || '',
      major: major || '',
      bio: bio || '',
      avatar: avatar,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (updateError) {
    throw new Error(`Cập nhật hồ sơ thất bại: ${updateError.message}`);
  }

  // Step 4: Always fetch the freshest data from DB after update to guarantee session accuracy
  const { data: freshUser, error: fetchError } = await supabase
    .from('users')
    .select('id, full_name, email, role, university, major, bio, avatar, created_at')
    .eq('id', id)
    .single();

  // Build safeUser from fresh DB data if available, otherwise fall back to known payload
  const source = (!fetchError && freshUser) ? freshUser : {
    id,
    full_name: fullName,
    email: currentUser.email,
    role: currentUser.role,
    university: university || '',
    major: major || '',
    bio: bio || '',
    avatar,
    created_at: currentUser.created_at,
  };

  const safeUser = {
    id: source.id,
    fullName: source.full_name,
    email: source.email,
    role: source.role,
    university: source.university,
    major: source.major,
    avatar: source.avatar,
    bio: source.bio,
    createdAt: source.created_at,
  };

  saveSession(safeUser);
  return { user: safeUser };
};

// ─── ĐỔI MẬT KHẨU ───────────────────────────────────
export const changePassword = async ({ id, currentPassword, newPassword }) => {
  const { data: user, error: getError } = await supabase
    .from('users')
    .select('email, password')
    .eq('id', id)
    .single();

  if (getError || !user) {
    throw new Error('Người dùng không tồn tại.');
  }

  const hashedCurrent = await hashPassword(currentPassword, user.email);
  const isLegacyMatch = user.password === currentPassword;
  const isHashMatch = user.password === hashedCurrent;

  if (!isLegacyMatch && !isHashMatch) {
    throw new Error('Mật khẩu hiện tại không đúng.');
  }

  const hashedNew = await hashPassword(newPassword, user.email);

  // 1. Đồng bộ mật khẩu mới với Supabase Auth nếu có session hoạt động
  const { data: { session: authSession } } = await supabase.auth.getSession();
  if (authSession) {
    const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
    if (authError) {
      throw new Error(`Cập nhật mật khẩu xác thực thất bại: ${authError.message}`);
    }
  }

  // 2. Cập nhật mật khẩu hash trong bảng users
  const { error: updateError } = await supabase
    .from('users')
    .update({ password: hashedNew })
    .eq('id', id);

  if (updateError) {
    throw new Error('Lỗi đổi mật khẩu.');
  }

  return { message: 'Đổi mật khẩu thành công!' };
};

// ─── HELPERS ─────────────────────────────────────────
export const getCurrentUser = () => getSession();
export const isAuthenticated = () => !!getSession();
