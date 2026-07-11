// src/components/common/Fireworks.jsx
import { useEffect, useRef, useState } from 'react';

const COLORS = [
  '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff',
  '#ff9ff3', '#ff9f43', '#00d2d3', '#f368e0',
  '#ffffff', '#ffdd59',
];

function rand(a, b) { return a + Math.random() * (b - a); }

function burst(x, y, particles) {
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const count = Math.floor(rand(55, 90));
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + rand(-0.15, 0.15);
    const speed = rand(1.8, 6.5);
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      alpha: 1,
      decay: rand(0.013, 0.024),
      size: rand(1.5, 3.2),
      color,
      gravity: rand(0.07, 0.13),
      twinkle: Math.random() > 0.5,
    });
  }
}

export default function Fireworks() {
  const canvasRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('sc_fireworks')) {
      sessionStorage.removeItem('sc_fireworks');
      sessionStorage.removeItem('sc_fireworks_name');
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let raf;
    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const particles = [];
    const rockets   = [];
    let launched = 0;
    const MAX = 10;
    let lastLaunch = 0;

    function tryLaunch(now) {
      if (launched >= MAX) return;
      const gap = launched < 4 ? 300 : 480;
      if (now - lastLaunch < gap) return;
      lastLaunch = now;
      launched++;
      rockets.push({
        x: rand(canvas.width * 0.12, canvas.width * 0.88),
        y: canvas.height,
        vy: rand(-15, -10),
        targetY: rand(canvas.height * 0.1, canvas.height * 0.45),
        trail: [],
        done: false,
      });
    }

    function loop(now) {
      // Transparent canvas — không tối màn hình
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      tryLaunch(now);

      // Rockets
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        if (r.done) { rockets.splice(i, 1); continue; }
        r.trail.push({ x: r.x, y: r.y });
        if (r.trail.length > 12) r.trail.shift();
        r.y  += r.vy;
        r.vy += 0.28;
        if (r.y <= r.targetY || r.vy >= 0) {
          burst(r.x, r.y, particles);
          r.done = true;
        }
        r.trail.forEach((pt, idx) => {
          const a = (idx / r.trail.length) * 0.9;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,220,80,${a})`;
          ctx.fill();
        });
      }

      // Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x  += p.vx;
        p.y  += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.97;
        p.alpha -= p.twinkle
          ? p.decay * (0.7 + 0.6 * Math.abs(Math.sin(now * 0.012 + i)))
          : p.decay;
        if (p.alpha <= 0) { particles.splice(i, 1); continue; }
        ctx.globalAlpha = Math.min(p.alpha, 1);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }

      ctx.globalAlpha = 1;

      // Tự tắt khi xong
      if (launched >= MAX && rockets.length === 0 && particles.length === 0) {
        setVisible(false);
        return;
      }
      raf = requestAnimationFrame(loop);
    }

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, zIndex: 99998, pointerEvents: 'none' }}
    />
  );
}
