// src/context/OnlineUsersContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';
import { useAuth } from './AuthContext';

const OnlineUsersContext = createContext([]);

export function OnlineUsersProvider({ children }) {
  const { user } = useAuth();
  const [onlineIds, setOnlineIds] = useState([]);

  useEffect(() => {
    if (!user?.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOnlineIds([]);
      return;
    }

    // IMPORTANT: all users must join the SAME static channel to see each other
    const channel = supabase.channel('sc-online-users', {
      config: {
        presence: {
          key: user.id.toString(),
        },
      },
    });

    const syncState = () => {
      const state = channel.presenceState();
      const ids = Object.keys(state);
      setOnlineIds(ids);
    };

    channel
      .on('presence', { event: 'sync' }, syncState)
      .on('presence', { event: 'join' }, syncState)
      .on('presence', { event: 'leave' }, syncState)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          try {
            await channel.track({
              id: user.id.toString(),
              onlineAt: new Date().toISOString(),
            });
          } catch (err) {
            if (import.meta.env.DEV) {
              console.warn('[OnlineUsers] Track failed:', err);
            }
          }
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return (
    <OnlineUsersContext.Provider value={onlineIds}>
      {children}
    </OnlineUsersContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOnlineUsers() {
  const context = useContext(OnlineUsersContext);
  if (context === undefined) {
    throw new Error('useOnlineUsers must be used within an OnlineUsersProvider');
  }
  return context;
}
