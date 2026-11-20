/* ============================================================
   wm.js — the window manager: drag, resize, z-order, taskbar,
   dialogs and message boxes.
   ============================================================ */

import { icon, iconEl } from './icons.js';
import sfx from './sound.js';

const BTN_SVG = {
  min: '<svg viewBox="0 0 12 12"><path d="M3 8.6h6"/></svg>',
  max: '<svg viewBox="0 0 12 12"><rect x="2.6" y="2.6" width="6.8" height="6.8" rx=".6"/></svg>',
  restore: '<svg viewBox="0 0 12 12"><rect x="2.2" y="4.2" width="5.6" height="5.6" rx=".6"/><path d="M4.2 4.2V2.2h5.6v5.6"/></svg>',
  close: '<svg viewBox="0 0 12 12"><path d="M3 3l6 6M9 3L3 9"/></svg>',
};

let uid = 0;

export class Win {
  constructor(wm, spec) {
    this.wm = wm;
    this.id = `win-${++uid}`;
    this.spec = spec;
    this.appId = spec.appId || spec.id || this.id;
    this.singletonKey = spec.singleton ? (typeof spec.singleton === 'string' ? spec.singleton : this.appId) : null;
    this.title = spec.title || 'Window';
    this.iconName = spec.icon || 'exe';
    this.closeHooks = [];
    this.minimized = false;
    this.maximized = false;
    this.prevRect = null;
    this.build();
  }

  build() {
    const { spec } = this;
    const el = document.createElement('section');
    el.className = 'win' + (spec.dialog ? ' dialog' : '') + (spec.elClass ? ' ' + spec.elClass : '');
    el.dataset.id = this.id;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', this.title);
    el.style.left = '0px';
    el.style.top = '0px';

    el.innerHTML = `
      <header class="titlebar">
        <div class="tb-icon">${icon(this.iconName)}</div>
        <div class="tb-title"></div>
        <div class="tb-buttons"></div>
      </header>
      <div class="win-body"></div>
      <div class="resize n"></div><div class="resize s"></div>
      <div class="resize e"></div><div class="resize w"></div>
      <div class="resize ne"></div><div class="resize nw"></div>
      <div class="resize se"></div><div class="resize sw"></div>`;

    this.el = el;
    this.titlebar = el.querySelector('.titlebar');
    this.titleEl = el.querySelector('.tb-title');
    this.iconEl = el.querySelector('.tb-icon');
    this.body = el.querySelector('.win-body');
    this.titleEl.textContent = this.title;

    /* --- window buttons --- */
    const btns = el.querySelector('.tb-buttons');
    const mk = (cls, svg, label, fn) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `tb-btn ${cls}`;
      b.innerHTML = svg;
      b.title = label;
      b.setAttribute('aria-label', label);
      b.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
      btns.appendChild(b);
      return b;
    };
    if (spec.minimizable !== false) this.minBtn = mk('min', BTN_SVG.min, 'Minimize', () => this.minimize());
    if (spec.maximizable !== false) this.maxBtn = mk('max', BTN_SVG.max, 'Maximize', () => this.toggleMax());
    if (spec.closable !== false) mk('close', BTN_SVG.close, 'Close', () => this.close());

    /* --- geometry --- */
    const W = spec.width || 640;
    const H = spec.height || 460;
    el.style.width = W + 'px';
    el.style.height = H + 'px';
    this.w = W; this.h = H;
    this.place(spec);

    /* --- interactions --- */
    this.titlebar.addEventListener('pointerdown', (e) => this.onTitlePointerDown(e));
    this.titlebar.addEventListener('dblclick', (e) => {
      if (e.target.closest('.tb-btn')) return;
      if (spec.maximizable !== false) this.toggleMax();
    });
    el.addEventListener('pointerdown', () => this.wm.focus(this), true);
    el.querySelectorAll('.resize').forEach((h) => {
      h.addEventListener('pointerdown', (e) => this.onResizeDown(e, [...h.classList].pop()));
    });

    this.wm.host.appendChild(el);
    this.wm.windows.set(this.id, this);
    this.wm.register(this);
    this.wm.focus(this);
    sfx.open();
    if (typeof spec.onMount === 'function') {
      try { spec.onMount(this.body, this); } catch (err) { console.error(err); }
    }
    if (spec.autoHeight) {
      requestAnimationFrame(() => {
        if (this.closed) return;
        const hostH = this.wm.host.clientHeight || window.innerHeight;
        const h = Math.min(hostH - 12, this.body.scrollHeight + 4);
        this.el.style.height = h + 'px';
        this.h = h;
        this.el.style.top = Math.max(6, Math.round((hostH - h) / 2.6)) + 'px';
      });
    }
  }

  place(spec) {
    const hostW = this.wm.host.clientWidth || window.innerWidth;
    const hostH = this.wm.host.clientHeight || window.innerHeight - 30;
    let w = Math.min(spec.width || 640, hostW - 12);
    let h = Math.min(spec.height || 460, hostH - 12);
    if (spec.maximized) {
      this.w = w; this.h = h;
      this.el.style.left = '0px'; this.el.style.top = '0px';
      this.el.style.width = hostW + 'px'; this.el.style.height = hostH + 'px';
      this.maximized = true;
      this.el.classList.add('maximized');
      this.updateMaxBtn();
      return;
    }
    this.w = w; this.h = h;
    this.el.style.width = w + 'px';
    this.el.style.height = h + 'px';
    let x = spec.x, y = spec.y;
    if (x == null || y == null) {
      const n = this.wm.windows.size % 7;
      x = Math.round((hostW - w) / 2) + (spec.center === false ? 0 : 0) - n * 14 + 40;
      y = Math.round((hostH - h) / 2.4) - n * 12 + 20;
      if (spec.center) { x = Math.round((hostW - w) / 2); y = Math.round((hostH - h) / 2.6); }
    }
    this.setPos(Math.max(0, Math.min(x, hostW - 70)), Math.max(0, Math.min(y, hostH - 40)));
  }

  setPos(x, y) {
    this.el.style.left = Math.round(x) + 'px';
    this.el.style.top = Math.round(y) + 'px';
  }

  /* ---------------- dragging ---------------- */
  onTitlePointerDown(e) {
    if (e.button !== 0 || e.target.closest('.tb-btn')) return;
    if (this.maximized) { this.wm.focus(this); return; }
    const rect = this.el.getBoundingClientRect();
    const host = this.wm.host.getBoundingClientRect();
    const offX = e.clientX - rect.left;
    const offY = e.clientY - rect.top;
    this.el.classList.remove('animating');
    const move = (ev) => {
      let x = ev.clientX - host.left - offX;
      let y = ev.clientY - host.top - offY;
      x = Math.max(-this.w + 90, Math.min(x, host.width - 90));
      y = Math.max(0, Math.min(y, host.height - 32));
      this.setPos(x, y);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      document.body.style.cursor = '';
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    this.wm.focus(this);
  }

  /* ---------------- resizing ---------------- */
  onResizeDown(e, dir) {
    if (e.button !== 0 || this.maximized || this.spec.resizable === false) return;
    e.preventDefault();
    e.stopPropagation();
    const start = { x: e.clientX, y: e.clientY, w: this.el.offsetWidth, h: this.el.offsetHeight, l: this.el.offsetLeft, t: this.el.offsetTop };
    const minW = this.spec.minWidth || 240;
    const minH = this.spec.minHeight || 120;
    this.el.classList.remove('animating');
    const move = (ev) => {
      const dx = ev.clientX - start.x;
      const dy = ev.clientY - start.y;
      let w = start.w, h = start.h, l = start.l, t = start.t;
      if (dir.includes('e')) w = Math.max(minW, start.w + dx);
      if (dir.includes('s')) h = Math.max(minH, start.h + dy);
      if (dir.includes('w')) { w = Math.max(minW, start.w - dx); l = start.l + (start.w - w); }
      if (dir.includes('n')) { h = Math.max(minH, start.h - dy); t = start.t + (start.h - h); }
      if (t < 0) { h += t; t = 0; }
      this.el.style.width = w + 'px';
      this.el.style.height = h + 'px';
      this.setPos(l, t);
      this.w = w; this.h = h;
      this.spec.onResize?.(w, h);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  /* ---------------- state changes ---------------- */
  setTitle(text) {
    this.title = text;
    this.titleEl.textContent = text;
    this.el.setAttribute('aria-label', text);
    if (this.taskBtn) this.taskBtn.querySelector('span').textContent = text;
  }

  setIcon(name) {
    this.iconName = name;
    this.iconEl.innerHTML = icon(name);
    if (this.taskBtn) this.taskBtn.querySelector('svg')?.replaceWith(iconEl(name));
  }

  updateMaxBtn() {
    if (!this.maxBtn) return;
    this.maxBtn.innerHTML = this.maximized ? BTN_SVG.restore : BTN_SVG.max;
    this.maxBtn.title = this.maximized ? 'Restore' : 'Maximize';
  }

  toggleMax() {
    if (this.spec.maximizable === false) return;
    if (this.maximized) this.restore();
    else this.maximize();
  }

  maximize() {
    if (this.maximized) return;
    this.prevRect = { l: this.el.offsetLeft, t: this.el.offsetTop, w: this.el.offsetWidth, h: this.el.offsetHeight };
    const hostW = this.wm.host.clientWidth;
    const hostH = this.wm.host.clientHeight;
    this.el.classList.add('animating');
    this.el.classList.add('maximized');
    this.el.style.left = '0px';
    this.el.style.top = '0px';
    this.el.style.width = hostW + 'px';
    this.el.style.height = hostH + 'px';
    this.maximized = true;
    this.w = hostW; this.h = hostH;
    this.updateMaxBtn();
    this.spec.onResize?.(hostW, hostH);
    setTimeout(() => this.el.classList.remove('animating'), 180);
  }

  restore() {
    if (this.minimized) { this.unminimize(); return; }
    if (!this.maximized) return;
    const r = this.prevRect || { l: 40, t: 40, w: 640, h: 460 };
    this.el.classList.add('animating');
    this.el.classList.remove('maximized');
    this.el.style.left = r.l + 'px';
    this.el.style.top = r.t + 'px';
    this.el.style.width = r.w + 'px';
    this.el.style.height = r.h + 'px';
    this.maximized = false;
    this.w = r.w; this.h = r.h;
    this.updateMaxBtn();
    this.spec.onResize?.(r.w, r.h);
    setTimeout(() => this.el.classList.remove('animating'), 180);
    this.wm.focus(this);
  }

  minimize() {
    if (this.minimized) return;
    const btn = this.taskBtn;
    const from = this.el.getBoundingClientRect();
    const to = btn ? btn.getBoundingClientRect() : { left: from.left, top: window.innerHeight, width: 100, height: 20 };
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    this.el.classList.add('animating');
    this.el.style.transform = `translate(${dx}px, ${dy}px) scale(.08)`;
    this.el.style.opacity = '0';
    this.minimized = true;
    this.el.classList.remove('active');
    if (btn) btn.classList.remove('active');
    sfx.minimize();
    setTimeout(() => { if (this.minimized) this.el.style.visibility = 'hidden'; }, 175);
    this.wm.setActive(null);
  }

  unminimize() {
    if (!this.minimized) return;
    this.minimized = false;
    this.el.style.visibility = '';
    this.el.style.transform = '';
    this.el.style.opacity = '';
    this.wm.focus(this);
  }

  close() {
    for (const hook of this.closeHooks) {
      try { if (hook() === false) return; } catch (e) { console.error(e); }
    }
    this.wm.closeWindow(this);
  }

  onClose(fn) { this.closeHooks.push(fn); }

  focus() { this.wm.focus(this); }

  flash() {
    this.el.classList.add('animating');
    let i = 0;
    const t = setInterval(() => {
      this.el.style.filter = i % 2 ? 'brightness(1.14)' : '';
      if (++i > 5) { clearInterval(t); this.el.style.filter = ''; }
    }, 90);
  }
}

/* ============================================================ */

export class WindowManager {
  constructor({ host, tasksEl, onChange }) {
    this.host = host;
    this.tasksEl = tasksEl;
    this.windows = new Map();
    this.z = 100;
    this.active = null;
    this.mru = [];
    this.onChange = onChange || (() => {});
    this.listeners = new Set();
    this.dialogSeq = 0;
  }

  /** Subscribe to window-list changes. Returns an unsubscribe function. */
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  notify() {
    try { this.onChange(); } catch (e) { console.error(e); }
    for (const fn of [...this.listeners]) {
      try { fn(); } catch (e) { console.error(e); }
    }
  }

  get count() { return this.windows.size; }

  register(win) {
    this.mru.unshift(win.id);
    // taskbar button
    if (win.spec.showInTaskbar !== false) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'taskbtn';
      b.innerHTML = `${icon(win.iconName)}<span></span>`;
      b.querySelector('span').textContent = win.title;
      b.title = win.title;
      b.addEventListener('click', () => {
        if (win.minimized) { win.unminimize(); return; }
        if (this.active === win) win.minimize();
        else this.focus(win);
      });
      this.tasksEl.appendChild(b);
      win.taskBtn = b;
    }
    this.notify();
  }

  focus(win) {
    if (!win || win.closed) return;
    if (win.minimized) { win.unminimize(); return; }
    if (this.active === win) return;
    this.z += 1;
    win.el.style.zIndex = String(this.z);
    for (const w of this.windows.values()) {
      const isActive = w === win;
      w.el.classList.toggle('active', isActive);
      if (w.taskBtn) w.taskBtn.classList.toggle('active', isActive);
    }
    this.mru = [win.id, ...this.mru.filter((id) => id !== win.id)];
    this.active = win;
    this.notify();
  }

  setActive(win) {
    this.active = win;
    if (!win) {
      for (const w of this.windows.values()) {
        if (!w.minimized) {
          w.el.classList.remove('active');
          if (w.taskBtn) w.taskBtn.classList.remove('active');
        }
      }
    }
    this.notify();
  }

  closeWindow(win) {
    if (win.closed) return;
    win.closed = true;
    win.el.classList.add('animating');
    win.el.style.opacity = '0';
    win.el.style.transform = 'scale(.97)';
    sfx.close();
    setTimeout(() => {
      win.el.remove();
      win.taskBtn?.remove();
      this.windows.delete(win.id);
      this.mru = this.mru.filter((id) => id !== win.id);
      if (this.active === win) {
        this.active = null;
        const next = this.mru.map((id) => this.windows.get(id)).find(Boolean);
        if (next) this.focus(next);
      }
      this.notify();
    }, 140);
    try { win.spec.onClose?.(); } catch (e) { console.error(e); }
  }

  closeAll() {
    [...this.windows.values()].forEach((w) => this.closeWindow(w));
  }

  minimizeAll() {
    [...this.windows.values()].forEach((w) => { if (!w.minimized) w.minimize(); });
  }

  cycle() {
    const open = this.mru.map((id) => this.windows.get(id)).filter((w) => w && !w.minimized);
    if (open.length < 2) return;
    const [first, second] = open;
    this.focus(second);
    first.flash();
  }

  find(key) {
    for (const w of this.windows.values()) if (w.singletonKey === key) return w;
    return null;
  }

  list() { return [...this.windows.values()].filter((w) => !w.closed); }

  /* ---------------- public API ---------------- */
  open(spec = {}) {
    if (spec.singleton) {
      const key = typeof spec.singleton === 'string' ? spec.singleton : spec.appId || spec.id;
      const existing = this.find(key);
      if (existing) {
        existing.unminimize();
        this.focus(existing);
        sfx.click();
        return existing;
      }
    }
    return new Win(this, spec);
  }

  /** Message box. Returns the label of the clicked button. */
  msgBox({ title = 'Windows', text = '', iconName = 'info', buttons = ['OK'], width = 400, sound = true } = {}) {
    return new Promise((resolve) => {
      if (sound) sfx.ding();
      let done = false;
      const win = this.open({
        title,
        icon: 'windows',
        width,
        height: undefined,
        dialog: true,
        elClass: 'msgbox',
        showInTaskbar: false,
        resizable: false,
        maximizable: false,
        minimizable: false,
        center: true,
        appId: 'msgbox',
        onMount: (body, w) => {
          // size to content after mount
          body.innerHTML = `
            <div class="mb-row">${icon(iconName)}<div class="mb-text"></div></div>
            <div class="mb-buttons"></div>`;
          body.querySelector('.mb-text').textContent = text;
          const row = body.querySelector('.mb-buttons');
          const finish = (label) => {
            if (done) return;
            done = true;
            resolve(label);
            w.close();
          };
          buttons.forEach((label) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'btn' + (label === buttons[0] ? ' primary' : '');
            b.textContent = label;
            b.addEventListener('click', () => finish(label));
            row.appendChild(b);
          });
          requestAnimationFrame(() => {
            const h = body.scrollHeight + 50;
            w.el.style.height = Math.max(h, 150) + 'px';
            w.el.style.width = width + 'px';
            const hostW = this.host.clientWidth;
            const hostH = this.host.clientHeight;
            w.setPos((hostW - w.el.offsetWidth) / 2, (hostH - w.el.offsetHeight) / 2.4);
            row.querySelector('.btn')?.focus();
          });
          w.onClose(() => { if (!done) { done = true; resolve(null); } });
        },
      });
      void win;
    });
  }

  confirm(text, title = 'Confirm') {
    return this.msgBox({ title, text, iconName: 'question', buttons: ['Yes', 'No'], width: 380 })
      .then((r) => r === 'Yes');
  }

  alert(text, title = 'Windows') {
    return this.msgBox({ title, text, iconName: 'info', buttons: ['OK'], width: 400 });
  }

  error(text, title = 'Error') {
    return this.msgBox({ title, text, iconName: 'error', buttons: ['OK'], width: 400 });
  }

  /** Single-line prompt dialog. Resolves string or null. */
  prompt({ title = 'Windows', label = '', value = '', iconName = 'info', width = 400, okLabel = 'OK' } = {}) {
    return new Promise((resolve) => {
      let done = false;
      this.open({
        title,
        icon: 'windows',
        width,
        dialog: true,
        showInTaskbar: false,
        resizable: false,
        maximizable: false,
        center: true,
        appId: 'prompt',
        onMount: (body, w) => {
          body.innerHTML = `
            <div class="dlg">
              <div class="body">${icon(iconName)}
                <div class="fields">
                  <span class="lbl"></span>
                  <input class="field" type="text" />
                </div>
              </div>
              <div class="foot">
                <button class="btn primary" data-ok>${okLabel}</button>
                <button class="btn" data-cancel>Cancel</button>
              </div>
            </div>`;
          const input = body.querySelector('input');
          body.querySelector('.lbl').textContent = label;
          input.value = value;
          const finish = (v) => { if (done) return; done = true; resolve(v); w.close(); };
          body.querySelector('[data-ok]').addEventListener('click', () => finish(input.value));
          body.querySelector('[data-cancel]').addEventListener('click', () => finish(null));
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') finish(input.value);
            if (e.key === 'Escape') finish(null);
            e.stopPropagation();
          });
          requestAnimationFrame(() => {
            w.el.style.height = 'auto';
            w.el.style.height = body.scrollHeight + 6 + 'px';
            w.setPos((this.host.clientWidth - w.el.offsetWidth) / 2, (this.host.clientHeight - w.el.offsetHeight) / 2.6);
            input.focus();
            input.select();
          });
          w.onClose(() => { if (!done) { done = true; resolve(null); } });
        },
      });
    });
  }
}

export function makeWM() {
  return new WindowManager({
    host: document.getElementById('windows'),
    tasksEl: document.getElementById('tasks'),
  });
}

export default WindowManager;
