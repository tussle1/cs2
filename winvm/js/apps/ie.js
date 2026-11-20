/* ============================================================
   ie.js — Internet Explorer 6 (renders a small built-in web)
   ============================================================ */

import { menuBar } from '../core/menu.js';

const HOME = 'http://www.arena.ai/';

const SITES = {
  'http://www.arena.ai/': { title: 'Arena — Windows in your browser', render: pageArena },
  'http://www.microsoft.com/windowsxp/': { title: 'Microsoft Windows XP', render: pageXP },
  'http://help.local/': { title: 'Windows XP Help and Support', render: pageHelp },
  'http://www.google.com/': { title: 'Google', render: pageSearch },
  'about:blank': { title: 'Blank', render: () => '<div style="height:100%"></div>' },
};

export function launch(ctx, opts = {}) {
  const { wm } = ctx;
  let history = [opts.url || HOME];
  let index = 0;
  let busy = false;

  wm.open({
    title: 'Internet Explorer',
    icon: 'ie',
    width: 840, height: 580, minWidth: 480, minHeight: 320,
    appId: 'ie',
    singleton: opts.singleton,
    x: opts.x, y: opts.y,
    onMount: (body, win) => {
      body.classList.add('ie');
      body.innerHTML = `
        <div class="toolbar">
          <button data-nav="back" title="Back">${svgArrow('back')}</button>
          <button data-nav="fwd" title="Forward">${svgArrow('fwd')}</button>
          <button data-nav="stop" title="Stop">✕</button>
          <button data-nav="refresh" title="Refresh">${svgRefresh()}</button>
          <button data-nav="home" title="Home">⌂</button>
          <div class="vsep"></div>
          <button data-nav="help" title="Help">?</button>
        </div>
        <div class="exp-addr">
          <label>Address</label>
          <div class="field">${'<svg viewBox="0 0 32 32" style="width:14px;height:14px"><circle cx="16" cy="16" r="12" fill="#3f8cf3"/><text x="14" y="23" font-family="Georgia" font-style="italic" font-size="18" fill="#fff">e</text></svg>'}<input type="text" spellcheck="false" aria-label="Address"></div>
          <button class="btn" data-go style="min-width:44px;height:22px">Go</button>
        </div>
        <div class="ie-page scroll"></div>
        <div class="ie-statusbar"><span class="status">Done</span><span class="zone">🌐 Internet</span></div>`;

      const page = body.querySelector('.ie-page');
      const addr = body.querySelector('.exp-addr input');
      const status = body.querySelector('.status');

      function svgArrow(dir) {
        const d = dir === 'back' ? 'M20 8L11 16l9 8M11 16h13' : 'M12 8l9 8-9 8M21 16H8';
        return `<svg viewBox="0 0 32 32" style="width:16px;height:16px"><path d="${d}" fill="none" stroke="#2f6fd0" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      }
      function svgRefresh() {
        return '<svg viewBox="0 0 32 32" style="width:16px;height:16px"><path d="M26 16a10 10 0 1 1-3-7.2" fill="none" stroke="#2f6fd0" stroke-width="3" stroke-linecap="round"/><path d="M26 5v7h-7" fill="none" stroke="#2f6fd0" stroke-width="3" stroke-linecap="round"/></svg>';
      }

      function render() {
        const url = history[index];
        const site = SITES[url];
        addr.value = url;
        win.setTitle(`${site ? site.title : 'Cannot find server'} - Microsoft Internet Explorer`);
        body.querySelector('[data-nav="back"]').disabled = index <= 0;
        body.querySelector('[data-nav="fwd"]').disabled = index >= history.length - 1;
        status.textContent = site ? 'Done' : 'The page cannot be displayed';
        if (!site) {
          page.innerHTML = errorPage(url);
        } else {
          page.innerHTML = `<div class="doc">${site.render()}</div>`;
        }
        page.scrollTop = 0;
        page.querySelectorAll('[data-url]').forEach((a) => {
          a.addEventListener('click', (e) => { e.preventDefault(); navigate(a.dataset.url); });
        });
        page.querySelectorAll('[data-app]').forEach((a) => {
          a.addEventListener('click', (e) => { e.preventDefault(); ctx.openApp(a.dataset.app, {}); });
        });
        page.querySelectorAll('[data-act]').forEach((a) => {
          a.addEventListener('click', (e) => {
            e.preventDefault();
            const act = a.dataset.act;
            if (act === 'fullscreen') {
              document.documentElement.requestFullscreen?.().catch(() => {});
            } else if (act === 'wallpaper') {
              ctx.openApp('display');
            } else if (act === 'shutdown') {
              ctx.confirmShutdown?.();
            } else if (act === 'sounds') {
              ctx.sfx.startup();
            }
          });
        });
      }

      function navigate(url, { push = true } = {}) {
        let u = String(url || '').trim();
        if (!u) return;
        if (!/^[a-z]+:/i.test(u)) u = 'http://' + u;
        if (push) {
          history = history.slice(0, index + 1);
          history.push(u);
          index = history.length - 1;
        }
        if (!SITES[u] && !SITES[u.replace(/\/?$/, '/')]) {
          // small alias table
          const alias = Object.keys(SITES).find((k) => k.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
            === u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''));
          if (alias) { history[history.length - 1] = alias; }
        }
        busy = false;
        ctx.sfx.click();
        render();
      }

      body.addEventListener('click', (e) => {
        const b = e.target.closest('[data-nav]');
        if (!b) return;
        const a = b.dataset.nav;
        if (a === 'back' && index > 0) { index--; render(); }
        else if (a === 'fwd' && index < history.length - 1) { index++; render(); }
        else if (a === 'home') navigate(HOME);
        else if (a === 'refresh') { status.textContent = 'Refreshing…'; setTimeout(() => { render(); }, 260); }
        else if (a === 'stop') { status.textContent = 'Stopped'; }
        else if (a === 'help') ctx.openApp('help');
      });

      body.querySelector('[data-go]').addEventListener('click', () => navigate(addr.value));
      addr.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') navigate(addr.value);
        e.stopPropagation();
      });

      const mb = menuBar(body, [
        { label: 'File', items: () => [
          { label: 'New Window', action: () => ctx.openApp('ie', { url: history[index] }) },
          { label: 'Close', action: () => win.close() },
        ] },
        { label: 'Edit', items: () => [
          { label: 'Copy', action: () => document.execCommand('copy') },
          { label: 'Select All', action: () => document.execCommand('selectAll') },
        ] },
        { label: 'View', items: () => [
          { label: 'Refresh', kbd: 'F5', action: () => render() },
          { label: 'Source', action: () => wm.alert('View Source is not available in this simulated browser.', 'Internet Explorer') },
        ] },
        { label: 'Favorites', items: () => [
          { label: 'Arena Home', icon: 'star', action: () => navigate('http://www.arena.ai/') },
          { label: 'Windows XP', icon: 'star', action: () => navigate('http://www.microsoft.com/windowsxp/') },
          { label: 'Help and Support', icon: 'star', action: () => navigate('http://help.local/') },
        ] },
        { label: 'Tools', items: () => [
          { label: 'Internet Options…', action: () => ctx.openApp('control', { panel: 'network' }) },
        ] },
        { label: 'Help', items: () => [
          { label: 'About Internet Explorer', action: () => ctx.openApp('about') },
        ] },
      ]);
      body.insertBefore(mb.el, body.firstChild);

      render();
    },
  });
}

/* ---------------- the (tiny) web ---------------- */

function pageArena() {
  return `
    <div class="hero">
      <h1>Windows XP, in your browser</h1>
      <p>No installation. No downloads. No virtual machine image. Just a tab.</p>
      <div class="btns">
        <a data-app="explorer" href="#">Open My Computer</a>
        <a data-app="cmd" href="#">Command Prompt</a>
        <a data-url="http://help.local/" href="#">What can I do?</a>
      </div>
    </div>
    <h2>Wait — is this really Windows?</h2>
    <p>It is not Microsoft's code, and it is not an emulator running a Windows disk image. It is a
    faithful re-creation of the Windows XP desktop written from scratch in HTML, CSS and JavaScript:
    a real window manager, a virtual file system, a command shell, and a dozen working programs.</p>
    <p>Which is actually rather better for a browser: it boots in under two seconds, needs no
    300&nbsp;MB download, and every program really works.</p>
    <h2>Things worth clicking</h2>
    <ul>
      <li><a data-app="winmine" href="#">Minesweeper</a> — right-click to flag.</li>
      <li><a data-app="solitaire" href="#">Solitaire</a> — click a card, then where it goes.</li>
      <li><a data-app="paint" href="#">Paint</a> — draw something and save it to My Pictures.</li>
      <li><a data-app="cmd" href="#">Command Prompt</a> — type <code>help</code>, then <code>dir</code>.</li>
      <li><a data-app="display" href="#">Display Properties</a> — change the wallpaper, turn on the screen saver.</li>
      <li><a data-act="sounds" href="#">Play the startup sound</a> again.</li>
    </ul>
    <h2>Your data stays here</h2>
    <p>Files you create live in this browser's local storage. Nothing is uploaded anywhere. You can
    wipe the whole machine from <a data-app="control" href="#">Control Panel</a>.</p>
    <hr>
    <p style="color:#666;font-size:12px">Built by Arena.ai — a demo of what a web page can be.
    Windows and Windows XP are trademarks of Microsoft Corporation. This page is an homage, not a product.</p>`;
}

function pageXP() {
  return `
    <div style="background:linear-gradient(180deg,#0a246a,#3f8cf3);color:#fff;padding:18px 20px;font-family:Tahoma,sans-serif">
      <span style="font:300 22px 'Trebuchet MS',sans-serif">Windows<b>XP</b></span>
      <div style="font-size:11px;opacity:.85">Experience the digital decade</div>
    </div>
    <h2>What's new in Windows XP</h2>
    <ul>
      <li><b>Luna</b> — a taskbar you can actually see, in blue, olive or silver.</li>
      <li><b>Fast user switching</b> — the welcome screen with the little user tiles.</li>
      <li><b>ClearType</b> — text that looks like it was printed on a damp napkin, beautifully.</li>
      <li><b>Remote Assistance</b> — invite a friend to watch you struggle with your printer.</li>
    </ul>
    <h2>System requirements</h2>
    <table>
      <tr><th>Component</th><th>Minimum</th></tr>
      <tr><td>Processor</td><td>233 MHz</td></tr>
      <tr><td>Memory</td><td>64 MB</td></tr>
      <tr><td>Disk</td><td>1.5 GB</td></tr>
      <tr><td>Browser</td><td>Any modern one, today</td></tr>
    </table>
    <p>Return to <a data-url="http://www.arena.ai/" href="#">Arena</a>, or read the
    <a data-url="http://help.local/" href="#">help file</a>.</p>`;
}

function pageHelp() {
  return `
    <h1>Help and Support Center</h1>
    <p><i>Pick a topic.</i></p>
    <h2>Windows basics</h2>
    <ul>
      <li><b>Start menu</b> — the green button in the corner. Everything lives there.</li>
      <li><b>Windows</b> — drag a title bar, resize from the edges, double-click to maximise.</li>
      <li><b>Alt+Tab</b> — cycles windows, exactly as you remember.</li>
      <li><b>Right-click</b> — the desktop, files and folders all have context menus.</li>
    </ul>
    <h2>Programs</h2>
    <ul>
      <li><b>Notepad</b> — open and save real files on the virtual C: drive.</li>
      <li><b>Paint</b> — pencil, brush, shapes, flood fill; saves PNGs.</li>
      <li><b>Command Prompt</b> — <code>dir</code>, <code>cd</code>, <code>type</code>, <code>tree</code>,
          <code>copy</code>, <code>ping</code>, <code>systeminfo</code>, and <code>shutdown /r</code> to reboot.</li>
      <li><b>Minesweeper</b>, <b>Solitaire</b>, <b>Calculator</b>, <b>Media Player</b> with synthesised music.</li>
      <li><b>Control Panel</b> — wallpapers, colour schemes, sounds, date and time, system information.</li>
    </ul>
    <h2>Keys</h2>
    <table>
      <tr><th>Keys</th><th>Does</th></tr>
      <tr><td><code>F1</code></td><td>This help window</td></tr>
      <tr><td><code>Alt+Tab</code></td><td>Switch windows</td></tr>
      <tr><td><code>Alt+F4</code></td><td>Close the active window</td></tr>
      <tr><td><code>Escape</code></td><td>Close menus and dialogs</td></tr>
      <tr><td><code>F5</code></td><td>Refresh the desktop</td></tr>
    </table>
    <p><a data-url="http://www.arena.ai/" href="#">Back to the home page</a></p>`;
}

function pageSearch() {
  return `
    <div style="text-align:center;padding:26px 0 10px">
      <div style="font:600 40px Arial,sans-serif;letter-spacing:-1px">
        <span style="color:#4285f4">A</span><span style="color:#ea4335">r</span><span style="color:#fbbc05">e</span><span style="color:#4285f4">n</span><span style="color:#34a853">a</span>
      </div>
      <div style="font:11px Tahoma,sans-serif;color:#555;margin-top:4px">Search the simulated web</div>
      <div style="margin:18px auto;max-width:420px;display:flex;gap:6px">
        <input class="field" style="flex:1" placeholder="Search…" disabled>
        <button class="btn" disabled>Search</button>
      </div>
      <p style="font:11px Tahoma,sans-serif;color:#777">Indexing 1 page out of 1 — results are instant.</p>
    </div>
    <h2>Results</h2>
    <p><a data-url="http://www.arena.ai/" href="#"><b>Windows XP, in your browser</b></a><br>
    <span style="color:#0a0;font-size:11px">http://www.arena.ai/</span><br>
    <span style="font-size:12px;color:#444">The complete Windows XP desktop, running in a single web page.</span></p>`;
}

function errorPage(url) {
  return `
    <div class="ie-error">
      <h1>The page cannot be displayed</h1>
      <p>The page you are looking for is currently unavailable. The Web site might be experiencing
      technical difficulties, or you may need to adjust your browser settings.</p>
      <hr>
      <p>Please try the following:</p>
      <ul>
        <li>Click the <b>Refresh</b> button, or try again later.</li>
        <li>If you typed the page address in the Address bar, make sure that it is spelled correctly.</li>
        <li>This is a simulated internet with exactly five pages on it, so
        <span class="url">${url.replace(/[<>&]/g, '')}</span> probably does not exist.</li>
      </ul>
      <p style="margin-top:18px"><b>Cannot find server or DNS Error</b><br>
      <span style="color:#666">Internet Explorer</span></p>
      <p style="margin-top:18px">
        <a data-url="http://www.arena.ai/" href="#">Go to the home page</a> ·
        <a data-url="http://help.local/" href="#">Help and Support</a>
      </p>
    </div>`;
}

export default launch;
