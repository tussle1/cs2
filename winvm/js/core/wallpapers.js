/* ============================================================
   wallpapers.js — desktop backgrounds (CSS only + one image)
   ============================================================ */

export const WALLPAPERS = [
  {
    id: 'bliss',
    name: 'Bliss',
    // falls back to a gradient if the photo asset is missing
    css: "url('assets/bliss.jpg') center / cover no-repeat, linear-gradient(180deg,#3f7fd0 0 55%,#5f9a3c 55% 100%)",
    thumb: "url('assets/bliss.jpg') center / cover no-repeat, linear-gradient(180deg,#3f7fd0 0 55%,#5f9a3c 55% 100%)",
  },
  {
    id: 'azul',
    name: 'Azul',
    css: 'radial-gradient(circle at 50% 120%, #7fb2e8 0%, #2b6cb8 40%, #0d2f66 100%)',
    thumb: 'radial-gradient(circle at 50% 120%, #7fb2e8 0%, #2b6cb8 40%, #0d2f66 100%)',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    css: 'linear-gradient(180deg,#1b2a5e 0%,#6b4a9c 35%,#e0705a 68%,#f4b25c 100%)',
    thumb: 'linear-gradient(180deg,#1b2a5e 0%,#6b4a9c 35%,#e0705a 68%,#f4b25c 100%)',
  },
  {
    id: 'meadow',
    name: 'Meadow',
    css: 'radial-gradient(ellipse at 30% 20%, #cbe7ff 0%, #7fb2e8 45%, #3d7ab8 100%)',
    thumb: 'radial-gradient(ellipse at 30% 20%, #cbe7ff 0%, #7fb2e8 45%, #3d7ab8 100%)',
  },
  {
    id: 'teal',
    name: 'Classic Teal',
    css: '#008080',
    thumb: '#008080',
  },
  {
    id: 'slate',
    name: 'Slate',
    css: 'linear-gradient(160deg,#2c3540,#101418)',
    thumb: 'linear-gradient(160deg,#2c3540,#101418)',
  },
  {
    id: 'aurora',
    name: 'Aurora',
    css: 'radial-gradient(ellipse at 70% 10%, #9be8d8 0%, #2f8f8a 30%, #16305c 75%, #070d1c 100%)',
    thumb: 'radial-gradient(ellipse at 70% 10%, #9be8d8 0%, #2f8f8a 30%, #16305c 75%, #070d1c 100%)',
  },
  {
    id: 'paper',
    name: 'Notebook',
    css: 'repeating-linear-gradient(180deg,#fdfbf3 0 27px,#e8e3d0 27px 28px)',
    thumb: 'repeating-linear-gradient(180deg,#fdfbf3 0 8px,#e8e3d0 8px 9px)',
  },
];

export function wallpaperById(id) {
  return WALLPAPERS.find((w) => w.id === id) || WALLPAPERS[0];
}

export function applyWallpaper(id) {
  const wp = wallpaperById(id);
  const el = document.getElementById('wallpaper');
  if (!el) return;
  el.style.background = wp.css;
}

export default WALLPAPERS;
