/* ============================================================
   calc.js — Calculator (standard view, fully working)
   ============================================================ */

export function launch(ctx, opts = {}) {
  const { wm } = ctx;
  wm.open({
    title: 'Calculator',
    icon: 'calc',
    width: 268, height: 300, minWidth: 240, minHeight: 260,
    appId: 'calc',
    singleton: 'calc',
    resizable: false,
    maximizable: false,
    onMount: (body, win) => {
      body.innerHTML = `
        <div class="calc">
          <div class="calc-mem"><span data-m="M">M</span></div>
          <div class="calc-display" data-display>0.</div>
          <div class="calc-grid"></div>
        </div>`;
      const display = body.querySelector('[data-display]');
      const memInd = body.querySelector('[data-m]');
      const grid = body.querySelector('.calc-grid');

      const st = {
        display: '0.',
        acc: null,
        op: null,
        fresh: true,
        mem: 0,
        typed: false,
      };

      const keys = [
        ['MC', 'mem-clear', 'mem'], ['7', 7], ['8', 8], ['9', 9], ['/', 'div', 'op'], ['sqrt', null, 'mem'],
        ['MR', 'mem-recall', 'mem'], ['4', 4], ['5', 5], ['6', 6], ['*', 'mul', 'op'], ['%', 'pct', 'mem'],
        ['MS', 'mem-store', 'mem'], ['1', 1], ['2', 2], ['3', 3], ['-', 'sub', 'op'], ['1/x', 'inv', 'mem'],
        ['M+', 'mem-add', 'mem'], ['0', 0], ['+/-', 'neg'], ['.', 'dot'], ['+', 'add', 'op'], ['=', 'eq', 'eq'],
      ];
      const topRow = [['Backspace', 'back'], ['CE', 'ce'], ['C', 'c']];

      const top = document.createElement('div');
      top.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:4px';
      topRow.forEach(([label, id]) => {
        const b = document.createElement('button');
        b.className = 'btn';
        b.style.minWidth = '0';
        b.style.height = '24px';
        b.textContent = label;
        b.addEventListener('click', () => press(id, label));
        top.appendChild(b);
      });
      body.querySelector('.calc').insertBefore(top, grid);

      keys.forEach(([label, val, cls]) => {
        const b = document.createElement('button');
        b.textContent = String(label);
        if (cls) b.className = cls;
        b.addEventListener('click', () => press(val, label));
        grid.appendChild(b);
      });

      const fmt = (n) => {
        if (!Number.isFinite(n)) return 'Cannot divide by zero.';
        const s = Math.abs(n) >= 1e16 ? n.toExponential(9) : String(Number(n.toPrecision(15)));
        return s.includes('.') ? s : s + '.';
      };

      const render = () => {
        display.textContent = st.display;
        memInd.classList.toggle('on', st.mem !== 0);
      };

      const num = () => parseFloat(st.display) || 0;

      function apply(a, b, op) {
        switch (op) {
          case 'add': return a + b;
          case 'sub': return a - b;
          case 'mul': return a * b;
          case 'div': return b === 0 ? NaN : a / b;
          default: return b;
        }
      }

      function press(val, label) {
        ctx.sfx?.tick?.();
        if (typeof val === 'number' || val === 'dot') {
          const ch = val === 'dot' ? '.' : String(val);
          if (st.fresh || !st.typed) {
            st.display = ch === '.' ? '0.' : ch + '.';
            st.fresh = false;
            st.typed = true;
            return render();
          }
          const base = st.display.replace(/\.$/, '');
          if (ch === '.') {
            if (base.includes('.')) return render();
            st.display = base + '.';
            return render();
          }
          st.display = base + ch + '.';
          return render();
        }

        switch (val) {
          case 'c':
            st.display = '0.'; st.acc = null; st.op = null; st.fresh = true; st.typed = false;
            break;
          case 'ce':
            st.display = '0.'; st.typed = false; st.fresh = true;
            break;
          case 'back': {
            let s = st.display.replace(/\.$/, '');
            s = s.slice(0, -1);
            st.display = s ? s + '.' : '0.';
            break;
          }
          case 'neg':
            st.display = st.display.startsWith('-') ? st.display.slice(1) : '-' + st.display;
            break;
          case 'sqrt': {
            const v = num();
            st.display = v < 0 ? 'Invalid input.' : fmt(Math.sqrt(v));
            st.fresh = true; st.typed = false;
            break;
          }
          case 'inv': {
            const v = num();
            st.display = v === 0 ? 'Cannot divide by zero.' : fmt(1 / v);
            st.fresh = true; st.typed = false;
            break;
          }
          case 'pct':
            st.display = fmt(num() / 100);
            break;
          case 'add': case 'sub': case 'mul': case 'div': {
            const v = num();
            if (st.op && !st.fresh) st.acc = apply(st.acc ?? v, v, st.op);
            else st.acc = v;
            st.display = fmt(st.acc);
            st.op = val;
            st.fresh = true;
            st.typed = false;
            break;
          }
          case 'eq': {
            const v = num();
            if (st.op) {
              const result = apply(st.acc ?? v, v, st.op);
              st.display = fmt(result);
              st.acc = result;
              st.op = null;
            }
            st.fresh = true; st.typed = false;
            break;
          }
          case 'mem-clear': st.mem = 0; break;
          case 'mem-recall': st.display = fmt(st.mem); st.fresh = true; st.typed = false; break;
          case 'mem-store': st.mem = num(); break;
          case 'mem-add': st.mem += num(); break;
          default: break;
        }
        render();
      }

      body.addEventListener('keydown', (e) => {
        const k = e.key;
        if (/^[0-9]$/.test(k)) press(Number(k));
        else if (k === '.') press('dot');
        else if (k === '+') press('add');
        else if (k === '-') press('sub');
        else if (k === '*') press('mul');
        else if (k === '/') press('div');
        else if (k === 'Enter' || k === '=') press('eq');
        else if (k === 'Escape') press('c');
        else if (k === 'Backspace') press('back');
        else return;
        e.preventDefault();
        e.stopPropagation();
      });
      body.tabIndex = 0;
      setTimeout(() => body.focus(), 40);
      render();
    },
  });
}

export default launch;
