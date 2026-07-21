/* eslint-disable no-undef */
// src/pages/PrivateCall.jsx
// Trang gọi video riêng tư 1-1 — hoàn toàn khác với Meetroom
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabaseClient';
import { sendMessage } from '../services/chatServiceTEMP.js';
import { useCall } from '../context/CallContext';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

/* ─── Màu avatar ──────────────────────────────────────────── */
const COLORS = ['#1A1A1A','#3A3A3A','#2E2E2E','#4A4A4A','#222222','#383838','#2A2A2A'];
const colorOf = s => COLORS[(s||'').split('').reduce((a,c)=>a+c.charCodeAt(0),0) % COLORS.length];

/* ─── Avatar ─────────────────────────────────────────────── */
function Avatar({ src, name = '', size = 80 }) {
  const initial = (name || '?')[0].toUpperCase();
  const color = colorOf(name);
  if (src) return (
    <img src={src} alt={name} style={{
      width: size, height: size, borderRadius: '50%',
      objectFit: 'cover', border: '3px solid rgba(255,255,255,0.15)',
    }} />
  );
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg, ${color}, ${color}99)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 800, color: '#fff',
      border: '3px solid rgba(255,255,255,0.15)',
    }}>{initial}</div>
  );
}


/* ─── ICE Servers — Multi-provider STUN + TURN for cross-network ── */
// Sử dụng nhiều TURN server dự phòng để đảm bảo kết nối xuyên mạng
const ICE_SERVERS = {
  iceServers: [
    // Google STUN (primary — highly reliable)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    // Metered TURN (free tier — active & maintained)
    {
      urls: [
        'turn:a.relay.metered.ca:80',
        'turn:a.relay.metered.ca:80?transport=tcp',
        'turn:a.relay.metered.ca:443',
        'turn:a.relay.metered.ca:443?transport=tcp',
        'turns:a.relay.metered.ca:443',
      ],
      username: 'e8dd65b92f70a28e5c182a86',
      credential: '3JGufwQKRFKbFPeV',
    },
    // OpenRelay backup
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    // Cloudflare STUN backup
    { urls: 'stun:stun.cloudflare.com:3478' },
  ],
  iceCandidatePoolSize: 10,
};

/* ─── Hook WebRTC cho cuộc gọi 1-1 ─────────────────────── */
function usePrivateWebRTC({ callId, user, mode, micOn, camOn, setMicOn, setCamOn, onHangup }) {
  const [localStream, setLocalStream]   = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [connected, setConnected]       = useState(false);
  const [error, setError]               = useState(null);
  const [remoteCamOn, setRemoteCamOn]   = useState(true);
  const [remoteMicOn, setRemoteMicOn]   = useState(true);

  const onHangupRef = useRef(onHangup);
  useEffect(() => {
    onHangupRef.current = onHangup;
  }, [onHangup]);

  const pcRef             = useRef(null);
  const localRef          = useRef(null);
  const channelRef        = useRef(null);
  const micOnRef          = useRef(micOn);
  const camOnRef          = useRef(camOn);
  const readyIntervalRef  = useRef(null);
  const iceCandidateQueue = useRef([]); // Queue ICE trước khi setRemoteDescription

  useEffect(() => { micOnRef.current = micOn; }, [micOn]);
  useEffect(() => { camOnRef.current = camOn; }, [camOn]);

  // Unique peer ID
  const myId = useMemo(
    () => `${user?.id || 'u'}_${Math.random().toString(36).slice(2, 6)}`,
    [user?.id]
  );

  // Bắt đầu media
  const startMedia = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('SecureContextError');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: true,
      });
      localRef.current = stream;
      setLocalStream(stream);
      stream.getAudioTracks().forEach(t => { t.enabled = micOnRef.current; });
      stream.getVideoTracks().forEach(t => { t.enabled = camOnRef.current; });
      const hasVideo = stream.getVideoTracks().length > 0;
      const hasAudio = stream.getAudioTracks().length > 0;
      if (setCamOn) setCamOn(hasVideo);
      if (setMicOn) setMicOn(hasAudio);
      return stream;
    } catch (err) {
      if (err.message === 'SecureContextError') {
        setError('Trình duyệt yêu cầu kết nối HTTPS để truy cập Camera/Microphone.');
        return null;
      }
      if (import.meta.env.DEV) console.warn('[PrivateCall] Full media failed, trying basic constraints:', err);
      
      // Fallback 1: Try basic constraints without resolution ideals
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('SecureContextError');
        }
        const simpleStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localRef.current = simpleStream;
        setLocalStream(simpleStream);
        simpleStream.getAudioTracks().forEach(t => { t.enabled = micOnRef.current; });
        simpleStream.getVideoTracks().forEach(t => { t.enabled = camOnRef.current; });
        if (setCamOn) setCamOn(simpleStream.getVideoTracks().length > 0);
        if (setMicOn) setMicOn(simpleStream.getAudioTracks().length > 0);
        return simpleStream;
      } catch (errFallback) {
        if (import.meta.env.DEV) console.warn('[PrivateCall] Basic media failed, trying audio only:', errFallback);
      }

      if (setCamOn) setCamOn(false);
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('SecureContextError');
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true,
        });
        localRef.current = stream;
        setLocalStream(stream);
        stream.getAudioTracks().forEach(t => { t.enabled = micOnRef.current; });
        const hasAudio = stream.getAudioTracks().length > 0;
        if (setMicOn) setMicOn(hasAudio);
        return stream;
      } catch (err2) {
        if (import.meta.env.DEV) console.error('[PrivateCall] Audio-only also failed:', err2);
        if (setMicOn) setMicOn(false);
        setError(err.name === 'NotAllowedError' || err2.name === 'NotAllowedError'
          ? 'Vui lòng cấp quyền camera và microphone để gọi video.'
          : 'Không thể truy cập camera/microphone hoặc thiết bị yêu cầu HTTPS.');
        return null;
      }
    }
  }, [setCamOn, setMicOn]);

  // Toggle mic/cam
  useEffect(() => {
    if (!localRef.current) return;
    localRef.current.getAudioTracks().forEach(t => { t.enabled = micOn; });
    channelRef.current?.send({
      type: 'broadcast', event: 'pc_signal',
      payload: { type: 'state', from: myId, micOn, camOn: camOnRef.current }
    });
  }, [micOn]); // eslint-disable-line

  useEffect(() => {
    if (!localRef.current) return;
    localRef.current.getVideoTracks().forEach(t => { t.enabled = camOn; });
    channelRef.current?.send({
      type: 'broadcast', event: 'pc_signal',
      payload: { type: 'state', from: myId, camOn, micOn: micOnRef.current }
    });
  }, [camOn]); // eslint-disable-line

  // Main signaling
  useEffect(() => {
    if (!callId || !user?.id) return;

    let cancelled = false;
    let ch = null;
    let subTimeout = null;

    const startCall = async () => {
      // 1. Khởi động camera và mic trước (không thoát sớm để vẫn kết nối kênh tín hiệu ngay cả khi từ chối quyền)
      const stream = await startMedia();
      if (cancelled) return;

      const createPC = (localStreamObj) => {
        const pc = new RTCPeerConnection({
          ...ICE_SERVERS,
          bundlePolicy: 'max-bundle',
          rtcpMuxPolicy: 'require',
        });
        pcRef.current = pc;

        if (localStreamObj) {
          localStreamObj.getTracks().forEach(t => pc.addTrack(t, localStreamObj));
        }

        pc.ontrack = (e) => {
          if (import.meta.env.DEV) console.log('[PrivateCall] Remote track added:', e.track.kind);
          setRemoteStream(prevStream => {
            const stream = prevStream || new MediaStream();
            stream.getTracks().forEach(t => {
              if (t.kind === e.track.kind) {
                stream.removeTrack(t);
              }
            });
            stream.addTrack(e.track);
            return new MediaStream(stream.getTracks());
          });
          setConnected(true);
        };

        pc.onicecandidate = (e) => {
          if (e.candidate && channelRef.current) {
            channelRef.current.send({
              type: 'broadcast', event: 'pc_signal',
              payload: { type: 'ice', from: myId, candidate: e.candidate }
            });
          }
        };

        pc.onconnectionstatechange = () => {
          if (import.meta.env.DEV) {
            console.log(`[PrivateCall] Connection state changed:`, pc.connectionState);
          }
          if (pc.connectionState === 'connected') {
            setConnected(true);
          }
          if (['failed', 'closed'].includes(pc.connectionState)) {
            setConnected(false);
            setRemoteStream(null);
            if (pcRef.current === pc) {
              try { pcRef.current.close(); } catch (e) {}
              pcRef.current = null;
            }
          }
        };

        pc.oniceconnectionstatechange = () => {
          if (import.meta.env.DEV) {
            console.log(`[PrivateCall] ICE Connection state changed:`, pc.iceConnectionState);
          }
          if (pc.iceConnectionState === 'connected') {
            setConnected(true);
          }
          if (['failed', 'closed'].includes(pc.iceConnectionState)) {
            setConnected(false);
            setRemoteStream(null);
            if (pcRef.current === pc) {
              try { pcRef.current.close(); } catch (e) {}
              pcRef.current = null;
            }
          }
        };

        return pc;
      };

      const setupPrivateChannel = () => {
        if (cancelled) return;

        ch = supabase.channel(`private_call_${callId}`, {
          config: { broadcast: { self: false } }
        });
        channelRef.current = ch;

        ch.on('broadcast', { event: 'pc_signal' }, async ({ payload: msg }) => {
          if (!msg || msg.from === myId || cancelled) return;

          if (msg.type === 'join' || msg.type === 'ready') {
            if (msg.camOn !== undefined) setRemoteCamOn(msg.camOn);
            if (msg.micOn !== undefined) setRemoteMicOn(msg.micOn);

            const isConnected = pcRef.current && (
              pcRef.current.connectionState === 'connected' ||
              pcRef.current.iceConnectionState === 'connected'
            );
            if (!isConnected) {
              // Tie-breaker: lexicographically smaller ID initiates the offer
              if (myId < msg.from) {
                if (import.meta.env.DEV) console.log('[PrivateCall] My ID is smaller, initiating offer...');
                if (pcRef.current) {
                  try { pcRef.current.close(); } catch (e) {}
                  pcRef.current = null;
                }
                iceCandidateQueue.current = [];
                const currentStream = localRef.current;
                const pc = createPC(currentStream);
                const offer = await pc.createOffer({ iceRestart: true });
                await pc.setLocalDescription(offer);
                channelRef.current?.send({
                  type: 'broadcast', event: 'pc_signal',
                  payload: { type: 'offer', from: myId, offer, camOn: camOnRef.current, micOn: micOnRef.current }
                });
              } else {
                if (import.meta.env.DEV) console.log('[PrivateCall] My ID is larger, waiting for remote offer...');
                if (msg.type === 'join') {
                  channelRef.current?.send({
                    type: 'broadcast', event: 'pc_signal',
                    payload: { type: 'ready', from: myId, camOn: camOnRef.current, micOn: micOnRef.current }
                  });
                }
              }
            }
          }

          if (msg.type === 'offer') {
            if (msg.camOn !== undefined) setRemoteCamOn(msg.camOn);
            if (msg.micOn !== undefined) setRemoteMicOn(msg.micOn);

            if (pcRef.current) {
              const state = pcRef.current.connectionState;
              if (state !== 'failed' && state !== 'closed') {
                if (import.meta.env.DEV) console.log('[PrivateCall] Peer connection already active, skipping offer processing.');
                return;
              }
            }
            if (import.meta.env.DEV) console.log('[PrivateCall] Received new offer, setting peer connection...');
            if (pcRef.current) {
              try { pcRef.current.close(); } catch (e) {}
              pcRef.current = null;
            }
            iceCandidateQueue.current = []; // Clear old queue
            const currentStream = localRef.current;
            const pc = createPC(currentStream);
            await pc.setRemoteDescription(msg.offer);
            // Flush ICE candidates
            while (iceCandidateQueue.current.length > 0) {
              const c = iceCandidateQueue.current.shift();
              try {
                await pc.addIceCandidate(new RTCIceCandidate(c));
              } catch (e) {}
            }
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            channelRef.current?.send({
              type: 'broadcast', event: 'pc_signal',
              payload: { type: 'answer', from: myId, answer, camOn: camOnRef.current, micOn: micOnRef.current }
            });
          }

          if (msg.type === 'answer') {
            if (msg.camOn !== undefined) setRemoteCamOn(msg.camOn);
            if (msg.micOn !== undefined) setRemoteMicOn(msg.micOn);

            if (pcRef.current) {
              const isConnected = pcRef.current.connectionState === 'connected' || pcRef.current.iceConnectionState === 'connected';
              if (!isConnected) {
                if (import.meta.env.DEV) console.log('[PrivateCall] Received answer, applying remote description...');
                await pcRef.current.setRemoteDescription(msg.answer);
                // Flush ICE candidates
                while (iceCandidateQueue.current.length > 0) {
                  const c = iceCandidateQueue.current.shift();
                  try {
                    await pcRef.current.addIceCandidate(new RTCIceCandidate(c));
                  } catch (e) {}
                }
              }
            }
          }

          if (msg.type === 'state') {
            if (msg.camOn !== undefined) setRemoteCamOn(msg.camOn);
            if (msg.micOn !== undefined) setRemoteMicOn(msg.micOn);
          }

          if (msg.type === 'ice') {
            const pc = pcRef.current;
            if (pc && pc.remoteDescription) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
              } catch (e) {}
            } else {
              iceCandidateQueue.current.push(msg.candidate);
            }
          }

          if (msg.type === 'hangup') {
            setConnected(false);
            setRemoteStream(null);
            if (onHangupRef.current) onHangupRef.current();
          }
        });

        ch.subscribe(async (status) => {
          if (cancelled) return;
          if (import.meta.env.DEV) {
            console.log(`[PrivateCall] Channel status: ${status}`);
          }

          if (status === 'SUBSCRIBED') {
            // Send join immediately
            channelRef.current?.send({
              type: 'broadcast', event: 'pc_signal',
              payload: { type: 'join', from: myId, camOn: camOnRef.current, micOn: micOnRef.current }
            });

            // Start interval if not running
            if (!readyIntervalRef.current) {
              readyIntervalRef.current = setInterval(() => {
                const isConnected = pcRef.current && (
                  pcRef.current.connectionState === 'connected' ||
                  pcRef.current.iceConnectionState === 'connected'
                );
                if (isConnected) return;

                if (import.meta.env.DEV) console.log('[PrivateCall] Retrying join broadcast...');
                channelRef.current?.send({
                  type: 'broadcast', event: 'pc_signal',
                  payload: { type: 'join', from: myId, camOn: camOnRef.current, micOn: micOnRef.current }
                });
              }, 4000);
            }
          }

          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            if (import.meta.env.DEV) {
              console.warn(`[PrivateCall] Channel subscription failed (${status}). Retrying in 3s...`);
            }
            clearTimeout(subTimeout);
            subTimeout = setTimeout(() => {
              if (ch) {
                supabase.removeChannel(ch);
              }
              setupPrivateChannel();
            }, 3000);
          }
        });
      };

      setupPrivateChannel();
    };

    startCall();

    return () => {
      cancelled = true;
      clearTimeout(subTimeout);
      if (readyIntervalRef.current) {
        clearInterval(readyIntervalRef.current);
        readyIntervalRef.current = null;
      }
      if (ch) {
        try {
          ch.send({
            type: 'broadcast', event: 'pc_signal',
            payload: { type: 'hangup', from: myId }
          });
        } catch (e) {}
        supabase.removeChannel(ch);
      }
      pcRef.current?.close();
      pcRef.current = null;
      localRef.current?.getTracks().forEach(t => t.stop());
      localRef.current = null;
      setRemoteStream(null);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId, user?.id, startMedia, myId]);

  const hangup = useCallback(async () => {
    if (channelRef.current) {
      await channelRef.current.send({
        type: 'broadcast', event: 'pc_signal',
        payload: { type: 'hangup', from: myId }
      });
    }
  }, [myId]);

  return { localStream, remoteStream, connected, error, hangup, remoteCamOn, remoteMicOn };
}

/* ─── Nút điều khiển ─────────────────────────────────────── */
function CtrlBtn({ onClick, title, active = true, danger = false, children }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: danger ? 64 : 56, height: danger ? 64 : 56,
        borderRadius: '50%',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '22px',
        transition: 'all 0.2s ease',
        background: danger
          ? (hov ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.15)')
          : active
            ? (hov ? '#e5e5e5' : '#ffffff')
            : (hov ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)'),
        border: danger
          ? '1.5px solid rgba(239, 68, 68, 0.5)'
          : active
            ? '1.5px solid #ffffff'
            : '1.5px solid rgba(255,255,255,0.2)',
        boxShadow: 'none',
        transform: hov ? (danger ? 'scale(1.1) rotate(-5deg)' : 'scale(1.08)') : 'scale(1)',
        color: danger ? '#ef4444' : active ? '#000000' : '#ffffff',
      }}
    >
      {children}
    </button>
  );
}

/* ─── VideoTile ──────────────────────────────────────────── */
function VideoTile({ stream, name, avatar, muted = false, camOff = false, mirrored = false, style = {} }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !stream) return;
    ref.current.srcObject = stream;
    ref.current.play().catch(() => {});

    const handleTrackAdded = () => {
      if (ref.current) {
        ref.current.play().catch(() => {});
      }
    };
    stream.addEventListener('addtrack', handleTrackAdded);
    return () => {
      stream.removeEventListener('addtrack', handleTrackAdded);
    };
  }, [stream]);

  const isConnecting = !stream;

  return (
    <div style={{
      position: 'relative',
      background: '#1A1A1A',
      border: '1.5px solid #262626',
      borderRadius: '20px',
      overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      ...style,
    }}>
      {stream && (
        <video
          ref={ref}
          autoPlay playsInline muted={muted}
          disablePictureInPicture
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover',
            transform: mirrored ? 'scaleX(-1)' : 'none',
          }}
        />
      )}

      {(camOff || !stream) && (
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: '20px',
          background: '#1A1A1A',
          width: '100%', height: '100%',
          justifyContent: 'center',
          position: 'absolute',
          inset: 0,
          zIndex: 2,
        }}>
          <div style={{ position: 'relative', marginBottom: isConnecting ? '10px' : '0px' }}>
            <div style={{
              borderRadius: '50%',
              border: '1.5px solid rgba(255,255,255,0.1)',
              display: 'inline-flex',
              overflow: 'hidden',
              boxShadow: 'none',
            }}>
              <Avatar src={avatar} name={name} size={isConnecting ? 88 : 80} />
            </div>
          </div>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>
            {camOff ? 'Camera tắt' : 'Đang kết nối...'}
          </span>
        </div>
      )}

      {/* Tên */}
      <div style={{
        position: 'absolute', bottom: '14px', left: '14px',
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(12px)',
        borderRadius: '12px', padding: '6px 14px',
        fontSize: '12.5px', fontWeight: 600, color: '#fff',
        border: '1px solid rgba(255,255,255,0.15)',
        zIndex: 5,
        boxShadow: 'none',
      }}>
        {name}
      </div>
    </div>
  );
}

/* ─── TRANG CHÍNH ────────────────────────────────────────── */
export default function PrivateCall() {
  const { callId } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      try {
        StatusBar.show().catch(() => {});
        StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
        StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
        StatusBar.setBackgroundColor({ color: '#000000' }).catch(() => {});
      } catch (err) {
        console.warn('StatusBar error in PrivateCall:', err);
      }
    }
    return () => {
      if (Capacitor.isNativePlatform()) {
        try {
          StatusBar.setStyle({ style: Style.Light }).catch(() => {});
          StatusBar.setBackgroundColor({ color: '#ffffff' }).catch(() => {});
        } catch (err) {
          console.warn('StatusBar error on PrivateCall cleanup:', err);
        }
      }
    };
  }, []);

  const mode = searchParams.get('mode') || 'caller';
  const friendName = (() => { try { return decodeURIComponent(searchParams.get('friendName') || ''); } catch { return ''; } })() || 'Người dùng';
  const friendAvatar = (() => { try { return decodeURIComponent(searchParams.get('friendAvatar') || ''); } catch { return ''; } })() || '';
  const friendId = searchParams.get('friendId') || null;



  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const localMirrored = true;
  const [showControls, setShowControls] = useState(true);
  const [pipSwapped, setPipSwapped] = useState(false);
  const hideTimer = useRef(null);

  // Theo dõi thời gian cuộc gọi ở cấp component
  const elapsedRef = useRef(0);
  const [elapsed, setElapsed] = useState(0);

  const [partnerHungUp, setPartnerHungUp] = useState(false);
  const [callEndedMsg, setCallEndedMsg] = useState(null); // 'no_answer' | 'cancelled'

  // Đọc callStatus và cancelCall từ CallContext (hiển thị khi timeout / bị hủy)
  const { callStatus, cancelCall } = useCall();

  // Khi callStatus thay đổi trong context (cho cả caller và callee)
  useEffect(() => {
    if (callStatus === 'no_answer') {
      setCallEndedMsg('no_answer');
      setTimeout(() => navigate('/chat'), 2000);
    } else if (callStatus === 'rejected') {
      setCallEndedMsg('rejected');
      setTimeout(() => navigate('/chat'), 2000);
    } else if (callStatus === 'missed') {
      setCallEndedMsg('cancelled');
      setTimeout(() => navigate('/chat'), 2000);
    }
  }, [callStatus, navigate]);

  const { localStream, remoteStream, connected, error, hangup, remoteCamOn, remoteMicOn } = usePrivateWebRTC({
    callId, user, mode, micOn, camOn, setMicOn, setCamOn,
    onHangup: () => {
      setPartnerHungUp(true);
      setTimeout(() => navigate('/chat'), 1500);
    }
  });

  const connectedRef = useRef(connected);
  useEffect(() => { connectedRef.current = connected; }, [connected]);

  const cancelCallRef = useRef(cancelCall);
  useEffect(() => { cancelCallRef.current = cancelCall; }, [cancelCall]);

  useEffect(() => {
    return () => {
      if (mode === 'caller' && !connectedRef.current) {
        cancelCallRef.current?.(false).catch(() => {});
      }
    };
  }, [mode]);

  // Tự động kết thúc nếu không thể kết nối WebRTC sau 35 giây (chống kẹt màn hình chờ khi đối phương đã hủy cuộc gọi)
  useEffect(() => {
    if (connected || partnerHungUp || callEndedMsg) return;

    const connectionTimeout = setTimeout(() => {
      setCallEndedMsg('cancelled');
      setTimeout(() => navigate('/chat'), 1500);
    }, 35000); // 35 giây timeout

    return () => clearTimeout(connectionTimeout);
  }, [connected, partnerHungUp, callEndedMsg, navigate]);

  // Đếm thời gian khi connected
  useEffect(() => {
    if (!connected) return;
    const iv = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
    }, 1000);
    return () => clearInterval(iv);
  }, [connected]);

  // Auto-hide controls sau 5s
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 5000);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    resetHideTimer();
    return () => clearTimeout(hideTimer.current);
  }, [resetHideTimer]);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const handleEndCall = useCallback(async () => {
    try {
      if (!connected && mode === 'caller') {
        await cancelCall(false);
      } else {
        await hangup();
      }
    } catch (err) {
      if (import.meta.env.DEV) console.warn('Failed to send hangup signal:', err);
    }

    // Gửi tin nhắn tổng kết thời gian cuộc gọi vào chat nếu có kết nối
    if (elapsedRef.current > 0 && user?.id && friendId) {
      const mm = String(Math.floor(elapsedRef.current / 60)).padStart(2, '0');
      const ss = String(elapsedRef.current % 60).padStart(2, '0');
      const summary = `📞 Cuộc gọi video đã kết thúc · ${mm}:${ss}`;
      try { await sendMessage(user.id, friendId, summary); } catch { /* ignore */ }
    }
    navigate('/chat');
  }, [connected, mode, cancelCall, hangup, navigate, user?.id, friendId]);

  return (
    <>
      <style>{`
        @keyframes pc-pulse-ring {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.05); }
        }
        @keyframes pc-fade-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pc-connecting-dot {
          0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
          40%           { transform: scale(1); opacity: 1; }
        }
        @keyframes pc-reject-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.6); }
          50%       { box-shadow: 0 0 0 18px rgba(239, 68, 68, 0); }
        }
        @keyframes pc-avatar-glow {
          0%, 100% { box-shadow: 0 0 0 4px rgba(255,255,255,0.3), 0 0 30px rgba(255,255,255,0.2); }
          50%       { box-shadow: 0 0 0 8px rgba(255,255,255,0.5), 0 0 50px rgba(255,255,255,0.35); }
        }
        @keyframes pc-wave {
          0%   { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        .pc-controls-bar {
          transition: opacity 0.35s ease, transform 0.35s ease;
        }
        .pc-pip-container {
          width: 180px !important;
          height: 260px !important;
          bottom: var(--bottom-pos) !important;
        }
        @media (max-width: 768px) {
          .pc-pip-container {
            width: 100px !important;
            height: 145px !important;
            right: 16px !important;
            bottom: var(--bottom-pos-mobile) !important;
          }
        }
      `}</style>

      <div
        onMouseMove={resetHideTimer}
        onClick={resetHideTimer}
        style={{
          position: 'fixed', inset: 0,
          background: '#0A0A0C',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
          color: '#ffffff',
          userSelect: 'none',
          cursor: showControls ? 'default' : 'none',
        }}
      >
        {/* ── Header ── */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          padding: isNative ? 'calc(env(safe-area-inset-top, 28px) + 12px) 24px 40px' : '24px 24px 40px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0) 100%)',
          zIndex: 10,
          opacity: showControls ? 1 : 0,
          pointerEvents: showControls ? 'auto' : 'none',
          transform: showControls ? 'translateY(0)' : 'translateY(-10px)',
          transition: 'opacity 0.35s, transform 0.35s',
        }}>
          {/* Tên + trạng thái */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Avatar src={friendAvatar} name={friendName} size={40} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '16px', color: '#ffffff' }}>{friendName}</div>
              <div style={{ fontSize: '12px', color: '#e5e5e5', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {connected ? (
                  <>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                    <span>{String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}</span>
                  </>
                ) : (
                  <>
                    {[0, 1, 2].map(i => (
                      <span key={i} style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: '#d4d4d8', display: 'inline-block',
                        animation: `pc-connecting-dot 1.4s ease-in-out ${i * 0.2}s infinite`,
                      }} />
                    ))}
                    <span style={{ marginLeft: 4, color: '#d4d4d8' }}>Đang kết nối...</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Label phòng */}
          <div style={{
            fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em',
            color: '#d4d4d8', textTransform: 'uppercase',
          }}>
            Cuộc gọi riêng tư
          </div>
        </div>

        <div style={{
          flex: 1, position: 'relative', overflow: 'hidden',
          display: 'flex', padding: 0,
        }}>
          {/* Video chính — chiếm toàn màn hình */}
          <VideoTile
            stream={pipSwapped ? localStream : remoteStream}
            name={pipSwapped ? (user?.fullName || 'Bạn') : friendName}
            avatar={pipSwapped ? user?.avatar : friendAvatar}
            muted={pipSwapped ? true : false}
            camOff={pipSwapped ? !camOn : (!remoteStream || !remoteCamOn)}
            mirrored={pipSwapped ? localMirrored : false}
            style={{ position: 'absolute', inset: 0, borderRadius: 0, border: 'none' }}
          />

          {/* Video phụ — Picture in Picture (góc dưới phải) */}
          <div
            className="pc-pip-container"
            style={{
              position: 'absolute',
              right: '30px',
              borderRadius: '16px',
              overflow: 'hidden',
              border: '1.5px solid rgba(255, 255, 255, 0.2)',
              boxShadow: 'none',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              zIndex: 40, cursor: 'pointer',
              animation: 'pc-fade-in 0.4s ease forwards',
              '--bottom-pos': showControls ? '120px' : '30px',
              '--bottom-pos-mobile': showControls ? '110px' : '16px',
            }}
            onClick={() => setPipSwapped(s => !s)}
            title="Nhấn để đổi màn hình chính"
          >
            <VideoTile
              stream={pipSwapped ? remoteStream : localStream}
              name={pipSwapped ? friendName : (user?.fullName || 'Bạn')}
              avatar={pipSwapped ? friendAvatar : user?.avatar}
              muted={pipSwapped ? false : true}
              camOff={pipSwapped ? (!remoteStream || !remoteCamOn) : !camOn}
              mirrored={pipSwapped ? false : localMirrored}
              style={{ borderRadius: 0, width: '100%', height: '100%' }}
            />
            <div style={{
              position: 'absolute', top: '8px', right: '8px',
              background: 'rgba(0,0,0,0.65)', borderRadius: '6px',
              padding: '6px 10px', fontSize: '11px', color: '#fff',
              fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px',
              boxShadow: 'none',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.85)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.65)'}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"></polyline>
                <polyline points="9 21 3 21 3 15"></polyline>
                <line x1="21" y1="3" x2="14" y2="10"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
              </svg>
              Phóng to
            </div>
          </div>

          {/* Lỗi */}
          {error && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'rgba(10, 10, 12, 0.95)', zIndex: 15,
              backdropFilter: 'blur(12px)',
              flexDirection: 'column', gap: '16px', padding: '32px',
              textAlign: 'center',
            }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <div style={{ fontWeight: 700, fontSize: '18px', color: '#ef4444' }}>Không thể kết nối</div>
              <div style={{ fontSize: '14px', color: '#a3a3a3', maxWidth: '300px', lineHeight: 1.6 }}>{error}</div>
              <button onClick={handleEndCall} style={{
                padding: '10px 24px', background: 'rgba(239, 68, 68, 0.15)',
                border: '1.5px solid rgba(239, 68, 68, 0.4)', borderRadius: '12px', color: '#ef4444',
                fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: 'none',
              }}>Quay lại</button>
            </div>
          )}

          {/* Đối phương cúp máy */}
          {partnerHungUp && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'rgba(10, 10, 12, 0.95)', zIndex: 15,
              backdropFilter: 'blur(12px)',
              flexDirection: 'column', gap: '16px', padding: '32px',
              textAlign: 'center',
            }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.18 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
                <line x1="23" y1="1" x2="1" y2="23" />
              </svg>
              <div style={{ fontWeight: 700, fontSize: '18px', color: '#ffffff' }}>Cuộc gọi đã kết thúc</div>
              <div style={{ fontSize: '14px', color: '#a3a3a3', maxWidth: '300px', lineHeight: 1.6 }}>Đối phương đã gác máy. Đang quay lại phòng chat...</div>
            </div>
          )}

          {/* Timeout / bị hủy — hiển thị cho cả 2 bên */}
          {callEndedMsg && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'rgba(10, 10, 12, 0.95)', zIndex: 16,
              backdropFilter: 'blur(12px)',
              flexDirection: 'column', gap: '20px', padding: '32px',
              textAlign: 'center',
              animation: 'pc-fade-in 0.3s ease',
            }}>
              {/* Premium icon container */}
              <div style={{
                position: 'relative',
                width: 80, height: 80,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {/* Icon circle */}
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'rgba(239,68,68,0.1)',
                  border: '1.5px solid #ef4444',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: 'none',
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.18 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
                    <line x1="23" y1="1" x2="1" y2="23" />
                  </svg>
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '20px', color: '#ef4444', marginBottom: '8px', letterSpacing: '-0.01em' }}>
                  {callEndedMsg === 'no_answer' ? 'Người nhận không bắt máy' : callEndedMsg === 'rejected' ? 'Người nhận đang bận' : 'Cuộc gọi đã bị hủy'}
                </div>
                <div style={{ fontSize: '13px', color: '#a3a3a3', lineHeight: 1.6 }}>
                  Đang quay lại phòng chat...
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Thanh điều khiển ── */}
        <div
          className="pc-controls-bar"
          style={{
            position: 'absolute',
            bottom: 0, left: 0, right: 0,
            padding: '40px 0 36px',
            background: 'linear-gradient(to top, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0) 100%)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: '16px',
            zIndex: 10,
            opacity: showControls ? 1 : 0,
            pointerEvents: showControls ? 'auto' : 'none',
            transform: showControls ? 'translateY(0)' : 'translateY(10px)',
          }}
        >
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {/* Mic */}
            <CtrlBtn onClick={() => setMicOn(m => !m)} title={micOn ? 'Tắt mic' : 'Bật mic'} active={micOn}>
              {micOn ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="2" x2="22" y1="2" y2="22" />
                  <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
                  <path d="M5 10v2a7 7 0 0 0 12 5.79" />
                  <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
                  <path d="M9 9v3a3 3 0 0 0 4.3 2.72" />
                  <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
              )}
            </CtrlBtn>

            {/* Kết thúc cuộc gọi — nút lớn ở giữa */}
            <CtrlBtn onClick={handleEndCall} title="Kết thúc cuộc gọi" danger>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.18 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
                <line x1="23" y1="1" x2="1" y2="23" />
              </svg>
            </CtrlBtn>

            {/* Camera */}
            <CtrlBtn onClick={() => setCamOn(c => !c)} title={camOn ? 'Tắt camera' : 'Bật camera'} active={camOn}>
              {camOn ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m22 8-6 4 6 4V8Z" />
                  <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m22 8-6 4 6 4V8Z" />
                  <rect width="14" height="12" x="2" y="6" rx="2" ry="2" style={{ opacity: 0.5 }} />
                  <line x1="2" x2="22" y1="2" y2="22" />
                </svg>
              )}
            </CtrlBtn>
          </div>

          {/* Trạng thái */}
          {!connected && !error && (
            <div style={{
              fontSize: '12px', color: '#a3a3a3',
              letterSpacing: '0.05em',
            }}>
              Đang chờ {friendName} kết nối...
            </div>
          )}
        </div>
      </div>
    </>
  );
}
