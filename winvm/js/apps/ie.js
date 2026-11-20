/* ============================================================
   ie.js — Internet Explorer 6
   Two internets in one browser:
     · the built-in five-page "intranet" (works offline)
     · the real internet, rendered through the little proxy in
       server.mjs (scripts stripped, links routed back through it)
   ============================================================ */

import { menuBar } from '../core/menu.js';
import { join, extname } from '../core/fs.js';
import { fmtBytes } from '../core/util.js';

const HOME = 'http://www.arena.ai/';

const SITES = {
  'http://www.arena.ai/': { title: 'Arena — Windows in your browser', render: pageArena },
  'http://www.microsoft.com/windowsxp/': { title: 'Microsoft Windows XP', render: pageXP },
  'http://help.local/': { title: 'Windows XP Help and Support', render: pageHelp },
  'http://www.google.com/': { title: 'Search', render: pageSearch },
  'about:blank': { title: 'Blank', render: () => '<div style="height:100%"></div>' },
};

const canFetch = typeof fetch === 'function';

const normUrl = (raw) => {
  let u = String(raw || '').trim();
  if (!u) return '';
  if (/^(about|http|https):/i.test(u)) return u;
  if (/^[\w-]+(\.[\w-]+)+(\/|$)/.test(u)) return 'http://' + u;
  return 'http://' + u;
};

export function launch(ctx, opts = {}) {
  const { wm, fs } = ctx;
  const startUrl = normUrl(opts.url) || HOME;
  const history = [startUrl];
  let index = 0;

  wm.open({
    title: 'Internet Explorer',
    icon: 'ie',
    width: 900, height: 640, minWidth: 480, minHeight: 320,
    appId: 'ie',
    singleton: opts.singleton,
    x: opts.x, y: opts.y,
    onMount: (body, win) => {
      const st = {
        real: true,
        proxy: true,
        busy: false,
        status: 'Done',
      };

      body.classList.add('ie');
      body.innerHTML = `
        <div class="toolbar">
          <button data-nav="back" title="Back">${svgArrow('back')}</button>
          <button data-nav="fwd" title="Forward">${svgArrow('fwd')}</button>
          <button data-nav="stop" title="Stop">✕</button>
          <button data-nav="refresh" title="Refresh">${svgRefresh()}</button>
          <button data-nav="home" title="Home">⌂</button>
          <div class="vsep"></div>
          <button data-nav="real" title="Use the real internet through the local proxy">🌐 <span>Real web</span></button>
          <button data-nav="tab" title="Open this address in a normal browser tab">↗</button>
          <div class="vsep"></div>
          <button data-nav="help" title="Help">?</button>
        </div>
        <div class="exp-addr">
          <label>Address</label>
          <div class="field">${'<svg viewBox="0 0 32 32" style="width:14px;height:14px"><circle cx="16" cy="16" r="12" fill="#3f8cf3"/><text x="14" y="23" font-family="Georgia" font-style="italic" font-size="18" fill="#fff">e</text></svg>'}<input type="text" spellcheck="false" aria-label="Address"></div>
          <button class="btn" data-go style="min-width:44px;height:22px">Go</button>
        </div>
        <div class="ie-realbar" hidden>
          <span>🌐 <b>Real internet</b> — rendered through the local proxy; scripts are off.</span>
          <button class="btn" data-real-off>Use the built-in web</button>
        </div>
        <div class="ie-page scroll"></div>
        <div class="ie-statusbar"><span class="status">Done</span><span class="zone">🌐 Internet</span></div>`;

      const page = body.querySelector('.ie-page');
      const addr = body.querySelector('.exp-addr input');
      const status = body.querySelector('.status');
      const zone = body.querySelector('.zone');
      const realBar = body.querySelector('.ie-realbar');
      const realBtn = body.querySelector('[data-nav="real"]');

      function svgArrow(dir) {
        const d = dir === 'back' ? 'M20 8L11 16l9 8M11 16h13' : 'M12 8l9 8-9 8M21 16H8';
        return `<svg viewBox="0 0 32 32" style="width:16px;height:16px"><path d="${d}" fill="none" stroke="#2f6fd0" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      }
      function svgRefresh() {
        return '<svg viewBox="0 0 32 32" style="width:16px;height:16px"><path d="M26 16a10 10 0 1 1-3-7.2" fill="none" stroke="#2f6fd0" stroke-width="3" stroke-linecap="round"/><path d="M26 5v7h-7" fill="none" stroke="#2f6fd0" stroke-width="3" stroke-linecap="round"/></svg>';
      }

      const isLocal = (url) => Object.prototype.hasOwnProperty.call(SITES, url);

      /* ---------------- chrome ---------------- */
      function chrome() {
        const url = history[index];
        const local = isLocal(url);
        addr.value = url;
        body.querySelector('[data-nav="back"]').disabled = index <= 0;
        body.querySelector('[data-nav="fwd"]').disabled = index >= history.length - 1;
        realBtn.style.opacity = st.real ? '1' : '.55';
        realBtn.querySelector('span').textContent = st.real ? 'Real web' : 'Built-in web';
        realBar.hidden = !(st.real && !local);
        zone.textContent = local ? '🌐 Local intranet' : (st.real ? '🌐 Internet · proxy' : '🌐 Internet');
        status.textContent = st.status;
        win.setTitle(`${local ? SITES[url].title : url} - Microsoft Internet Explorer`);
      }

      function pageShell(extraClass = '') {
        page.className = 'ie-page scroll ' + extraClass;
        page.innerHTML = '';
        page.style.padding = '';
      }

      /* ---------------- rendering ---------------- */
      function renderLocal(url) {
        pageShell();
        const site = SITES[url];
        page.innerHTML = `<div class="doc">${site.render()}</div>`;
        page.scrollTop = 0;
        wirePageLinks();
        st.status = 'Done';
        chrome();
      }

      function wirePageLinks() {
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
            if (act === 'fullscreen') document.documentElement.requestFullscreen?.().catch(() => {});
            else if (act === 'wallpaper') ctx.openApp('display');
            else if (act === 'sounds') ctx.sfx.startup();
            else if (act === 'shutdown') ctx.openShutdownDialog?.();
          });
        });
      }

      function renderMessage({ title, body: html, icon = 'ie' }) {
        pageShell();
        page.innerHTML = `<div class="ie-error">
            <div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:10px">
              <span class="ico32">${ctx.icon(icon)}</span><h1 style="margin:0">${title}</h1>
            </div>
            ${html}
          </div>`;
        chrome();
      }

      function renderFrame(html, finalUrl) {
        pageShell('real');
        const frame = document.createElement('iframe');
        frame.className = 'ie-frame';
        frame.setAttribute('sandbox', 'allow-same-origin');
        frame.setAttribute('referrerpolicy', 'no-referrer');
        frame.srcdoc = html;
        page.appendChild(frame);
        frame.addEventListener('load', () => {
          try {
            const doc = frame.contentDocument;
            if (!doc) return;
            doc.querySelectorAll('a[data-wxp-href]').forEach((a) => {
              a.addEventListener('click', (ev) => {
                ev.preventDefault();
                navigate(a.dataset.wxpHref);
              });
            });
            doc.querySelectorAll('a[href^="http"]').forEach((a) => {
              a.addEventListener('click', (ev) => {
                ev.preventDefault();
                navigate(a.getAttribute('href'));
              });
            });
            doc.addEventListener('click', (ev) => {
              // if the page tries to swallow clicks, still let the link win
              const a = ev.target.closest?.('a[data-wxp-href]');
              if (a) { ev.preventDefault(); navigate(a.dataset.wxpHref); }
            });
          } catch (e) {
            st.status = 'Rendered (links disabled: cross-origin document)';
            chrome();
          }
        });
        st.status = `Done — ${new URL(finalUrl).hostname}`;
        chrome();
      }

      async function renderRemote(url) {
        pageShell();
        page.innerHTML = `<div class="ie-error"><h1>Opening ${escapeHtml(url)}…</h1>
          <p style="color:#666">Fetching through the local proxy…</p></div>`;
        st.status = 'Opening page…';
        chrome();
        if (!canFetch) return unavailable();
        try {
          const res = await fetch(`api/fetch?url=${encodeURIComponent(url)}`, { cache: 'no-store' });
          const data = await res.json();
          if (!res.ok || data.error) {
            st.status = 'The page cannot be displayed';
            return renderMessage({
              title: 'Cannot reach that address',
              body: `<p>${escapeHtml(data.error || 'The proxy returned an error.')}</p>
                <p><b>Two things to check:</b></p>
                <ul>
                  <li>This page is served by <code>node server.mjs</code> — a plain static host has no proxy,
                      so the real internet needs the tiny server from this project.</li>
                  <li>Some hosts block automated requests, and some addresses simply do not exist.</li>
                </ul>
                <p style="margin-top:14px"><a data-url="${HOME}" href="#">Go to the home page</a> ·
                <a href="${escapeAttr(url)}" data-open-tab>Open in a normal browser tab ↗</a></p>`,
              icon: 'warn',
            });
          }
          if (!data.html) {
            st.status = `Download available — ${data.contentType}`;
            return renderDownloadOffer(data);
          }
          renderFrame(data.html, data.url);
        } catch (err) {
          unavailable();
        }
      }

      function unavailable() {
        st.status = 'Proxy unavailable';
        renderMessage({
          title: 'The real internet needs the proxy',
          body: `<p>This copy of Windows XP is running from a static host (or a file), so there is no server to
            fetch pages for it.</p>
            <p>Start it with <code>node server.mjs 8080</code> and the address bar will open real websites.</p>
            <p style="margin-top:14px"><a data-url="http://help.local/" href="#">What does the proxy do?</a> ·
            <a href="${escapeAttr(history[index])}" data-open-tab>Open in a normal browser tab ↗</a></p>`,
          icon: 'warn',
        });
      }

      function renderDownloadOffer(data) {
        const name = fileNameFor(data.url, data.contentType);
        pageShell();
        page.innerHTML = `<div class="ie-error">
          <h1>Downloading ${escapeHtml(name)}</h1>
          <p>This address is a file, not a page: </p>
          <table style="margin:10px 0 14px">
            <tr><th>File</th><td>${escapeHtml(name)}</td></tr>
            <tr><th>Type</th><td>${escapeHtml(data.contentType)}</td></tr>
            ${data.size ? `<tr><th>Size</th><td>${fmtBytes(data.size)}</td></tr>` : ''}
          </table>
          <p>Internet Explorer will save it to <b>My Documents\\Downloads</b> on your C: drive, where
          you can open it with the appropriate program.</p>
          <p style="margin-top:14px"><button class="btn" data-download="${escapeAttr(data.url)}">Save to C:\\Downloads…</button>
          <a href="${escapeAttr(data.url)}" data-open-tab style="margin-left:12px">Open in a normal tab ↗</a></p>
        </div>`;
        page.querySelector('[data-download]').addEventListener('click', (e) => downloadFile(e.target.dataset.download, name, data.contentType));
        page.querySelector('[data-open-tab]')?.addEventListener('click', (e) => { e.preventDefault(); window.open(data.url, '_blank', 'noopener'); });
        chrome();
      }

      function fileNameFor(url, type) {
        try {
          const p = new URL(url).pathname;
          const base = decodeURIComponent(p.split('/').filter(Boolean).pop() || '');
          if (base && base.includes('.')) return base;
        } catch (e) { /* ignore */ }
        const ext = ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'application/pdf': 'pdf',
          'text/plain': 'txt', 'application/zip': 'zip', 'application/json': 'json' })[String(type).split(';')[0]]
          || 'download.bin';
        return `download.${ext}`;
      }

      async function downloadFile(url, name, type) {
        st.status = `Downloading ${name}…`;
        chrome();
        if (!canFetch) return unavailable();
        try {
          const res = await fetch(`api/fetch?url=${encodeURIComponent(url)}&raw=1`, { cache: 'no-store' });
          const blob = await res.blob();
          const dataUrl = await new Promise((resolve, reject) => {
            const fr = new FileReader();
            fr.onload = () => resolve(String(fr.result));
            fr.onerror = reject;
            fr.readAsDataURL(blob);
          });
          const dir = 'C:\\Documents and Settings\\Administrator\\My Documents\\Downloads';
          const safe = name.replace(/[\\/:*?"<>|]/g, '_');
          const target = join(dir, fs.uniqueName(dir, safe.replace(/\.[^.]+$/, ''), (safe.match(/\.[^.]+$/) || [''])[0]));
          fs.writeFile(target, dataUrl, { mime: type.split(';')[0] });
          ctx.sfx.notify();
          ctx.refreshDesktop?.();
          st.status = `Saved ${safe} (${fmtBytes(blob.size)})`;
          chrome();
          const open = await wm.msgBox({
            title: 'Download complete',
            iconName: 'info', width: 420, buttons: ['Open', 'Open Folder', 'Close'],
            text: `${safe} was saved to your computer.\n\n${fmtBytes(blob.size)} · ${dir}`,
          });
          if (open === 'Open') ctx.shell.openPath(target);
          if (open === 'Open Folder') ctx.openApp('explorer', { path: dir });
        } catch (err) {
          wm.error(`The download could not be completed.\n\n${err.message}`, 'Internet Explorer');
          st.status = 'Download failed';
          chrome();
        }
      }

      /* ---------------- navigation ---------------- */
      async function navigate(raw, { push = true } = {}) {
        const url = normUrl(raw);
        if (!url) return;
        if (push) {
          history.splice(index + 1);
          history.push(url);
          index = history.length - 1;
        }
        ctx.sfx.click();
        if (isLocal(url)) return renderLocal(url);
        if (!st.real) {
          st.status = 'The page cannot be displayed';
          return renderMessage({
            title: 'The page cannot be displayed',
            body: `<p>You are browsing the built-in web, which has exactly five pages on it.</p>
              <p>Press the <b>🌐 Real web</b> button to reach real websites through the local proxy.</p>
              <p style="margin-top:14px"><a data-url="${HOME}" href="#">Go to the home page</a> ·
              <a data-url="http://help.local/" href="#">Help and Support</a></p>`,
            icon: 'warn',
          });
        }
        return renderRemote(url);
      }

      /* ---------------- events ---------------- */
      body.addEventListener('click', (e) => {
        const b = e.target.closest('[data-nav]');
        if (b) {
          const a = b.dataset.nav;
          if (a === 'back' && index > 0) { index--; navigate(history[index], { push: false }); }
          else if (a === 'fwd' && index < history.length - 1) { index++; navigate(history[index], { push: false }); }
          else if (a === 'home') navigate(HOME);
          else if (a === 'refresh') navigate(history[index], { push: false });
          else if (a === 'stop') { st.status = 'Stopped'; chrome(); }
          else if (a === 'help') ctx.openApp('help');
          else if (a === 'real') {
            st.real = !st.real;
            ctx.settings.set('ieReal', st.real);
            navigate(history[index], { push: false });
          } else if (a === 'tab') {
            const url = history[index];
            if (!isLocal(url)) window.open(url, '_blank', 'noopener');
            else ctx.sfx.beep();
          }
          return;
        }
        const off = e.target.closest('[data-real-off]');
        if (off) { st.real = false; navigate(history[index], { push: false }); return; }
        const tab = e.target.closest('[data-open-tab]');
        if (tab) { e.preventDefault(); window.open(tab.getAttribute('href'), '_blank', 'noopener'); }
      });

      page.addEventListener('click', (e) => {
        const tab = e.target.closest('[data-open-tab]');
        if (tab) { e.preventDefault(); window.open(tab.getAttribute('href'), '_blank', 'noopener'); }
      });

      body.querySelector('[data-go]').addEventListener('click', () => navigate(addr.value));
      addr.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') navigate(addr.value);
        e.stopPropagation();
      });

      menuBar(body, [
        { label: 'File', items: () => [
          { label: 'New Window', action: () => ctx.openApp('ie', { url: history[index] }) },
          { label: 'Open in a normal tab', disabled: isLocal(history[index]), action: () => window.open(history[index], '_blank', 'noopener') },
          { sep: true },
          { label: 'Close', action: () => win.close() },
        ] },
        { label: 'View', items: () => [
          { label: 'Refresh', kbd: 'F5', action: () => navigate(history[index], { push: false }) },
          { label: 'Use the real internet', checked: st.real, action: () => { st.real = true; navigate(history[index], { push: false }); } },
          { label: 'Use the built-in web', checked: !st.real, action: () => { st.real = false; navigate(history[index], { push: false }); } },
        ] },
        { label: 'Favorites', items: () => [
          { label: 'Arena Home', icon: 'star', action: () => navigate(HOME) },
          { label: 'Windows XP', icon: 'star', action: () => navigate('http://www.microsoft.com/windowsxp/') },
          { label: 'Help and Support', icon: 'star', action: () => navigate('http://help.local/') },
          { sep: true },
          { label: 'Real: Wikipedia', icon: 'ie', action: () => navigate('https://en.wikipedia.org/wiki/Windows_XP') },
          { label: 'Real: Hacker News', icon: 'ie', action: () => navigate('https://news.ycombinator.com/') },
          { label: 'Real: example.com', icon: 'ie', action: () => navigate('https://example.com/') },
        ] },
        { label: 'Tools', items: () => [
          { label: 'Downloads folder', icon: 'folder', action: () => ctx.openApp('explorer', { path: 'C:\\Documents and Settings\\Administrator\\My Documents\\Downloads' }) },
          { label: 'Internet Options…', action: () => ctx.openApp('control', { panel: 'network' }) },
        ] },
        { label: 'Help', items: () => [
          { label: 'About Internet Explorer', action: () => ctx.openApp('about') },
        ] },
      ]);
      body.insertBefore(body.querySelector('.menubar'), body.firstChild);

      /* ---------------- boot ---------------- */
      st.real = ctx.settings.get('ieReal') !== false;
      if (canFetch) {
        fetch('api/health', { cache: 'no-store' })
          .then((r) => r.json())
          .then((d) => { st.proxy = !!d.proxy; chrome(); })
          .catch(() => { st.proxy = false; chrome(); });
      } else {
        st.proxy = false;
      }

      navigate(history[0], { push: false });
    },
  });
}

/* ---------------- helpers ---------------- */
function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const escapeAttr = escapeHtml;

/* ---------------- the (tiny) built-in web ---------------- */

function pageArena() {
  return `
    <div class="hero">
      <h1>Windows XP, in your browser</h1>
      <p>No installation. No downloads. No virtual machine image. Just a tab.</p>
      <div class="btns">
        <a data-app="vm" href="#">Boot the Virtual PC</a>
        <a data-app="cmd" href="#">Command Prompt</a>
        <a data-url="http://help.local/" href="#">What can I do?</a>
      </div>
    </div>
    <h2>Two internets</h2>
    <p>This address bar can reach the <b>real internet</b>. Press <b>🌐 Real web</b> in the toolbar, then type any
    address — it is fetched by the small proxy in <code>server.mjs</code>, with scripts stripped so it cannot take
    over the desktop, and links routed back through the proxy so you can keep clicking.</p>
    <p>Sites that need JavaScript (most of 2026) will look broken or empty. Old-fashioned, mostly-HTML pages —
    Wikipedia, documentation, news, <code>example.com</code> — work far better. If something refuses to render,
    the ↗ button opens it in a normal browser tab.</p>
    <h2>And a real computer</h2>
    <p>The <a data-app="vm" href="#">Virtual PC</a> is not a simulation: it is an actual x86 machine emulated in
    WebAssembly, running a real operating system. Boot the bundled KolibriOS, or insert a floppy, CD or hard-disk
    image of your own.</p>
    <h2>Things worth clicking</h2>
    <ul>
      <li><a data-app="winmine" href="#">Minesweeper</a> — right-click to flag.</li>
      <li><a data-app="paint" href="#">Paint</a> — draw something and save it to My Pictures.</li>
      <li><a data-app="cmd" href="#">Command Prompt</a> — type <code>help</code>, then <code>dir</code>.</li>
      <li><a data-app="display" href="#">Display Properties</a> — wallpaper and screen savers.</li>
    </ul>
    <hr>
    <p style="color:#666;font-size:12px">Built by Arena.ai. Windows and Windows XP are trademarks of Microsoft
    Corporation; this page is an homage, not a product.</p>`;
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
    <h2>The real internet</h2>
    <ul>
      <li><b>🌐 Real web</b> in the Internet Explorer toolbar fetches real pages through
        <code>server.mjs</code> (endpoint <code>/api/fetch</code>).</li>
      <li>Scripts, frames and inline event handlers are stripped before the page reaches you, so a website
        cannot run code inside this desktop.</li>
      <li>Links are rewritten to go back through the proxy, so clicking around works.</li>
      <li>Non-HTML addresses (images, ZIPs, PDFs) offer to save into <b>My Documents\\Downloads</b>.</li>
      <li>Private and local addresses are refused by the proxy — it will not be used to poke at your router.</li>
      <li>A static host has no proxy; the address bar will tell you so and offer a real browser tab instead.</li>
    </ul>
    <h2>Virtual PC</h2>
    <ul>
      <li>Start &gt; All Programs &gt; System Tools &gt; <b>Virtual PC</b>, or the desktop icon.</li>
      <li>It boots <b>KolibriOS 0.7.7</b>, a complete open-source graphical OS in 1.4 MB.</li>
      <li>Drop a <code>.img</code>, <code>.ima</code>, <code>.iso</code> or disk image onto the window to boot it.
        Windows 95/98 discs work if you own one.</li>
      <li>Machine state can be saved to this browser, so an OS you install keeps its programs.</li>
    </ul>
    <h2>Windows basics</h2>
    <ul>
      <li><b>Start menu</b> — the green button in the corner.</li>
      <li><b>Windows</b> — drag a title bar, resize from the edges, double-click to maximise.</li>
      <li><b>Alt+Tab</b> — cycles windows, exactly as you remember.</li>
    </ul>
    <p><a data-url="http://www.arena.ai/" href="#">Back to the home page</a></p>`;
}

function pageSearch() {
  return `
    <div style="text-align:center;padding:26px 0 10px">
      <div style="font:600 40px Arial,sans-serif;letter-spacing:-1px">
        <span style="color:#4285f4">A</span><span style="color:#ea4335">r</span><span style="color:#fbbc05">e</span><span style="color:#4285f4">n</span><span style="color:#34a853">a</span>
      </div>
      <div style="font:11px Tahoma,sans-serif;color:#555;margin-top:4px">Search the simulated web</div>
    </div>
    <h2>Results</h2>
    <p><a data-url="http://www.arena.ai/" href="#"><b>Windows XP, in your browser</b></a><br>
    <span style="color:#0a0;font-size:11px">http://www.arena.ai/</span><br>
    <span style="font-size:12px;color:#444">The complete Windows XP desktop, running in a single web page.</span></p>
    <p style="color:#666;font-size:12px">For real results, switch to the 🌐 Real web and open a real search engine.</p>`;
}

export default launch;
