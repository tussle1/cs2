/* ============================================================
   main.js — boots the machine and wires everything together
   ============================================================ */

import fs, { HOME, MY_DOCS } from './core/fs.js';
import settings from './core/settings.js';
import sfx, { unlock } from './core/sound.js';
import { icon, iconEl } from './core/icons.js';
import { WindowManager } from './core/wm.js';
import { contextMenu, closeMenus } from './core/menu.js';
import { applyWallpaper } from './core/wallpapers.js';
import { initDesktop } from './core/desktop.js';
import { initStartMenu } from './core/startmenu.js';
import { initScreensaver, startSaver } from './core/screensaver.js';
import { createShell } from './core/shell.js';
import { APPS } from './apps/index.js';
import { playBoot, shutdown, restart, logoff, openShutdownDialog } from './core/boot.js';
import { fmtClock, fmtDateLong } from './core/util.js';

const wm = new WindowManager({
  host: document.getElementById('windows'),
  tasksEl: document.getElementById('tasks'),
  onChange: () => { ctx.__busy = wm.count > 0; },
});

const ctx = {
  wm,
  fs,
  settings,
  sfx,
  icon,
  menu: { contextMenu },
  apps: APPS,
  paths: { HOME, MY_DOCS },
  refreshDesktop: () => {},
  refreshStartMenu: () => {},
  applyScheme: (s) => { document.documentElement.dataset.scheme = s || 'blue'; },
  resetSettings: () => {},
  shutdown: () => shutdown(ctx),
  restart: () => restart(ctx),
  logoff: () => logoff(ctx),
  openShutdownDialog: () => openShutdownDialog(ctx),
  confirmShutdown: () => openShutdownDialog(ctx),
  __busy: false,
};

ctx.shell = createShell(ctx);
ctx.openApp = (id, opts = {}) => {
  const app = APPS[id];
  if (!app) {
    wm.error(`Windows cannot find '${id}'.`, 'Windows');
    return null;
  }
  return app.launch(ctx, opts);
};

/* ---------------- appearance ---------------- */
document.documentElement.dataset.scheme = settings.get('scheme') || 'blue';
applyWallpaper(settings.get('wallpaper') || 'bliss');
if (settings.get('pointerScale')) {
  document.documentElement.style.setProperty('--cursor-scale', settings.get('pointerScale') / 100);
}

settings.subscribe((key) => {
  if (key === 'scheme' || key === '*') document.documentElement.dataset.scheme = settings.get('scheme') || 'blue';
  if (key === 'wallpaper' || key === '*') applyWallpaper(settings.get('wallpaper') || 'bliss');
  if (key === 'userName' || key === '*') ctx.refreshStartMenu();
  if (key === '*') unlock();
});

/* ---------------- taskbar ---------------- */
function initTaskbar() {
  const clock = document.getElementById('clock');
  const quick = document.getElementById('quicklaunch');
  const tray = document.getElementById('tray-icons');

  const tick = () => {
    const d = new Date();
    clock.textContent = fmtClock(d, {
      clock24: settings.get('clock24'),
      seconds: settings.get('showSeconds'),
    });
    clock.title = `${fmtDateLong(d)}\n${fmtClock(d, { clock24: true, seconds: true })}`;
  };
  tick();
  setInterval(tick, 1000);
  clock.addEventListener('click', () => ctx.openApp('control', { panel: 'datetime' }));

  const quickItems = [
    { icon: 'ie', title: 'Internet Explorer', action: () => ctx.openApp('ie', { url: 'http://www.arena.ai/' }) },
    { icon: 'folder', title: 'My Computer', action: () => ctx.openApp('explorer', { path: '::computer', singleton: 'mycomputer', title: 'My Computer' }) },
    { icon: 'media', title: 'Windows Media Player', action: () => ctx.openApp('media') },
    { icon: 'cmd', title: 'Command Prompt', action: () => ctx.openApp('cmd') },
  ];
  quickItems.forEach((q) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.title = q.title;
    b.innerHTML = icon(q.icon);
    b.addEventListener('click', q.action);
    quick.appendChild(b);
  });
  const showDesktop = document.createElement('button');
  showDesktop.type = 'button';
  showDesktop.title = 'Show Desktop';
  showDesktop.innerHTML = icon('display');
  showDesktop.addEventListener('click', () => wm.minimizeAll());
  quick.appendChild(showDesktop);

  const trayVolume = document.createElement('button');
  trayVolume.type = 'button';
  trayVolume.title = 'Volume';
  trayVolume.innerHTML = icon('volume');
  trayVolume.addEventListener('click', (e) => {
    const r = trayVolume.getBoundingClientRect();
    const vol = Math.round(settings.get('volume') * 100);
    contextMenu(e, [
      { header: `Volume: ${vol}%` },
      { label: 'Mute', checked: !settings.get('sounds'), action: () => {
        settings.set('sounds', !settings.get('sounds'));
        sfx.ding();
      } },
      { sep: true },
      { label: 'Adjust Audio Properties…', action: () => ctx.openApp('control', { panel: 'sounds' }) },
    ]);
    void r;
  });
  tray.appendChild(trayVolume);

  const trayNet = document.createElement('button');
  trayNet.type = 'button';
  trayNet.title = 'Local Area Connection — connected';
  trayNet.innerHTML = icon('network');
  trayNet.addEventListener('click', (e) => {
    contextMenu(e, [
      { header: 'Local Area Connection' },
      { label: 'Status: Connected', disabled: true },
      { label: 'Speed: 100.0 Mbps', disabled: true },
      { sep: true },
      { label: 'Open Network Connections', action: () => ctx.openApp('control', { panel: 'network' }) },
    ]);
  });
  tray.appendChild(trayNet);
}

/* ---------------- keyboard ---------------- */
function initKeys() {
  document.addEventListener('keydown', (e) => {
    if (window.__vmCapture) {
      // the Virtual PC window owns the keyboard (Esc is handled by the machine itself,
      // but also releases capture so desktop shortcuts work again)
      if (e.key === 'Escape') window.__vmRelease?.();
      return;
    }
    if (e.key === 'Escape') { closeMenus(); return; }
    if (e.key === 'F1') { e.preventDefault(); ctx.openApp('help'); return; }
    if (e.altKey && e.key === 'Tab') { e.preventDefault(); wm.cycle(); return; }
    if (e.altKey && e.key === 'F4') {
      e.preventDefault();
      if (wm.active) wm.active.close();
      else openShutdownDialog(ctx);
      return;
    }
    if (e.key === 'F5' && !e.target.closest('input,textarea')) {
      ctx.refreshDesktop();
    }
  });

  // first gesture unlocks audio
  const kick = () => { unlock(); window.removeEventListener('pointerdown', kick); };
  window.addEventListener('pointerdown', kick);
}

/* ---------------- boot ---------------- */
async function start() {
  const desktop = initDesktop(ctx);
  ctx.refreshDesktop = desktop.render;
  const startMenu = initStartMenu(ctx);
  ctx.refreshStartMenu = startMenu.rebuild;
  initTaskbar();
  initKeys();
  initScreensaver();

  ctx.resetSettings = () => {
    settings.resetAll();
    document.documentElement.dataset.scheme = 'blue';
    applyWallpaper('bliss');
    ctx.refreshStartMenu();
  };

  const first = !settings.get('booted');
  await playBoot(ctx, { fast: !first });
  document.getElementById('wallpaper').animate?.(
    [{ filter: 'brightness(1.35)' }, { filter: 'brightness(1)' }],
    { duration: 900, easing: 'ease-out' },
  );
  void first;

  // friendly nudge on the very first run
  if (!localStorage.getItem('winvm.seenWelcome')) {
    localStorage.setItem('winvm.seenWelcome', '1');
    setTimeout(() => {
      wm.msgBox({
        title: 'Windows XP — in your browser',
        iconName: 'info',
        width: 430,
        text: 'Welcome to a complete Windows XP desktop running in a single web page.\n\n'
          + 'Nothing was installed and nothing is downloading: the shell is a faithful re-creation in '
          + 'HTML, CSS and JavaScript.\n\n'
          + 'Two things go further than a re-creation: Internet Explorer can reach the REAL internet '
          + 'through the little proxy server, and Virtual PC is a genuine x86 machine that boots a real '
          + 'operating system — or any 32-bit Windows disc image you own.\n\n'
          + 'Double-click the icons, open Start, or press F1 for a tour.',
        buttons: ['Take a look'],
      });
    }, 900);
  }

  // dev/screenshot helper: ?app=cmd&path=...
  const params = new URLSearchParams(location.search);
  if (params.get('app')) {
    const opts = {};
    if (params.get('path')) opts.path = params.get('path');
    if (params.get('url')) opts.url = params.get('url');
    if (params.get('boot') || params.get('power')) opts.power = true;
    setTimeout(() => ctx.openApp(params.get('app'), opts), 200);
  }
  if (params.get('saver')) setTimeout(() => startSaver(params.get('saver')), 300);
  if (params.get('nosound')) settings.set('sounds', false);
}

/* ---------------- installable / offline ---------------- */
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (!/^https?:$/.test(location.protocol)) return; // file:// has no SW support
  if (new URLSearchParams(location.search).get('nosw')) return;
  const register = () => {
    navigator.serviceWorker.register('sw.js', { scope: './' })
      .catch((err) => console.warn('[winxp] service worker failed:', err.message));
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

window.winxp = { ctx, wm, fs, settings, sfx, openApp: (...a) => ctx.openApp(...a) };
registerServiceWorker();

start().catch((err) => {
  console.error(err);
  document.body.classList.remove('booting');
});
