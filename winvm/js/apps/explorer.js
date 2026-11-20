/* ============================================================
   explorer.js — My Computer / Windows Explorer
   ============================================================ */

import { icon, fileIcon, extLabel } from '../core/icons.js';
import { normalize, join, dirname, basename } from '../core/fs.js';
import { menuBar, contextMenu } from '../core/menu.js';
import { fmtBytes, fmtDate } from '../core/util.js';
import sfx from '../core/sound.js';

const COMPUTER = '::computer';

const DRIVES = [
  { name: '3½ Floppy (A:)', path: 'A:\\', icon: 'floppy', label: '3½ Inch Floppy Disk', cap: '1.44 MB' },
  { name: 'Local Disk (C:)', path: 'C:\\', icon: 'drive', label: 'Local Disk', cap: '19.0 GB' },
  { name: 'CD Drive (D:)', path: 'D:\\', icon: 'cd', label: 'CD Drive', cap: '681 MB' },
];

const SPECIAL = [
  { name: 'My Documents', path: 'C:\\Documents and Settings\\Administrator\\My Documents', icon: 'folder' },
  { name: 'My Pictures', path: 'C:\\Documents and Settings\\Administrator\\My Documents\\My Pictures', icon: 'folder' },
  { name: 'Control Panel', path: '::control', icon: 'control' },
];

export function launch(ctx, opts = {}) {
  const { wm, fs, shell, settings } = ctx;
  const startPath = opts.path === COMPUTER ? COMPUTER : (opts.path ? normalize(opts.path) : COMPUTER);

  wm.open({
    title: opts.title || 'My Computer',
    icon: 'folder',
    width: 780, height: 520, minWidth: 460, minHeight: 280,
    appId: 'explorer',
    singleton: opts.singleton,
    x: opts.x, y: opts.y,
    onMount: (body, win) => {
      const st = {
        path: startPath,
        hist: [startPath],
        idx: 0,
        view: settings.get('explorerView') || 'icons',
        sel: null,
        side: true,
      };

      body.classList.add('exp');
      body.innerHTML = `
        <div class="toolbar">
          <button type="button" data-act="back" title="Back">${icon('back')}</button>
          <button type="button" data-act="fwd" title="Forward">${icon('forward')}</button>
          <button type="button" data-act="up" title="Up">${icon('upFolder')}</button>
          <div class="vsep"></div>
          <button type="button" data-act="search">${icon('search')}<span>Search</span></button>
          <button type="button" data-act="folders">${icon('folder')}<span>Folders</span></button>
          <div class="vsep"></div>
          <button type="button" data-act="views" title="Views">${icon('copy')}<span>Views</span></button>
        </div>
        <div class="exp-addr">
          <label>Address</label>
          <div class="field">${icon('folder')}<input type="text" spellcheck="false" aria-label="Address" /></div>
          <button class="btn" type="button" data-act="go" style="min-width:44px;height:22px">Go</button>
        </div>
        <div class="exp-main">
          <aside class="exp-side"></aside>
          <div class="exp-views">
            <div class="exp-cols" hidden><span>Name</span><span>Type</span><span>Size</span><span>Date Modified</span></div>
            <div class="exp-files scroll" tabindex="0"></div>
          </div>
        </div>
        <div class="statusbar"><span class="st-count">0 objects</span><span class="st-sel"></span><span class="st-size"></span></div>`;

      menuBar(body, []).el.remove(); // keep API available, no menu bar in Explorer

      const $ = (s) => body.querySelector(s);
      const filesEl = $('.exp-files');
      const colsEl = $('.exp-cols');
      const addrInput = $('.exp-addr input');
      const sideEl = $('.exp-side');
      const stCount = $('.st-count');
      const stSel = $('.st-sel');
      const stSize = $('.st-size');
      const toolbar = $('.toolbar');

      /* ---------------- data ---------------- */
      function titleFor(path) {
        if (path === COMPUTER) return 'My Computer';
        if (path === '::control') return 'Control Panel';
        if (/^[A-Za-z]:\\$/.test(path)) {
          const d = DRIVES.find((x) => x.path === path);
          return d ? d.name : path.slice(0, 2);
        }
        return basename(path) || path;
      }

      function listFor(path) {
        if (path === COMPUTER) {
          return DRIVES.map((d) => ({
            name: d.name, path: d.path, icon: d.icon, type: 'drive', kind: d.label,
            modified: Date.now(), size: 0, cap: d.cap,
          }));
        }
        if (path === '::control') return null;
        return (fs.list(path) || []).map((n) => ({
          name: n.name,
          path: join(path, n.name),
          icon: n.type === 'dir' ? 'folder' : fileIcon(n.name),
          type: n.type,
          kind: n.type === 'dir' ? 'File Folder' : extLabel(n.name),
          modified: n.modified || n.created,
          size: n.type === 'dir' ? 0 : (n.content || '').length,
          node: n,
        }));
      }

      const thumbIcon = (it) => {
        if (it.node && it.node.mime === 'image/png' && typeof it.node.content === 'string' && it.node.content.startsWith('data:')) return null;
        return it.icon;
      };

      /* ---------------- rendering ---------------- */
      function renderChrome() {
        win.setTitle(titleFor(st.path));
        addrInput.value = st.path === COMPUTER ? 'My Computer' : st.path;
        toolbar.querySelector('[data-act="back"]').disabled = st.idx <= 0;
        toolbar.querySelector('[data-act="fwd"]').disabled = st.idx >= st.hist.length - 1;
        toolbar.querySelector('[data-act="up"]').disabled = st.path === COMPUTER || /^[A-Za-z]:\\$/.test(st.path);
        filesEl.className = 'exp-files scroll ' + st.view;
        colsEl.hidden = st.view !== 'details';
        sideEl.style.display = st.side ? '' : 'none';
      }

      function renderSide() {
        const sel = st.sel;
        const info = sel ? selItem() : null;
        const tasks = st.path === COMPUTER
          ? `<div class="group"><h4>System Tasks</h4>
               <button class="item" data-side="sysinfo">${icon('computer')}<span>View system information</span></button>
               <button class="item" data-side="addrem">${icon('exe')}<span>Add or remove programs</span></button>
               <button class="item" data-side="control">${icon('gear')}<span>Change a setting</span></button>
             </div>`
          : `<div class="group"><h4>File and Folder Tasks</h4>
               <button class="item" data-side="newfolder">${icon('new')}<span>Make a new folder</span></button>
               <button class="item" data-side="web">${icon('ie')}<span>Publish this folder to the Web</span></button>
               <button class="item" data-side="share">${icon('network')}<span>Share this folder</span></button>
             </div>`;

        sideEl.innerHTML = `
          ${tasks}
          <div class="group"><h4>Other Places</h4>
            <button class="item" data-side="computer">${icon('computer')}<span>My Computer</span></button>
            <button class="item" data-side="docs">${icon('folder')}<span>My Documents</span></button>
            <button class="item" data-side="pics">${icon('folder')}<span>My Pictures</span></button>
            <button class="item" data-side="control">${icon('control')}<span>Control Panel</span></button>
          </div>
          <div class="group"><h4>Details</h4>
            <div style="padding:6px 9px;line-height:1.45">
              ${info
                ? `<b>${escapeHtmlLocal(info.name)}</b><br>${escapeHtmlLocal(info.kind)}<br>
                   ${info.type === 'file' ? fmtBytes(info.size) : ''}<br>
                   <span style="color:#667">Modified: ${fmtDate(info.modified, { time: false })}</span>`
                : '<span style="color:#667">Select an item to view its details.</span>'}
            </div>
          </div>
          ${st.path === COMPUTER ? '<div class="tip">Tip: double-click a drive to browse your files.</div>' : ''}`;

        sideEl.querySelectorAll('[data-side]').forEach((b) => b.addEventListener('click', () => {
          const a = b.dataset.side;
          if (a === 'newfolder') newFolder();
          else if (a === 'web') ctx.openApp('ie', { url: 'http://www.arena.ai/' });
          else if (a === 'share') wm.alert('Simple File Sharing is not available in this simulation, but the sentiment is appreciated.', 'Sharing');
          else if (a === 'computer') navigate(COMPUTER);
          else if (a === 'docs') navigate('C:\\Documents and Settings\\Administrator\\My Documents');
          else if (a === 'pics') navigate('C:\\Documents and Settings\\Administrator\\My Documents\\My Pictures');
          else if (a === 'control') ctx.openApp('control');
          else if (a === 'sysinfo') ctx.openApp('control', { panel: 'system' });
          else if (a === 'addrem') wm.alert('Add or Remove Programs\n\nAll programs in this build are built in, so there is nothing to remove.', 'Add or Remove Programs');
        }));
      }

      function renderFiles() {
        const items = listFor(st.path);
        if (items === null) { // control panel shortcut
          filesEl.innerHTML = '';
          return;
        }
        filesEl.innerHTML = '';
        if (!items.length) {
          const empty = document.createElement('div');
          empty.className = 'exp-empty';
          empty.textContent = 'This folder is empty.';
          filesEl.appendChild(empty);
        }
        for (const it of items) {
          const d = document.createElement('div');
          d.className = 'exp-item' + (st.sel === it.path ? ' selected' : '');
          d.dataset.path = it.path;
          d.tabIndex = 0;
          const thumb = thumbIcon(it);
          if (thumb) {
            d.innerHTML = `${icon(thumb)}<span></span>`;
            d.querySelector('span').textContent = it.name;
          } else {
            d.innerHTML = `<span></span>`;
            d.firstElementChild.textContent = it.name;
            const img = document.createElement('img');
            img.src = it.node.content;
            img.alt = '';
            img.style.width = '38px';
            img.style.height = '38px';
            img.style.objectFit = 'contain';
            d.prepend(img);
          }
          if (st.view === 'details') {
            const t = document.createElement('span');
            t.className = 'meta';
            t.textContent = it.kind;
            const s = document.createElement('span');
            s.className = 'meta';
            s.textContent = it.type === 'file' ? fmtBytes(it.size) : (it.cap || '');
            const m = document.createElement('span');
            m.className = 'meta';
            m.textContent = fmtDate(it.modified, { time: false });
            d.append(t, s, m);
          }
          filesEl.appendChild(d);
        }
        stCount.textContent = `${items.length} object${items.length === 1 ? '' : 's'}`;
      }

      function renderStatus() {
        const it = st.sel ? selItem() : null;
        stSel.textContent = it ? `${escapeHtmlLocal(it.name)}  ${it.type === 'file' ? fmtBytes(it.size) : it.kind}` : '';
        const items = listFor(st.path) || [];
        const total = items.reduce((n, i) => n + (i.size || 0), 0);
        stSize.textContent = total ? fmtBytes(total) : '';
      }

      function selItem() {
        if (!st.sel) return null;
        const items = listFor(st.path) || [];
        return items.find((i) => i.path === st.sel) || null;
      }

      function render() {
        renderChrome();
        renderFiles();
        renderSide();
        renderStatus();
      }

      /* ---------------- actions ---------------- */
      function navigate(path, { push = true } = {}) {
        if (path === '::control') { ctx.openApp('control'); return; }
        if (path !== COMPUTER && !fs.exists(path)) {
          sfx.error();
          wm.error(`'${path}' is not accessible.\n\nThe path may be incorrect, or the drive is not ready.`, 'My Computer');
          return;
        }
        st.path = path;
        st.sel = null;
        if (push) {
          st.hist = st.hist.slice(0, st.idx + 1);
          st.hist.push(path);
          st.idx = st.hist.length - 1;
        }
        render();
      }

      function newFolder() {
        if (st.path === COMPUTER) return;
        const name = fs.uniqueName(st.path, 'New Folder');
        fs.mkdir(join(st.path, name), { parents: true });
        render();
        st.sel = join(st.path, name);
        render();
        ctx.refreshDesktop?.();
      }

      function newTextFile() {
        if (st.path === COMPUTER) return;
        const name = fs.uniqueName(st.path, 'New Text Document', '.txt');
        fs.writeFile(join(st.path, name), '');
        st.sel = join(st.path, name);
        render();
        ctx.refreshDesktop?.();
      }

      function setView(v) {
        st.view = v;
        settings.set('explorerView', v);
        render();
      }

      async function renameSelected() {
        const it = selItem();
        if (!it) return;
        const name = await wm.prompt({ title: 'Rename', label: 'New name:', value: it.name });
        if (!name) return;
        if (fs.rename(it.path, name)) {
          st.sel = join(dirname(it.path), name);
          render();
          ctx.refreshDesktop?.();
        } else {
          wm.error('The file name you specified is not valid.', 'Rename');
        }
      }

      async function deleteSelected() {
        const it = selItem();
        if (!it) return;
        if (it.type === 'drive') { wm.error('This drive cannot be deleted.', 'Error'); return; }
        const ok = ctx.settings.get('confirmDelete')
          ? await wm.confirm(`Are you sure you want to move '${it.name}' to the Recycle Bin?`, 'Confirm Delete')
          : true;
        if (!ok) return;
        shell.recycle(it.path);
        st.sel = null;
        render();
      }

      function propsOf(it) {
        wm.msgBox({
          title: `${it.name} Properties`,
          iconName: it.type === 'dir' ? 'folder' : 'txt',
          buttons: ['OK'],
          width: 400,
          text: `${it.name}\n\nType: ${it.kind}\nLocation: ${dirname(it.path)}\n`
            + (it.type === 'file' ? `Size: ${fmtBytes(it.size)}\n` : '')
            + `Modified: ${fmtDate(it.modified)}\n\nRead-only: No\nHidden: No`,
        });
      }

      function viewMenu(x, y) {
        contextMenu({ preventDefault() {}, stopPropagation() {}, clientX: x, clientY: y }, [
          { header: 'Views' },
          { label: 'Icons', checked: st.view === 'icons', action: () => setView('icons') },
          { label: 'List', checked: st.view === 'list', action: () => setView('list') },
          { label: 'Details', checked: st.view === 'details', action: () => setView('details') },
        ]);
      }

      function itemMenu(e, it) {
        st.sel = it.path;
        render();
        contextMenu(e, [
          { label: 'Open', icon: it.type === 'dir' ? 'folderOpen' : fileIcon(it.name), action: () => openItem(it) },
          it.type === 'dir' ? { label: 'Explore', icon: 'folder', action: () => navigate(it.path) } : null,
          { sep: true },
          { label: 'Rename', icon: 'rename', disabled: it.type === 'drive', action: renameSelected },
          { label: 'Delete', icon: 'delete', disabled: it.type === 'drive', action: deleteSelected },
          { sep: true },
          { label: 'Properties', icon: 'props', action: () => propsOf(it) },
        ]);
      }

      function emptyMenu(e) {
        st.sel = null;
        render();
        contextMenu(e, [
          { label: 'View', submenu: [
            { label: 'Icons', checked: st.view === 'icons', action: () => setView('icons') },
            { label: 'List', checked: st.view === 'list', action: () => setView('list') },
            { label: 'Details', checked: st.view === 'details', action: () => setView('details') },
          ] },
          { label: 'Arrange Icons By', submenu: [
            { label: 'Name', action: () => render() },
            { label: 'Type', action: () => render() },
            { label: 'Date Modified', action: () => render() },
          ] },
          { label: 'Refresh', icon: 'refresh', action: () => render() },
          { sep: true },
          { label: 'New', submenu: [
            { label: 'Folder', icon: 'folder', action: newFolder },
            { label: 'Text Document', icon: 'txt', action: newTextFile },
          ] },
          { sep: true },
          { label: 'Properties', icon: 'props', action: () => wm.alert(
            'Folder properties\n\nType: File Folder\nLocation: ' + (st.path === COMPUTER ? 'Desktop' : dirname(st.path))
            + '\nSize: ' + fmtBytes(fs.size(st.path === COMPUTER ? 'C:\\' : st.path))
            + '\nContains: ' + (listFor(st.path) || []).length + ' objects', 'Properties') },
        ]);
      }

      function openItem(it) {
        if (it.type === 'drive' || it.type === 'dir') navigate(it.path);
        else shell.openPath(it.path);
      }

      /* ---------------- wiring ---------------- */
      filesEl.addEventListener('click', (e) => {
        const item = e.target.closest('.exp-item');
        st.sel = item ? item.dataset.path : null;
        filesEl.querySelectorAll('.exp-item').forEach((n) => n.classList.toggle('selected', n.dataset.path === st.sel));
        renderSide();
        renderStatus();
      });

      filesEl.addEventListener('dblclick', (e) => {
        const item = e.target.closest('.exp-item');
        if (!item) return;
        const found = (listFor(st.path) || []).find((i) => i.path === item.dataset.path);
        if (found) openItem(found);
      });

      filesEl.addEventListener('contextmenu', (e) => {
        const item = e.target.closest('.exp-item');
        if (item) {
          const found = (listFor(st.path) || []).find((i) => i.path === item.dataset.path);
          if (found) { itemMenu(e, found); return; }
        }
        emptyMenu(e);
      });

      filesEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { const it = selItem(); if (it) openItem(it); }
        else if (e.key === 'Delete') deleteSelected();
        else if (e.key === 'F2') renameSelected();
        else if (e.key === 'F5') render();
        else if (e.key === 'Backspace') goUp();
      });

      toolbar.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-act]');
        if (!b) return;
        const a = b.dataset.act;
        if (a === 'back') { if (st.idx > 0) { st.idx--; st.path = st.hist[st.idx]; st.sel = null; render(); } }
        else if (a === 'fwd') { if (st.idx < st.hist.length - 1) { st.idx++; st.path = st.hist[st.idx]; st.sel = null; render(); } }
        else if (a === 'up') goUp();
        else if (a === 'folders') { st.side = !st.side; render(); }
        else if (a === 'search') wm.alert('Search Companion\n\nIndexing Service is not running. Try looking in a folder instead.', 'Search');
        else if (a === 'views') {
          const r = b.getBoundingClientRect();
          viewMenu(r.left, r.bottom);
        }
        else if (a === 'views') {}
      });

      function goUp() {
        if (st.path === COMPUTER) return;
        if (/^[A-Za-z]:\\$/.test(st.path)) navigate(COMPUTER);
        else navigate(dirname(st.path));
      }

      $('.exp-addr').addEventListener('click', (e) => {
        if (e.target.closest('[data-act="go"]')) {
          const v = addrInput.value.trim();
          if (/^my computer$/i.test(v)) navigate(COMPUTER);
          else if (v) navigate(normalize(v));
        }
      });
      addrInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const v = addrInput.value.trim();
          if (/^my computer$/i.test(v)) navigate(COMPUTER);
          else if (v) navigate(normalize(v));
        }
      });

      render();
    },
  });
}

function escapeHtmlLocal(s = '') {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export default launch;
