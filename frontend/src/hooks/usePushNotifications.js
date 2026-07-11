// frontend/src/hooks/usePushNotifications.js
import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/config/supabaseClient';
import { useToast } from '@/context/ToastContext';

export default function usePushNotifications(user) {
  const { addToast } = useToast();

  useEffect(() => {
    // Only register on native platforms (Android / iOS)
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    if (!user || !user.id) {
      return;
    }

    const initPush = async () => {
      try {
        let permStatus = await PushNotifications.checkPermissions();

        // Request permission if not already granted (handles 'prompt' and 'prompt-with-rationale')
        if (permStatus.receive !== 'granted') {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
          if (import.meta.env.DEV) console.warn('[Push] User denied notification permission');
          addToast('Thông báo đẩy đang bị tắt. Bạn có thể bật lại trong Cài đặt hệ thống để nhận tin nhắn mới.', 'info');
          return;
        }

        // Register with Apple / Google push services
        await PushNotifications.register();

        // 1. Listen for successful registration and upload token to Supabase
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

        // 2. Listen for registration failures
        await PushNotifications.addListener('registrationError', (err) => {
          if (import.meta.env.DEV) console.error('[Push] Registration error:', err);
        });

        // 3. Listen for incoming push notification while app is running in foreground
        await PushNotifications.addListener('pushNotificationReceived', (notification) => {
          if (import.meta.env.DEV) console.log('[Push] Notification received in foreground:', notification);
        });

        // 4. Listen for user tapping on push notification
        await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          if (import.meta.env.DEV) console.log('[Push] Action performed:', action);
          
          // Route redirection based on notification payload data
          const data = action.notification?.data;
          if (data) {
            if (data.type === 'privatemsg' && data.senderId) {
              window.location.href = `/chat?userId=${data.senderId}`;
            } else if ((data.type === 'groupmsg' || data.type === 'fileupload' || data.type === 'schedule' || data.type === 'deadline') && data.groupId) {
              window.location.href = `/groups/${data.groupId}`;
            } else if (data.type === 'friendreq') {
              window.location.href = `/friends`;
            }
          }
        });

      } catch (error) {
        if (import.meta.env.DEV) console.error('[Push] Initialization failed:', error);
      }
    };

    initPush();

    // Cleanup listeners when user logs out or hook unmounts
    return () => {
      if (Capacitor.isNativePlatform()) {
        PushNotifications.removeAllListeners();
      }
    };
  }, [user]);
}
