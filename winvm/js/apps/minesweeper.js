/* ============================================================
   minesweeper.js — the real thing: flags, timer, three levels
   ============================================================ */

import { menuBar } from '../core/menu.js';

const LEVELS = {
  beginner: { cols: 9, rows: 9, mines: 10 },
  intermediate: { cols: 16, rows: 16, mines: 40 },
  expert: { cols: 30, rows: 16, mines: 99 },
};

export function launch(ctx, opts = {}) {
  const { wm } = ctx;
  const level = opts.level || ctx.settings.get('mineLevel') || 'beginner';

  wm.open({
    title: 'Minesweeper',
    icon: 'mine',
    width: LEVELS[level].cols * 16 + 22,
    height: LEVELS[level].rows * 16 + 124,
    appId: 'winmine',
    singleton: 'winmine',
    resizable: false,
    maximizable: false,
    onMount: (body, win) => {
      let cfg = LEVELS[level];
      const st = {
        cells: [],
        revealed: 0,
        flags: 0,
        started: false,
        over: false,
        won: false,
        time: 0,
        timer: null,
      };

      body.innerHTML = `<div class="ms">
        <div class="ms-panel">
          <div class="ms-lcd" data-mines>010</div>
          <button class="ms-face" data-face title="New game">🙂</button>
          <div class="ms-lcd" data-time>000</div>
        </div>
        <div class="ms-grid"></div>
      </div>`;
      const gridEl = body.querySelector('.ms-grid');
      const minesEl = body.querySelector('[data-mines]');
      const timeEl = body.querySelector('[data-time]');
      const faceEl = body.querySelector('[data-face]');

      const lcd = (n) => String(Math.max(-99, Math.min(999, n))).padStart(3, '0').slice(-3);

      function newGame(nextLevel) {
        if (nextLevel) cfg = LEVELS[nextLevel];
        clearInterval(st.timer);
        Object.assign(st, {
          revealed: 0, flags: 0, started: false, over: false, won: false, time: 0, timer: null,
        });
        st.cells = [];
        for (let y = 0; y < cfg.rows; y++) {
          for (let x = 0; x < cfg.cols; x++) {
            st.cells.push({ x, y, mine: false, open: false, flag: false, n: 0 });
          }
        }
        // place mines avoiding the first click later — place randomly now, and move if needed
        let placed = 0;
        while (placed < cfg.mines) {
          const i = Math.floor(Math.random() * st.cells.length);
          if (!st.cells[i].mine) { st.cells[i].mine = true; placed++; }
        }
        for (const c of st.cells) c.n = neighbors(c).filter((n) => n.mine).length;
        faceEl.textContent = '🙂';
        updateLcd();
        layout();
      }

      function neighbors(c) {
        const out = [];
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const x = c.x + dx, y = c.y + dy;
            if (x < 0 || y < 0 || x >= cfg.cols || y >= cfg.rows) continue;
            out.push(st.cells[y * cfg.cols + x]);
          }
        }
        return out;
      }

      function layout() {
        gridEl.style.gridTemplateColumns = `repeat(${cfg.cols}, 16px)`;
        gridEl.innerHTML = '';
        st.cells.forEach((c) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.setAttribute('aria-label', `cell ${c.x + 1},${c.y + 1}`);
          b.addEventListener('mousedown', (e) => {
            e.preventDefault();
            if (st.over) return;
            if (e.button === 2) toggleFlag(c, b);
            else if (e.button === 0) reveal(c, b);
          });
          b.addEventListener('contextmenu', (e) => e.preventDefault());
          c.el = b;
          gridEl.appendChild(b);
        });
        win.el.style.width = (cfg.cols * 16 + 22) + 'px';
        win.el.style.height = (cfg.rows * 16 + 124) + 'px';
      }

      function updateLcd() {
        minesEl.textContent = lcd(cfg.mines - st.flags);
        timeEl.textContent = lcd(st.time);
      }

      function startTimer() {
        if (st.timer) return;
        st.timer = setInterval(() => {
          st.time = Math.min(999, st.time + 1);
          timeEl.textContent = lcd(st.time);
        }, 1000);
      }

      function relocateMine(first) {
        // ensure the first click is never a mine and is surrounded by numbers
        const safe = new Set([first, ...neighbors(first)]);
        for (const c of safe) {
          if (c.mine) {
            c.mine = false;
            let placed = false;
            for (const other of st.cells) {
              if (!other.mine && !safe.has(other)) { other.mine = true; placed = true; break; }
            }
            if (!placed) c.mine = true;
          }
        }
        for (const c of st.cells) c.n = neighbors(c).filter((n) => n.mine).length;
      }

      function reveal(c, el) {
        if (st.over || c.open || c.flag) return;
        if (!st.started) {
          st.started = true;
          if (c.mine) relocateMine(c);
          startTimer();
        }
        if (c.mine) return lose(c);
        openCell(c);
        checkWin();
        void el;
      }

      function openCell(c) {
        if (c.open || c.flag) return;
        c.open = true;
        st.revealed++;
        const el = c.el;
        el.classList.add('open');
        if (c.n > 0) { el.textContent = String(c.n); el.classList.add('ms-n' + c.n); }
        if (c.n === 0) neighbors(c).forEach(openCell);
      }

      function toggleFlag(c, el) {
        if (st.over || c.open) return;
        if (!st.started) { st.started = true; startTimer(); }
        c.flag = !c.flag;
        st.flags += c.flag ? 1 : -1;
        el.textContent = c.flag ? '🚩' : '';
        el.classList.toggle('flag', c.flag);
        updateLcd();
        ctx.sfx.tick();
      }

      function lose(hit) {
        st.over = true;
        clearInterval(st.timer);
        faceEl.textContent = '😵';
        ctx.sfx.boom();
        for (const c of st.cells) {
          if (c.mine && !c.flag) { c.el.classList.add('open', 'mine'); c.el.textContent = '💣'; }
          if (c.flag && !c.mine) { c.el.textContent = '✖'; }
        }
        if (hit) hit.el.classList.add('mine-hit');
      }

      function checkWin() {
        if (st.revealed === cfg.rows * cfg.cols - cfg.mines) {
          st.over = true;
          st.won = true;
          clearInterval(st.timer);
          faceEl.textContent = '😎';
          ctx.sfx.notify();
          for (const c of st.cells) {
            if (c.mine && !c.flag) { c.flag = true; c.el.textContent = '🚩'; }
          }
          st.flags = cfg.mines;
          updateLcd();
          setTimeout(() => {
            const best = ctx.settings.get('mineBest') || {};
            const key = Object.keys(LEVELS).find((k) => LEVELS[k] === cfg) || 'beginner';
            if (!best[key] || st.time < best[key]) { best[key] = st.time; ctx.settings.set('mineBest', best); }
            wm.msgBox({
              title: 'Minesweeper', iconName: 'info', width: 380,
              text: `You cleared the field in ${st.time} seconds!\n\nPlay again?`,
              buttons: ['Yes', 'No'],
            }).then((r) => { if (r === 'Yes') newGame(); });
          }, 320);
        }
      }

      faceEl.addEventListener('click', () => newGame());

      const mb = menuBar(body, [
        { label: 'Game', items: () => [
          { label: 'New', kbd: 'F2', action: () => newGame() },
          { sep: true },
          { label: 'Beginner', checked: cfg === LEVELS.beginner, action: () => newGame('beginner') },
          { label: 'Intermediate', checked: cfg === LEVELS.intermediate, action: () => newGame('intermediate') },
          { label: 'Expert', checked: cfg === LEVELS.expert, action: () => newGame('expert') },
          { sep: true },
          { label: 'Best Times…', action: () => {
            const b = ctx.settings.get('mineBest') || {};
            wm.alert(`Best Times\n\nBeginner: ${b.beginner ?? '—'} seconds\nIntermediate: ${b.intermediate ?? '—'} seconds\nExpert: ${b.expert ?? '—'} seconds`, 'Best Times');
          } },
          { sep: true },
          { label: 'Exit', action: () => win.close() },
        ] },
        { label: 'Help', items: () => [
          { label: 'How to play', action: () => wm.alert(
            'Minesweeper\n\nLeft-click to open a square. Right-click to place a flag.\n'
            + 'Numbers tell you how many mines touch that square.\n'
            + 'Open every safe square to win.', 'Minesweeper Help') },
          { label: 'About Minesweeper', action: () => ctx.openApp('about') },
        ] },
      ]);
      body.insertBefore(mb.el, body.firstChild);

      body.addEventListener('keydown', (e) => { if (e.key === 'F2') newGame(); e.stopPropagation(); });

      newGame();
      ctx.settings.set('mineLevel', level);
      win.setTitle('Minesweeper');
    },
  });
}

export default launch;
