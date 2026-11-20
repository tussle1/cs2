/* ============================================================
   shell.js — file associations, "Run", and the Recycle Bin
   ============================================================ */

import { normalize, basename, extname, dirname, join } from './fs.js';
import { extLabel } from './icons.js';

const RECYCLE_KEY = 'winvm.recycle.v2';

const TEXT_EXT = ['txt', 'log', 'ini', 'bat', 'sys', 'cfg', 'md', 'json', 'js', 'css', 'xml', 'csv', 'inf', 'url'];
const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'gif', 'bmp'];
const AUDIO_EXT = ['wav', 'mp3', 'mid', 'wma'];

/* Command name → app id. Used by Run…, the command prompt and exe files. */
export const EXE_ALIASES = {
  'notepad': 'notepad', 'notepad.exe': 'notepad',
  'calc': 'calc', 'calc.exe': 'calc',
  'cmd': 'cmd', 'cmd.exe': 'cmd', 'command': 'cmd', 'command.com': 'cmd',
  'mspaint': 'paint', 'mspaint.exe': 'paint', 'paint': 'paint',
  'winmine': 'winmine', 'winmine.exe': 'winmine', 'minesweeper': 'winmine',
  'sol': 'solitaire', 'sol.exe': 'solitaire', 'solitaire': 'solitaire',
  'iexplore': 'ie', 'iexplore.exe': 'ie', 'ie': 'ie', 'iexplorer': 'ie',
  'wmplayer': 'media', 'wmplayer.exe': 'media', 'media': 'media', 'mplayer': 'media',
  'taskmgr': 'taskmgr', 'taskmgr.exe': 'taskmgr',
  'control': 'control', 'control.exe': 'control',
  'explorer': 'explorer', 'explorer.exe': 'explorer',
  'help': 'help', 'winhelp': 'help',
  'winver': 'about', 'about': 'about',
  'cmd.exe': 'cmd',
};

export function createShell(ctx) {
  let recycled = [];
  try { recycled = JSON.parse(localStorage.getItem(RECYCLE_KEY) || '[]'); } catch (e) { recycled = []; }

  const save = () => {
    try { localStorage.setItem(RECYCLE_KEY, JSON.stringify(recycled)); } catch (e) { /* ignore */ }
    ctx.emitChange?.('recycle');
  };

  const shell = {
    get recycled() { return recycled; },

    /** Open a path with whatever program is associated with it. */
    openPath(path, opts = {}) {
      const { fs, wm } = ctx;
      const p = normalize(path);
      const node = fs.node(p);
      if (!node) {
        ctx.sfx.error();
        return wm.error(`Windows cannot find '${p}'.\n\nCheck the spelling of the name, and then try again.`, 'Windows');
      }
      if (node.type === 'dir') return ctx.openApp('explorer', { path: p, ...opts });
      const ext = extname(p);
      if (ext === 'exe') return shell.runExe(basename(p), p);
      if (TEXT_EXT.includes(ext)) return ctx.openApp('notepad', { path: p });
      if (IMAGE_EXT.includes(ext)) return ctx.openApp('paint', { path: p });
      if (AUDIO_EXT.includes(ext)) return ctx.openApp('media', { path: p });
      return ctx.openApp('notepad', { path: p });
    },

    /** Launch by command name ("calc", "notepad.exe", …). */
    runExe(name, fullPath) {
      const { fs, wm } = ctx;
      const key = String(name || '').toLowerCase().replace(/^.*[\\/]/, '');
      if (key === 'winmine.exe' && fullPath && !fs.exists(fullPath)) {
        // fall through to the alias anyway
      }
      const appId = EXE_ALIASES[key] || EXE_ALIASES[key.replace(/\.exe$/, '')];
      if (appId) {
        if (appId === 'explorer') return ctx.openApp('explorer', { path: dirname(fullPath || 'C:\\') });
        return ctx.openApp(appId, {});
      }
      ctx.sfx.error();
      return wm.error(`Windows cannot find '${name}'.\n\nMake sure you typed the name correctly, and then try again.`, name);
    },

    /** Run… dialog semantics: alias, path, or full path. */
    runCommand(input) {
      const cmd = String(input || '').trim();
      if (!cmd) return;
      const lower = cmd.toLowerCase();
      if (EXE_ALIASES[lower]) return shell.runExe(lower);
      if (ctx.fs.exists(cmd)) return shell.openPath(cmd);
      if (['http://', 'https://', 'www.'].some((p) => lower.startsWith(p))) {
        return ctx.openApp('ie', { url: cmd });
      }
      if (lower === 'http://help.local/' || lower === 'help.local') return ctx.openApp('help', {});
      ctx.sfx.error();
      return ctx.wm.error(
        `Windows cannot find '${cmd}'.\n\nMake sure you typed the name correctly, and then try again.`,
        'Run'
      );
    },

    /** Delete → move into the Recycle Bin (keeps a snapshot). */
    recycle(path) {
      const { fs } = ctx;
      const p = normalize(path);
      const node = fs.node(p);
      if (!node) return false;
      recycled.push({
        id: 'r' + Date.now() + Math.random().toString(16).slice(2, 6),
        name: node.name,
        type: node.type,
        dir: dirname(p),
        node: structuredClone(node),
        deletedAt: Date.now(),
        size: fs.size(p),
      });
      fs.remove(p);
      save();
      ctx.sfx.close();
      ctx.refreshDesktop?.();
      return true;
    },

    deleteForever(path) {
      ctx.fs.remove(normalize(path));
      ctx.refreshDesktop?.();
    },

    restore(item) {
      const { fs } = ctx;
      const target = join(item.dir, item.name);
      const unique = fs.uniqueName(item.dir, item.name.replace(/\.[^.]+$/, ''), (item.name.match(/\.[^.]+$/) || [''])[0]);
      const dest = fs.exists(target) ? join(item.dir, unique) : target;
      const copy = structuredClone(item.node);
      copy.name = basename(dest);
      const parent = fs.mkdir(dirname(dest), { parents: true, silent: true });
      if (!parent) return false;
      parent.children[copy.name.toLowerCase()] = copy;
      fs.save();
      recycled = recycled.filter((r) => r.id !== item.id);
      save();
      ctx.refreshDesktop?.();
      return true;
    },

    emptyRecycle() {
      recycled = [];
      save();
      ctx.refreshDesktop?.();
    },

    describe(node) { return node.type === 'dir' ? 'File Folder' : extLabel(node.name); },
  };

  return shell;
}

export default createShell;
