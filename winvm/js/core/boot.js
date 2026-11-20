/* ============================================================
   boot.js — BIOS, boot screen, welcome screen, shutdown flows
   ============================================================ */

import { icon } from './icons.js';

const layer = () => document.getElementById('bootlayer');

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function show(html, cls = '') {
  const el = layer();
  el.className = 'show ' + cls;
  el.innerHTML = html;
  el.hidden = false;
  return el;
}

function hide() {
  const el = layer();
  el.className = '';
  el.innerHTML = '';
  el.hidden = true;
  document.body.classList.remove('booting');
}

const flag = '<span class="flag"></span>';

/* ---------------- BIOS ---------------- */
function biosHtml() {
  return `
    <div class="bios">
      <div class="energy">
        <div class="logo">
          <div class="energy-star"></div>
          <div class="meta">
            <div class="brand">ARENA</div>
            <div>AwardBIOS v6.00PG · ARENA-XP Mainboard</div>
            <div>Copyright (C) 1984-2026, Arena.ai</div>
          </div>
        </div>
        <div class="meta" style="max-width:520px;text-align:left">
          Main Processor : WebAssembly Virtual x86, ${navigator.hardwareConcurrency || 2} cores<br>
          Memory Testing : 1048576K OK<br><br>
          Detecting IDE Primary Master ... Local Disk (C:)<br>
          Detecting IDE Primary Slave  ... None<br>
          Detecting IDE Secondary Master ... CD-ROM (D:)<br>
          Detecting Floppy Drive A: ... 1.44M, 3.5 in.<br><br>
          Booting from Hard Disk ...
        </div>
        <div class="hint">Press any key to skip · ESC for boot menu (there is no boot menu)</div>
      </div>
    </div>`;
}

/* ---------------- Windows boot screen ---------------- */
function bootScreenHtml() {
  return `
    <div class="xp-boot">
      <div class="inner">
        <div class="xp-logo">
          ${flag}
          <div>
            <div class="word">Microsoft<sup style="font-size:12px">®</sup><br><b>Windows</b><span style="color:#f2c14e">xp</span></div>
          </div>
          <div class="edition">Professional<br><span style="font-size:10px;opacity:.8">Copyright © Microsoft Corporation</span></div>
        </div>
        <div class="xp-bar"><i></i><i></i><i></i></div>
        <div class="brandline">Starting Windows…</div>
      </div>
      <div class="copyright">Arena.ai · a Windows XP desktop rebuilt in the browser</div>
    </div>`;
}

/* ---------------- Welcome / logon ---------------- */
function welcomeHtml(ctx, { hint = 'Click your user name to begin' } = {}) {
  const name = ctx.settings.get('userName') || 'Administrator';
  return `
    <div class="welcome">
      <div class="top">
        ${flag.replace('class="flag"', 'class="flag" style="width:38px;height:38px"')}
        <div class="word">Microsoft<b>Windows</b><span style="color:#f2c14e">xp</span></div>
        <div style="margin-left:auto;font-size:11px;color:#cfe0ff">Professional</div>
      </div>
      <div class="mid">
        <button class="user" type="button" data-login>
          <div class="avatar">${icon('user')}</div>
          <div style="text-align:left">
            <div class="name"></div>
            <div class="hint">${hint}</div>
          </div>
        </button>
      </div>
      <div class="bottom">
        <span>After you log on, you can add or change accounts.</span>
        <button type="button" data-off>${icon('shutdown')}<span>Turn off computer</span></button>
      </div>
    </div>`;
}

export async function playBoot(ctx, { fast = false } = {}) {
  document.body.classList.add('booting');
  const el = show(biosHtml());
  let skipped = false;
  const skip = () => { skipped = true; };
  el.addEventListener('pointerdown', skip);
  window.addEventListener('keydown', skip, { once: true });

  const wait = (ms) => Promise.race([sleep(ms), new Promise((r) => {
    const t = setInterval(() => { if (skipped) { clearInterval(t); r(); } }, 40);
    setTimeout(() => { clearInterval(t); r(); }, ms + 50);
  })]);

  await wait(fast ? 260 : 1150);
  show(bootScreenHtml());
  await wait(fast ? 700 : 2400);

  await new Promise((resolve) => {
    show(welcomeHtml(ctx, { hint: fast ? 'Click your user name to begin' : 'Starting your session…' }));
    const el2 = layer();
    const login = () => { el2.removeEventListener('pointerdown', onAny); document.removeEventListener('keydown', onAny); resolve(); };
    const onAny = (e) => {
      if (e.type === 'keydown' && e.key === 'Escape') return;
      login();
    };
    el2.querySelector('[data-login]').addEventListener('click', (e) => { e.stopPropagation(); login(); });
    el2.querySelector('[data-off]').addEventListener('click', (e) => { e.stopPropagation(); shutdown(ctx); });
    el2.addEventListener('pointerdown', onAny);
    document.addEventListener('keydown', onAny);
    setTimeout(login, fast ? 900 : 1900);
  });

  hide();
  document.body.classList.remove('booting');
  ctx.settings.set('booted', true);
  try { ctx.sfx.startup(); } catch (e) { /* audio may be blocked until a gesture */ }
  await sleep(120);
}

/* ---------------- shutdown / restart / logoff ---------------- */

export function openShutdownDialog(ctx) {
  const { wm } = ctx;
  wm.open({
    title: 'Turn off computer',
    icon: 'shutdown',
    width: 420, autoHeight: true, dialog: true, showInTaskbar: false, resizable: false,
    maximizable: false, minimizable: false, center: true, appId: 'shutdown',
    onMount: (body, win) => {
      body.innerHTML = `
        <div class="shutdown" style="background:linear-gradient(180deg,#3f7fd0,#2a5fb0);padding:18px;gap:0">
          <div style="display:flex;flex-direction:column;align-items:center;gap:14px;width:100%">
            <div style="font:300 20px/1.2 'Trebuchet MS',sans-serif;color:#fff">Turn off computer</div>
            <div style="display:flex;gap:14px;margin-top:6px">
              <button class="opt" data-act="standby">
                <span class="bubble" style="background:radial-gradient(circle at 35% 30%,#ffe9a8,#c98a08)">◔</span>
                <b>Stand By</b>
              </button>
              <button class="opt" data-act="off">
                <span class="bubble" style="background:radial-gradient(circle at 35% 30%,#ff9b8a,#b02418)">⏻</span>
                <b>Turn Off</b>
              </button>
              <button class="opt" data-act="restart">
                <span class="bubble" style="background:radial-gradient(circle at 35% 30%,#9fd4ff,#1b62c0)">⟳</span>
                <b>Restart</b>
              </button>
            </div>
            <button class="btn" data-act="cancel" style="margin-top:10px;min-width:90px">Cancel</button>
          </div>
        </div>`;
      const style = document.createElement('style');
      style.textContent = `
        .shutdown .opt{background:none;border:0;color:#fff;display:flex;flex-direction:column;align-items:center;gap:7px;width:96px;padding:8px 4px;border-radius:6px}
        .shutdown .opt:hover{background:#ffffff22;box-shadow:inset 0 0 0 1px #ffffff44}
        .shutdown .opt b{font-size:12px;font-weight:normal}
        .shutdown .bubble{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;font-size:22px;color:#2a2a2a;box-shadow:inset 0 -2px 6px #0003,0 2px 6px #0004}`;
      body.appendChild(style);
      body.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => {
        const a = b.dataset.act;
        win.close();
        if (a === 'off') shutdown(ctx);
        else if (a === 'restart') restart(ctx);
        else if (a === 'standby') standby(ctx);
      }));
    },
  });
}

export async function shutdown(ctx) {
  ctx.sfx.shutdown();
  const el = show(`
    <div class="shutdown">
      <div>
        <h1>Windows is shutting down…</h1>
        <p>Please wait while your settings are saved.</p>
        <div class="xp-bar" style="margin:0 auto"><i></i><i></i><i></i></div>
      </div>
    </div>`);
  el.hidden = false;
  ctx.wm.closeAll();
  await sleep(1900);
  show(`
    <div class="bios" style="display:grid;place-items:center;text-align:center">
      <div>
        <div style="font-size:20px;color:#f2c14e;margin-bottom:10px">It is now safe to turn off your computer.</div>
        <div style="color:#8fa9b8;margin-bottom:24px">(All of your files were saved in this browser.)</div>
        <button class="btn" data-again style="padding:6px 18px;min-width:0">Turn the computer back on</button>
      </div>
    </div>`);
  layer().querySelector('[data-again]').addEventListener('click', () => restart(ctx, { cold: true }));
}

export async function restart(ctx, { cold = false } = {}) {
  if (!cold) {
    ctx.sfx.shutdown();
    show(`<div class="shutdown"><div><h1>Windows is restarting…</h1>
      <p>Your files are safe in this browser tab.</p>
      <div class="xp-bar" style="margin:0 auto"><i></i><i></i><i></i></div></div></div>`);
    ctx.wm.closeAll();
     await sleep(1500);
  }
  await playBoot(ctx, { fast: cold });
}

export async function logoff(ctx) {
  ctx.sfx.logoff();
  ctx.wm.closeAll();
  show(welcomeHtml(ctx, { hint: 'Logging off…' }));
  await sleep(700);
  await new Promise((resolve) => {
    const el = layer();
    el.innerHTML = welcomeHtml(ctx, { hint: 'Click your user name to log back on' });
    const login = () => resolve();
    el.querySelector('[data-login]').addEventListener('click', login);
    el.addEventListener('pointerdown', (e) => {
      if (e.target.closest('[data-off]')) return;
      login();
    });
  });
  hide();
  ctx.sfx.startup();
}

export function standby(ctx) {
  show(`<div class="bios" style="display:grid;place-items:center;text-align:center">
    <div>
      <div style="color:#8fa9b8;font-size:14px;letter-spacing:1px">STANDING BY</div>
      <div style="color:#4a5a66;font-size:12px;margin-top:10px">Click anywhere to wake the computer</div>
    </div></div>`);
  const el = layer();
  el.addEventListener('pointerdown', () => {
    hide();
    ctx.sfx.ding();
  }, { once: true });
}

export default { playBoot, shutdown, restart, logoff, standby, openShutdownDialog };
