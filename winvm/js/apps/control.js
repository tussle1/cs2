/* ============================================================
   control.js — Control Panel and its little applets
   ============================================================ */

import { icon } from '../core/icons.js';
import { fmtClock, fmtDateLong } from '../core/util.js';
import sfx, { setVolume } from '../core/sound.js';

const ITEMS = [
  { id: 'display', title: 'Display', icon: 'display', desc: 'Wallpaper, screen saver, colours' },
  { id: 'sounds', title: 'Sounds and Audio Devices', icon: 'volume', desc: 'Volume and system sounds' },
  { id: 'datetime', title: 'Date and Time', icon: 'clockIcon', desc: 'Clock, date, time zone' },
  { id: 'system', title: 'System', icon: 'computer', desc: 'Hardware, memory, about this PC' },
  { id: 'users', title: 'User Accounts', icon: 'user', desc: 'Change your name' },
  { id: 'network', title: 'Network Connections', icon: 'network', desc: 'Local Area Connection' },
  { id: 'mouse', title: 'Mouse', icon: 'run', desc: 'Pointer and buttons' },
  { id: 'addrem', title: 'Add or Remove Programs', icon: 'exe', desc: 'Installed software' },
];

export function launch(ctx, opts = {}) {
  const { wm } = ctx;
  if (opts.panel) return openPanel(ctx, opts.panel);

  wm.open({
    title: 'Control Panel',
    icon: 'control',
    width: 700, height: 480, minWidth: 460, minHeight: 300,
    appId: 'control',
    singleton: 'control',
    onMount: (body, win) => {
      body.innerHTML = `
        <div class="cp">
          <aside class="cp-side">
            <div class="g">
              <h4>Control Panel</h4>
              Pick a category to change how Windows looks and behaves. Everything here really works.
            </div>
            <div style="margin-top:10px;padding:0 2px;color:#eaf2ff;line-height:1.6">
              Changes are saved in this browser, so they survive a refresh.
            </div>
          </aside>
          <div class="cp-items"></div>
        </div>`;
      const grid = body.querySelector('.cp-items');
      ITEMS.forEach((it) => {
        const b = document.createElement('button');
        b.className = 'cp-item';
        b.innerHTML = `${icon(it.icon)}<span><b>${it.title}</b><small>${it.desc}</small></span>`;
        b.addEventListener('click', () => openPanel(ctx, it.id));
        grid.appendChild(b);
      });
      void win;
    },
  });
}

function shell(ctx, { title, icon: ic, width = 470, height = 400, mount, appId }) {
  ctx.wm.open({
    title, icon: ic, width, height, minWidth: 360, minHeight: 240,
    appId: appId || 'cpanel', singleton: 'cpanel:' + appId,
    onMount: (body, win) => mount(body, win),
  });
}

export function openPanel(ctx, id) {
  if (id === 'display') return ctx.openApp('display');
  if (id === 'sounds') return openSounds(ctx);
  if (id === 'datetime') return openDateTime(ctx);
  if (id === 'system') return openSystem(ctx);
  if (id === 'users') return openUsers(ctx);
  if (id === 'network') return openNetwork(ctx);
  if (id === 'mouse') return openMouse(ctx);
  if (id === 'addrem') return openAddRemove(ctx);
  return null;
}

function openSounds(ctx) {
  shell(ctx, {
    title: 'Sounds and Audio Devices Properties', icon: 'volume', appId: 'sounds', width: 420, height: 400,
    mount: (body) => {
      body.innerHTML = `
        <div class="dt" style="gap:14px">
          <div class="row"><label>Device volume</label>
            <input type="range" min="0" max="100" value="${Math.round(ctx.settings.get('volume') * 100)}" data-vol style="flex:1">
          </div>
          <div class="row"><label>Mute</label>
            <button class="btn" data-mute style="min-width:70px">${ctx.settings.get('sounds') ? 'Mute' : 'Unmute'}</button>
          </div>
          <div style="border-top:1px solid #ddd;padding-top:10px">
            <b>Program events</b>
            <div style="margin-top:6px;display:flex;flex-direction:column;gap:6px">
              ${[['Windows XP Startup', 'startup'], ['Windows XP Shutdown', 'shutdown'], ['Windows Logoff', 'logoff'],
                 ['Asterisk', 'ding'], ['Critical Stop', 'error'], ['Notify', 'notify']]
                .map(([label, action]) => `<div class="row"><span style="flex:1">${label}</span>
                  <button class="btn" data-play="${action}" style="min-width:60px">▶</button></div>`).join('')}
            </div>
          </div>
          <p style="color:#555;margin:0">All sounds are synthesised on the fly with the Web Audio API — there are no .wav files here.</p>
        </div>`;
      body.querySelector('[data-vol]').addEventListener('input', (e) => {
        setVolume(Number(e.target.value) / 100);
      });
      body.querySelector('[data-mute]').addEventListener('click', (e) => {
        const on = !ctx.settings.get('sounds');
        ctx.settings.set('sounds', on);
        e.target.textContent = on ? 'Mute' : 'Unmute';
        if (on) sfx.ding();
      });
      body.querySelectorAll('[data-play]').forEach((b) => b.addEventListener('click', () => {
        const was = ctx.settings.get('sounds');
        ctx.settings.set('sounds', true);
        sfx[b.dataset.play]?.();
        if (!was) setTimeout(() => ctx.settings.set('sounds', was), 1200);
      }));
    },
  });
}

function openDateTime(ctx) {
  shell(ctx, {
    title: 'Date and Time Properties', icon: 'clockIcon', appId: 'datetime', width: 380, height: 430,
    mount: (body, win) => {
      body.innerHTML = `
        <div class="dt">
          <div class="clockface">
            <div class="hand h-hour"></div><div class="hand h-min"></div><div class="hand h-sec"></div>
            <div class="pin"></div>
          </div>
          <div class="dcenter">
            <div data-date style="font-size:14px;margin-bottom:2px"></div>
            <div data-time style="color:#555"></div>
          </div>
          <div class="row between" style="border-top:1px solid #eee;padding-top:10px">
            <label style="min-width:0">Time zone</label>
            <select class="field" style="flex:1;margin-left:10px">
              <option>${Intl.DateTimeFormat().resolvedOptions().timeZone}</option>
            </select>
          </div>
          <div class="row">
            <label style="min-width:0">Clock format</label>
            <label style="margin-left:10px"><input type="checkbox" data-24 ${ctx.settings.get('clock24') ? 'checked' : ''}> 24-hour</label>
            <label><input type="checkbox" data-secs ${ctx.settings.get('showSeconds') ? 'checked' : ''}> show seconds</label>
          </div>
          <p style="color:#666;margin:0">This clock reads your computer’s real clock, so it is always right.</p>
        </div>`;
      const h = body.querySelector('.h-hour');
      const m = body.querySelector('.h-min');
      const s = body.querySelector('.h-sec');
      const dateEl = body.querySelector('[data-date]');
      const timeEl = body.querySelector('[data-time]');
      const tick = () => {
        const d = new Date();
        const sec = d.getSeconds() + d.getMilliseconds() / 1000;
        const min = d.getMinutes() + sec / 60;
        const hr = (d.getHours() % 12) + min / 60;
        h.style.transform = `rotate(${hr * 30}deg)`;
        m.style.transform = `rotate(${min * 6}deg)`;
        s.style.transform = `rotate(${sec * 6}deg)`;
        dateEl.textContent = fmtDateLong(d);
        timeEl.textContent = fmtClock(d, { clock24: ctx.settings.get('clock24'), seconds: ctx.settings.get('showSeconds') });
      };
      tick();
      const timer = setInterval(tick, 250);
      win.onClose(() => { clearInterval(timer); return true; });
      body.querySelector('[data-24]').addEventListener('change', (e) => ctx.settings.set('clock24', e.target.checked));
      body.querySelector('[data-secs]').addEventListener('change', (e) => ctx.settings.set('showSeconds', e.target.checked));
    },
  });
}

function openSystem(ctx) {
  shell(ctx, {
    title: 'System Properties', icon: 'computer', appId: 'system', width: 440, height: 430,
    mount: (body, win) => {
      const nav = navigator;
      body.innerHTML = `
        <div class="dt" style="gap:12px">
          <div style="display:flex;gap:14px;align-items:center;border-bottom:1px solid #ddd;padding-bottom:12px">
            <span class="ico32">${icon('computer')}</span>
            <div>
              <div style="font-size:13px;font-weight:bold">Microsoft Windows XP</div>
              <div style="color:#555">Professional · Version 2002 · Service Pack 3</div>
            </div>
          </div>
          <table style="font-size:11px;border-collapse:collapse;line-height:1.7">
            <tr><td style="color:#666;padding-right:14px">Registered to:</td><td>${ctx.settings.get('userName')}</td></tr>
            <tr><td style="color:#666">Computer:</td><td>ARENA-XP</td></tr>
            <tr><td style="color:#666">Processor:</td><td>${nav.hardwareConcurrency || 2} × logical cores (${nav.platform || 'web'})</td></tr>
            <tr><td style="color:#666">Memory:</td><td>${nav.deviceMemory ? nav.deviceMemory + ' GB device memory' : '1,048 MB'}</td></tr>
            <tr><td style="color:#666">Screen:</td><td>${window.screen.width} × ${window.screen.height}</td></tr>
            <tr><td style="color:#666">Browser:</td><td>${navigator.userAgent.split(') ')[0]})</td></tr>
            <tr><td style="color:#666">Files on C:</td><td>${ctx.fs.size('C:\\').toLocaleString()} bytes in use</td></tr>
          </table>
          <div style="border-top:1px solid #ddd;padding-top:10px;display:flex;flex-direction:column;gap:8px">
            <button class="btn" data-wipe style="min-width:0">Restore this computer to its original state…</button>
            <button class="btn" data-reset style="min-width:0">Reset all settings…</button>
            <span style="color:#666">Restoring deletes files you created and the Recycle Bin contents. Settings are kept.</span>
          </div>
        </div>`;
      body.querySelector('[data-wipe]').addEventListener('click', async () => {
        const ok = await ctx.wm.confirm(
          'This will erase all files you created on C: and empty the Recycle Bin.\n\nThe desktop will restart.\n\nContinue?',
          'Restore this computer');
        if (!ok) return;
        ctx.fs.wipe();
        ctx.shell.emptyRecycle();
        win.close();
        ctx.refreshDesktop?.();
        ctx.wm.alert('Your computer has been restored to its original state.', 'System');
      });
      body.querySelector('[data-reset]').addEventListener('click', async () => {
        const ok = await ctx.wm.confirm('Reset wallpaper, colours, sounds and screen saver settings?', 'Reset settings');
        if (!ok) return;
        ctx.resetSettings?.();
      });
    },
  });
}

function openUsers(ctx) {
  shell(ctx, {
    title: 'User Accounts', icon: 'user', appId: 'users', width: 460, height: 340,
    mount: (body, win) => {
      body.innerHTML = `
        <div class="dt" style="align-items:center;text-align:center">
          <div style="width:64px;height:64px;border-radius:6px;background:linear-gradient(160deg,#ffd9a8,#e0a05a 60%,#b9753a);box-shadow:0 0 0 2px #fff,0 2px 6px #0003;display:grid;place-items:center;font-size:26px">👤</div>
          <div>
            <div style="font-size:13px;font-weight:bold" data-name>${ctx.settings.get('userName')}</div>
            <div style="color:#666">Computer administrator</div>
          </div>
          <button class="btn" data-rename style="min-width:0">Change my name…</button>
          <p style="color:#666;max-width:320px">The name appears on the welcome screen, the Start menu and the command prompt.</p>
        </div>`;
      body.querySelector('[data-rename]').addEventListener('click', async () => {
        const name = await ctx.wm.prompt({
          title: 'Change name', label: 'New account name:', value: ctx.settings.get('userName'),
        });
        if (!name) return;
        ctx.settings.set('userName', name.trim().slice(0, 24) || 'Administrator');
        body.querySelector('[data-name]').textContent = ctx.settings.get('userName');
        ctx.refreshStartMenu?.();
        ctx.wm.alert('Your name has been changed. It takes effect on the Start menu immediately.', 'User Accounts');
        void win;
      });
    },
  });
}

function openNetwork(ctx) {
  shell(ctx, {
    title: 'Local Area Connection Status', icon: 'network', appId: 'network', width: 400, height: 330,
    mount: (body) => {
      body.innerHTML = `
        <div class="dt" style="gap:12px">
          <div class="row"><b>Connection status:</b><span style="color:#0a0">Connected</span></div>
          <div class="row"><b>Duration:</b><span data-dur>00:00:00</span></div>
          <div class="row"><b>Speed:</b><span>100.0 Mbps</span></div>
          <div class="row"><b>Sent:</b><span>1,204 packets</span></div>
          <div class="row"><b>Received:</b><span>2,318 packets</span></div>
          <div style="border-top:1px solid #ddd;padding-top:10px;color:#555">
            This machine is connected to the simulated internet, which contains five pages and one search
            engine with a single result in it.
          </div>
        </div>`;
      const started = Date.now();
      const el = body.querySelector('[data-dur]');
      const timer = setInterval(() => {
        const s = Math.floor((Date.now() - started) / 1000);
        el.textContent = `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
      }, 1000);
      el.textContent = '00:00:00';
      void timer;
    },
  });
}

function openMouse(ctx) {
  return ctx.wm.open({
    title: 'Mouse Properties', icon: 'run', width: 400, height: 320, appId: 'cpanel', singleton: 'cpanel:mouse',
    onMount: (body) => {
      body.innerHTML = `
        <div class="dt" style="gap:12px">
          <div class="row"><b>Buttons:</b><span>Left handed / Right handed</span></div>
          <div class="row"><b>Double-click speed:</b><span>Fast</span></div>
          <div class="row"><b>Pointer size:</b>
            <input type="range" min="100" max="160" value="${ctx.settings.get('pointerScale') || 100}" data-scale style="flex:1">
            <span data-val>${ctx.settings.get('pointerScale') || 100}%</span>
          </div>
          <p style="color:#555;margin:0">Scaling the pointer makes the whole desktop easier to hit on a big screen.</p>
          <div style="text-align:center;padding:8px;border:1px solid #ddd;border-radius:4px;background:#fafafa">
            <div data-cursor style="font-size:28px">🖱️</div>
          </div>
        </div>`;
      const range = body.querySelector('[data-scale]');
      const val = body.querySelector('[data-val]');
      const cur = body.querySelector('[data-cursor]');
      const apply = (v) => {
        document.documentElement.style.setProperty('--cursor-scale', v / 100);
        cur.style.transform = `scale(${v / 100})`;
      };
      apply(Number(range.value));
      range.addEventListener('input', (e) => {
        const v = Number(e.target.value);
        val.textContent = v + '%';
        apply(v);
        ctx.settings.set('pointerScale', v);
      });
    },
  });
}

function openAddRemove(ctx) {
  shell(ctx, {
    title: 'Add or Remove Programs', icon: 'exe', appId: 'addrem', width: 520, height: 380,
    mount: (body) => {
      const programs = [
        ['Windows XP Service Pack 3', '18.4 MB', 'Microsoft'],
        ['Internet Explorer 6', '12.1 MB', 'Microsoft'],
        ['Windows Media Player 9', '8.6 MB', 'Microsoft'],
        ['Minesweeper', '0.2 MB', 'Microsoft'],
        ['Solitaire', '0.3 MB', 'Microsoft'],
        ['Paint', '0.4 MB', 'Microsoft'],
        ['Command Prompt', '0.1 MB', 'Microsoft'],
        ['This entire desktop', '0 MB', 'Arena.ai'],
      ];
      body.innerHTML = `
        <div style="padding:10px;background:#fff;flex:1;overflow:auto">
          <table style="width:100%;border-collapse:collapse;font-size:11px">
            <tr style="background:#f2f6fc;color:#003c74;text-align:left">
              <th style="padding:5px 8px">Name</th><th>Size</th><th>Used</th><th></th>
            </tr>
            ${programs.map(([n, s, o]) => `
              <tr style="border-bottom:1px solid #eee">
                <td style="padding:6px 8px"><b>${n}</b><br><span style="color:#777">${o}</span></td>
                <td>${s}</td><td>rarely</td>
                <td style="text-align:right"><button class="btn" style="min-width:60px;height:20px" data-no>Remove</button></td>
              </tr>`).join('')}
          </table>
        </div>`;
      body.querySelectorAll('[data-no]').forEach((b) => b.addEventListener('click', () => {
        ctx.wm.alert('You cannot remove this program: it is load-bearing nostalgia.', 'Add or Remove Programs');
      }));
    },
  });
}

export default launch;
