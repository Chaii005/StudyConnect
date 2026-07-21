// frontend/src/hooks/usePushNotifications.js
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/config/supabaseClient';
import { useToast } from '@/context/ToastContext';

export default function usePushNotifications(user) {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const saveTokenToDatabase = async (tokenValue, userId) => {
    if (!tokenValue || !userId) return;

    // 1. Save via Supabase client (direct table upsert)
    try {
      const { error } = await supabase
        .from('user_push_tokens')
        .upsert({
          user_id: parseInt(userId, 10),
          device_token: tokenValue,
          platform: Capacitor.getPlatform()
        }, { onConflict: 'device_token' });

      if (error) {
        if (import.meta.env.DEV) console.error('[Push] Supabase token upsert error:', error.message);
      } else {
        if (import.meta.env.DEV) console.log('[Push] Token saved to Supabase successfully');
      }
    } catch (dbErr) {
      if (import.meta.env.DEV) console.error('[Push] Supabase DB error saving token:', dbErr);
    }

    // 2. Save via Backend REST API (Render endpoint)
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://studyconnect-backend-ylyu.onrender.com';
      let token = null;
      try {
        const sessionStr = localStorage.getItem('sc_session');
        if (sessionStr) {
          const sess = JSON.parse(sessionStr);
          token = sess?.access_token || sess?.token;
        }
      } catch (e) {
        // ignore parse error
      }

      await fetch(`${backendUrl}/api/users/push-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          deviceToken: tokenValue,
          platform: Capacitor.getPlatform()
        })
      });
      if (import.meta.env.DEV) console.log('[Push] Token synced to Backend API successfully');
    } catch (apiErr) {
      if (import.meta.env.DEV) console.warn('[Push] Backend API token sync error:', apiErr);
    }
  };

  // 1. Register Action Listeners immediately on startup (runs once on mount, independent of user auth)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let regListener = null;
    let regErrorListener = null;
    let notificationListener = null;
    let actionListener = null;

    const initListeners = async () => {
      try {
        // Create standard default notification channel
        try {
          await PushNotifications.createChannel({
            id: 'default',
            name: 'Default',
            description: 'Kênh thông báo mặc định',
            importance: 5,
            visibility: 1,
            sound: 'default',
            vibration: true
          });
        } catch (channelErr) {
          if (import.meta.env.DEV) console.warn('[Push] Default channel creation failed:', channelErr);
        }

        // Create calls notification channel with max priority
        try {
          await PushNotifications.createChannel({
            id: 'calls',
            name: 'Cuộc gọi đến',
            description: 'Kênh thông báo cho cuộc gọi đến',
            importance: 5,
            visibility: 1,
            sound: 'default',
            vibration: true,
            lights: true,
            lightColor: '#ef4444'
          });
        } catch (channelErr) {
          if (import.meta.env.DEV) console.warn('[Push] Calls channel creation failed:', channelErr);
        }

        // Listen for device token registration
        regListener = await PushNotifications.addListener('registration', async (token) => {
          if (import.meta.env.DEV) console.log('[Push] Token registered:', token.value);
          localStorage.setItem('sc_fcm_token', token.value);
          
          if (userRef.current && userRef.current.id) {
            await saveTokenToDatabase(token.value, userRef.current.id);
          }
        });

        // Listen for registration errors
        regErrorListener = await PushNotifications.addListener('registrationError', (err) => {
          if (import.meta.env.DEV) console.error('[Push] Registration error:', err);
        });

        // Listen for foreground notifications
        notificationListener = await PushNotifications.addListener('pushNotificationReceived', (notification) => {
          if (import.meta.env.DEV) console.log('[Push] Notification received in foreground:', notification);
          const title = notification.title || 'Thông báo';
          const body = notification.body || '';
          
          const data = notification.data;
          let targetPath = null;
          if (data) {
            if (data.type === 'incoming_call' && data.callId) {
              const callInfo = {
                callId: data.callId,
                callerId: data.callerId,
                callerName: data.callerName || 'Người dùng',
                callerAvatar: data.callerAvatar || '',
              };
              sessionStorage.setItem('pending_incoming_call', JSON.stringify(callInfo));
              window.dispatchEvent(new CustomEvent('pending-call', { detail: callInfo }));
              targetPath = '/chat';
            } else if (data.type === 'privatemsg' && data.senderId) {
              targetPath = `/chat?userId=${data.senderId}`;
            } else if (data.type === 'groupmsg' && data.groupId) {
              targetPath = `/groups/${data.groupId}?tab=chat`;
            } else if (data.type === 'fileupload' && data.groupId) {
              targetPath = `/groups/${data.groupId}?tab=documents`;
            } else if (data.type === 'schedule' && data.groupId) {
              targetPath = `/groups/${data.groupId}?tab=schedule`;
            } else if (data.type === 'deadline' && data.groupId) {
              targetPath = `/groups/${data.groupId}?tab=deadlines`;
            } else if (data.type === 'friendreq' || data.type === 'friendaccept') {
              targetPath = '/friends';
            } else if (data.type === 'groupinvite') {
              targetPath = '/groups';
            } else if (data.type === 'joinrequest' && data.groupId) {
              targetPath = `/groups/${data.groupId}`;
            } else if (data.type === 'groupcall' && data.groupId) {
              targetPath = `/groups/${data.groupId}?tab=chat`;
            } else if (['groupjoin', 'groupdeputy', 'othergroupjoin'].includes(data.type) && data.groupId) {
              targetPath = `/groups/${data.groupId}`;
            } else if (data.type === 'deadline-urgent' && data.groupId) {
              targetPath = `/groups/${data.groupId}?tab=deadlines`;
            } else if ((data.type === 'comment' || data.type === 'like' || data.type === 'posttag_user' || data.type === 'posttag_group') && data.postId) {
              targetPath = `/?postId=${data.postId}`;
            } else if (data.type === 'missedcall' && data.senderId) {
              targetPath = `/chat?userId=${data.senderId}`;
            } else if (['groupkick', 'groupdemote'].includes(data.type)) {
              targetPath = `/groups`;
            }
          }

          if (!targetPath) {
            targetPath = '/?openNotifications=true';
          }

          addToast(`${title}: ${body}`, 'info', 6000, targetPath);
        });

        // Listen for user tapping on push notifications (handles cold start launch actions)
        actionListener = await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          if (import.meta.env.DEV) console.log('[Push] Action performed:', action);
          
          const data = action.notification?.data;
          let targetPath = null;
          if (data) {
            if (data.type === 'incoming_call' && data.callId) {
              const callInfo = {
                callId: data.callId,
                callerId: data.callerId,
                callerName: data.callerName || 'Người dùng',
                callerAvatar: data.callerAvatar || '',
              };
              sessionStorage.setItem('pending_incoming_call', JSON.stringify(callInfo));
              window.dispatchEvent(new CustomEvent('pending-call', { detail: callInfo }));
              targetPath = '/chat';
            } else if (data.type === 'privatemsg' && data.senderId) {
              targetPath = `/chat?userId=${data.senderId}`;
            } else if (data.type === 'groupmsg' && data.groupId) {
              targetPath = `/groups/${data.groupId}?tab=chat`;
            } else if (data.type === 'fileupload' && data.groupId) {
              targetPath = `/groups/${data.groupId}?tab=documents`;
            } else if (data.type === 'schedule' && data.groupId) {
              targetPath = `/groups/${data.groupId}?tab=schedule`;
            } else if (data.type === 'deadline' && data.groupId) {
              targetPath = `/groups/${data.groupId}?tab=deadlines`;
            } else if (data.type === 'friendreq' || data.type === 'friendaccept') {
              targetPath = '/friends';
            } else if (data.type === 'groupinvite') {
              targetPath = '/groups';
            } else if (data.type === 'joinrequest' && data.groupId) {
              targetPath = `/groups/${data.groupId}`;
            } else if (data.type === 'groupcall' && data.groupId) {
              targetPath = `/groups/${data.groupId}?tab=chat`;
            } else if (['groupjoin', 'groupdeputy', 'othergroupjoin'].includes(data.type) && data.groupId) {
              targetPath = `/groups/${data.groupId}`;
            } else if (data.type === 'deadline-urgent' && data.groupId) {
              targetPath = `/groups/${data.groupId}?tab=deadlines`;
            } else if ((data.type === 'comment' || data.type === 'like' || data.type === 'posttag_user' || data.type === 'posttag_group') && data.postId) {
              targetPath = `/?postId=${data.postId}`;
            } else if (data.type === 'missedcall' && data.senderId) {
              targetPath = `/chat?userId=${data.senderId}`;
            } else if (['groupkick', 'groupdemote'].includes(data.type)) {
              targetPath = `/groups`;
            }
          }

          if (!targetPath) {
            targetPath = '/?openNotifications=true';
          }

          const hasSession = !!localStorage.getItem('sc_session');
          if (hasSession) {
            if (import.meta.env.DEV) console.log('[Push] Session active, navigating directly to:', targetPath);
            navigate(targetPath);
          } else {
            if (import.meta.env.DEV) console.log('[Push] Session not loaded yet, storing pending redirect:', targetPath);
            sessionStorage.setItem('pending_push_redirect', targetPath);
          }
        });

        // Trigger registration for FCM on startup (checks permissions and registers if granted)
        const permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive === 'granted') {
          await PushNotifications.register();
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error('[Push] Action listeners init failed:', err);
      }
    };

    initListeners();

    return () => {
      if (regListener) regListener.remove();
      if (regErrorListener) regErrorListener.remove();
      if (notificationListener) notificationListener.remove();
      if (actionListener) actionListener.remove();
    };
  }, [navigate, addToast]);

  // 2. Register Device Token & Sync cached token (runs/updates whenever user is authenticated)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    if (!user || !user.id) {
      return;
    }

    const initTokenRegistration = async () => {
      try {
        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive !== 'granted') {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
          if (import.meta.env.DEV) console.warn('[Push] User denied notification permission');
          return;
        }

        // Sync already registered cached token if exists
        const cachedToken = localStorage.getItem('sc_fcm_token');
        if (cachedToken) {
          await saveTokenToDatabase(cachedToken, user.id);
        }

        // Request token generation / update
        await PushNotifications.register();

      } catch (err) {
        if (import.meta.env.DEV) console.error('[Push] Token registration failed:', err);
      }
    };

    initTokenRegistration();
  }, [user?.id]);

  // 3. Process pending notification redirect once authenticated
  useEffect(() => {
    if (user && user.id) {
      const pendingRedirect = sessionStorage.getItem('pending_push_redirect');
      if (pendingRedirect) {
        if (import.meta.env.DEV) console.log('[Push] Auth complete, executing pending redirect:', pendingRedirect);
        sessionStorage.removeItem('pending_push_redirect');
        setTimeout(() => {
          navigate(pendingRedirect);
        }, 100);
      }
    }
  }, [user, navigate]);
}
