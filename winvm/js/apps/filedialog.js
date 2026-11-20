/* ============================================================
   filedialog.js — the shared Open / Save As dialog
   ============================================================ */

import { icon, fileIcon } from '../core/icons.js';
import { normalize, join, dirname, basename, extname, MY_DOCS, MY_PICS, DESKTOP_DIR, HOME } from '../core/fs.js';
import { fmtBytes, fmtDate } from '../core/util.js';

const PLACES = [
  { name: 'My Documents', path: MY_DOCS, icon: 'folder' },
  { name: 'My Pictures', path: MY_PICS, icon: 'folder' },
  { name: 'Desktop', path: DESKTOP_DIR, icon: 'folder' },
  { name: 'My Computer', path: 'C:\\', icon: 'computer' },
];

/**
 * @param opts { mode:'open'|'save', path, filename, filter:[ext], title, filterLabel }
 * @returns Promise<string|null> full path
 */
export function fileDialog(ctx, opts = {}) {
  const { wm, fs } = ctx;
  const mode = opts.mode || 'open';
  let cur = normalize(opts.path || MY_DOCS);
  while (!fs.isDir(cur) && cur !== 'C:\\') cur = dirname(cur);
  let selected = null;
  const filter = (opts.filter || []).map((f) => f.toLowerCase());

  return new Promise((resolve) => {
    wm.open({
      title: opts.title || (mode === 'open' ? 'Open' : 'Save As'),
      iconOverride: null,
      icon: mode === 'open' ? 'folderOpen' : 'save',
      width: 620, height: 430, minWidth: 460, minHeight: 320,
      dialog: true, center: true, showInTaskbar: false, appId: 'filedialog',
      onMount: (body, win) => {
        body.innerHTML = `
          <div class="exp" style="height:100%">
            <div class="exp-addr"><label>Look in</label>
              <div class="field">${icon('folder')}<input type="text" spellcheck="false"></div>
              <button class="btn" data-up style="min-width:42px;height:22px">Up</button>
            </div>
            <div class="exp-main">
              <aside class="exp-side" style="flex:0 0 148px">
                ${PLACES.map((p) => `<div class="group"><button class="item" data-place="${p.path}">${icon(p.icon)}<span>${p.name}</span></button></div>`).join('')}
              </aside>
              <div class="exp-views">
                <div class="exp-files scroll" style="grid-template-columns:repeat(auto-fill,minmax(110px,1fr))"></div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;padding:7px 9px;background:var(--face);border-top:1px solid #d4d0c8">
              <label style="min-width:56px;font-size:11px">File name</label>
              <input class="field name-input" style="flex:1" spellcheck="false">
              <button class="btn" data-ok style="min-width:74px">${mode === 'open' ? 'Open' : 'Save'}</button>
              <button class="btn" data-cancel style="min-width:74px">Cancel</button>
            </div>
            <div style="padding:0 9px 6px;background:var(--face);font-size:11px;color:#555">
              Files of type: <b></b>
            </div>
          </div>`;

        const filesEl = body.querySelector('.exp-files');
        const nameInput = body.querySelector('.name-input');
        const addrInput = body.querySelector('.exp-addr input');
        body.querySelector('b').textContent = opts.filterLabel
          || (filter.length ? filter.map((f) => f.toUpperCase()).join(', ') + ' files' : 'All files');
        nameInput.value = opts.filename || '';

        function listItems() {
          const nodes = fs.list(cur) || [];
          return nodes.filter((n) => n.type === 'dir' || !filter.length || filter.includes(extname(n.name)) || !extname(n.name));
        }

        function render() {
          addrInput.value = cur;
          filesEl.innerHTML = '';
          const items = listItems();
          if (!items.length) {
            const d = document.createElement('div');
            d.className = 'exp-empty';
            d.textContent = 'No files match this filter.';
            filesEl.appendChild(d);
          }
          for (const n of items) {
            const item = document.createElement('div');
            item.className = 'exp-item' + (selected === n.name ? ' selected' : '');
            const ic = n.type === 'dir' ? 'folder' : fileIcon(n.name);
            item.innerHTML = `${icon(ic)}<span></span>`;
            item.querySelector('span').textContent = n.name;
            item.title = `${n.name}\n${n.type === 'dir' ? 'File Folder' : fmtBytes((n.content || '').length)}\n${fmtDate(n.modified)}`;
            item.addEventListener('click', () => {
              selected = n.name;
              if (n.type === 'file') nameInput.value = n.name;
              filesEl.querySelectorAll('.exp-item').forEach((x) => x.classList.toggle('selected', x === item));
            });
            item.addEventListener('dblclick', () => {
              if (n.type === 'dir') { cur = join(cur, n.name); selected = null; render(); }
              else { nameInput.value = n.name; finish(); }
            });
            filesEl.appendChild(item);
          }
        }

        let done = false;
        const finish = () => {
          if (done) return;
          let name = nameInput.value.trim();
          if (!name) {
            if (mode === 'save') { name = 'Untitled'; }
            else { ctx.sfx.error(); return; }
          }
          if (mode === 'save' && filter.length && !extname(name)) name += '.' + filter[0];
          const full = /^[A-Za-z]:/.test(name) ? normalize(name) : join(cur, name);
          done = true;
          resolve(full);
          win.close();
        };

        body.querySelector('[data-ok]').addEventListener('click', finish);
        body.querySelector('[data-cancel]').addEventListener('click', () => { done = true; resolve(null); win.close(); });
        body.querySelector('[data-up]').addEventListener('click', () => {
          if (!/^[A-Za-z]:\\$/.test(cur)) { cur = dirname(cur); selected = null; render(); }
        });
        body.querySelectorAll('[data-place]').forEach((b) => b.addEventListener('click', () => {
          cur = normalize(b.dataset.place); selected = null; render();
        }));
        nameInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') finish();
          if (e.key === 'Escape') { done = true; resolve(null); win.close(); }
          e.stopPropagation();
        });
        win.onClose(() => { if (!done) { done = true; resolve(null); } });

        render();
        setTimeout(() => { nameInput.focus(); nameInput.select(); }, 30);
      },
    });
  });
}

export default fileDialog;
