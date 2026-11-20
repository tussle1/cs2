/* ============================================================
   settings.js — user preferences, persisted in localStorage
   ============================================================ */

const KEY = 'winvm.settings.v2';

export const DEFAULTS = {
  userName: 'Administrator',
  scheme: 'blue',          // blue | olive | silver | classic
  wallpaper: 'bliss',      // see wallpapers.js
  wallpaperFit: 'cover',
  sounds: true,
  volume: 0.55,
  screensaver: 'starfield', // none | starfield | mystify
  saverWait: 3,             // minutes
  clock24: false,
  showSeconds: false,
  explorerView: 'icons',    // icons | list | details
  taskbarSmall: false,
  booted: false,            // has this browser booted before (for fast boot)
};

let data = { ...DEFAULTS };
const subs = new Set();

try {
  const raw = localStorage.getItem(KEY);
  if (raw) data = { ...DEFAULTS, ...JSON.parse(raw) };
} catch (e) { /* ignore */ }

export function get(key) { return data[key]; }
export function all() { return { ...data }; }

export function set(key, value) {
  if (typeof key === 'object') {
    Object.assign(data, key);
  } else {
    data[key] = value;
  }
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
  subs.forEach((fn) => { try { fn(key, value, data); } catch (e) { console.error(e); } });
  return data;
}

export function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }

export function resetAll() {
  data = { ...DEFAULTS };
  localStorage.removeItem(KEY);
  subs.forEach((fn) => fn('*', null, data));
}

export default { get, set, all, subscribe, resetAll, DEFAULTS };
