/* ============================================================
   fs.js — a small persistent virtual filesystem (Windows paths)
   ============================================================ */

const STORE_KEY = 'winvm.fs.v2';
const SEP = '\\';

export const USER = 'Administrator';
export const HOME = `C:${SEP}Documents and Settings${SEP}${USER}`;
export const DESKTOP_DIR = `${HOME}${SEP}Desktop`;
export const MY_DOCS = `${HOME}${SEP}My Documents`;
export const MY_PICS = `${MY_DOCS}${SEP}My Pictures`;
export const MY_MUSIC = `${MY_DOCS}${SEP}My Music`;
export const PROGRAMS = `C:${SEP}Program Files`;
export const WINDIR = `C:${SEP}WINDOWS`;

/* ---------------- path helpers ---------------- */

export function normalize(path = 'C:\\') {
  let p = String(path).replace(/\//g, SEP).trim();
  if (!p) p = 'C:' + SEP;
  if (!/^[A-Za-z]:/.test(p)) p = 'C:' + SEP + p.replace(/^\\+/, '');
  const drive = p.slice(0, 2).toUpperCase();
  const rest = p.slice(2).split(SEP).filter(Boolean);
  const out = [];
  for (const part of rest) {
    if (part === '.') continue;
    if (part === '..') { out.pop(); continue; }
    if (part.includes(':')) continue;
    out.push(part);
  }
  return out.length ? drive + SEP + out.join(SEP) : drive + SEP;
}

export function join(...parts) {
  return normalize(parts.filter((p) => p !== '' && p != null).join(SEP));
}

export function dirname(path) {
  const p = normalize(path);
  if (/^[A-Za-z]:\\$/.test(p)) return p;
  const i = p.lastIndexOf(SEP);
  return i <= 2 ? p.slice(0, 3) : p.slice(0, i);
}

export function basename(path) {
  const p = normalize(path);
  if (/^[A-Za-z]:\\$/.test(p)) return p.slice(0, 2);
  return p.slice(p.lastIndexOf(SEP) + 1);
}

export function extname(path) {
  const b = basename(path);
  const i = b.lastIndexOf('.');
  return i > 0 ? b.slice(i + 1).toLowerCase() : '';
}

export function stripExt(path) {
  const b = basename(path);
  const i = b.lastIndexOf('.');
  return i > 0 ? b.slice(0, i) : b;
}

/* ---------------- seeding ---------------- */

const now = () => Date.now();

function file(name, content = '', mime = 'text/plain') {
  return { type: 'file', name, content, mime, created: now(), modified: now() };
}
function dir(name, children = []) {
  const node = { type: 'dir', name, children: {}, created: now(), modified: now() };
  for (const c of children) node.children[c.name.toLowerCase()] = c;
  return node;
}

function seedTree() {
  const readme = `WINDOWS XP — IN YOUR BROWSER
===========================

Welcome! You are looking at a complete Windows XP desktop that runs
entirely inside a web page. Nothing was installed, downloaded or
virtualised: every pixel, window and program you see is HTML, CSS and
JavaScript in your own browser tab.

WHAT TO TRY
-----------
* Double-click the desktop icons, or press Start.
* Start > All Programs > Games > Minesweeper / Solitaire.
* Start > All Programs > Accessories > Command Prompt and type HELP.
* Start > Control Panel > Display to change the wallpaper and colours.
* Right-click the desktop for a menu.
* Reboot the machine from Start > Turn Off Computer.

YOUR FILES
----------
Everything you save lives in your own browser (localStorage), on this
fake C: drive. It is private to this browser profile, survives a
refresh, and can be wiped from Control Panel > System.

Enjoy the nostalgia. - Arena.ai
`;
  const welcome = `Welcome to Windows XP

This is a live simulation of Windows XP Professional, built with
plain web technology and no installation of any kind.

A few things that actually work here:
 - the window manager (drag, resize, maximise, minimise, Alt+Tab)
 - the file system, Command Prompt and file explorer
 - Notepad and Paint, with real saving and loading
 - Minesweeper, Solitaire, Calculator and Windows Media Player
 - Display Properties, wallpapers and the starfield screen saver

Press F1 (or Start > Help and Support) for the full list of features.
`;
  const notes = `TO DO
-----
[x] Boot the machine
[x] Open a window
[ ] Write something in Notepad
[ ] Draw something in Paint
[ ] Beat Minesweeper on Expert
`;
  return {
    'C:': dir('C:', [
      file('README.txt', readme),
      file('AUTOEXEC.BAT', '@ECHO OFF\nREM Windows XP in the browser\nSET PATH=C:\\WINDOWS;C:\\WINDOWS\\SYSTEM32\nPROMPT $P$G\n'),
      file('CONFIG.SYS', 'DEVICE=C:\\WINDOWS\\HIMEM.SYS\nFILES=40\nBUFFERS=20\n'),
      dir('Documents and Settings', [
        dir(USER, [
          dir('Desktop', [file('Welcome.txt', welcome)]),
          dir('My Documents', [
            file('Notes.txt', notes),
            dir('My Pictures', []),
            dir('My Music', [file('Tracklist.txt', '1. Windows XP Startup - Windows\n2. Arena Theme - Synthwave\n3. Cursor Waltz - Unknown\n')]),
            dir('Downloads', []),
          ]),
          dir('Favorites', [
            file('Arena Home.url', '[InternetShortcut]\nURL=http://www.arena.ai/\n'),
            file('Windows Help.url', '[InternetShortcut]\nURL=http://help.local/\n'),
          ]),
          dir('Start Menu', [dir('Programs', [])]),
        ]),
      ]),
      dir('Program Files', [
        dir('Internet Explorer', [file('iexplore.exe', '')]),
        dir('Windows NT', [
          dir('Accessories', [file('notepad.exe', ''), file('mspaint.exe', ''), file('calc.exe', '')]),
          dir('Games', [file('winmine.exe', ''), file('sol.exe', ''), file('freecell.exe', '')]),
        ]),
        dir('Windows Media Player', [file('wmplayer.exe', '')]),
        dir('Common Files', []),
      ]),
      dir('WINDOWS', [
        dir('system32', [file('cmd.exe', ''), file('taskmgr.exe', ''), file('notepad.exe', ''), file('drivers', [])]),
        dir('Web', [dir('Wallpaper', [])]),
        dir('Media', [file('chimes.wav', ''), file('ding.wav', '')]),
        dir('Temp', []),
        file('win.ini', '[windows]\nload=\nrun=\n\n[Desktop]\nWallpaper=Bliss\n'),
        file('system.ini', '[386Enh]\nwoafont=dosapp.fon\n\n[drivers]\n'),
        file('NOTEPAD.EXE', ''),
      ]),
      dir('Temp', []),
    ]),
  };
}

/* ---------------- the filesystem ---------------- */

export class VFS {
  constructor() {
    this.listeners = new Set();
    this.reset(false);
    this.load();
  }

  /* ---- drives ---- */
  reset(persist = true) {
    const tree = seedTree();
    this.drives = { 'C:': tree['C:'] };
    this.drives['A:'] = dir('A:', []);
    this.drives['D:'] = dir('D:', [file('README.TXT', 'Welcome to the Windows XP in the browser CD-ROM.'), dir('I386', [])]);
    if (persist) { this.save(); this.emit(); }
  }

  /* ---- events ---- */
  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(path) { for (const fn of this.listeners) { try { fn(path); } catch (e) { console.error(e); } } }

  /* ---- persistence ---- */
  save() {
    try {
      const c = this.drives['C:'];
      localStorage.setItem(STORE_KEY, JSON.stringify(c));
    } catch (e) { /* quota — ignore */ }
  }

  load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      const c = JSON.parse(raw);
      if (c && c.type === 'dir') this.drives['C:'] = c;
    } catch (e) { /* corrupt — keep seed */ }
  }

  wipe() {
    localStorage.removeItem(STORE_KEY);
    this.reset(false);
    this.emit('C:\\');
  }

  get writable() { return true; }

  /* ---- core access ---- */
  node(path) {
    const p = normalize(path);
    const drive = p.slice(0, 2).toUpperCase();
    let node = this.drives[drive];
    if (!node) return null;
    const parts = p.slice(3).split(SEP).filter(Boolean);
    for (const part of parts) {
      if (!node || node.type !== 'dir') return null;
      const next = node.children[part.toLowerCase()];
      if (!next) return null;
      node = next;
    }
    return node;
  }

  exists(path) { return !!this.node(path); }
  isDir(path) { const n = this.node(path); return !!n && n.type === 'dir'; }
  isFile(path) { const n = this.node(path); return !!n && n.type === 'file'; }

  list(path) {
    const n = this.node(path);
    if (!n || n.type !== 'dir') return null;
    const items = Object.values(n.children);
    items.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true });
    });
    return items;
  }

  readFile(path) {
    const n = this.node(path);
    if (!n) throw new Error(`Cannot find '${path}'`);
    if (n.type === 'dir') throw new Error(`'${path}' is a folder`);
    return n.content ?? '';
  }

  /** Write (creating folders as needed). opts: {mime, silent} */
  writeFile(path, content, opts = {}) {
    const p = normalize(path);
    const parentPath = dirname(p);
    const parent = this.mkdir(parentPath, { parents: true, silent: true });
    if (!parent) throw new Error(`Cannot create '${p}'`);
    const name = basename(p);
    if (!name) throw new Error('Invalid file name');
    const key = name.toLowerCase();
    const prev = parent.children[key];
    const node = prev && prev.type === 'file' ? prev : file(name, '', opts.mime || 'text/plain');
    node.content = content;
    node.mime = opts.mime || node.mime || 'text/plain';
    node.modified = now();
    node.name = name;
    parent.children[key] = node;
    parent.modified = now();
    if (!opts.silent) { this.save(); this.emit(p); }
    return node;
  }

  mkdir(path, opts = {}) {
    const p = normalize(path);
    const drive = p.slice(0, 2).toUpperCase();
    let node = this.drives[drive];
    if (!node) return null;
    const parts = p.slice(3).split(SEP).filter(Boolean);
    for (const part of parts) {
      if (node.type !== 'dir') return null;
      const key = part.toLowerCase();
      if (!node.children[key]) {
        if (!opts.parents && parts[parts.length - 1].toLowerCase() !== key) return null;
        node.children[key] = dir(part);
      }
      node = node.children[key];
    }
    if (!opts.silent) { this.save(); this.emit(p); }
    return node;
  }

  remove(path, { recursive = true } = {}) {
    const p = normalize(path);
    const parent = this.node(dirname(p));
    if (!parent) return false;
    const key = basename(p).toLowerCase();
    const node = parent.children[key];
    if (!node) return false;
    if (node.type === 'dir' && Object.keys(node.children).length && !recursive) return false;
    delete parent.children[key];
    this.save(); this.emit(dirname(p));
    return true;
  }

  rename(path, newName) {
    const p = normalize(path);
    const parent = this.node(dirname(p));
    if (!parent || !newName) return false;
    const key = basename(p).toLowerCase();
    const node = parent.children[key];
    if (!node) return false;
    const clean = String(newName).replace(/[\\/:*?"<>|]/g, '').trim();
    if (!clean) return false;
    delete parent.children[key];
    node.name = clean;
    parent.children[clean.toLowerCase()] = node;
    parent.modified = now();
    this.save(); this.emit(dirname(p));
    return true;
  }

  move(from, toDir) {
    const src = this.node(from);
    const dst = this.mkdir(toDir, { parents: true, silent: true });
    if (!src || !dst || dst.type !== 'dir') return false;
    if (normalize(toDir).toLowerCase().startsWith(normalize(from).toLowerCase())) return false;
    let name = basename(from);
    let i = 1;
    while (dst.children[name.toLowerCase()]) {
      const dot = name.lastIndexOf('.');
      const base = dot > 0 ? name.slice(0, dot) : name;
      const ext = dot > 0 ? name.slice(dot) : '';
      name = `${base} (${i++})${ext}`;
    }
    const copy = structuredClone(src);
    copy.name = name;
    dst.children[name.toLowerCase()] = copy;
    this.remove(from);
    return true;
  }

  copy(from, toDir) {
    const src = this.node(from);
    const dst = this.mkdir(toDir, { parents: true, silent: true });
    if (!src || !dst) return false;
    return this.move; // kept for API symmetry
  }

  size(path) {
    const n = this.node(path);
    if (!n) return 0;
    if (n.type === 'file') return (n.content || '').length;
    return Object.values(n.children).reduce((sum, c) => sum + this.size(join(path, c.name)), 0);
  }

  uniqueName(dirPath, base, ext = '') {
    const d = this.node(dirPath);
    if (!d) return base + ext;
    let name = base + ext;
    let i = 2;
    while (d.children[name.toLowerCase()]) name = `${base} (${i++})${ext}`;
    return name;
  }

  /* convenience bundle used by apps */
  home() { return HOME; }
}

export const fs = new VFS();
export default fs;
