// src/pages/AuthCallback.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/config/supabaseClient';
import studyconectLogo from '@/assets/studyconect_logo.png';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let isSyncing = false;

    // Đăng ký lắng nghe sự kiện thay đổi trạng thái Auth (bao gồm cả khi parse xong hash token từ Google redirect)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (isSyncing) return;

      if (session) {
        isSyncing = true;
        const authUser = session.user;

        try {
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

          if (!existingUser) {
            // 3. Nếu là người dùng Google OAuth mới, đăng ký họ vào public.users
            const fullName = authUser.user_metadata?.full_name || authUser.email.split('@')[0];
            const avatarUrl = authUser.user_metadata?.avatar_url || '';

            const { data: newUser, error: insertError } = await supabase
              .from('users')
              .insert([{
                full_name: fullName,
                email: authUser.email,
                password: '', // Đăng nhập OAuth không lưu mật khẩu trong db của ta
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

          // 5. Lưu phiên đăng nhập vào localStorage để đăng nhập ở phía frontend
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

          // Chuyển hướng về trang chủ
          window.location.href = '/';
        } catch (err) {
          if (import.meta.env.DEV) console.error('Error synchronizing user session:', err);
          navigate(`/login?error=sync_failed&message=${encodeURIComponent(err.message || 'Sync failed')}`);
        }
      }
    });

    // Fallback: Chờ tối đa 4 giây để SDK xử lý phân tích tokens từ URL hash.
    // Nếu hết 4 giây vẫn không phát hiện session, hiển thị lỗi.
    const timeoutId = setTimeout(async () => {
      if (isSyncing) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login?error=no_session&message=Không%20nhận%20được%20phiên%20đăng%20nhập%20sau%204s');
      }
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [navigate]);

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
