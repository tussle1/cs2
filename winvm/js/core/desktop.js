/* ============================================================
   desktop.js — desktop icons, selection, marquee, context menu
   ============================================================ */

import { icon, fileIcon } from './icons.js';
import { normalize, join, DESKTOP_DIR, MY_DOCS, MY_PICS, MY_MUSIC } from './fs.js';
import { contextMenu } from './menu.js';

export function initDesktop(ctx) {
  const { fs, wm, shell, settings } = ctx;
  const iconsEl = document.getElementById('icons');
  const desktopEl = document.getElementById('desktop');
  const marquee = document.getElementById('marquee');
  let selected = null;

  const SPECIALS = [
    {
      name: 'My Computer', icon: 'computer', kind: 'system',
      open: () => ctx.openApp('explorer', { path: '::computer', singleton: 'mycomputer', title: 'My Computer' }),
    },
    {
      name: 'My Documents', icon: 'folder', kind: 'system',
      open: () => ctx.openApp('explorer', { path: MY_DOCS, singleton: 'mydocs', title: 'My Documents' }),
    },
    {
      name: 'Recycle Bin', icon: () => (shell.recycled.length ? 'recycle' : 'recycleEmpty'), kind: 'recycle',
      open: () => ctx.openApp('recycle'),
    },
    {
      name: 'Internet Explorer', icon: 'ie', kind: 'system',
      open: () => ctx.openApp('ie', { url: 'http://www.arena.ai/', singleton: 'ie-home' }),
    },
  ];

  function desktopFiles() {
    return (fs.list(DESKTOP_DIR) || []).map((n) => ({
      name: n.name,
      path: join(DESKTOP_DIR, n.name),
      node: n,
      icon: n.type === 'dir' ? 'folder' : fileIcon(n.name),
      kind: 'file',
    }));
  }

  function select(el) {
    iconsEl.querySelectorAll('.dicon').forEach((n) => n.classList.toggle('selected', n === el));
    selected = el || null;
  }

  function render() {
    iconsEl.innerHTML = '';
    const entries = [...SPECIALS.map((s) => ({ ...s, special: true })), ...desktopFiles()];
    entries.forEach((entry) => {
      const el = document.createElement('div');
      el.className = 'dicon';
      el.tabIndex = 0;
      el.setAttribute('role', 'listitem');
      const ic = typeof entry.icon === 'function' ? entry.icon() : entry.icon;
      el.innerHTML = `${icon(ic)}<span></span>`;
      el.querySelector('span').textContent = entry.name;
      el.title = entry.name;
      el.dataset.name = entry.name;

      el.addEventListener('click', (e) => { e.stopPropagation(); select(el); });
      el.addEventListener('dblclick', () => openEntry(entry, el));
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') openEntry(entry, el);
        if (e.key === 'Delete' && entry.path) { shell.recycle(entry.path); render(); }
      });
      el.addEventListener('contextmenu', (e) => {
        select(el);
        if (entry.special) {
          contextMenu(e, [
            { label: 'Open', icon: entry.icon, action: () => openEntry(entry, el) },
            entry.kind === 'recycle' ? { label: `Empty Recycle Bin (${shell.recycled.length})`, icon: 'delete', disabled: !shell.recycled.length, action: async () => {
              const ok = await wm.confirm('Are you sure you want to permanently delete these items?', 'Confirm Delete');
              if (ok) { shell.emptyRecycle(); render(); }
            } } : null,
            { sep: true },
            { label: 'Properties', icon: 'props', action: () => ctx.openApp(entry.name === 'My Computer' ? 'control' : 'about', { panel: 'system' }) },
          ]);
        } else {
          contextMenu(e, [
            { label: 'Open', icon: entry.icon, action: () => openEntry(entry, el) },
            { sep: true },
            { label: 'Rename', icon: 'rename', action: async () => {
              const name = await wm.prompt({ title: 'Rename', label: 'New name:', value: entry.name });
              if (name && fs.rename(entry.path, name)) render();
            } },
            { label: 'Delete', icon: 'delete', action: () => { shell.recycle(entry.path); render(); } },
            { sep: true },
            { label: 'Properties', icon: 'props', action: () => wm.alert(
              `${entry.name}\n\nType: ${entry.node.type === 'dir' ? 'File Folder' : 'File'}\nLocation: ${DESKTOP_DIR}`
              + `\nSize: ${entry.node.type === 'file' ? (entry.node.content || '').length + ' bytes' : '—'}`, 'Properties') },
          ]);
        }
      });
      iconsEl.appendChild(el);
    });
  }

  function openEntry(entry, el) {
    if (entry.special) return entry.open();
    if (entry.node?.type === 'dir') return ctx.openApp('explorer', { path: entry.path });
    return shell.openPath(entry.path);
    void el;
  }

  /* --- desktop background: click, marquee, context menu --- */
  desktopEl.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('.win') || e.target.closest('.dicon')) return;
    select(null);
    const startX = e.clientX;
    const startY = e.clientY;
    let dragging = false;
    const onMove = (ev) => {
      if (!dragging && Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) < 6) return;
      dragging = true;
      marquee.hidden = false;
      const x = Math.min(startX, ev.clientX);
      const y = Math.min(startY, ev.clientY);
      const w = Math.abs(ev.clientX - startX);
      const h = Math.abs(ev.clientY - startY);
      Object.assign(marquee.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
      const box = { l: x, t: y, r: x + w, b: y + h };
      iconsEl.querySelectorAll('.dicon').forEach((n) => {
        const r = n.getBoundingClientRect();
        const hit = !(r.right < box.l || r.left > box.r || r.bottom < box.t || r.top > box.b);
        n.classList.toggle('selected', hit);
      });
    };
    const onUp = () => {
      marquee.hidden = true;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      void dragging;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  });

  desktopEl.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.win') || e.target.closest('.dicon')) return;
    select(null);
    contextMenu(e, [
      { label: 'Arrange Icons By', submenu: [
        { label: 'Name', action: render },
        { label: 'Type', action: render },
        { label: 'Auto Arrange', checked: true, action: render },
      ] },
      { label: 'Refresh', icon: 'refresh', action: render },
      { sep: true },
      { label: 'New', submenu: [
        { label: 'Folder', icon: 'folder', action: newFolder },
        { label: 'Text Document', icon: 'txt', action: newText },
      ] },
      { sep: true },
      { label: 'Properties', icon: 'props', action: () => ctx.openApp('display') },
    ]);
  });

  function newFolder() {
    const name = fs.uniqueName(DESKTOP_DIR, 'New Folder');
    fs.mkdir(join(DESKTOP_DIR, name), { parents: true });
    render();
  }
  function newText() {
    const name = fs.uniqueName(DESKTOP_DIR, 'New Text Document', '.txt');
    fs.writeFile(join(DESKTOP_DIR, name), '');
    render();
    ctx.openApp('notepad', { path: join(DESKTOP_DIR, name) });
  }

  fs.onChange(render);
  render();

  return { render, select, get selected() { return selected; } };
}

export default initDesktop;
