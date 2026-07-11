// src/context/AuthContext.jsx
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, logout as serviceLogout } from '../services/authService';
import { supabase } from '../config/supabaseClient';

const getAdminCurrentUser = () => {
  try { return JSON.parse(localStorage.getItem('sc_admin_session')); }
  catch { return null; }
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => getCurrentUser());
  const [admin, setAdmin] = useState(() => getAdminCurrentUser());
  const [loading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    let active = true;

    const verifyUser = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, is_banned, full_name, major, bio, university, avatar, email, role')
          .eq('id', parseInt(user.id, 10))
          .maybeSingle();

        if (!active) return;

        if (error || !data || data.is_banned) {
          serviceLogout();
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

    // Verify immediately on mount to sync profile
    verifyUser();

    // Verify periodically every 30 seconds when the app is visible
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        verifyUser();
      }
    }, 30000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
