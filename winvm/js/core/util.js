/* ============================================================
   util.js — small shared helpers
   ============================================================ */

export function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

export function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function fmtBytes(n = 0) {
  if (n < 1024) return `${n} bytes`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

export function fmtDate(ts, { time = true, short = false } = {}) {
  const d = new Date(ts || Date.now());
  const date = short
    ? `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`
    : `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  if (!time) return date;
  const t = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return `${date} ${t}`;
}

export function fmtDateLong(ts) {
  const d = new Date(ts || Date.now());
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function fmtClock(date = new Date(), { clock24 = false, seconds = false } = {}) {
  let h = date.getHours();
  let suffix = '';
  if (!clock24) {
    suffix = h >= 12 ? ' PM' : ' AM';
    h = h % 12 || 12;
  }
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${clock24 ? String(h).padStart(2, '0') : h}:${m}${seconds ? ':' + s : ''}${suffix}`;
}

export function debounce(fn, ms = 120) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v != null && v !== false) node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null) node.append(c);
  return node;
}

export function readFileAsText(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsText(file);
  });
}

export function readFileAsDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export function download(filename, content, mime = 'text/plain') {
  const a = document.createElement('a');
  a.href = content.startsWith('data:') ? content : URL.createObjectURL(new Blob([content], { type: mime }));
  a.download = filename;
  a.click();
  setTimeout(() => { if (a.href.startsWith('blob:')) URL.revokeObjectURL(a.href); }, 4000);
}

export function pickFile(accept = '') {
  return new Promise((res) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.addEventListener('change', () => res(input.files?.[0] || null));
    input.click();
  });
}

export default { clamp, escapeHtml, fmtBytes, fmtDate, fmtDateLong, fmtClock, debounce, el, download, pickFile };
