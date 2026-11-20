/* ============================================================
   menu.js — popup menus, context menus and menu bars
   ============================================================ */

import { icon } from './icons.js';
import sfx from './sound.js';

let openMenus = [];

export function closeMenus() {
  while (openMenus.length) {
    const m = openMenus.pop();
    m.el.remove();
    m.onClose?.();
  }
}

/** Build a menu element from a list of items. Supports nested `submenu`. */
export function buildMenu(items, { className = 'menu', onClose } = {}) {
  const el = document.createElement('div');
  el.className = className;
  el.setAttribute('role', 'menu');
  let openSub = null;

  const closeSub = () => {
    if (openSub) { openSub.remove(); openSub = null; el.querySelectorAll('.has-sub').forEach((n) => n.classList.remove('open')); }
  };

  for (const it of items) {
    if (!it || it.sep) {
      closeSub();
      el.appendChild(document.createElement('hr'));
      continue;
    }
    if (it.header) {
      const h = document.createElement('div');
      h.className = 'menu-header';
      h.textContent = it.header;
      el.appendChild(h);
      continue;
    }
    const b = document.createElement('button');
    b.type = 'button';
    b.disabled = !!it.disabled;
    const check = it.checked ? '✓' : '';
    b.innerHTML = `${it.checked !== undefined ? `<span class="check">${check}</span>` : ''}` +
      (it.icon ? icon(it.icon) : '') +
      `<span class="lbl"></span>` +
      (it.kbd ? `<span class="kbd"></span>` : '') +
      (it.submenu ? '<span class="arrow">▸</span>' : '');
    b.querySelector('.lbl').textContent = it.label;
    if (it.kbd) b.querySelector('.kbd').textContent = it.kbd;
    if (it.icon) {
      const svg = b.querySelector('svg');
      if (svg) { svg.style.width = '16px'; svg.style.height = '16px'; }
    } else {
      b.style.paddingLeft = it.checked !== undefined ? '24px' : '20px';
    }
    if (it.submenu) {
      b.classList.add('has-sub');
      b.addEventListener('pointerenter', () => {
        closeSub();
        if (it.disabled) return;
        const sub = buildMenu(typeof it.submenu === 'function' ? it.submenu() : it.submenu, {
          className: 'menu', onClose,
        });
        const r = b.getBoundingClientRect();
        document.getElementById('menu-layer').appendChild(sub);
        const sr = sub.getBoundingClientRect();
        let left = r.right - 3;
        if (left + sr.width > window.innerWidth - 4) left = Math.max(4, r.left - sr.width + 3);
        sub.style.left = left + 'px';
        sub.style.top = Math.min(r.top - 3, window.innerHeight - sr.height - 34) + 'px';
        b.classList.add('open');
        openSub = sub;
      });
    } else {
      b.addEventListener('pointerenter', () => { closeSub(); b.focus(); });
    }
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      if (it.submenu) return;
      closeMenus();
      sfx.click();
      it.action?.();
    });
    el.appendChild(b);
  }
  return el;
}

/** Show a popup menu anchored at viewport coordinates. */
export function openMenu(x, y, items, opts = {}) {
  closeMenus();
  const el = buildMenu(items, opts);
  document.getElementById('menu-layer').appendChild(el);
  // keep on screen
  const r = el.getBoundingClientRect();
  let left = x, top = y;
  if (left + r.width > window.innerWidth - 4) left = Math.max(4, window.innerWidth - r.width - 4);
  if (top + r.height > window.innerHeight - 34) top = Math.max(4, window.innerHeight - r.height - 34);
  el.style.left = left + 'px';
  el.style.top = top + 'px';
  openMenus.push({ el, onClose: opts.onClose });
  const dismiss = (e) => {
    if (el.contains(e.target)) return;
    closeMenus();
    document.removeEventListener('pointerdown', dismiss, true);
  };
  setTimeout(() => document.addEventListener('pointerdown', dismiss, true), 0);
  return el;
}

/** Context menu helper that prevents the browser menu. */
export function contextMenu(e, items) {
  e.preventDefault();
  e.stopPropagation();
  return openMenu(e.clientX, e.clientY, items, { className: 'ctx' });
}

/**
 * A Windows-style menu bar.
 * menus: [{ label, items: [...] | () => [...] }, ...]
 */
export function menuBar(container, menus) {
  const bar = document.createElement('div');
  bar.className = 'menubar';
  container.appendChild(bar);
  let current = null;

  const close = () => {
    current?.el.remove();
    current = null;
    bar.querySelectorAll('button').forEach((b) => b.classList.remove('open'));
  };

  menus.forEach((m) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = m.label;
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const wasOpen = current && current.label === m.label;
      close();
      if (wasOpen) return;
      const items = typeof m.items === 'function' ? m.items() : m.items;
      const el = buildMenu(items, { className: 'menu' , onClose: () => {} });
      document.getElementById('menu-layer').appendChild(el);
      const rect = b.getBoundingClientRect();
      el.style.left = rect.left + 'px';
      el.style.top = rect.bottom + 'px';
      const mr = el.getBoundingClientRect();
      if (mr.right > window.innerWidth - 4) el.style.left = Math.max(4, window.innerWidth - mr.width - 4) + 'px';
      b.classList.add('open');
      current = { label: m.label, el };
      const dismiss = (ev) => {
        if (el.contains(ev.target) || ev.target === b) return;
        close();
        document.removeEventListener('pointerdown', dismiss, true);
      };
      setTimeout(() => document.addEventListener('pointerdown', dismiss, true), 0);
    });
    b.addEventListener('pointerenter', () => {
      if (current && current.label !== m.label) b.click();
    });
    bar.appendChild(b);
  });

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  return { el: bar, close };
}

export default { openMenu, contextMenu, menuBar, closeMenus, buildMenu };
