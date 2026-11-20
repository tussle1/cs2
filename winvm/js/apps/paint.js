/* ============================================================
   paint.js — Paint (pencil, brush, shapes, fill, save as PNG)
   ============================================================ */

import { icon } from '../core/icons.js';
import { menuBar } from '../core/menu.js';
import { normalize, basename, dirname, extname } from '../core/fs.js';
import { fileDialog } from './filedialog.js';

const PALETTE = [
  '#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080',
  '#ffffff', '#c0c0c0', '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff',
  '#ff8080', '#ffc080', '#ffff80', '#80ff80', '#80ffff', '#8080ff', '#ff80ff', '#c08040',
  '#804000', '#400000', '#004000', '#000040',
];

const TOOLS = [
  ['pencil', 'tPencil', 'Pencil'],
  ['brush', 'tBrush', 'Brush'],
  ['eraser', 'tEraser', 'Eraser'],
  ['fill', 'tFill', 'Fill With Color'],
  ['picker', 'tPicker', 'Pick Color'],
  ['spray', 'tSpray', 'Airbrush'],
  ['line', 'tLine', 'Line'],
  ['rect', 'tRect', 'Rectangle'],
  ['ellipse', 'tEllipse', 'Ellipse'],
  ['text', 'tText', 'Text (not supported)'],
];

export function launch(ctx, opts = {}) {
  const { wm, fs } = ctx;
  let path = opts.path ? normalize(opts.path) : null;
  let dirty = false;

  wm.open({
    title: 'untitled - Paint',
    icon: 'paint',
    width: 760, height: 590, minWidth: 420, minHeight: 320,
    appId: 'paint',
    x: opts.x, y: opts.y,
    onMount: (body, win) => {
      body.innerHTML = `
        <div class="paint">
          <div class="paint-body">
            <div class="paint-tools"></div>
            <div class="paint-stage"><div class="paint-canvas-wrap"><canvas width="620" height="400"></canvas></div></div>
            <div class="paint-side">
              <div class="paint-current"><i class="bg"></i></div>
              <div class="paint-swatches"></div>
            </div>
          </div>
          <div class="paint-colors"></div>
          <div class="statusbar"><span class="st-pos">For Help, click Help Topics on the Help Menu.</span><span class="st-size">620 x 400</span></div>
        </div>`;

      const canvas = body.querySelector('canvas');
      const g = canvas.getContext('2d', { willReadFrequently: true });
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, canvas.width, canvas.height);
      g.lineJoin = 'round';
      g.lineCap = 'round';

      const state = {
        tool: 'pencil',
        color: '#000000',
        bg: '#ffffff',
        size: 3,
        drawing: false,
        start: null,
        snapshot: null,
        undo: [],
      };

      const toolsEl = body.querySelector('.paint-tools');
      TOOLS.forEach(([id, ic, label]) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.dataset.tool = id;
        b.title = label;
        b.innerHTML = icon(ic);
        b.addEventListener('click', () => {
          if (id === 'text') {
            wm.alert('Text tool\n\nDrawing text on the canvas is not implemented — but the keyboard works fine in Notepad.', 'Paint');
            return;
          }
          state.tool = id;
          toolsEl.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
          ctx.sfx.tick();
        });
        toolsEl.appendChild(b);
      });
      toolsEl.querySelector('[data-tool="pencil"]').classList.add('on');

      const swEl = body.querySelector('.paint-swatches');
      ['#000000', '#ffffff', '#ff0000', '#0000ff', '#00a000', '#ffff00', '#ff8000', '#8000ff'].forEach((c) => {
        const b = document.createElement('button');
        b.style.background = c;
        b.addEventListener('click', () => { state.color = c; updateCurrent(); });
        swEl.appendChild(b);
      });

      const palEl = body.querySelector('.paint-colors');
      PALETTE.forEach((c) => {
        const b = document.createElement('button');
        b.style.background = c;
        b.dataset.color = c;
        b.title = c;
        b.addEventListener('click', () => {
          if (b.dataset.secondary) state.bg = c; else state.color = c;
          updateCurrent();
        });
        b.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          state.bg = c;
          updateCurrent();
        });
        palEl.appendChild(b);
      });

      function updateCurrent() {
        body.querySelector('.paint-current .bg').style.background = state.color;
        palEl.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.color === state.color));
      }
      updateCurrent();

      const wrap = body.querySelector('.paint-canvas-wrap');
      const stPos = body.querySelector('.st-pos');
      const stSize = body.querySelector('.st-size');

      function canvasPoint(e) {
        const r = canvas.getBoundingClientRect();
        return {
          x: Math.round((e.clientX - r.left) * (canvas.width / r.width)),
          y: Math.round((e.clientY - r.top) * (canvas.height / r.height)),
        };
      }

      function pushUndo() {
        try {
          state.undo.push(g.getImageData(0, 0, canvas.width, canvas.height));
          if (state.undo.length > 24) state.undo.shift();
        } catch (e) { /* ignore */ }
      }

      function restoreUndo() {
        const img = state.undo.pop();
        if (img) g.putImageData(img, 0, 0);
      }

      function floodFill(x, y, color) {
        const img = g.getImageData(0, 0, canvas.width, canvas.height);
        const d = img.data;
        const idx = (y * canvas.width + x) * 4;
        const target = [d[idx], d[idx + 1], d[idx + 2], d[idx + 3]];
        const rgb = hexToRgb(color);
        if (target[0] === rgb[0] && target[1] === rgb[1] && target[2] === rgb[2]) return;
        const stack = [[x, y]];
        const seen = new Uint8Array(canvas.width * canvas.height);
        const match = (i) => Math.abs(d[i] - target[0]) < 12 && Math.abs(d[i + 1] - target[1]) < 12
          && Math.abs(d[i + 2] - target[2]) < 12 && Math.abs(d[i + 3] - target[3]) < 12;
        while (stack.length) {
          const [cx, cy] = stack.pop();
          if (cx < 0 || cy < 0 || cx >= canvas.width || cy >= canvas.height) continue;
          const p = cy * canvas.width + cx;
          if (seen[p]) continue;
          seen[p] = 1;
          const i = p * 4;
          if (!match(i)) continue;
          d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = 255;
          stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
        }
        g.putImageData(img, 0, 0);
      }

      function hexToRgb(hex) {
        const h = hex.replace('#', '');
        return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
      }

      function drawShape(a, b) {
        g.strokeStyle = state.color;
        g.fillStyle = state.color;
        g.lineWidth = state.size;
        g.beginPath();
        if (state.tool === 'line') {
          g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
        } else if (state.tool === 'rect') {
          g.strokeRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
        } else if (state.tool === 'ellipse') {
          const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
          g.ellipse(cx, cy, Math.abs(b.x - a.x) / 2, Math.abs(b.y - a.y) / 2, 0, 0, Math.PI * 2);
          g.stroke();
        }
      }

      wrap.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        const p = canvasPoint(e);
        state.drawing = true;
        state.start = p;
        pushUndo();
        if (state.tool === 'fill') { floodFill(p.x, p.y, state.color); state.drawing = false; markDirty(); return; }
        if (state.tool === 'picker') {
          const d = g.getImageData(p.x, p.y, 1, 1).data;
          state.color = '#' + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('');
          updateCurrent();
          state.drawing = false;
          return;
        }
        if (['line', 'rect', 'ellipse'].includes(state.tool)) {
          state.snapshot = g.getImageData(0, 0, canvas.width, canvas.height);
        } else {
          g.strokeStyle = state.tool === 'eraser' ? state.bg : state.color;
          g.lineWidth = state.tool === 'brush' ? state.size * 2.2 : state.tool === 'eraser' ? state.size * 3 : state.size;
          g.beginPath();
          g.moveTo(p.x, p.y);
        }
        markDirty();
        wrap.setPointerCapture?.(e.pointerId);
      });

      wrap.addEventListener('pointermove', (e) => {
        const p = canvasPoint(e);
        stPos.textContent = `${p.x}, ${p.y}`;
        if (!state.drawing) return;
        if (state.tool === 'spray') {
          g.fillStyle = state.color;
          for (let i = 0; i < 14; i++) {
            const a = Math.random() * Math.PI * 2;
            const r = Math.random() * state.size * 2.4;
            g.fillRect(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 1, 1);
          }
          return;
        }
        if (['line', 'rect', 'ellipse'].includes(state.tool)) {
          if (state.snapshot) g.putImageData(state.snapshot, 0, 0);
          drawShape(state.start, p);
          return;
        }
        g.lineTo(p.x, p.y);
        g.stroke();
      });

      wrap.addEventListener('pointerup', () => {
        state.drawing = false;
        state.snapshot = null;
      });

      function markDirty() {
        if (!dirty) { dirty = true; updateTitle(); }
      }

      function updateTitle() {
        win.setTitle(`${dirty ? '*' : ''}${path ? basename(path) : 'untitled'} - Paint`);
      }

      async function save({ saveAs = false } = {}) {
        let target = path;
        if (!target || saveAs) {
          target = await fileDialog(ctx, {
            mode: 'save', title: 'Save As', path: path ? dirname(path) : 'C:\\Documents and Settings\\Administrator\\My Documents\\My Pictures',
            filename: path ? basename(path) : 'untitled.png', filter: ['png'], filterLabel: 'PNG (*.png)',
          });
          if (!target) return false;
        }
        if (extname(target) !== 'png') target += '.png';
        fs.writeFile(target, canvas.toDataURL('image/png'), { mime: 'image/png' });
        path = target;
        dirty = false;
        updateTitle();
        ctx.refreshDesktop?.();
        ctx.sfx.click();
        return true;
      }

      async function open() {
        const p = await fileDialog(ctx, {
          mode: 'open', title: 'Open', path: 'C:\\Documents and Settings\\Administrator\\My Documents\\My Pictures',
          filter: ['png', 'jpg', 'jpeg', 'gif', 'bmp'],
        });
        if (!p) return;
        loadImage(p);
      }

      function loadImage(p) {
        const content = fs.readFile(p, '');
        const img = new Image();
        img.onload = () => {
          g.fillStyle = '#fff';
          g.fillRect(0, 0, canvas.width, canvas.height);
          g.drawImage(img, 0, 0, canvas.width, canvas.height);
          path = p;
          dirty = false;
          updateTitle();
        };
        img.onerror = () => wm.error('Paint cannot read this file.\n\nThis is not a valid bitmap file.', 'Paint');
        img.src = content;
      }

      const clearAll = () => {
        pushUndo();
        g.fillStyle = '#fff';
        g.fillRect(0, 0, canvas.width, canvas.height);
        dirty = true; updateTitle();
      };

      const mb = menuBar(body, [
        { label: 'File', items: () => [
          { label: 'New', kbd: 'Ctrl+N', action: clearAll },
          { label: 'Open…', kbd: 'Ctrl+O', action: open },
          { label: 'Save', kbd: 'Ctrl+S', action: () => save() },
          { label: 'Save As…', action: () => save({ saveAs: true }) },
          { sep: true },
          { label: 'Exit', action: () => win.close() },
        ] },
        { label: 'Edit', items: () => [
          { label: 'Undo', kbd: 'Ctrl+Z', action: restoreUndo },
          { sep: true },
          { label: 'Clear Image', kbd: 'Ctrl+Shift+N', action: clearAll },
        ] },
        { label: 'View', items: () => [
          { label: 'Tool Box', checked: true, disabled: true },
          { label: 'Color Box', checked: true, disabled: true },
        ] },
        { label: 'Image', items: () => [
          { label: 'Invert Colors', action: () => {
            pushUndo();
            const img = g.getImageData(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < img.data.length; i += 4) {
              img.data[i] = 255 - img.data[i];
              img.data[i + 1] = 255 - img.data[i + 1];
              img.data[i + 2] = 255 - img.data[i + 2];
            }
            g.putImageData(img, 0, 0);
            markDirty();
          } },
          { label: 'Flip/Rotate…', action: () => {
            pushUndo();
            const copy = document.createElement('canvas');
            copy.width = canvas.width; copy.height = canvas.height;
            copy.getContext('2d').drawImage(canvas, 0, 0);
            g.save();
            g.translate(canvas.width, 0);
            g.scale(-1, 1);
            g.drawImage(copy, 0, 0);
            g.restore();
            markDirty();
          } },
          { label: 'Attributes…', action: () => wm.alert(`Width: ${canvas.width} pixels\nHeight: ${canvas.height} pixels\n\nColors: True Color`, 'Attributes') },
        ] },
        { label: 'Help', items: () => [
          { label: 'Help Topics', action: () => ctx.openApp('help') },
          { label: 'About Paint', action: () => ctx.openApp('about') },
        ] },
      ]);
      body.insertBefore(mb.el, body.firstChild);

      body.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); restoreUndo(); }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
        e.stopPropagation();
      });
      body.tabIndex = 0;

      if (path) loadImage(path);
      else updateTitle();

      win.onClose(() => {
        if (!dirty) return true;
        wm.msgBox({
          title: 'Paint', iconName: 'warn', width: 420,
          text: 'Save changes to ' + (path ? basename(path) : 'untitled') + '?',
          buttons: ['Yes', 'No', 'Cancel'],
        }).then(async (r) => {
          if (r === 'Cancel' || r === null) return;
          if (r === 'Yes' && !(await save())) return;
          dirty = false;
          win.close();
        });
        return false;
      });
    },
  });
}

export default launch;
