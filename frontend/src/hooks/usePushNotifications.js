// frontend/src/hooks/usePushNotifications.js
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/config/supabaseClient';
import { useToast } from '@/context/ToastContext';

export default function usePushNotifications(user) {
  const { addToast } = useToast();
  const navigate = useNavigate();

  // 1. Register Action Listeners immediately on startup (runs once on mount, independent of user auth)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

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

        // Listen for foreground notifications
        await PushNotifications.addListener('pushNotificationReceived', (notification) => {
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
        await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
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

      } catch (err) {
        if (import.meta.env.DEV) console.error('[Push] Action listeners init failed:', err);
      }
    };

    initListeners();

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [navigate, addToast]);

  // 2. Register Device Token (runs/updates whenever user is authenticated)
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

        // Upload FCM token to database
        await PushNotifications.addListener('registration', async (token) => {
          if (import.meta.env.DEV) console.log('[Push] Token registered:', token.value);
          localStorage.setItem('sc_fcm_token', token.value);
          
          try {
            const { error } = await supabase
              .from('user_push_tokens')
              .upsert({
                user_id: parseInt(user.id, 10),
                device_token: token.value,
                platform: Capacitor.getPlatform()
              }, { onConflict: 'device_token' });

            if (error && import.meta.env.DEV) {
              console.error('[Push] Failed to save token to database:', error.message);
            }
          } catch (dbErr) {
            if (import.meta.env.DEV) console.error('[Push] Database error saving token:', dbErr);
          }
        });

        await PushNotifications.addListener('registrationError', (err) => {
          if (import.meta.env.DEV) console.error('[Push] Registration error:', err);
        });

        // Trigger registration for FCM token
        await PushNotifications.register();

      } catch (err) {
        if (import.meta.env.DEV) console.error('[Push] Token registration failed:', err);
      }
    };

    initTokenRegistration();
  }, [user]);

  // 3. Process pending notification redirect once authenticated
  useEffect(() => {
    if (user && user.id) {
      const pendingRedirect = sessionStorage.getItem('pending_push_redirect');
      if (pendingRedirect) {
        if (import.meta.env.DEV) console.log('[Push] Auth complete, executing pending redirect:', pendingRedirect);
        sessionStorage.removeItem('pending_push_redirect');
        // Small delay to ensure react router route tree is fully ready
        setTimeout(() => {
          navigate(pendingRedirect);
        }, 100);
      }
    }
  }, [user, navigate]);
}
