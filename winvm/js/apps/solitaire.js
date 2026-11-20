/* ============================================================
   solitaire.js — Klondike Solitaire (click a card, then a target)
   ============================================================ */

import { menuBar } from '../core/menu.js';

const SUITS = ['♠', '♥', '♦', '♣'];
const RED = new Set(['♥', '♦']);
const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const clone = (s) => JSON.parse(JSON.stringify(s));

function freshDeck() {
  const deck = [];
  for (const s of SUITS) for (let r = 1; r <= 13; r++) deck.push({ suit: s, rank: r, up: false });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function launch(ctx) {
  const { wm } = ctx;

  wm.open({
    title: 'Solitaire',
    icon: 'cards',
    width: 590, height: 480, minWidth: 540, minHeight: 400,
    appId: 'solitaire',
    singleton: 'solitaire',
    onMount: (body, win) => {
      body.innerHTML = '<div class="sol"><div class="sol-top"></div><div class="sol-tab"></div></div>';
      const sol = body.querySelector('.sol');
      const top = body.querySelector('.sol-top');
      const tab = body.querySelector('.sol-tab');

      const state = { stock: [], waste: [], found: { '♠': [], '♥': [], '♦': [], '♣': [] }, cols: [[], [], [], [], [], [], []] };
      let sel = null;         // {from:'waste'|'col'|'found', col, index}
      let undoStack = [];
      let moves = 0;
      let seconds = 0;
      let timer = null;

      function newGame() {
        const deck = freshDeck();
        state.stock = [];
        state.waste = [];
        state.found = { '♠': [], '♥': [], '♦': [], '♣': [] };
        state.cols = [[], [], [], [], [], [], []];
        for (let c = 0; c < 7; c++) {
          for (let i = 0; i <= c; i++) {
            const card = deck.pop();
            card.up = i === c;
            state.cols[c].push(card);
          }
        }
        while (deck.length) {
          const card = deck.pop();
          card.up = false;
          state.stock.push(card);
        }
        sel = null;
        undoStack = [];
        moves = 0;
        seconds = 0;
        clearInterval(timer);
        timer = null;
        render();
      }

      function snapshot() {
        undoStack.push({ ...clone(state), moves });
        if (undoStack.length > 40) undoStack.shift();
      }

      function startClock() {
        if (timer) return;
        timer = setInterval(() => { seconds++; }, 1000);
      }

      const cardEl = (card, opts = {}) => {
        const d = document.createElement('div');
        d.className = 'card ' + (card.up ? (RED.has(card.suit) ? 'red' : 'black') : 'back');
        if (card.up) {
          d.innerHTML = `
            <div class="corner"><span>${RANKS[card.rank]}</span><span class="suit">${card.suit}</span></div>
            <div class="pip">${card.suit}</div>
            <div class="corner br"><span>${RANKS[card.rank]}</span><span class="suit">${card.suit}</span></div>`;
          if (opts.movable) d.classList.add('movable');
          if (opts.selected) { d.classList.add('sel'); d.style.zIndex = 60; }
        }
        d.style.top = (opts.top || 0) + 'px';
        d.style.position = 'absolute';
        d.style.left = '0';
        return d;
      };

      function render() {
        // ---- top row ----
        top.innerHTML = '';
        const stockSlot = document.createElement('div');
        stockSlot.className = 'sol-slot';
        stockSlot.title = 'Click to deal a card';
        if (state.stock.length) {
          const back = cardEl({ suit: '♠', rank: 1, up: false });
          back.style.position = 'absolute';
          back.style.top = '0';
          stockSlot.appendChild(back);
        } else {
          stockSlot.style.borderStyle = 'solid';
          stockSlot.innerHTML = '<div style="position:absolute;inset:0;display:grid;place-items:center;color:#ffffffaa;font-size:20px">↻</div>';
        }
        stockSlot.addEventListener('click', deal);
        top.appendChild(stockSlot);

        const wasteSlot = document.createElement('div');
        wasteSlot.className = 'sol-slot';
        wasteSlot.style.marginRight = 'auto';
        const topWaste = state.waste[state.waste.length - 1];
        if (topWaste) {
          const c = cardEl(topWaste, { movable: true, selected: sel?.from === 'waste' });
          c.addEventListener('click', (e) => { e.stopPropagation(); selectWaste(); });
          c.addEventListener('dblclick', (e) => { e.stopPropagation(); autoToFoundation('waste'); });
          wasteSlot.appendChild(c);
        }
        top.appendChild(wasteSlot);

        for (const s of SUITS) {
          const slot = document.createElement('div');
          slot.className = 'sol-slot foundation';
          slot.innerHTML = `<div style="position:absolute;inset:0;display:grid;place-items:center;color:#ffffff88;font-size:24px">${s}</div>`;
          const pile = state.found[s];
          if (pile.length) {
            const c = cardEl(pile[pile.length - 1]);
            c.style.position = 'absolute';
            c.style.top = '0';
            slot.appendChild(c);
          }
          slot.addEventListener('click', (e) => { e.stopPropagation(); dropTo('found', s); });
          top.appendChild(slot);
        }

        // ---- tableau ----
        tab.innerHTML = '';
        state.cols.forEach((pile, ci) => {
          const col = document.createElement('div');
          col.className = 'sol-col';
          col.style.minHeight = '120px';
          col.dataset.col = ci;
          col.addEventListener('click', (e) => { e.stopPropagation(); dropTo('col', ci); });
          pile.forEach((card, i) => {
            const selected = sel && sel.from === 'col' && sel.col === ci && i >= sel.index;
            const c = cardEl(card, { top: offsetFor(pile, i), movable: card.up, selected });
            if (card.up) {
              c.addEventListener('click', (e) => { e.stopPropagation(); pickFromCol(ci, i); });
              c.addEventListener('dblclick', (e) => { e.stopPropagation(); autoToFoundation('col', ci, i); });
            }
            col.appendChild(c);
          });
          if (!pile.length) {
            col.innerHTML = '<div class="sol-slot" style="position:absolute;inset:0 0 auto 0;height:90px"></div>';
            const inner = col.firstElementChild;
            inner.addEventListener('click', (e) => { e.stopPropagation(); dropTo('col', ci); });
          }
          tab.appendChild(col);
        });

        win.setTitle(`Solitaire — ${moves} moves, ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`);
      }

      function offsetFor(pile, index) {
        let y = 0;
        for (let i = 0; i < index; i++) y += pile[i].up ? 20 : 8;
        return y;
      }

      function deal() {
        snapshot();
        if (!state.stock.length) {
          if (!state.waste.length) return;
          state.stock = state.waste.reverse().map((c) => ({ ...c, up: false }));
          state.waste = [];
        } else {
          const card = state.stock.pop();
          card.up = true;
          state.waste.push(card);
          moves++;
        }
        startClock();
        sel = null;
        ctx.sfx.tick();
        render();
      }

      function selectWaste() {
        if (!state.waste.length) return;
        if (sel?.from === 'waste') { sel = null; render(); return; }
        sel = { from: 'waste' };
        render();
      }

      function pickFromCol(ci, i) {
        const card = state.cols[ci][i];
        if (!card.up) return;
        if (sel?.from === 'col' && sel.col === ci && sel.index === i) { sel = null; render(); return; }
        sel = { from: 'col', col: ci, index: i };
        render();
      }

      function canStack(card, onto) {
        const redCard = RED.has(card.suit);
        const redOnto = RED.has(onto.suit);
        return card.rank === onto.rank - 1 && redCard !== redOnto;
      }

      function validToCol(cards, ci) {
        const pile = state.cols[ci];
        if (!pile.length) return cards[0].rank === 13;
        const last = pile[pile.length - 1];
        return last.up && canStack(cards[0], last);
      }

      function tryMove(dest, key) {
        if (!sel) return false;
        let cards = [];
        if (sel.from === 'waste') {
          cards = [state.waste[state.waste.length - 1]];
        } else if (sel.from === 'col') {
          cards = state.cols[sel.col].slice(sel.index);
        } else {
          return false;
        }
        if (!cards.length || !cards.every((c) => c.up)) return false;

        if (dest === 'col') {
          if (sel.from === 'col' && sel.col === key) return false;
          if (!validToCol(cards, key)) return false;
          snapshot();
          if (sel.from === 'waste') state.waste.pop();
          else {
            state.cols[sel.col].splice(sel.index);
            flipTop(sel.col);
          }
          state.cols[key].push(...cards);
        } else if (dest === 'found') {
          if (cards.length !== 1) return false;
          const card = cards[0];
          if (card.suit !== key) return false;
          const pile = state.found[key];
          const ok = pile.length ? (card.rank === pile[pile.length - 1].rank + 1) : card.rank === 1;
          if (!ok) return false;
          snapshot();
          if (sel.from === 'waste') state.waste.pop();
          else { state.cols[sel.col].splice(sel.index); flipTop(sel.col); }
          state.found[key].push(card);
        }
        moves++;
        sel = null;
        ctx.sfx.click();
        render();
        checkWin();
        return true;
      }

      function flipTop(ci) {
        const pile = state.cols[ci];
        const last = pile[pile.length - 1];
        if (last && !last.up) last.up = true;
      }

      function dropTo(kind, key) { tryMove(kind, key); }

      function autoToFoundation(from, ci, i) {
        if (from === 'waste') {
          const card = state.waste[state.waste.length - 1];
          if (!card) return;
          sel = { from: 'waste' };
          tryMove('found', card.suit);
        } else {
          const card = state.cols[ci][i];
          if (!card || !card.up) return;
          sel = { from: 'col', col: ci, index: i };
          tryMove('found', card.suit);
        }
      }

      function checkWin() {
        const total = SUITS.reduce((n, s) => n + state.found[s].length, 0);
        if (total === 52) {
          clearInterval(timer);
          ctx.sfx.startup();
          wm.msgBox({
            title: 'Solitaire', iconName: 'star', width: 400,
            text: `Congratulations, you won!\n\nMoves: ${moves}\nTime: ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}\n\nDeal again?`,
            buttons: ['Yes', 'No'],
          }).then((r) => { if (r === 'Yes') newGame(); });
        }
      }

      sol.addEventListener('click', () => { if (sel) { sel = null; render(); } });

      const mb = menuBar(body, [
        { label: 'Game', items: () => [
          { label: 'Deal', kbd: 'F2', action: newGame },
          { label: 'Undo', kbd: 'Ctrl+Z', action: () => {
            const prev = undoStack.pop();
            if (!prev) return;
            Object.assign(state, prev);
            moves = prev.moves;
            sel = null;
            render();
          } },
          { sep: true },
          { label: 'Exit', action: () => win.close() },
        ] },
        { label: 'Help', items: () => [
          { label: 'How to play', action: () => wm.alert(
            'Klondike Solitaire\n\nClick the deck to turn a card.\n'
            + 'Click a card to pick it up, then click where it should go.\n'
            + 'Double-click a card to send it to its foundation.\n'
            + 'Build the four foundations from Ace to King.\n'
            + 'On the tableau, stack descending cards of alternating colours.', 'Solitaire Help') },
          { label: 'About Solitaire', action: () => ctx.openApp('about') },
        ] },
      ]);
      body.insertBefore(mb.el, body.firstChild);

      body.addEventListener('keydown', (e) => {
        if (e.key === 'F2') newGame();
        if (e.key === 'Escape') { sel = null; render(); }
        e.stopPropagation();
      });

      win.onClose(() => { clearInterval(timer); return true; });
      newGame();
    },
  });
}

export default launch;
