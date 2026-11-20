/* ============================================================
   media.js — Windows Media Player with a little WebAudio synth
   ============================================================ */

import { menuBar } from '../core/menu.js';
import { icon } from '../core/icons.js';

const TRACKS = [
  {
    name: 'Windows XP Startup', artist: 'Microsoft (arranged)', bpm: 96, wave: 'sine', loop: 1,
    notes: [[59, 1], [71, 1], [83, 1], [88, 1], [null, 1], [86, 1], [83, 1], [null, 1]],
    bass: [[47, 2], [55, 2], [59, 2], [null, 2]],
  },
  {
    name: 'Bliss (Arena Theme)', artist: 'Arena Synth Ensemble', bpm: 104, wave: 'triangle', loop: 1,
    notes: [
      [72, 1], [76, 1], [79, 1], [76, 1], [72, 1], [74, 2], [null, 1],
      [71, 1], [74, 1], [79, 1], [83, 1], [79, 1], [76, 2], [null, 1],
      [72, 1], [76, 1], [81, 1], [79, 1], [76, 1], [74, 2], [null, 1],
      [69, 1], [72, 1], [76, 1], [79, 2], [null, 3],
    ],
    bass: [[48, 4], [53, 4], [55, 4], [48, 4], [45, 4], [52, 4], [50, 4], [48, 4]],
  },
  {
    name: 'Cursor Waltz', artist: 'The Pointers', bpm: 132, wave: 'square', loop: 1,
    notes: [
      [67, 1], [71, 1], [74, 1], [79, 3], [77, 1], [74, 1], [71, 3],
      [69, 1], [72, 1], [76, 1], [81, 3], [79, 1], [76, 1], [72, 3],
    ],
    bass: [[43, 3], [50, 3], [43, 3], [45, 3], [48, 3], [45, 3], [43, 3], [null, 3]],
  },
  {
    name: 'Dial-Up Blues', artist: '56k Modem Quartet', bpm: 88, wave: 'sawtooth', loop: 1,
    notes: [
      [57, 1], [58, 1], [57, 1], [55, 1], [null, 1], [60, 2], [63, 2],
      [65, 1], [64, 1], [62, 1], [60, 1], [null, 1], [57, 2], [null, 2],
    ],
    bass: [[45, 4], [43, 4], [41, 4], [40, 4]],
  },
];

const midiFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

export function launch(ctx, opts = {}) {
  const { wm } = ctx;

  wm.open({
    title: 'Windows Media Player',
    icon: 'media',
    width: 500, height: 520, minWidth: 380, minHeight: 420,
    appId: 'media',
    singleton: 'media',
    onMount: (body, win) => {
      body.innerHTML = `
        <div class="wmp">
          <div class="wmp-screen">
            <canvas></canvas>
            <div class="wmp-track">
              <div class="t">Nothing playing</div>
              <div class="a">Windows Media Player</div>
            </div>
          </div>
          <div class="wmp-controls">
            <div class="wmp-btns">
              <button data-act="prev" title="Previous">${icon('prev')}</button>
              <button data-act="play" title="Play">${icon('play')}</button>
              <button data-act="stop" title="Stop">${icon('stopSq')}</button>
              <button data-act="next" title="Next">${icon('next')}</button>
            </div>
            <div class="wmp-seek">
              <div class="wmp-bar"><i></i></div>
              <div class="wmp-times"><span data-cur>0:00</span><span data-dur>0:00</span></div>
            </div>
            <div class="wmp-vol">${icon('volume')}<input type="range" min="0" max="100" value="${Math.round(ctx.settings.get('volume') * 100)}" aria-label="Volume"></div>
          </div>
          <div class="wmp-playlist"></div>
        </div>`;

      const canvas = body.querySelector('canvas');
      const g = canvas.getContext('2d');
      const trackEl = body.querySelector('.wmp-track .t');
      const artistEl = body.querySelector('.wmp-track .a');
      const bar = body.querySelector('.wmp-bar i');
      const curEl = body.querySelector('[data-cur]');
      const durEl = body.querySelector('[data-dur]');
      const listEl = body.querySelector('.wmp-playlist');
      const playBtn = body.querySelector('[data-act="play"]');

      const state = {
        ac: null, gain: null, analyser: null, data: null,
        playing: false, index: 0, startAt: 0, loopDur: 0, loopTimer: null, raf: 0,
        vol: ctx.settings.get('volume'),
      };

      TRACKS.forEach((t, i) => {
        const b = document.createElement('button');
        b.innerHTML = `<span class="n">${i + 1}</span><span class="nm"></span>`;
        b.querySelector('.nm').textContent = `${t.name} — ${t.artist}`;
        b.addEventListener('click', () => { state.index = i; play(); });
        listEl.appendChild(b);
      });

      function audio() {
        if (state.ac) return state.ac;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        state.ac = new AC();
        state.gain = state.ac.createGain();
        state.gain.gain.value = state.vol;
        state.analyser = state.ac.createAnalyser();
        state.analyser.fftSize = 128;
        state.gain.connect(state.analyser);
        state.analyser.connect(state.ac.destination);
        state.data = new Uint8Array(state.analyser.frequencyBinCount);
        return state.ac;
      }

      function note(midi, t, dur, wave, gain = 0.16) {
        const ac = state.ac;
        const osc = ac.createOscillator();
        const env = ac.createGain();
        osc.type = wave;
        osc.frequency.value = midiFreq(midi);
        env.gain.setValueAtTime(0.0001, t);
        env.gain.exponentialRampToValueAtTime(gain, t + 0.02);
        env.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.95);
        osc.connect(env).connect(state.gain);
        osc.start(t);
        osc.stop(t + dur + 0.05);
      }

      function scheduleLoop(at) {
        const track = TRACKS[state.index];
        const beat = 60 / track.bpm;
        let t = at;
        for (const [m, beats] of track.notes) {
          const dur = beats * beat;
          if (m != null) note(m, t, dur, track.wave, 0.15);
          t += dur;
        }
        if (track.bass) {
          let bt = at;
          for (const [m, beats] of track.bass) {
            const dur = beats * beat;
            if (m != null) note(m - 12, bt, dur, 'triangle', 0.1);
            bt += dur;
          }
        }
        return t - at;
      }

      function play() {
        const ac = audio();
        if (!ac) return;
        if (ac.state === 'suspended') ac.resume();
        const track = TRACKS[state.index];
        state.playing = true;
        playBtn.innerHTML = icon('pause');
        trackEl.textContent = track.name;
        artistEl.textContent = track.artist;
        listEl.querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', i === state.index));
        state.startAt = ac.currentTime + 0.08;
        state.loopDur = scheduleLoop(state.startAt);
        clearInterval(state.loopTimer);
        state.loopTimer = setInterval(() => {
          if (!state.playing) return;
          state.startAt += state.loopDur;
          scheduleLoop(state.startAt);
        }, state.loopDur * 1000 - 60);
        durEl.textContent = fmt(state.loopDur);
        draw();
      }

      function stop() {
        state.playing = false;
        clearInterval(state.loopTimer);
        if (state.ac) { state.ac.close(); state.ac = null; state.gain = null; state.analyser = null; }
        playBtn.innerHTML = icon('play');
        bar.style.width = '0%';
        curEl.textContent = '0:00';
        cancelAnimationFrame(state.raf);
        clearCanvas();
      }

      function clearCanvas() {
        const r = canvas.getBoundingClientRect();
        canvas.width = Math.max(1, r.width * devicePixelRatio);
        canvas.height = Math.max(1, r.height * devicePixelRatio);
        g.clearRect(0, 0, canvas.width, canvas.height);
      }

      const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

      function draw() {
        if (!state.playing) return;
        const r = canvas.getBoundingClientRect();
        if (canvas.width !== Math.floor(r.width * devicePixelRatio)) {
          canvas.width = Math.floor(r.width * devicePixelRatio);
          canvas.height = Math.floor(r.height * devicePixelRatio);
        }
        g.clearRect(0, 0, canvas.width, canvas.height);
        if (state.analyser) state.analyser.getByteFrequencyData(state.data);
        const n = 28;
        const w = canvas.width / n;
        for (let i = 0; i < n; i++) {
          const v = state.data ? state.data[i * 1] / 255 : 0.15;
          const h = Math.max(2, v * canvas.height * 0.85);
          const grad = g.createLinearGradient(0, canvas.height, 0, canvas.height - h);
          grad.addColorStop(0, 'rgba(60,150,255,.25)');
          grad.addColorStop(1, 'rgba(150,220,255,.85)');
          g.fillStyle = grad;
          g.fillRect(i * w + w * 0.18, canvas.height - h, w * 0.64, h);
        }
        const ac = state.ac;
        if (ac) {
          const elapsed = Math.max(0, Math.min(state.loopDur, ac.currentTime - state.startAt));
          bar.style.width = `${(elapsed / state.loopDur) * 100}%`;
          curEl.textContent = fmt(elapsed);
        }
        state.raf = requestAnimationFrame(draw);
      }

      body.querySelector('.wmp-btns').addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        const a = b.dataset.act;
        if (a === 'play') { if (state.playing) { stop(); } else { play(); } }
        else if (a === 'stop') stop();
        else if (a === 'next') { state.index = (state.index + 1) % TRACKS.length; stop(); play(); }
        else if (a === 'prev') { state.index = (state.index - 1 + TRACKS.length) % TRACKS.length; stop(); play(); }
      });

      body.querySelector('input[type=range]').addEventListener('input', (e) => {
        state.vol = Number(e.target.value) / 100;
        if (state.gain) state.gain.gain.value = state.vol;
        ctx.settings.set('volume', state.vol);
      });

      menuBar(body, [
        { label: 'File', items: () => [
          { label: 'Open…', action: () => ctx.openApp('explorer', { path: 'C:\\Documents and Settings\\Administrator\\My Documents\\My Music' }) },
          { label: 'Close', action: () => win.close() },
        ] },
        { label: 'Play', items: () => [
          { label: 'Play/Pause', action: () => (state.playing ? stop() : play()) },
          { label: 'Stop', action: stop },
          { label: 'Next', action: () => { state.index = (state.index + 1) % TRACKS.length; stop(); play(); } },
          { label: 'Previous', action: () => { state.index = (state.index - 1 + TRACKS.length) % TRACKS.length; stop(); play(); } },
        ] },
        { label: 'View', items: () => [
          { label: 'Now Playing', checked: true, disabled: true },
          { label: 'Visualizations', checked: true, disabled: true },
        ] },
        { label: 'Help', items: () => [
          { label: 'About Windows Media Player', action: () => ctx.openApp('about') },
        ] },
      ]);

      body.addEventListener('keydown', (e) => {
        if (e.code === 'Space') { e.preventDefault(); state.playing ? stop() : play(); }
        e.stopPropagation();
      });

      win.onClose(() => { clearInterval(state.loopTimer); if (state.ac) state.ac.close(); state.playing = false; return true; });
      clearCanvas();
      requestAnimationFrame(clearCanvas);
    },
  });
}

export default launch;
