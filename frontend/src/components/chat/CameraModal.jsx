import { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';

export default function CameraModal({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  
  const isNative = Capacitor.isNativePlatform();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768 || isNative);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768 || Capacitor.isNativePlatform());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const startNativeCamera = async () => {
        try {
          const { Camera, CameraResultType } = await import('@capacitor/camera');
          const image = await Camera.getPhoto({
            quality: 85,
            allowEditing: false,
            resultType: CameraResultType.Base64,
            promptLabelHeader: 'Chụp ảnh',
            promptLabelPhoto: 'Chọn từ thư viện',
            promptLabelPicture: 'Chụp ảnh mới'
          });
          if (image && image.base64String) {
            onCapture(`data:image/jpeg;base64,${image.base64String}`);
          } else {
            onClose();
          }
        } catch (err) {
          if (import.meta.env.DEV) console.warn('[CameraModal] Native camera cancelled or failed:', err);
          onClose();
        }
      };
      startNativeCamera();
    } else {
      const startCamera = async () => {
        const constraintOptions = [
          { video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } },
          { video: { width: { ideal: 1280 }, height: { ideal: 720 } } },
          { video: true }
        ];

        let stream = null;
        let lastError = null;

        for (const constraints of constraintOptions) {
          try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            break;
          } catch (err) {
            lastError = err;
          }
        }

        if (stream) {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            setReady(true);
          }
        } else {
          if (import.meta.env.DEV) console.error('All camera constraint options failed:', lastError);
          setError('Không thể truy cập camera. Vui lòng kiểm tra quyền thiết bị.');
        }
      };

      startCamera();
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [onCapture, onClose]);

  const handleCapture = () => {
    if (!ready || !videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Match resolution
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      onCapture(dataUrl);
    }
  };

  if (Capacitor.isNativePlatform()) {
    return (
      <div 
        style={{
          position: 'fixed', 
          inset: 0, 
          zIndex: 9999,
          background: 'rgba(10, 10, 20, 0.85)', 
          backdropFilter: 'blur(16px)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
        }}
      >
        <div style={{ color: '#ffffff', fontSize: '15px', fontWeight: 600 }}>
          Đang khởi động camera hệ thống...
        </div>
      </div>
    );
  }

  return (
    <div 
      style={{
        position: 'fixed', 
        inset: 0, 
        zIndex: 9999,
        background: 'rgba(10, 10, 20, 0.85)', 
        backdropFilter: 'blur(16px)',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: isMobile ? '12px' : '20px',
        animation: 'cameraFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: isMobile ? '16px' : '24px',
          padding: isMobile ? '16px' : '24px',
          width: isMobile ? '100%' : '560px',
          maxWidth: isMobile ? '92vw' : '100%',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: isMobile ? '14px' : '20px',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: isMobile ? '16px' : '18px', fontWeight: 800, color: 'var(--text-primary)' }}>Chụp ảnh trực tiếp</h3>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            ✕
          </button>
        </div>

        <div 
          style={{ 
            position: 'relative', 
            background: '#000', 
            borderRadius: '12px', 
            overflow: 'hidden',
            aspectRatio: isMobile ? '4/3' : '16/9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--border)',
          }}
        >
          {error ? (
            <div style={{ color: '#ef4444', textAlign: 'center', padding: '20px', fontSize: '13px', fontWeight: 600 }}>
              {error}
            </div>
          ) : (
            <>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
              {!ready && (
                <div style={{ position: 'absolute', color: '#fff', fontSize: '13px' }}>
                  Đang khởi động camera...
                </div>
              )}
            </>
          )}
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', width: '100%' }}>
          <button
            onClick={onClose}
            style={{
              flex: isMobile ? 1 : 'none',
              padding: isMobile ? '10px 16px' : '12px 24px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 700,
              fontFamily: 'inherit',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-input)'}
          >
            Hủy
          </button>
          
          <button
            onClick={handleCapture}
            disabled={!ready}
            style={{
              flex: isMobile ? 1.5 : 'none',
              padding: isMobile ? '10px 16px' : '12px 28px',
              background: ready ? 'var(--primary)' : 'var(--bg-input)',
              border: 'none',
              borderRadius: '12px',
              color: ready ? 'white' : 'var(--text-muted)',
              cursor: ready ? 'pointer' : 'default',
              fontSize: '14px',
              fontWeight: 800,
              fontFamily: 'inherit',
              transition: 'all 0.2s',
              opacity: ready ? 1 : 0.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
            onMouseEnter={e => { if (ready) e.currentTarget.style.opacity = '0.9'; }}
            onMouseLeave={e => { if (ready) e.currentTarget.style.opacity = '1'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            Chụp
          </button>
        </div>
      </div>
      <style>{`
        @keyframes cameraFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
