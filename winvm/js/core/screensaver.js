/* ============================================================
   screensaver.js — starfield / mystify, plus idle detection
   ============================================================ */

import settings from './settings.js';

let raf = 0;
let active = false;
let idleTimer = 0;
let lastActivity = Date.now();
let canvas = null;
let ctx2d = null;
let state = null;

const layer = () => document.getElementById('screensaver');

function sizeCanvas() {
  canvas.width = Math.floor(window.innerWidth * devicePixelRatio);
  canvas.height = Math.floor(window.innerHeight * devicePixelRatio);
  canvas.style.width = '100%';
  canvas.style.height = '100%';
}

function initStars() {
  const stars = [];
  for (let i = 0; i < 260; i++) {
    stars.push({
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2,
      z: Math.random() * 1 + 0.15,
      pz: 0,
    });
  }
  return { stars, t: 0 };
}

function initMystify() {
  const lines = [];
  for (let i = 0; i < 3; i++) {
    lines.push({
      pts: Array.from({ length: 4 }, () => ({
        x: Math.random() * 2 - 1,
        y: Math.random() * 2 - 1,
        vx: (Math.random() * 2 - 1) * 0.006,
        vy: (Math.random() * 2 - 1) * 0.006,
      })),
      hue: Math.random() * 360,
      trail: [],
    });
  }
  return { lines, t: 0 };
}

function draw() {
  if (!active) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx2d.fillStyle = '#000';
  ctx2d.fillRect(0, 0, w, h);
  const kind = state.kind;

  if (kind === 'mystify') {
    for (const line of state.data.lines) {
      line.trail.unshift(line.pts.map((p) => ({ x: p.x, y: p.y })));
      if (line.trail.length > 26) line.trail.pop();
      const color = `hsl(${(line.hue + state.data.t * 12) % 360} 90% 60%)`;
      ctx2d.strokeStyle = color;
      ctx2d.lineWidth = Math.max(2, 2 * devicePixelRatio);
      ctx2d.beginPath();
      const tr = line.trail;
      for (let i = 0; i < tr.length - 1; i++) {
        const a = tr[i];
        const b = tr[i + 1];
        const alpha = 1 - i / tr.length;
        ctx2d.globalAlpha = alpha * 0.85;
        ctx2d.beginPath();
        ctx2d.moveTo((a[0].x + 1) * w / 2, (a[0].y + 1) * h / 2);
        for (let k = 1; k < a.length; k++) ctx2d.lineTo((a[k].x + 1) * w / 2, (a[k].y + 1) * h / 2);
        ctx2d.closePath();
        ctx2d.moveTo((b[0].x + 1) * w / 2, (b[0].y + 1) * h / 2);
        for (let k = 1; k < b.length; k++) ctx2d.lineTo((b[k].x + 1) * w / 2, (b[k].y + 1) * h / 2);
        ctx2d.closePath();
        ctx2d.stroke();
      }
      ctx2d.globalAlpha = 1;
      for (const p of line.pts) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x > 1 || p.x < -1) p.vx *= -1;
        if (p.y > 1 || p.y < -1) p.vy *= -1;
      }
    }
    state.data.t += 1;
  } else {
    // starfield
    const cx = w / 2;
    const cy = h / 2;
    for (const s of state.data.stars) {
      s.pz = s.z;
      s.z -= 0.0075;
      if (s.z <= 0.02) {
        s.x = (Math.random() - 0.5) * 2;
        s.y = (Math.random() - 0.5) * 2;
        s.z = 1;
        s.pz = 1;
      }
      const k = 1 / s.z;
      const x = cx + s.x * k * w * 0.35;
      const y = cy + s.y * k * h * 0.35;
      if (x < 0 || x > w || y < 0 || y > h) continue;
      const px = cx + s.x * (1 / s.pz) * w * 0.35;
      const py = cy + s.y * (1 / s.pz) * h * 0.35;
      const size = Math.max(1, (1 - s.z) * 2.4) * devicePixelRatio;
      const bright = Math.min(1, (1 - s.z) * 1.4);
      ctx2d.strokeStyle = `rgba(210,235,255,${bright})`;
      ctx2d.lineWidth = size;
      ctx2d.beginPath();
      ctx2d.moveTo(px, py);
      ctx2d.lineTo(x, y);
      ctx2d.stroke();
    }
    state.data.t += 1;
  }

  if (state.data.t % 30 === 0) {
    ctx2d.fillStyle = 'rgba(255,255,255,.35)';
    ctx2d.font = `${13 * devicePixelRatio}px Tahoma, sans-serif`;
    ctx2d.textAlign = 'right';
    ctx2d.fillText('Windows XP  ·  move the mouse to continue', w - 20 * devicePixelRatio, h - 18 * devicePixelRatio);
  }

  raf = requestAnimationFrame(draw);
}

export function startSaver(kind) {
  if (active) return;
  const el = layer();
  if (!el) return;
  kind = kind || settings.get('screensaver');
  if (!kind || kind === 'none') return;
  active = true;
  el.hidden = false;
  el.innerHTML = '';
  canvas = document.createElement('canvas');
  el.appendChild(canvas);
  ctx2d = canvas.getContext('2d');
  sizeCanvas();
  state = { kind, data: kind === 'mystify' ? initMystify() : initStars() };
  window.addEventListener('resize', sizeCanvas);
  raf = requestAnimationFrame(draw);
}

export function stopSaver() {
  if (!active) return;
  active = false;
  cancelAnimationFrame(raf);
  const el = layer();
  if (el) { el.hidden = true; el.innerHTML = ''; }
  lastActivity = Date.now();
}

export function isActive() { return active; }

export function resetIdle() { lastActivity = Date.now(); }

export function initScreensaver() {
  const poke = () => {
    lastActivity = Date.now();
    if (active) stopSaver();
  };
  ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'].forEach((ev) =>
    window.addEventListener(ev, poke, { passive: true }));

  setInterval(() => {
    if (active) return;
    const wait = Number(settings.get('saverWait')) || 0;
    if (!wait) return;
    const kind = settings.get('screensaver');
    if (!kind || kind === 'none') return;
    if (Date.now() - lastActivity > wait * 60_000) startSaver(kind);
  }, 5000);

  clearInterval(idleTimer);
}

export default { initScreensaver, startSaver, stopSaver, resetIdle, isActive };
