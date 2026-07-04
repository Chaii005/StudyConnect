// src/pages/AuthCallback.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/config/supabaseClient';
import studyconectLogo from '@/assets/studyconect_logo.png';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      // 1. Get current session from Supabase Auth
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        if (import.meta.env.DEV) console.error('Error fetching session:', sessionError);
        const errorMsg = sessionError ? sessionError.message : 'No session available';
        navigate(`/login?error=no_session&message=${encodeURIComponent(errorMsg)}`);
        return;
      }

      const authUser = session.user;

      try {
        // 2. Check if user already exists in public.users by email
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
          // 3. If new Google OAuth user, register them in public.users
          const fullName = authUser.user_metadata?.full_name || authUser.email.split('@')[0];
          const avatarUrl = authUser.user_metadata?.avatar_url || '';

          const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert([{
              full_name: fullName,
              email: authUser.email,
              password: '', // OAuth doesn't use passwords in our public.users table
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
          // 4. Update the supabase_uid link if not already set
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

        // 5. Store session in localStorage to log user in
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

        // Redirect to homepage
        window.location.href = '/';
      } catch (err) {
        if (import.meta.env.DEV) console.error('Error synchronizing user session:', err);
        navigate(`/login?error=sync_failed&message=${encodeURIComponent(err.message || 'Sync failed')}`);
      }
    };

    handleAuthCallback();
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
