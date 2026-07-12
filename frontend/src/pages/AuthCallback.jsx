// src/pages/AuthCallback.jsx
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/config/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import studyconectLogo from '@/assets/studyconect_logo.png';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const { addToast } = useToast();
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    const handleAuth = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        
        // 1. Kiểm tra xem Supabase có trả về lỗi trong query parameters không
        const queryErrorName = urlParams.get('error');
        const queryErrorDesc = urlParams.get('error_description');
        if (queryErrorName) {
          throw new Error(`Lỗi OAuth (${queryErrorName}): ${queryErrorDesc || 'Không có mô tả chi tiết'}`);
        }

        // 2. Kiểm tra xem Supabase có trả về lỗi trong hash fragment không
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const hashErrorName = hashParams.get('error');
        const hashErrorDesc = hashParams.get('error_description');
        if (hashErrorName) {
          throw new Error(`Lỗi OAuth Hash (${hashErrorName}): ${hashErrorDesc || 'Không có mô tả chi tiết'}`);
        }

        const code = urlParams.get('code');
        let session = null;

        if (code) {
          if (import.meta.env.DEV) console.log('[AuthCallback] Exchanging code for session...');
          // Trao đổi mã code PKCE lấy phiên đăng nhập (session)
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            throw exchangeError;
          }
          session = data.session;
        } else {
          if (import.meta.env.DEV) console.log('[AuthCallback] No code in URL, getting session...');
          // Fallback check: kiểm tra xem có session sẵn chưa (như implicit flow)
          const { data, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) {
            throw sessionError;
          }
          session = data.session;

          // Nếu chưa có session nhưng URL có chứa tokens ở hash, chờ Supabase client xử lý (tối đa 3 giây)
          if (!session && (window.location.hash.includes('access_token') || window.location.hash.includes('id_token'))) {
            if (import.meta.env.DEV) console.log('[AuthCallback] Hash token detected. Waiting for Supabase to parse...');
            for (let i = 0; i < 6; i++) {
              await new Promise(resolve => setTimeout(resolve, 500));
              const { data: retryData } = await supabase.auth.getSession();
              if (retryData?.session) {
                session = retryData.session;
                break;
              }
            }
          }
        }

        if (!session) {
          throw new Error("Không tìm thấy thông tin phiên đăng nhập từ Google (Session is null)");
        }

        const authUser = session.user;
        if (import.meta.env.DEV) console.log('[AuthCallback] Authenticated user:', authUser.email);

        // 2. Kiểm tra xem người dùng đã tồn tại trong public.users theo email chưa
        const { data: existingUser, error: queryError } = await supabase
          .from('users')
          .select('*')
          .eq('email', authUser.email)
          .maybeSingle();

        if (queryError) {
          throw queryError;
        }

        let finalUser;
        let isNewUser = false;

        if (!existingUser) {
          isNewUser = true;
          if (import.meta.env.DEV) console.log('[AuthCallback] Creating new public user...');
          // 3. Nếu là người dùng Google OAuth mới, đăng ký họ vào public.users
          const fullName = authUser.user_metadata?.full_name || authUser.email.split('@')[0];
          const avatarUrl = authUser.user_metadata?.avatar_url || '';

          const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert([{
              full_name: fullName,
              email: authUser.email,
              password: '', // OAuth mới — chưa có mật khẩu, sẽ đặt ở CompleteProfile
              avatar: avatarUrl,
              supabase_uid: authUser.id,
              role: 'user',
              university: '',
              major: '',
              bio: ''
            }])
            .select()
            .single();

          if (insertError) {
            throw insertError;
          }
          finalUser = newUser;
        } else {
          // 4. Cập nhật liên kết supabase_uid nếu chưa được đặt
          if (!existingUser.supabase_uid) {
            if (import.meta.env.DEV) console.log('[AuthCallback] Syncing existing user supabase_uid...');
            const { data: updatedUser, error: updateError } = await supabase
              .from('users')
              .update({ supabase_uid: authUser.id })
              .eq('id', existingUser.id)
              .select()
              .single();

            if (updateError) {
              throw updateError;
            }
            finalUser = updatedUser;
          } else {
            finalUser = existingUser;
          }
        }

        // 5. Lưu phiên đăng nhập vào localStorage
        const safeUser = {
          id: finalUser.id,
          fullName: finalUser.full_name,
          email: finalUser.email,
          role: finalUser.role,
          university: finalUser.university || '',
          major: finalUser.major || '',
          avatar: finalUser.avatar || '',
          bio: finalUser.bio || '',
          createdAt: finalUser.created_at,
        };

        localStorage.setItem('sc_session', JSON.stringify(safeUser));
        setUser(safeUser);

        if (isNewUser) {
          // User mới Google: chuyển sang trang hoàn thiện hồ sơ
          localStorage.setItem('sc_pending_profile_id', String(finalUser.id));
          addToast('Hãy hoàn tất hồ sơ để hoàn thành đăng ký.', 'info');
          navigate('/complete-profile', { replace: true });
        } else {
          addToast('Đăng nhập bằng Google thành công! Chào mừng quay trở lại.', 'success');
          sessionStorage.setItem('sc_fireworks', '1');
          sessionStorage.setItem('sc_fireworks_name', safeUser.fullName?.split(' ').pop() || '');
          navigate('/');
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error('Error in AuthCallback:', err);
        navigate(`/login?error=sync_failed&message=${encodeURIComponent(err.message || 'Sync failed')}`);
      }
    };

    handleAuth();
  }, [navigate, setUser, addToast]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      flexDirection: 'column',
      gap: '20px',
    }}>
      <img 
        src={studyconectLogo} 
        alt="StudyConnect" 
        style={{ width: '64px', height: '64px', objectFit: 'contain', animation: 'pulse 1.5s infinite ease-in-out' }} 
      />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '32px', height: '32px',
          border: '3px solid rgba(0,0,0,0.1)',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: 600 }}>
          Đang đồng bộ tài khoản...
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
          Vui lòng không đóng trình duyệt
        </span>
      </div>
      
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.85; }
        }
      `}</style>
    </div>
  );
}
