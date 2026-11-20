/* ============================================================
   notepad.js — Notepad, with real open/save into the fake C:
   ============================================================ */

import { menuBar } from '../core/menu.js';
import { normalize, basename, dirname } from '../core/fs.js';
import { fileDialog } from './filedialog.js';

export function launch(ctx, opts = {}) {
  const { wm, fs } = ctx;
  let path = opts.path ? normalize(opts.path) : null;
  let dirty = false;

  wm.open({
    title: 'Untitled - Notepad',
    icon: 'notepad',
    width: 660, height: 470, minWidth: 300, minHeight: 180,
    appId: 'notepad',
    x: opts.x, y: opts.y,
    onMount: (body, win) => {
      body.classList.add('notepad');
      const ta = document.createElement('textarea');
      ta.spellcheck = false;
      ta.setAttribute('aria-label', 'Document');
      body.appendChild(ta);

      const bar = menuBar(body, []);
      body.insertBefore(bar.el, ta);

      const updateTitle = () => {
        const name = path ? basename(path) : 'Untitled';
        win.setTitle(`${dirty ? '*' : ''}${name} - Notepad`);
      };

      const markDirty = () => { if (!dirty) { dirty = true; updateTitle(); } };

      function load(p) {
        try {
          const text = fs.readFile(p);
          ta.value = String(text);
          path = p;
          dirty = false;
          updateTitle();
        } catch (e) {
          wm.error(`Cannot open the file '${basename(p)}'.`, 'Notepad');
        }
      }

      async function save({ saveAs = false } = {}) {
        let target = path;
        if (!target || saveAs) {
          target = await fileDialog(ctx, {
            mode: 'save',
            title: 'Save As',
            path: path ? dirname(path) : 'C:\\Documents and Settings\\Administrator\\My Documents',
            filename: path ? basename(path) : 'Untitled.txt',
            filter: ['txt'],
            filterLabel: 'Text Documents (*.txt)',
          });
          if (!target) return false;
        }
        try {
          fs.writeFile(target, ta.value, { mime: 'text/plain' });
          path = target;
          dirty = false;
          updateTitle();
          ctx.refreshDesktop?.();
          ctx.sfx.click();
          return true;
        } catch (e) {
          wm.error(`Cannot save '${basename(target)}'.\n\nThe disk may be full or the path invalid.`, 'Notepad');
          return false;
        }
      }

      async function confirmDiscard() {
        if (!dirty) return true;
        const r = await wm.msgBox({
          title: 'Notepad',
          text: `The text in ${path ? basename(path) : 'Untitled'} has changed.\n\nDo you want to save the changes?`,
          iconName: 'warn', buttons: ['Yes', 'No', 'Cancel'], width: 430,
        });
        if (r === 'Cancel' || r === null) return false;
        if (r === 'Yes') return save();
        return true;
      }

      const fileMenu = () => [
        { label: 'New', kbd: 'Ctrl+N', action: async () => {
          if (!(await confirmDiscard())) return;
          ta.value = ''; path = null; dirty = false; updateTitle();
        } },
        { label: 'Open…', kbd: 'Ctrl+O', action: async () => {
          if (!(await confirmDiscard())) return;
          const p = await fileDialog(ctx, {
            mode: 'open', title: 'Open',
            path: path ? dirname(path) : 'C:\\Documents and Settings\\Administrator\\My Documents',
            filter: ['txt', 'ini', 'log', 'bat', 'sys'],
            filterLabel: 'Text Documents (*.txt; *.ini; *.log)',
          });
          if (p) load(p);
        } },
        { label: 'Save', kbd: 'Ctrl+S', action: () => save() },
        { label: 'Save As…', action: () => save({ saveAs: true }) },
        { sep: true },
        { label: 'Page Setup…', action: () => wm.alert('There is no printer installed on this computer.', 'Page Setup') },
        { label: 'Print…', kbd: 'Ctrl+P', action: () => wm.alert('No printer is installed.\n\n(You are running a browser, not a laser printer.)', 'Print') },
        { sep: true },
        { label: 'Exit', action: async () => { if (await confirmDiscard()) win.close(); } },
      ];

      const editMenu = () => [
        { label: 'Undo', kbd: 'Ctrl+Z', action: () => { ta.focus(); document.execCommand('undo'); } },
        { sep: true },
        { label: 'Cut', kbd: 'Ctrl+X', action: () => { ta.focus(); document.execCommand('cut'); } },
        { label: 'Copy', kbd: 'Ctrl+C', action: () => { ta.focus(); document.execCommand('copy'); } },
        { label: 'Paste', kbd: 'Ctrl+V', action: () => { ta.focus(); document.execCommand('paste'); } },
        { label: 'Delete', kbd: 'Del', action: () => { ta.focus(); document.execCommand('delete'); } },
        { sep: true },
        { label: 'Select All', kbd: 'Ctrl+A', action: () => { ta.focus(); ta.select(); } },
        { label: 'Time/Date', kbd: 'F5', action: () => {
          const d = new Date();
          const stamp = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + ' '
            + d.toLocaleDateString();
          ta.setRangeText(stamp, ta.selectionStart, ta.selectionEnd, 'end');
          markDirty();
        } },
      ];

      const formatMenu = () => [
        { label: 'Word Wrap', checked: ta.classList.contains('wrap'), action: () => {
          ta.classList.toggle('wrap');
          ctx.settings.set('notepadWrap', ta.classList.contains('wrap'));
        } },
        { label: 'Font…', action: () => wm.alert('Fonts: Lucida Console 12\n\n(Notepad’s font dialog is not part of this build.)', 'Font') },
      ];

      const helpMenu = () => [
        { label: 'Help Topics', action: () => ctx.openApp('help') },
        { sep: true },
        { label: 'About Notepad', action: () => ctx.openApp('about') },
      ];

      const rebuild = () => {
        bar.el.remove();
        const nb = menuBar(body, [
          { label: 'File', items: fileMenu },
          { label: 'Edit', items: editMenu },
          { label: 'Format', items: formatMenu },
          { label: 'View', items: () => [{ label: 'Status Bar', disabled: true }] },
          { label: 'Help', items: helpMenu },
        ]);
        body.insertBefore(nb.el, ta);
      };
      rebuild();

      ta.addEventListener('input', markDirty);
      ta.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') { e.preventDefault(); openVia(); }
        if (e.key === 'F5') {
          e.preventDefault();
          const d = new Date();
          const stamp = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + ' ' + d.toLocaleDateString();
          ta.setRangeText(stamp, ta.selectionStart, ta.selectionEnd, 'end');
          markDirty();
        }
        e.stopPropagation();
      });

      const openVia = async () => {
        if (!(await confirmDiscard())) return;
        const p = await fileDialog(ctx, { mode: 'open', title: 'Open', path: dirname(path || 'C:\\') });
        if (p) load(p);
      };

      win.onClose(() => { if (dirty) { confirmDiscard().then((ok) => { if (ok) { dirty = false; win.close(); } }); return false; } return true; });

      ta.classList.toggle('wrap', !!ctx.settings.get('notepadWrap'));
      if (path) load(path);
      else updateTitle();
      setTimeout(() => ta.focus(), 60);
    },
  });
}

export default launch;
