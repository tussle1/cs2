/* ============================================================
   help.js / about.js / run.js — small system dialogs
   ============================================================ */

import { icon } from '../core/icons.js';

const HELP_HTML = `
  <h1>Windows XP Help and Support</h1>
  <p><i>Everything that works in this browser page.</i></p>

  <h2>Windows and the desktop</h2>
  <ul>
    <li>Drag a window by its title bar; resize from any edge or corner.</li>
    <li>Double-click a title bar to maximize or restore it.</li>
    <li>Minimize to the taskbar; click a taskbar button to restore.</li>
    <li><kbd>Alt</kbd>+<kbd>Tab</kbd> cycles windows, <kbd>Alt</kbd>+<kbd>F4</kbd> closes the active one.</li>
    <li>Right-click the desktop for Arrange Icons, Refresh, New and Properties.</li>
    <li>Select desktop icons with a drag-marquee, open with double-click.</li>
  </ul>

  <h2>Programs</h2>
  <table>
    <tr><th>Program</th><th>What it does</th></tr>
    <tr><td>My Computer</td><td>Browse C:, A: and D:; create, rename, delete and open files.</td></tr>
    <tr><td>Notepad</td><td>Open and save text files, word wrap, time/date stamp.</td></tr>
    <tr><td>Paint</td><td>Pencil, brush, eraser, line, rectangle, ellipse, flood fill, airbrush, picker; saves PNG.</td></tr>
    <tr><td>Command Prompt</td><td>A real shell over the virtual disk: dir, cd, type, tree, copy, move, ren, del, ping, ipconfig, systeminfo, color, start, shutdown.</td></tr>
    <tr><td>Calculator</td><td>Standard arithmetic with memory keys and keyboard input.</td></tr>
    <tr><td>Minesweeper</td><td>Beginner, Intermediate and Expert, with flags and best times.</td></tr>
    <tr><td>Solitaire</td><td>Klondike: click a card, then click where it should go; double-click sends it home.</td></tr>
    <tr><td>Internet Explorer</td><td>A small built-in internet with five pages and a working Back button.</td></tr>
    <tr><td>Media Player</td><td>Four synthesised tracks with a live visualiser (Web Audio).</td></tr>
    <tr><td>Control Panel</td><td>Wallpaper, colour scheme, screen saver, sounds, clock, user name, system info.</td></tr>
    <tr><td>Task Manager</td><td>Applications, processes, CPU and memory graphs; end tasks for real.</td></tr>
  </table>

  <h2>Where your files live</h2>
  <p>Your C: drive lives in this browser’s <code>localStorage</code>. Files survive a refresh and are
  private to this browser profile. Nothing is uploaded. To start over, open
  <b>Control Panel → System → Restore this computer</b>.</p>

  <h2>Is this a virtual machine?</h2>
  <p>No. There is no x86 emulator and no Windows disk image here — that would mean a 300&nbsp;MB download and
  a licence. This is a from-scratch re-implementation of the Windows XP shell and a dozen programs in
  HTML, CSS and JavaScript, which is why it boots instantly and works on a phone.</p>

  <h2>Keyboard shortcuts</h2>
  <table>
    <tr><th>Keys</th><th>Action</th></tr>
    <tr><td><kbd>F1</kbd></td><td>Help and Support</td></tr>
    <tr><td><kbd>Alt</kbd>+<kbd>Tab</kbd></td><td>Switch windows</td></tr>
    <tr><td><kbd>Alt</kbd>+<kbd>F4</kbd></td><td>Close active window</td></tr>
    <tr><td><kbd>Esc</kbd></td><td>Close menus and dialogs</td></tr>
    <tr><td><kbd>F5</kbd></td><td>Refresh desktop</td></tr>
  </table>

  <p style="margin-top:22px;color:#666">Windows and Windows XP are trademarks of Microsoft Corporation.
  This page is an independent homage built by Arena.ai.</p>`;

export function launch(ctx) {
  const { wm } = ctx;
  wm.open({
    title: 'Help and Support Center',
    icon: 'help',
    width: 680, height: 540, minWidth: 420, minHeight: 300,
    appId: 'help',
    singleton: 'help',
    onMount: (body) => {
      body.innerHTML = `<div class="helpdoc scroll"></div>`;
      body.querySelector('.helpdoc').innerHTML = HELP_HTML;
      body.style.padding = '0';
    },
  });
}

export function launchAbout(ctx) {
  const { wm } = ctx;
  wm.open({
    title: 'About Windows',
    icon: 'windows',
    width: 440,
    autoHeight: true,
    dialog: true,
    showInTaskbar: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    appId: 'about',
    onMount: (body, win) => {
      body.innerHTML = `
        <div style="padding:16px 18px;display:flex;flex-direction:column;gap:12px;font-size:11px">
          <div style="display:flex;gap:14px;align-items:center">
            <div style="width:44px;height:44px">${icon('windows')}</div>
            <div>
              <div style="font-size:15px;font-weight:bold;letter-spacing:-.2px">Microsoft Windows XP</div>
              <div style="color:#555">Professional · Version 2002 · Service Pack 3</div>
            </div>
          </div>
          <div style="border-top:1px solid #ddd;padding-top:10px;line-height:1.7;color:#333">
            <b>Windows in the browser</b> — a faithful re-creation of the Windows XP desktop in
            HTML, CSS and JavaScript. No emulator, no disk image, no installation.<br><br>
            Memory available to Windows: 1,048,576 KB<br>
            Registered to: ${ctx.settings.get('userName')} · ARENA-XP<br>
            Built by Arena.ai
          </div>
          <div style="display:flex;justify-content:flex-end">
            <button class="btn primary" data-ok>OK</button>
          </div>
        </div>`;
      body.querySelector('[data-ok]').addEventListener('click', () => win.close());
    },
  });
}

export function launchRun(ctx) {
  const { wm } = ctx;
  wm.open({
    title: 'Run',
    icon: 'run',
    width: 400,
    autoHeight: true,
    dialog: true,
    showInTaskbar: false,
    resizable: false,
    maximizable: false,
    appId: 'run',
    onMount: (body, win) => {
      body.innerHTML = `
        <div class="dlg">
          <div class="body">
            ${icon('run')}
            <div class="fields">
              <span class="hint">Type the name of a program, folder, document, or Internet resource,
              and Windows will open it for you.</span>
              <label style="margin-top:4px">Open:</label>
              <input class="field" type="text" value="" spellcheck="false" aria-label="Open">
            </div>
          </div>
          <div class="foot">
            <button class="btn primary" data-ok>OK</button>
            <button class="btn" data-cancel>Cancel</button>
            <button class="btn" data-browse>Browse…</button>
          </div>
        </div>`;
      const input = body.querySelector('input');
      const submit = () => {
        const v = input.value.trim();
        win.close();
        if (v) ctx.shell.runCommand(v);
      };
      body.querySelector('[data-ok]').addEventListener('click', submit);
      body.querySelector('[data-cancel]').addEventListener('click', () => win.close());
      body.querySelector('[data-browse]').addEventListener('click', () => {
        win.close();
        ctx.openApp('explorer', { path: 'C:\\' });
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submit();
        if (e.key === 'Escape') win.close();
        e.stopPropagation();
      });
      input.focus();
    },
  });
}
