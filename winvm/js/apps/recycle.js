/* ============================================================
   recycle.js — the Recycle Bin
   ============================================================ */

import { icon, fileIcon } from '../core/icons.js';
import { fmtBytes, fmtDate } from '../core/util.js';
import { menuBar, contextMenu } from '../core/menu.js';

export function launch(ctx) {
  const { wm, shell } = ctx;

  wm.open({
    title: 'Recycle Bin',
    icon: 'recycleEmpty',
    width: 640, height: 420, minWidth: 360, minHeight: 240,
    appId: 'recycle',
    singleton: 'recycle',
    onMount: (body, win) => {
      body.style.display = 'flex';
      body.style.flexDirection = 'column';
      const files = document.createElement('div');
      files.className = 'binfiles scroll';
      body.appendChild(files);
      menuBar(body, []).el.remove();

      const render = () => {
        const items = shell.recycled;
        files.innerHTML = '';
        win.setTitle('Recycle Bin');
        if (!items.length) {
          const d = document.createElement('div');
          d.className = 'exp-empty';
          d.style.gridColumn = '1 / -1';
          d.textContent = 'The Recycle Bin is empty.';
          files.appendChild(d);
          return;
        }
        items.forEach((item) => {
          const d = document.createElement('div');
          d.className = 'exp-item';
          const ic = item.type === 'dir' ? 'folder' : fileIcon(item.name);
          d.innerHTML = `${icon(ic)}<span></span>`;
          d.querySelector('span').textContent = item.name;
          d.title = `${item.name}\nOriginal location: ${item.dir}\nDeleted: ${fmtDate(item.deletedAt)}`;
          d.addEventListener('dblclick', () => {
            shell.restore(item);
            render();
          });
          d.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            contextMenu(e, [
              { label: 'Restore', icon: 'refresh', action: () => { shell.restore(item); render(); } },
              { sep: true },
              { label: 'Properties', icon: 'props', action: () => wm.alert(
                `${item.name}\n\nOriginal location: ${item.dir}\nSize: ${fmtBytes(item.size)}\nDeleted: ${fmtDate(item.deletedAt)}`,
                'Properties') },
            ]);
          });
          files.appendChild(d);
        });
      };

      menuBar(body, [
        { label: 'File', items: () => [
          { label: 'Empty Recycle Bin', disabled: !shell.recycled.length, action: async () => {
            const ok = await wm.confirm(`Are you sure you want to permanently delete these ${shell.recycled.length} item(s)?`, 'Confirm Delete');
            if (!ok) return;
            shell.emptyRecycle();
            render();
          } },
          { sep: true },
          { label: 'Close', action: () => win.close() },
        ] },
        { label: 'View', items: () => [{ label: 'Refresh', icon: 'refresh', action: render }] },
        { label: 'Help', items: () => [{ label: 'About the Recycle Bin', action: () => ctx.openApp('about') }] },
      ]);

      const refresh = () => { if (!win.closed) render(); };
      ctx.fs.onChange(refresh);
      render();
    },
  });
}

export default launch;
