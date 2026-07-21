// src/components/CallNotification.jsx
// Popup thông báo cuộc gọi đến — hiển thị overlay trên MỌI trang
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useCall } from '../context/CallContext';
import Avatar from './common/Avatar';
import { Capacitor } from '@capacitor/core';
import { Haptics } from '@capacitor/haptics';

// Nhạc chuông bằng Web Audio API
function useRingTone(active) {
  const audioCtxRef = useRef(null);
  const nodesRef = useRef([]);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!active) {
      nodesRef.current.forEach(n => { try { n.stop(); } catch { /* empty */ } });
      nodesRef.current = [];
      clearInterval(intervalRef.current);
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      return;
    }

    const playRing = () => {
      // Rung thiết bị ở block riêng biệt, tránh bị ảnh hưởng bởi lỗi AudioContext (do chính sách autoplay của trình duyệt)
      try {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([1000, 800]);
        }
      } catch (e) {
        if (import.meta.env.DEV) console.warn('[CallNotification] navigator.vibrate failed:', e);
      }

      try {
        if (Capacitor.isNativePlatform()) {
          Haptics.vibrate({ duration: 1000 }).catch(() => {});
        }
      } catch (hapticsErr) {
        if (import.meta.env.DEV) console.warn('[CallNotification] Haptics failed:', hapticsErr);
      }

      try {
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
          audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }

        const playChimeNode = (freq, startTime, duration) => {
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gainNode = ctx.createGain();

          osc1.type = 'triangle';
          osc1.frequency.setValueAtTime(freq, startTime);

          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(freq * 2, startTime);

          // Dynamic pitch vibrato for organic analog texture
          const lfo = ctx.createOscillator();
          const lfoGain = ctx.createGain();
          lfo.frequency.value = 6.5; 
          lfoGain.gain.value = 2; 
          lfo.connect(lfoGain);
          lfoGain.connect(osc1.frequency);
          lfoGain.connect(osc2.frequency);

          osc1.connect(gainNode);
          osc2.connect(gainNode);
          gainNode.connect(ctx.destination);

          // Soft bell chime envelope
          gainNode.gain.setValueAtTime(0, startTime);
          gainNode.gain.linearRampToValueAtTime(0.08, startTime + 0.015);
          gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

          lfo.start(startTime);
          lfo.stop(startTime + duration);

          osc1.start(startTime);
          osc1.stop(startTime + duration);

          osc2.start(startTime);
          osc2.stop(startTime + duration);

          nodesRef.current.push(osc1, osc2, lfo);
        };

        const now = ctx.currentTime;
        // First elegant upward chord sweep (E major)
        playChimeNode(659.25, now, 1.2);        // E5
        playChimeNode(830.61, now + 0.12, 1.2);   // G#5
        playChimeNode(987.77, now + 0.24, 1.2);   // B5
        playChimeNode(1318.51, now + 0.36, 1.2);  // E6

        // Second resolving upward sweep (A major)
        playChimeNode(880.00, now + 0.8, 1.2);    // A5
        playChimeNode(1109.73, now + 0.92, 1.2);  // C#6
        playChimeNode(1318.51, now + 1.04, 1.2);  // E6
        playChimeNode(1760.00, now + 1.16, 1.2);  // A6
      } catch { /* ignore */ }
    };

    playRing();
    intervalRef.current = setInterval(playRing, 1800);

    return () => {
      clearInterval(intervalRef.current);
      nodesRef.current.forEach(n => { try { n.stop(); } catch { /* empty */ } });
      nodesRef.current = [];
      try {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(0);
        }
      } catch (e) {}
      try {
        if (Capacitor.isNativePlatform()) {
          Haptics.vibrate({ duration: 0 }).catch(() => {});
        }
      } catch (e) {}
    };
  }, [active]);
}

export default function CallNotification() {
  const { incomingCall, acceptCall, rejectCall } = useCall();
  const location = useLocation();

  const isAdminRoute = location.pathname.startsWith('/admin') || location.pathname === '/admin-login';

  useRingTone(!!incomingCall && !isAdminRoute);

  if (!incomingCall || isAdminRoute) return null;

  return (
    <>
      {/* Style animations */}
      <style>{`
        @keyframes cn-slideIn {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes cn-ring-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.3); }
          50%       { box-shadow: 0 0 0 14px rgba(34, 197, 94, 0); }
        }
        @keyframes cn-reject-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.3); }
          50%       { box-shadow: 0 0 0 14px rgba(239, 68, 68, 0); }
        }
        @keyframes cn-avatar-glow {
          0%, 100% { box-shadow: 0 0 0 4px rgba(255,255,255,0.05), 0 0 25px rgba(255,255,255,0.05); }
          50%       { box-shadow: 0 0 0 8px rgba(255,255,255,0.1), 0 0 40px rgba(255,255,255,0.15); }
        }
        @keyframes cn-wave {
          0%   { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(2.0); opacity: 0; }
        }
      `}</style>

      {/* Overlay backdrop + căn giữa tuyệt đối — LUÔN CHÍNH GIỮA MÀN HÌNH */}
      <div style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}>
        {/* Wrapper animation */}
        <div style={{
          width: '320px',
          maxWidth: '90vw',
          flexShrink: 0,
          animation: 'cn-slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}>
          {/* Card nội dung */}
          <div style={{
            background: 'rgba(10, 10, 12, 0.85)',
            border: '1.5px solid #262626',
            borderRadius: '24px',
            padding: '32px 24px 28px',
            backdropFilter: 'blur(24px) saturate(180%)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0',
            textAlign: 'center',
            overflow: 'hidden',
            position: 'relative',
          }}>
            {/* Status label */}
            <div style={{
              fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em',
              color: '#a3a3a3', textTransform: 'uppercase',
              marginBottom: '24px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
            }}>
              <span style={{
                width: '24px', height: '24px', borderRadius: '6px', flexShrink: 0,
                background: '#18181b',
                border: '1px solid #27272a',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m22 8-6 4 6 4V8Z" />
                  <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
                </svg>
              </span>
              Cuộc gọi đến
            </div>

            {/* Avatar với sóng động */}
            <div style={{ position: 'relative', marginBottom: '24px' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  position: 'absolute', inset: '-12px',
                  borderRadius: '50%',
                  border: '1.5px solid rgba(255,255,255,0.08)',
                  animation: `cn-wave 2s ease-out ${i * 0.6}s infinite`,
                }} />
              ))}
              <div style={{
                borderRadius: '50%',
                animation: 'cn-avatar-glow 2s ease-in-out infinite',
                border: '2px solid #262626',
                display: 'inline-flex',
                overflow: 'hidden'
              }}>
                <Avatar src={incomingCall.callerAvatar} initial={incomingCall.callerName} size={80} />
              </div>
            </div>

            {/* Tên người gọi */}
            <div style={{
              fontSize: '20px', fontWeight: 700,
              color: '#ffffff',
              marginBottom: '6px',
              letterSpacing: '-0.01em',
            }}>
              {incomingCall.callerName}
            </div>

            <div style={{
              fontSize: '12px', color: '#737373',
              marginBottom: '28px', fontWeight: 500,
            }}>
              Đang gọi video cho bạn...
            </div>

            {/* Nút hành động */}
            <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
              {/* Từ chối */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <button
                  id="btn-reject-call"
                  onClick={rejectCall}
                  style={{
                    width: '56px', height: '56px', borderRadius: '50%',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1.5px solid rgba(239, 68, 68, 0.4)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: 'cn-reject-pulse 1.8s ease-in-out infinite',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    color: '#ef4444',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'scale(1.1) rotate(-8deg)';
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                  }}
                  title="Từ chối"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.18 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
                    <line x1="23" y1="1" x2="1" y2="23" />
                  </svg>
                </button>
                <span style={{ fontSize: '11px', color: '#737373', fontWeight: 600 }}>Từ chối</span>
              </div>

              {/* Chấp nhận */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <button
                  id="btn-accept-call"
                  onClick={acceptCall}
                  style={{
                    width: '56px', height: '56px', borderRadius: '50%',
                    background: 'rgba(34, 197, 94, 0.15)',
                    border: '1.5px solid rgba(34, 197, 94, 0.4)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: 'cn-ring-pulse 1.8s ease-in-out infinite',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    color: '#22c55e',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'scale(1.1) rotate(8deg)';
                    e.currentTarget.style.background = 'rgba(34, 197, 94, 0.25)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                    e.currentTarget.style.background = 'rgba(34, 197, 94, 0.15)';
                  }}
                  title="Chấp nhận"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m22 8-6 4 6 4V8Z" />
                    <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
                  </svg>
                </button>
                <span style={{ fontSize: '11px', color: '#737373', fontWeight: 600 }}>Chấp nhận</span>
              </div>
            </div>
          </div>{/* end card */}
        </div>{/* end animation wrapper */}
      </div>{/* end overlay */}
    </>
  );
}
