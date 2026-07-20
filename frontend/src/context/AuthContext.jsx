import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getCurrentUser, logout as serviceLogout } from '../services/authService';
import { supabase } from '../config/supabaseClient';
import { useLocation } from 'react-router-dom';

const getAdminCurrentUser = () => {
  try { return JSON.parse(localStorage.getItem('sc_admin_session')); }
  catch { return null; }
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => getCurrentUser());
  const [admin, setAdmin] = useState(() => getAdminCurrentUser());
  const [loading] = useState(false);
  const location = useLocation();
  const lastCheckedRef = useRef(0);

  useEffect(() => {
    if (!user?.id) return;

    let active = true;

    const verifyUser = async (force = false) => {
      const now = Date.now();
      if (!force && now - lastCheckedRef.current < 5000) {
        return;
      }
      lastCheckedRef.current = now;

      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, is_banned, full_name, major, bio, university, avatar, email, role')
          .eq('id', parseInt(user.id, 10))
          .maybeSingle();

        if (!active) return;

        if (error || !data || data.is_banned) {
          await serviceLogout();
          setUser(null);
          window.location.href = '/login';
          return;
        }

        // Sync latest profile fields (major, bio, etc.) into session
        // so user.major is always up-to-date for filtering/sorting
        const needsSync = (
          data.major !== user.major ||
          data.bio !== user.bio ||
          data.university !== user.university ||
          data.full_name !== user.fullName ||
          data.avatar !== user.avatar
        );

        if (needsSync) {
          const updated = {
            ...user,
            fullName: data.full_name || user.fullName,
            major: data.major || '',
            bio: data.bio || '',
            university: data.university || '',
            avatar: data.avatar || '',
          };
          try {
            localStorage.setItem('sc_session', JSON.stringify(updated));
          } catch { /* ignore */ }
          setUser(updated);
        }
      } catch (err) {
        if (import.meta.env.DEV) console.warn('Lỗi kiểm tra trạng thái tài khoản:', err);
      }
    };

    // Verify immediately on mount or route transition
    verifyUser();

    // Realtime subscription for logged-in user's profile updates (e.g. when major is updated by Admin or self)
    const selfChannel = supabase
      .channel(`user-self-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new) {
            const data = payload.new;
            if (data.is_banned) {
              serviceLogout();
              setUser(null);
              window.location.href = '/login';
              return;
            }
            setUser((prev) => {
              if (!prev) return null;
              const updated = {
                ...prev,
                fullName: data.full_name || prev.fullName,
                major: data.major || '',
                bio: data.bio || '',
                university: data.university || '',
                avatar: data.avatar || '',
              };
              try {
                localStorage.setItem('sc_session', JSON.stringify(updated));
              } catch { /* ignore */ }
              return updated;
            });
          }
        }
      )
      .subscribe();

    // Verify periodically every 30 seconds when the app is visible
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        verifyUser(true);
      }
    }, 30000);

    return () => {
      active = false;
      supabase.removeChannel(selfChannel);
      clearInterval(interval);
    };
  }, [user?.id, location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const logout = () => {
    serviceLogout();
    setUser(null);
  };

  const adminLogout = () => {
    localStorage.removeItem('sc_admin_session');
    setAdmin(null);
  };

  const refreshUser = () => {
    const u = getCurrentUser();
    setUser(u);
    return u;
  };

  const refreshAdmin = () => {
    const a = getAdminCurrentUser();
    setAdmin(a);
    return a;
  };

  return (
    <AuthContext.Provider value={{
      user,
      setUser,
      logout,
      refreshUser,
      isAuth: !!user,
      admin,
      setAdmin,
      adminLogout,
      refreshAdmin,
      isAdminAuth: !!admin,
      loading
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
