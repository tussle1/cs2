/* ============================================================
   sound.js — tiny WebAudio synth for UI bleeps (no audio files)
   ============================================================ */

import settings from './settings.js';

let ctx = null;
let master = null;

function audio() {
  if (!settings.get('sounds')) return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = settings.get('volume') * 0.5;
    master.connect(ctx.destination);
    settings.subscribe((k) => {
      if (k === 'volume' || k === '*') master.gain.value = settings.get('volume') * 0.5;
    });
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function unlock() { audio(); }

function tone(freq, t0, dur, { type = 'sine', gain = 0.25, attack = 0.008, release = 0.12 } = {}) {
  const ac = audio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + t0);
  g.gain.setValueAtTime(0.0001, ac.currentTime + t0);
  g.gain.exponentialRampToValueAtTime(gain, ac.currentTime + t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + t0 + dur + release);
  osc.connect(g).connect(master);
  osc.start(ac.currentTime + t0);
  osc.stop(ac.currentTime + t0 + dur + release + 0.02);
}

function noise(t0, dur, { gain = 0.12, freq = 900, q = 1.2 } = {}) {
  const ac = audio();
  if (!ac) return;
  const len = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = freq;
  bp.Q.value = q;
  const g = ac.createGain();
  g.gain.value = gain;
  src.connect(bp).connect(g).connect(master);
  src.start(ac.currentTime + t0);
}

export const sfx = {
  click() { tone(1250, 0, 0.02, { type: 'square', gain: 0.06, release: 0.03 }); },
  open() { tone(660, 0, 0.05, { type: 'sine', gain: 0.12 }); tone(990, 0.045, 0.06, { gain: 0.1 }); },
  close() { tone(520, 0, 0.05, { gain: 0.1 }); tone(330, 0.04, 0.07, { gain: 0.09 }); },
  minimize() { noise(0, 0.14, { freq: 700, gain: 0.05 }); },
  error() { tone(330, 0, 0.10, { type: 'triangle', gain: 0.18 }); tone(247, 0.12, 0.16, { type: 'triangle', gain: 0.16 }); },
  ding() { tone(880, 0, 0.09, { gain: 0.14 }); tone(1320, 0.06, 0.14, { gain: 0.09 }); },
  notify() { tone(784, 0, 0.08, { gain: 0.13 }); tone(1047, 0.08, 0.12, { gain: 0.1 }); },
  tick() { tone(1800, 0, 0.012, { type: 'square', gain: 0.03, release: 0.02 }); },
  beep() { tone(1000, 0, 0.08, { type: 'square', gain: 0.08 }); },
  boom() { noise(0, 0.3, { freq: 220, gain: 0.2 }); tone(110, 0, 0.3, { type: 'sine', gain: 0.2 }); },

  /** A soft four-note startup chime, the XP way. */
  startup() {
    const notes = [[587.33, 0], [880, 0.16], [1174.66, 0.34], [1567.98, 0.52]];
    notes.forEach(([f, t]) => tone(f, t, 0.5, { type: 'sine', gain: 0.13, attack: 0.02, release: 0.7 }));
    notes.forEach(([f, t]) => tone(f / 2, t, 0.45, { type: 'triangle', gain: 0.05, attack: 0.02, release: 0.6 }));
  },
  shutdown() {
    [[880, 0], [659.25, 0.18], [523.25, 0.36], [392, 0.54]].forEach(([f, t]) =>
      tone(f, t, 0.5, { type: 'sine', gain: 0.12, release: 0.6 }));
  },
  logoff() { [[659.25, 0], [523.25, 0.14], [440, 0.28]].forEach(([f, t]) => tone(f, t, 0.35, { gain: 0.1 })); },
};

export function setVolume(v) {
  settings.set('volume', v);
  if (master) master.gain.value = v * 0.5;
}

export default sfx;
