/* ============================================================
   startmenu.js — the Start menu and All Programs
   ============================================================ */

import { icon } from './icons.js';
import { openMenu, closeMenus } from './menu.js';

export function initStartMenu(ctx) {
  const btn = document.getElementById('start-button');
  const menu = document.getElementById('start-menu');
  const { settings, shell } = ctx;
  let isOpen = false;

  const PROGRAMS = [
    { header: 'Accessories' },
    { label: 'Calculator', icon: 'calc', app: 'calc' },
    { label: 'Command Prompt', icon: 'cmd', app: 'cmd' },
    { label: 'Notepad', icon: 'notepad', app: 'notepad' },
    { label: 'Paint', icon: 'paint', app: 'paint' },
    { label: 'Windows Explorer', icon: 'folder', app: 'explorer', opts: { path: 'C:\\' } },
    { sep: true },
    { header: 'Games' },
    { label: 'Minesweeper', icon: 'mine', app: 'winmine' },
    { label: 'Solitaire', icon: 'cards', app: 'solitaire' },
    { sep: true },
    { header: 'Internet' },
    { label: 'Internet Explorer', icon: 'ie', app: 'ie' },
    { sep: true },
    { header: 'Entertainment' },
    { label: 'Windows Media Player', icon: 'media', app: 'media' },
    { sep: true },
    { header: 'System Tools' },
    { label: 'Virtual PC', icon: 'vm', app: 'vm' },
    { label: 'Control Panel', icon: 'control', app: 'control' },
    { label: 'Task Manager', icon: 'exe', app: 'taskmgr' },
    { label: 'System Information', icon: 'computer', app: 'control', opts: { panel: 'system' } },
  ];

  function item({ label, icon: ic, sub, action, bold, cls }) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'sm-item' + (bold ? ' bold' : '') + (cls ? ' ' + cls : '');
    b.innerHTML = `${ic ? icon(ic) : '<span style="width:24px"></span>'}<span>${label}${sub ? `<span class="sub">${sub}</span>` : ''}</span>`;
    b.addEventListener('click', () => { close(); action(); });
    return b;
  }

  function build() {
    const name = settings.get('userName') || 'Administrator';
    menu.innerHTML = `
      <div class="sm-header">
        <div class="avatar">${icon('user')}</div>
        <div class="who"></div>
      </div>
      <div class="sm-body">
        <div class="sm-left"></div>
        <div class="sm-right"></div>
      </div>
      <div class="sm-footer">
        <button type="button" data-logoff>${icon('logoff')}<span>Log Off</span></button>
        <button type="button" data-off>${icon('shutdown')}<span>Turn Off Computer</span></button>
      </div>`;
    menu.querySelector('.who').textContent = name;

    const left = menu.querySelector('.sm-left');
    const right = menu.querySelector('.sm-right');

    left.append(
      item({ label: 'Internet', sub: 'Internet Explorer', icon: 'ie', bold: true, action: () => ctx.openApp('ie', { url: 'http://www.arena.ai/' }) }),
      item({ label: 'E-mail', sub: 'Outlook Express', icon: 'mail', bold: true, action: () => ctx.openApp('about') }),
      Object.assign(document.createElement('div'), { className: 'sm-sep' }),
    );
    left.append(
      item({ label: 'Windows Media Player', icon: 'media', action: () => ctx.openApp('media') }),
      item({ label: 'Windows Messenger', icon: 'messenger', action: () => ctx.openApp('about') }),
      Object.assign(document.createElement('div'), { className: 'sm-sep' }),
    );

    const allBtn = item({ label: 'All Programs', icon: '', bold: true, action: () => {} });
    allBtn.classList.add('has-sub');
    allBtn.innerHTML = '<span style="width:12px"></span><span>All Programs</span><span style="margin-left:auto">▸</span>';
    const showPrograms = () => {
      const r = allBtn.getBoundingClientRect();
      const items = PROGRAMS.map((p) => {
        if (p.sep) return { sep: true };
        if (p.header) return { header: p.header };
        return {
          label: p.label,
          icon: p.icon,
          action: () => { close(); ctx.openApp(p.app, p.opts || {}); },
        };
      });
      openMenu(r.right - 4, r.top - 8, items, {});
    };
    allBtn.addEventListener('pointerenter', showPrograms);
    allBtn.addEventListener('click', showPrograms);
    left.appendChild(allBtn);

    right.append(
      item({ label: 'My Documents', icon: 'folder', bold: true, action: () => ctx.openApp('explorer', { path: 'C:\\Documents and Settings\\Administrator\\My Documents', singleton: 'mydocs' }) }),
      item({ label: 'My Recent Documents', icon: 'folder', bold: true, action: () => ctx.openApp('explorer', { path: 'C:\\Documents and Settings\\Administrator\\My Documents' }) }),
      item({ label: 'My Pictures', icon: 'folder', bold: true, action: () => ctx.openApp('explorer', { path: 'C:\\Documents and Settings\\Administrator\\My Documents\\My Pictures' }) }),
      item({ label: 'My Music', icon: 'media', bold: true, action: () => ctx.openApp('explorer', { path: 'C:\\Documents and Settings\\Administrator\\My Documents\\My Music' }) }),
      Object.assign(document.createElement('div'), { className: 'sm-sep' }),
      item({ label: 'My Computer', icon: 'computer', bold: true, action: () => ctx.openApp('explorer', { path: '::computer', singleton: 'mycomputer', title: 'My Computer' }) }),
      Object.assign(document.createElement('div'), { className: 'sm-sep' }),
      item({ label: 'Control Panel', icon: 'control', bold: true, action: () => ctx.openApp('control') }),
      item({ label: 'Search', icon: 'search', action: () => ctx.openApp('explorer', { path: 'C:\\' }) }),
      item({ label: 'Run…', icon: 'run', action: () => ctx.openApp('run') }),
      item({ label: 'Help and Support', icon: 'help', action: () => ctx.openApp('help') }),
    );

    menu.querySelector('[data-off]').addEventListener('click', () => { close(); ctx.openShutdownDialog(); });
    menu.querySelector('[data-logoff]').addEventListener('click', () => { close(); ctx.logoff(); });
  }

  function open() {
    if (isOpen) return;
    isOpen = true;
    build();
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    ctx.sfx.click();
    setTimeout(() => document.addEventListener('pointerdown', outside, true), 0);
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    menu.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    closeMenus();
    document.removeEventListener('pointerdown', outside, true);
  }

  function outside(e) {
    if (menu.contains(e.target) || btn.contains(e.target)) return;
    if (e.target.closest('.menu')) return;
    close();
  }

  function toggle() { isOpen ? close() : open(); }

  btn.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
    if (e.key === 'F1') { e.preventDefault(); ctx.openApp('help'); }
  });

  return { open, close, toggle, rebuild: () => { if (isOpen) { build(); } } };
}

export default initStartMenu;
