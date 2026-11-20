/* ============================================================
   display.js — Display Properties (wallpaper, scheme, saver)
   ============================================================ */

import { WALLPAPERS, applyWallpaper } from '../core/wallpapers.js';
import { startSaver } from '../core/screensaver.js';

const SCHEMES = [
  { id: 'blue', name: 'Windows XP (Blue) — default' },
  { id: 'olive', name: 'Windows XP (Olive Green)' },
  { id: 'silver', name: 'Windows XP (Silver)' },
  { id: 'classic', name: 'Windows Classic' },
];

export function launch(ctx) {
  const { wm, settings } = ctx;

  wm.open({
    title: 'Display Properties',
    icon: 'display',
    width: 460, height: 520, minWidth: 420, minHeight: 420,
    appId: 'display',
    singleton: 'display',
    resizable: true,
    maximizable: false,
    onMount: (body, win) => {
      body.innerHTML = `
        <div class="dprops">
          <div class="tabs">
            <button data-tab="desktop" class="on">Desktop</button>
            <button data-tab="themes">Themes</button>
            <button data-tab="saver">Screen Saver</button>
            <button data-tab="appearance">Appearance</button>
            <button data-tab="settings">Settings</button>
          </div>
          <div class="tab-body"></div>
          <div class="dprops-foot">
            <button class="btn primary" data-ok>OK</button>
            <button class="btn" data-cancel>Cancel</button>
            <button class="btn" data-apply>Apply</button>
          </div>
        </div>`;

      const bodyEl = body.querySelector('.tab-body');
      const tabsEl = body.querySelector('.tabs');
      let tab = 'desktop';
      let pendingWall = settings.get('wallpaper');
      let pendingScheme = settings.get('scheme');
      let pendingSaver = settings.get('screensaver');
      let pendingWait = settings.get('saverWait');

      const wallThumbs = () => `
        <div class="row"><label>Background:</label>
          <select class="field" data-wall-select style="flex:1">
            ${WALLPAPERS.map((w) => `<option value="${w.id}" ${w.id === pendingWall ? 'selected' : ''}>${w.name}</option>`).join('')}
          </select>
        </div>
        <div class="wall-grid">
          ${WALLPAPERS.map((w) => `
            <button data-wall="${w.id}" class="${w.id === pendingWall ? 'on' : ''}" title="${w.name}">
              <span class="thumb" style="background:${w.thumb.replace(/"/g, '&quot;')}"></span>
              <span class="cap">${w.name}</span>
            </button>`).join('')}
        </div>
        <div class="row"><label>Position:</label>
          <select class="field" data-fit style="flex:1">
            <option value="cover" ${settings.get('wallpaperFit') === 'cover' ? 'selected' : ''}>Stretch</option>
            <option value="center">Center</option>
          </select>
        </div>
        <div class="row" style="gap:8px;align-items:flex-start">
          <span class="ico32">${ctx.icon('display')}</span>
          <div style="line-height:1.5;color:#444">The preview above is live — click Apply to keep a wallpaper,
          or OK to close this dialog.</div>
        </div>`;

      const renderTab = () => {
        tabsEl.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
        if (tab === 'desktop') {
          bodyEl.innerHTML = wallThumbs();
          bodyEl.querySelectorAll('[data-wall]').forEach((b) => b.addEventListener('click', () => {
            pendingWall = b.dataset.wall;
            renderTab();
            applyWallpaper(pendingWall);
          }));
          bodyEl.querySelector('[data-wall-select]').addEventListener('change', (e) => {
            pendingWall = e.target.value;
            applyWallpaper(pendingWall);
            renderTab();
          });
        } else if (tab === 'themes') {
          bodyEl.innerHTML = `
            <div class="lcd-preview" style="align-self:center">
              <div>Windows XP<br><small>Professional</small></div>
            </div>
            <div class="row"><label>Theme:</label>
              <select class="field" data-scheme style="flex:1">
                ${SCHEMES.map((s) => `<option value="${s.id}" ${s.id === pendingScheme ? 'selected' : ''}>${s.name}</option>`).join('')}
              </select>
            </div>
            <p style="color:#444;line-height:1.6;margin:0">
              A theme bundles a colour scheme and a desktop background. Try <b>Windows Classic</b> for the
              grey, beveled look of 1998.
            </p>`;
          bodyEl.querySelector('[data-scheme]').addEventListener('change', (e) => {
            pendingScheme = e.target.value;
            document.documentElement.dataset.scheme = pendingScheme;
          });
        } else if (tab === 'saver') {
          bodyEl.innerHTML = `
            <div class="row"><label>Screen saver:</label>
              <select class="field" data-saver style="flex:1">
                <option value="none" ${pendingSaver === 'none' ? 'selected' : ''}>(None)</option>
                <option value="starfield" ${pendingSaver === 'starfield' ? 'selected' : ''}>3D Starfield</option>
                <option value="mystify" ${pendingSaver === 'mystify' ? 'selected' : ''}>Mystify</option>
              </select>
              <button class="btn" data-preview style="min-width:80px">Preview</button>
            </div>
            <div class="row"><label>Wait:</label>
              <input class="field" type="number" min="1" max="60" style="width:64px" data-wait value="${pendingWait}">
              <span>minutes</span>
            </div>
            <div style="border:1px solid #b6b2a3;padding:10px;background:#f9f9f5;border-radius:3px;line-height:1.6">
              <b>Preview area</b><br>
              <span style="color:#555">The screen saver starts after the computer sits idle. Move the mouse or
              press a key to come back — the same as it ever was.</span>
            </div>`;
          bodyEl.querySelector('[data-saver]').addEventListener('change', (e) => { pendingSaver = e.target.value; });
          bodyEl.querySelector('[data-wait]').addEventListener('change', (e) => { pendingWait = Number(e.target.value) || 3; });
          bodyEl.querySelector('[data-preview]').addEventListener('click', () => {
            if (pendingSaver === 'none') return;
            startSaver(pendingSaver);
          });
        } else if (tab === 'appearance') {
          bodyEl.innerHTML = `
            <div class="row"><label>Windows and buttons:</label>
              <select class="field" data-scheme2 style="flex:1">
                ${SCHEMES.map((s) => `<option value="${s.id}" ${s.id === pendingScheme ? 'selected' : ''}>${s.name}</option>`).join('')}
              </select>
            </div>
            <div class="row"><label>Colour scheme:</label>
              <select class="field" style="flex:1"><option>Default (Blue)</option></select>
            </div>
            <div style="margin-top:8px;border:1px solid #b6b2a3;padding:16px;background:linear-gradient(160deg,#eef4ff,#fff);border-radius:4px">
              <div style="border:2px solid #0830c0;border-radius:6px;overflow:hidden;max-width:260px">
                <div style="background:linear-gradient(180deg,#3f8cf3,#0058e6);color:#fff;font:bold 12px Tahoma;padding:4px 8px">Sample window</div>
                <div style="background:#ece9d8;padding:10px;font:11px Tahoma">Text goes here.
                  <button class="btn" style="min-width:60px;height:20px;margin-left:6px">OK</button>
                </div>
              </div>
            </div>`;
          bodyEl.querySelector('[data-scheme2]').addEventListener('change', (e) => {
            pendingScheme = e.target.value;
            document.documentElement.dataset.scheme = pendingScheme;
            renderTab();
          });
        } else {
          bodyEl.innerHTML = `
            <div class="lcd-preview" style="align-self:center">
              <div><b>${window.screen.width} × ${window.screen.height}</b><br>
              <small>Colour quality: Highest (32 bit)</small></div>
            </div>
            <div class="row"><label>Display:</label><span>Default Monitor on Arena Graphics Adapter</span></div>
            <div class="row"><label>Screen resolution:</label>
              <span>${window.innerWidth} × ${window.innerHeight} (this tab)</span>
            </div>
            <p style="color:#555;line-height:1.6;margin:0">
              The desktop automatically fills your browser viewport — resize the window and it follows.
            </p>`;
        }
      };

      const apply = () => {
        settings.set({ wallpaper: pendingWall, scheme: pendingScheme, screensaver: pendingSaver, saverWait: pendingWait });
        document.documentElement.dataset.scheme = pendingScheme;
        applyWallpaper(pendingWall);
        ctx.applyScheme?.(pendingScheme);
      };

      tabsEl.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-tab]');
        if (!b) return;
        tab = b.dataset.tab;
        renderTab();
      });
      body.querySelector('[data-ok]').addEventListener('click', () => { apply(); win.close(); });
      body.querySelector('[data-apply]').addEventListener('click', apply);
      body.querySelector('[data-cancel]').addEventListener('click', () => {
        document.documentElement.dataset.scheme = settings.get('scheme');
        applyWallpaper(settings.get('wallpaper'));
        win.close();
      });

      renderTab();
    },
  });
}

export default launch;
