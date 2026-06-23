// src/context/OnlineUsersContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';
import { useAuth } from './AuthContext';

const OnlineUsersContext = createContext([]);

export function OnlineUsersProvider({ children }) {
  const { user } = useAuth();
  const [onlineIds, setOnlineIds] = useState([]);

  useEffect(() => {
    if (!user?.id) {
      setOnlineIds([]);
      return;
    }

    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: user.id.toString(),
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const ids = Object.keys(state);
        setOnlineIds(ids);
      })
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

export function useOnlineUsers() {
  const context = useContext(OnlineUsersContext);
  if (context === undefined) {
    throw new Error('useOnlineUsers must be used within an OnlineUsersProvider');
  }
  return context;
}
