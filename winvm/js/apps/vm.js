/* ============================================================
   vm.js — Virtual PC: a real x86 machine inside the window.
   v86 (WebAssembly) + SeaBIOS + a bundled KolibriOS floppy,
   or any floppy / ISO / hard-disk image you own.
   ============================================================ */

import { menuBar } from '../core/menu.js';
import { fmtBytes } from '../core/util.js';

const BUNDLED = { name: 'KolibriOS 0.7.7 (bundled floppy)', url: 'vendor/os/kolibrios.img', kind: 'fda' };

const DB_NAME = 'winxp-vm';
const STORE = 'images';

/* ---------------- tiny IndexedDB helper ---------------- */
function idb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(key, value) {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGet(key) {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(key) {
  const db = await idb();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve(true);
  });
}

const abs = (p) => new URL(p, document.baseURI).href;

export function launch(ctx, opts = {}) {
  const { wm } = ctx;

  wm.open({
    title: 'Virtual PC — KolibriOS',
    icon: 'vm',
    width: 1100, height: 860, minWidth: 520, minHeight: 400,
    appId: 'vm',
    singleton: 'vm',
    maximized: window.innerWidth < 1200,
    onMount: (body, win) => {
      body.classList.add('vmpc');
      body.innerHTML = `
        <div class="toolbar vm-toolbar">
          <button type="button" data-act="power" class="vm-power">⏻ <span>Power on</span></button>
          <button type="button" data-act="pause" disabled>⏸ <span>Pause</span></button>
          <button type="button" data-act="reset" disabled>⟲ <span>Reset</span></button>
          <div class="vsep"></div>
          <label style="display:flex;align-items:center;gap:6px;font-size:11px">
            Boot from
            <select class="field" data-media style="min-width:210px">
              <option value="bundled">KolibriOS 0.7.7 — bundled floppy</option>
              <option value="file">Your own floppy / ISO / disk image…</option>
              <option value="stored">Saved disk image in this browser</option>
            </select>
          </label>
          <button type="button" data-act="eject" disabled title="Eject media">⏏</button>
          <div class="vsep"></div>
          <button type="button" data-act="save">Save state</button>
          <button type="button" data-act="restore">Restore state</button>
          <div class="spacer"></div>
          <button type="button" data-act="scale" title="Fit / 1:1">Fit</button>
          <button type="button" data-act="fullscreen" title="Full screen">⛶</button>
          <input type="file" hidden accept=".img,.iso,.ima,.bin,.vhd,.raw" />
        </div>
        <div class="vm-stage">
          <div class="vm-screen" tabindex="0" aria-label="Virtual machine screen"></div>
          <div class="vm-splash">
            <div class="vm-logo">${ctx.icon('vm')}</div>
            <h1>Virtual PC</h1>
            <p>A real x86 computer, emulated in WebAssembly.</p>
            <p class="small">Bundled: <b>KolibriOS 0.7.7</b>, a tiny open-source operating system with a
            graphical desktop, a text editor, a hex editor, games and a shell — about 1.4&nbsp;MB in total.
            Boot takes a few seconds.</p>
            <button class="btn primary" data-act="power">⏻ Power on</button>
            <p class="small dim">Click the screen to hand the keyboard to the machine; <kbd>Esc</kbd> takes it back.</p>
            <p class="small dim">You can also boot a floppy, CD or hard-disk image of your own —
            including Windows 95/98 if you have the disc. Nothing is uploaded; the image stays in this tab.</p>
          </div>
        </div>
        <div class="statusbar">
          <span data-status style="flex:0 0 auto">Powered off</span>
          <span data-info>v86 · SeaBIOS · KolibriOS</span>
          <span data-media-info style="flex:0 0 auto"></span>
        </div>
        <div class="vm-drop"><span>Drop a disk image here to boot it</span></div>`;

      const $ = (s) => body.querySelector(s);
      const stage = $('.vm-stage');
      const screenEl = $('.vm-screen');
      const splash = $('.vm-splash');
      const statusEl = $('[data-status]');
      const infoEl = $('[data-info]');
      const mediaInfo = $('[data-media-info]');
      const powerBtn = body.querySelector('[data-act="power"]');
      const pauseBtn = body.querySelector('[data-act="pause"]');
      const resetBtn = body.querySelector('[data-act="reset"]');
      const ejectBtn = body.querySelector('[data-act="eject"]');
      const mediaSel = body.querySelector('[data-media]');
      const fileInput = body.querySelector('input[type=file]');
      const dropEl = $('.vm-drop');

      const st = {
        emu: null,
        V86: null,
        running: false,
        paused: false,
        media: { name: BUNDLED.name, source: 'bundled', kind: 'fda' },
        buffer: null,        // ArrayBuffer for a user-supplied image
        scale: 1,
        fit: true,
        capture: null,
        bootedAt: 0,
      };

      const setStatus = (text, info) => {
        statusEl.textContent = text;
        if (info != null) infoEl.textContent = info;
      };
      const setMediaLabel = () => {
        mediaInfo.textContent = st.media ? `FDD: ${st.media.name}` : 'no media';
      };

      function setBusy(busy, label) {
        powerBtn.disabled = busy;
        pauseBtn.disabled = !busy;
        resetBtn.disabled = !busy;
        ejectBtn.disabled = !busy;
        if (label) powerBtn.innerHTML = `⏻ <span>${label}</span>`;
      }

      /* ---------------- keyboard capture ----------------
         v86 listens on window, so it must be told when it may not take keys
         (otherwise typing in Notepad would also type into the virtual machine). */
      function setCapture(on) {
        if (st.capture === on) return;
        st.capture = on;
        screenEl.classList.toggle('captured', on);
        window.__vmCapture = on;
        try { st.emu?.keyboard_set_enabled?.(on); } catch (e) { /* ignore */ }
        try { st.emu?.mouse_set_enabled?.(on); } catch (e) { /* ignore */ }
        if (on) setStatus(st.paused ? 'Paused' : 'Running — keyboard captured', 'Esc releases the keyboard');
        else setStatus(st.paused ? 'Paused' : 'Running', 'click the screen to type into the machine');
      }
      window.__vmRelease = () => setCapture(false);

      screenEl.addEventListener('pointerdown', () => { if (st.emu) setCapture(true); });
      document.addEventListener('pointerdown', (e) => {
        if (!e.target.closest?.('.vm-screen')) setCapture(false);
      }, true);
      screenEl.addEventListener('blur', () => setCapture(false));

      /* ---------------- boot ---------------- */
      async function powerOn() {
        if (st.emu) return;
        splash.classList.add('hidden');
        setBusy(true, 'Starting…');
        setStatus('Starting the machine…', 'loading v86…');
        stage.classList.add('on');

        try {
          if (!st.V86) {
            const mod = await import(abs('vendor/v86/libv86.mjs'));
            st.V86 = mod.V86 || mod.default?.V86 || mod.default;
          }
        } catch (err) {
          setStatus('Could not load the emulator');
          splash.classList.remove('hidden');
          splash.innerHTML = `<div class="vm-error"><h1>Emulator failed to load</h1>
            <p><code>${String(err.message)}</code></p>
            <p>The v86 files live in <code>vendor/v86/</code>. If you copied only part of the project,
            that folder is missing.</p></div>`;
          setBusy(false, 'Power on');
          return;
        }

        let media = null;
        if (st.media?.source === 'bundled') media = { fda: { url: abs(BUNDLED.url) } };
        else if (st.buffer) {
          const arr = st.buffer.slice(0);
          if (st.media.kind === 'cdrom') media = { cdrom: { buffer: arr } };
          else if (st.media.kind === 'fda') media = { fda: { buffer: arr } };
          else media = { hda: { buffer: arr } };
        }
        if (!media) {
          setStatus('No boot media');
          splash.classList.remove('hidden');
          setBusy(false, 'Power on');
          return;
        }

        try {
          st.emu = new st.V86({
            wasm_path: abs('vendor/v86/v86.wasm'),
            memory_size: 64 * 1024 * 1024,
            vga_memory_size: 8 * 1024 * 1024,
            screen_container: screenEl,
            bios: { url: abs('vendor/bios/seabios.bin') },
            vga_bios: { url: abs('vendor/bios/vgabios.bin') },
            ...media,
            autostart: true,
            disable_speaker: false,
            disable_keyboard: false,
            disable_mouse: false,
          });
          st.running = true;
          st.paused = false;
          st.bootedAt = Date.now();
          setBusy(true, 'Running');
          setStatus('Running — booting…', 'v86 · SeaBIOS');
          setMediaLabel();
          screenEl.focus();
          st.capture = null;
          setCapture(true);

          const note = (msg) => { if (!st.emu) return; infoEl.textContent = msg; };
          for (const ev of ['emulator-ready', 'emulator-started']) {
            try { st.emu.add_listener(ev, () => note('v86 · SeaBIOS · running')); } catch (e) { /* ignore */ }
          }
          try {
            st.emu.add_listener('screen-set-size', (size) => {
              const [w, h] = Array.isArray(size) ? size : [];
              if (w && h) setStatus(`Running — ${w}×${h}`, 'v86 · SeaBIOS · running');
              applyScale();
            });
          } catch (e) { /* ignore */ }

          setTimeout(() => { if (st.emu) setStatus('Running', 'v86 · SeaBIOS · running'); }, 6000);
          applyScale();
        } catch (err) {
          st.emu = null;
          stage.classList.remove('on');
          splash.classList.remove('hidden');
          setStatus('Failed to start');
          wm.error(`The virtual machine could not start.\n\n${err.message}`, 'Virtual PC');
          setBusy(false, 'Power on');
        }
      }

      function powerOff({ keepMedia = true } = {}) {
        if (!st.emu) return;
        try { st.emu.destroy(); } catch (e) { /* ignore */ }
        st.emu = null;
        st.running = false;
        st.paused = false;
        st.capture = null;
        window.__vmCapture = false;
        screenEl.classList.remove('captured');
        screenEl.innerHTML = '';
        stage.classList.remove('on');
        splash.classList.remove('hidden');
        setBusy(false, 'Power on');
        setStatus('Powered off', 'v86 · SeaBIOS · KolibriOS');
        if (!keepMedia) { st.media = null; st.buffer = null; setMediaLabel(); }
      }

      /* ---------------- scaling ---------------- */
      function applyScale() {
        const canvas = screenEl.querySelector('canvas');
        if (!canvas) return;
        if (st.fit) {
          const availW = Math.max(200, stage.clientWidth - 16);
          const availH = Math.max(150, stage.clientHeight - 16);
          const w = canvas.width || 1024;
          const h = canvas.height || 768;
          const s = Math.min(availW / w, availH / h, 2);
          canvas.style.width = Math.round(w * s) + 'px';
          canvas.style.height = Math.round(h * s) + 'px';
        } else {
          canvas.style.width = '';
          canvas.style.height = '';
        }
      }
      const onResize = () => applyScale();
      window.addEventListener('resize', onResize);

      /* ---------------- media ---------------- */
      async function pickFile() {
        fileInput.click();
      }

      fileInput.addEventListener('change', async () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        await loadImageFile(file);
        fileInput.value = '';
      });

      async function loadImageFile(file) {
        if (st.emu) {
          const ok = await wm.confirm('The machine is running. Power it off and boot the new image?', 'Virtual PC');
          if (!ok) return;
          powerOff();
        }
        const buf = await file.arrayBuffer();
        const ext = file.name.split('.').pop().toLowerCase();
        let kind = 'hda';
        if (ext === 'iso') kind = 'cdrom';
        else if (buf.byteLength === 1474560 || buf.byteLength === 737280 || ext === 'ima') kind = 'fda';
        st.buffer = buf;
        st.media = { name: file.name, source: 'file', kind };
        mediaSel.value = 'file';
        setMediaLabel();
        setStatus(`Powered off — ${file.name} (${fmtBytes(buf.byteLength)})`, `${kind === 'cdrom' ? 'CD-ROM' : kind === 'fda' ? 'Floppy' : 'Hard disk'} image loaded`);
        try { await idbPut('user-image', { name: file.name, kind, buffer: buf }); } catch (e) { /* quota */ }
      }

      mediaSel.addEventListener('change', async () => {
        const v = mediaSel.value;
        if (v === 'bundled') {
          st.media = { name: BUNDLED.name, source: 'bundled', kind: 'fda' };
          st.buffer = null;
          setMediaLabel();
          setStatus('Powered off', 'Floppy: KolibriOS 0.7.7');
        } else if (v === 'file') {
          pickFile();
        } else if (v === 'stored') {
          try {
            const rec = await idbGet('user-image');
            if (!rec) {
              wm.alert('No saved disk image yet.\n\nChoose “Your own floppy / ISO / disk image…” once and it will be remembered here.', 'Virtual PC');
              mediaSel.value = 'bundled';
              return;
            }
            st.buffer = rec.buffer;
            st.media = { name: rec.name, source: 'file', kind: rec.kind };
            setMediaLabel();
            setStatus(`Powered off — ${rec.name} (${fmtBytes(rec.buffer.byteLength)})`, 'restored from this browser');
          } catch (e) {
            wm.error(e.message, 'Virtual PC');
          }
        }
      });

      /* drag & drop a disk image */
      ['dragenter', 'dragover'].forEach((ev) => stage.addEventListener(ev, (e) => {
        e.preventDefault();
        dropEl.classList.add('show');
      }));
      ['dragleave', 'drop'].forEach((ev) => stage.addEventListener(ev, (e) => {
        e.preventDefault();
        if (ev === 'drop' && e.dataTransfer?.files?.[0]) loadImageFile(e.dataTransfer.files[0]);
        dropEl.classList.remove('show');
      }));

      /* ---------------- state save / restore ---------------- */
      async function saveState() {
        if (!st.emu) return wm.alert('Power the machine on first.', 'Virtual PC');
        setStatus('Saving machine state…');
        try {
          const buf = await st.emu.save_state();
          await idbPut('state', { buffer: buf, media: st.media?.name, at: Date.now() });
          setStatus('Machine state saved', `resume any time (${fmtBytes(buf.byteLength)})`);
          ctx.sfx.notify();
        } catch (e) {
          setStatus('Save failed');
          wm.error(`Could not save the machine state.\n\n${e.message}`, 'Virtual PC');
        }
      }

      async function restoreState() {
        if (!st.emu) await powerOn();
        if (!st.emu) return;
        try {
          const rec = await idbGet('state');
          if (!rec) return wm.alert('No saved state yet.', 'Virtual PC');
          setStatus('Restoring machine state…');
          await st.emu.restore_state(rec.buffer);
          setStatus('Machine state restored', 'resumed');
        } catch (e) {
          wm.error(`Could not restore the state.\n\n${e.message}`, 'Virtual PC');
        }
      }

      /* ---------------- controls ---------------- */
      body.addEventListener('click', (e) => {
        const b = e.target.closest('[data-act]');
        if (!b) return;
        const a = b.dataset.act;
        if (a === 'power') powerOn();
        else if (a === 'pause') {
          if (!st.emu) return;
          st.paused = !st.paused;
          try { st.paused ? st.emu.stop() : st.emu.run(); } catch (err) { /* ignore */ }
          b.innerHTML = st.paused ? '▶ <span>Resume</span>' : '⏸ <span>Pause</span>';
          setStatus(st.paused ? 'Paused' : 'Running');
        } else if (a === 'reset') {
          if (!st.emu) return;
          try { st.emu.restart(); setStatus('Reset', 'booting again'); } catch (err) { powerOff(); powerOn(); }
        } else if (a === 'eject') {
          powerOff({ keepMedia: false });
          mediaSel.value = 'bundled';
          st.media = { name: BUNDLED.name, source: 'bundled', kind: 'fda' };
          setMediaLabel();
          setStatus('Media ejected', 'KolibriOS floppy selected');
        } else if (a === 'save') saveState();
        else if (a === 'restore') restoreState();
        else if (a === 'scale') {
          st.fit = !st.fit;
          b.textContent = st.fit ? 'Fit' : '1:1';
          applyScale();
        } else if (a === 'fullscreen') {
          if (document.fullscreenElement) document.exitFullscreen?.();
          else stage.requestFullscreen?.().catch(() => {});
        }
      });

      mediaSel.addEventListener('keydown', (e) => e.stopPropagation());

      menuBar(body, [
        { label: 'Machine', items: () => [
          { label: st.emu ? 'Power off' : 'Power on', action: () => (st.emu ? powerOff() : powerOn()) },
          { label: 'Reset', disabled: !st.emu, action: () => { try { st.emu.restart(); } catch (e) { powerOff(); powerOn(); } } },
          { label: st.paused ? 'Resume' : 'Pause', disabled: !st.emu, action: () => { if (st.emu) { st.paused ? st.emu.run() : st.emu.stop(); st.paused = !st.paused; } } },
          { sep: true },
          { label: 'Save machine state…', disabled: !st.emu, action: saveState },
          { label: 'Restore machine state…', action: restoreState },
          { sep: true },
          { label: 'Close', action: () => win.close() },
        ] },
        { label: 'Media', items: () => [
          { label: 'KolibriOS 0.7.7 floppy', checked: st.media?.source === 'bundled', action: () => { mediaSel.value = 'bundled'; mediaSel.dispatchEvent(new Event('change')); } },
          { label: 'Insert disk image…', action: pickFile },
          { label: 'Saved disk image in this browser', action: () => { mediaSel.value = 'stored'; mediaSel.dispatchEvent(new Event('change')); } },
          { sep: true },
          { label: 'Eject', disabled: !st.emu, action: () => { powerOff({ keepMedia: false }); } },
        ] },
        { label: 'View', items: () => [
          { label: 'Fit to window', kbd: 'F', checked: st.fit, action: () => { st.fit = true; applyScale(); } },
          { label: 'Actual size', checked: !st.fit, action: () => { st.fit = false; applyScale(); } },
          { sep: true },
          { label: 'Full screen', action: () => stage.requestFullscreen?.().catch(() => {}) },
        ] },
        { label: 'Help', items: () => [
          { label: 'About Virtual PC', action: () => wm.alert(
            'Virtual PC\n\nA real x86 PC emulated by v86 (WebAssembly): SeaBIOS, a VGA card, a PS/2 keyboard and mouse, '
            + 'a floppy controller and an IDE controller.\n\n'
            + 'Bundled OS: KolibriOS 0.7.7 (open source, GPLv2) — a complete graphical OS in 1.4 MB.\n\n'
            + 'You can boot your own floppy (.img/.ima), CD (.iso) or hard disk image; it stays in this tab and can be '
            + 'saved to this browser so installed programs persist.\n\n'
            + 'v86 is BSD-2-Clause, SeaBIOS and VGABIOS are LGPL. See vendor/NOTICE.md.', 'About Virtual PC') },
        ] },
      ]);

      const bar = body.querySelector('.menubar');
      if (bar) body.insertBefore(bar, body.firstChild);

      win.onClose(() => {
        window.removeEventListener('resize', onResize);
        if (st.emu) { try { st.emu.destroy(); } catch (e) { /* ignore */ } }
        return true;
      });

      setMediaLabel();
      setStatus('Powered off', 'Floppy: KolibriOS 0.7.7');
      if (opts.power) setTimeout(() => powerOn(), 250);
    },
  });
}

export default launch;
