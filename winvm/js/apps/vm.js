/* ============================================================
   vm.js — Virtual PC: a real x86 machine inside the window.
   v86 (WebAssembly) + SeaBIOS. Bundled: KolibriOS 0.7.7.
   Also: install your own 32-bit Windows (95/98/2000/XP) from an
   ISO, on a hard-disk image that survives a reload.
   ============================================================ */

import { menuBar } from '../core/menu.js';
import { fmtBytes } from '../core/util.js';

const KOLIBRI = { name: 'KolibriOS 0.7.7 (bundled floppy)', url: 'vendor/os/kolibrios.img', kind: 'fda' };

const BOOT = {
  cdrom: 291,     // 0x123 — SeaBIOS tries the CD first (v86's default)
  hdd: 786,       // 0x312
  floppy: 801,    // 0x321
};

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
    tx.onabort = () => reject(tx.error || new Error('storage aborted (quota?)'));
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
    tx.onerror = () => resolve(true);
  });
}

const abs = (p) => new URL(p, document.baseURI).href;
const MB = 1024 * 1024;

export function launch(ctx, opts = {}) {
  const { wm } = ctx;

  wm.open({
    title: 'Virtual PC',
    icon: 'vm',
    width: 1100, height: 880, minWidth: 520, minHeight: 420,
    appId: 'vm',
    singleton: 'vm',
    maximized: window.innerWidth < 1280,
    onMount: (body, win) => {
      body.classList.add('vmpc');
      body.innerHTML = `
        <div class="toolbar vm-toolbar">
          <button type="button" data-act="power" class="vm-power">⏻ <span>Power on</span></button>
          <button type="button" data-act="pause" disabled>⏸ <span>Pause</span></button>
          <button type="button" data-act="reset" disabled>⟲ <span>Reset</span></button>
          <div class="vsep"></div>
          <button type="button" data-act="cd" title="Insert a CD (ISO image)">💿 <span>CD</span></button>
          <button type="button" data-act="hdd" title="Create or attach a hard disk">🗄 <span>Disk</span></button>
          <div class="spacer"></div>
          <button type="button" data-act="scale" title="Fit / 1:1">Fit</button>
          <button type="button" data-act="fullscreen" title="Full screen">⛶</button>
          <input type="file" hidden accept=".img,.iso,.ima,.bin,.vhd,.raw" data-file="disk">
          <input type="file" hidden accept=".iso,.img,.bin,.raw" data-file="cd">
          <input type="file" hidden accept=".img,.ima,.iso,.bin,.raw,.vhd" data-file="floppy">
        </div>

        <div class="vm-devices">
          <button type="button" class="vm-chip" data-act="cd"><b>CD</b><span data-dev="cd">empty</span></button>
          <button type="button" class="vm-chip" data-act="hdd"><b>Disk</b><span data-dev="hdd">none</span></button>
          <button type="button" class="vm-chip" data-act="floppy"><b>Floppy</b><span data-dev="fdd">KolibriOS</span></button>
          <button type="button" class="vm-chip" data-act="boot"><b>Boot</b><span data-dev="boot">CD first</span></button>
          <button type="button" class="vm-chip" data-act="memory"><b>RAM</b><span data-dev="ram">128 MB</span></button>
          <span class="vm-storage" data-storage></span>
        </div>

        <div class="vm-stage">
          <div class="vm-screen" tabindex="0" aria-label="Virtual machine screen"></div>
          <div class="vm-splash">
            <div class="vm-logo">${ctx.icon('vm')}</div>
            <h1>Virtual PC</h1>
            <p>A real x86 computer, emulated in WebAssembly — SeaBIOS, a VGA card, IDE, a floppy
            controller and a Sound Blaster.</p>
            <div class="vm-choices">
              <button class="vm-choice" data-act="kolibri">
                <span class="vm-choice-icon">🐧</span>
                <b>Boot KolibriOS</b>
                <i>The bundled 1.4 MB open-source OS. Desktop in a few seconds.</i>
              </button>
              <button class="vm-choice" data-act="windows">
                <span class="vm-choice-icon">🪟</span>
                <b>Install Windows from an ISO</b>
                <i>Windows 95, 98, ME, NT 4.0, 2000 or XP (32-bit). You supply the disc image.</i>
              </button>
            </div>
            <p class="small dim">Click the screen to give the machine the keyboard; <kbd>Esc</kbd> takes it back.
            Nothing is uploaded — images stay in this tab (and, for the hard disk, in this browser).</p>
          </div>
        </div>

        <div class="statusbar">
          <span data-status style="flex:0 0 auto">Powered off</span>
          <span data-info>v86 · SeaBIOS</span>
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
      const storageEl = $('[data-storage]');
      const powerBtn = body.querySelector('[data-act="power"]');
      const pauseBtn = body.querySelector('[data-act="pause"]');
      const resetBtn = body.querySelector('[data-act="reset"]');
      const fileDisk = body.querySelector('[data-file="disk"]');
      const fileCd = body.querySelector('[data-file="cd"]');
      const fileFloppy = body.querySelector('[data-file="floppy"]');

      const st = {
        emu: null,
        V86: null,
        paused: false,
        capture: null,
        fit: true,
        bootOrder: 'cdrom',
        memory: 128,                     // MB
        cd: null,                        // { name, buffer }
        hdd: null,                       // { name, buffer, size }
        fdd: { name: KOLIBRI.name, url: abs(KOLIBRI.url) },
        dirty: false,
        saving: false,
      };

      const setStatus = (text, info) => {
        statusEl.textContent = text;
        if (info != null) infoEl.textContent = info;
      };
      const running = () => !!st.emu;

      function refreshChips() {
        body.querySelector('[data-dev="cd"]').textContent = st.cd ? st.cd.name : 'empty';
        body.querySelector('[data-dev="hdd"]').textContent = st.hdd
          ? `${Math.round(st.hdd.buffer.byteLength / MB)} MB${st.dirty ? ' •' : ''}`
          : 'none';
        body.querySelector('[data-dev="fdd"]').textContent = st.fdd ? (st.fdd.url ? 'KolibriOS' : st.fdd.name) : 'empty';
        body.querySelector('[data-dev="boot"]').textContent = ({ cdrom: 'CD first', hdd: 'Disk first', floppy: 'Floppy first' })[st.bootOrder];
        body.querySelector('[data-dev="ram"]').textContent = `${st.memory} MB`;
        mediaInfo.textContent = st.hdd ? `${st.cd ? 'CD + ' : ''}HDD ${Math.round(st.hdd.buffer.byteLength / MB)} MB` : (st.fdd ? 'FDD' : '');
        refreshStorage();
      }

      async function refreshStorage() {
        try {
          const est = await navigator.storage?.estimate?.();
          if (est?.usage != null) {
            storageEl.textContent = `browser storage: ${fmtBytes(est.usage)}${est.quota ? ' of ' + fmtBytes(est.quota) : ''}`;
            return;
          }
        } catch (e) { /* ignore */ }
        storageEl.textContent = '';
      }

      function setBusy(busy, label) {
        powerBtn.disabled = busy;
        pauseBtn.disabled = !busy;
        resetBtn.disabled = !busy;
        if (label) powerBtn.innerHTML = `⏻ <span>${label}</span>`;
      }

      /* ---------------- capture ---------------- */
      function setCapture(on) {
        if (st.capture === on) return;
        st.capture = on;
        screenEl.classList.toggle('captured', on);
        window.__vmCapture = on;
        try { st.emu?.keyboard_set_enabled?.(on); } catch (e) { /* ignore */ }
        try { st.emu?.mouse_set_enabled?.(on); } catch (e) { /* ignore */ }
        if (running()) {
          setStatus(on ? (st.paused ? 'Paused' : 'Running — keyboard captured') : (st.paused ? 'Paused' : 'Running'),
            on ? 'Esc releases the keyboard' : 'click the screen to type into the machine');
        }
      }
      window.__vmRelease = () => setCapture(false);
      screenEl.addEventListener('pointerdown', () => { if (running()) setCapture(true); });
      screenEl.addEventListener('blur', () => setCapture(false));
      document.addEventListener('pointerdown', (e) => {
        if (!e.target.closest?.('.vm-screen')) setCapture(false);
      }, true);

      /* ---------------- media ---------------- */
      const kick = (which) => ({ cd: fileCd, disk: fileDisk, floppy: fileFloppy }[which]?.click());

      async function insertCd(file) {
        if (running()) {
          const ok = await wm.confirm('The machine is running. Power it off and insert the CD?', 'Virtual PC');
          if (!ok) return;
          await powerOff();
        }
        const buffer = await file.arrayBuffer();
        st.cd = { name: file.name, buffer };
        st.bootOrder = 'cdrom';
        refreshChips();
        setStatus(`Powered off — CD: ${file.name} (${fmtBytes(buffer.byteLength)})`, 'Boot order: CD first');
        if (buffer.byteLength < 900 * MB) {
          try { await idbPut('cdrom', { name: file.name, buffer }); } catch (e) { /* session only */ }
        }
      }

      async function insertFloppy(file) {
        if (running()) {
          const ok = await wm.confirm('The machine is running. Power it off and insert the floppy?', 'Virtual PC');
          if (!ok) return;
          await powerOff();
        }
        const buffer = await file.arrayBuffer();
        st.fdd = { name: file.name, buffer };
        refreshChips();
        setStatus(`Powered off — floppy: ${file.name}`, '');
      }

      async function attachDisk(file) {
        if (running()) {
          const ok = await wm.confirm('The machine is running. Power it off and attach this disk?', 'Virtual PC');
          if (!ok) return;
          await powerOff();
        }
        const buffer = await file.arrayBuffer();
        st.hdd = { name: file.name, buffer };
        st.dirty = false;
        refreshChips();
        setStatus(`Powered off — disk: ${file.name} (${fmtBytes(buffer.byteLength)})`, 'changes are not saved until you save');
      }

      async function createDisk() {
        const pick = await wm.msgBox({
          title: 'Create a hard disk',
          iconName: 'question',
          width: 460,
          text: 'How large should the new hard-disk image be?\n\n'
            + 'Windows 95/98 need about 300 MB, Windows 2000 about 1 GB, Windows XP about 2 GB.\n'
            + 'The whole image lives in this tab\'s memory, so keep it modest on a Chromebook.',
          buttons: ['256 MB', '512 MB', '1 GB', '2 GB', 'Cancel'],
        });
        const size = { '256 MB': 256, '512 MB': 512, '1 GB': 1024, '2 GB': 2048 }[pick];
        if (!size) return;
        if (running()) await powerOff();
        setStatus(`Creating a ${size} MB disk…`);
        await new Promise((r) => setTimeout(r, 30));
        try {
          const buffer = new ArrayBuffer(size * MB);
          st.hdd = { name: `disk-${size}mb.img`, buffer };
          st.dirty = true;
          st.bootOrder = 'cdrom';
          refreshChips();
          setStatus(`Blank ${size} MB disk ready`, 'boot from the CD to install');
          ctx.sfx.notify();
        } catch (err) {
          wm.error(`Could not allocate ${size} MB.\n\n${err.message}`, 'Virtual PC');
          setStatus('Powered off');
        }
      }

      async function ejectAll() {
        if (running()) await powerOff();
        st.cd = null;
        st.hdd = null;
        st.fdd = { name: KOLIBRI.name, url: abs(KOLIBRI.url) };
        st.dirty = false;
        refreshChips();
        setStatus('Media ejected', 'bundled KolibriOS floppy selected');
      }

      /* ---------------- persistence ---------------- */
      function liveDiskBuffer() {
        // v86 writes straight into the ArrayBuffer it was handed (no copy-on-write layer),
        // so the buffer we passed in *is* the disk: reading it back gives the installed system.
        return st.hdd?.buffer || st.emu?.hda?.buffer || null;
      }

      async function saveDisk({ quiet = false } = {}) {
        const buf = liveDiskBuffer();
        if (!buf) { if (!quiet) wm.alert('There is no hard disk attached.', 'Virtual PC'); return; }
        if (st.saving) return;
        st.saving = true;
        const before = statusEl.textContent;
        setStatus(`Saving the ${Math.round(buf.byteLength / MB)} MB disk…`, 'IndexedDB');
        try {
          await idbPut('hdd', { name: st.hdd?.name || 'disk.img', buffer: buf, size: buf.byteLength });
          st.dirty = false;
          refreshChips();
          setStatus('Hard disk saved', `${fmtBytes(buf.byteLength)} in this browser`);
          if (!quiet) ctx.sfx.notify();
        } catch (err) {
          setStatus(before);
          if (!quiet) wm.error(`The disk could not be saved.\n\n${err.message}\n\n`
            + 'Browsers cap storage per site; try a smaller disk, or export the image to a file instead.', 'Virtual PC');
        } finally {
          st.saving = false;
        }
      }

      async function exportDisk() {
        const buf = liveDiskBuffer();
        if (!buf) return wm.alert('There is no hard disk attached.', 'Virtual PC');
        const blob = new Blob([buf], { type: 'application/octet-stream' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = st.hdd?.name || 'disk.img';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 30000);
        setStatus('Disk exported to your downloads', fmtBytes(blob.size));
      }

      async function forgetDisk() {
        const ok = await wm.confirm('Delete the hard disk saved in this browser?\n\n'
          + 'The image inside the running machine is untouched until you reload.', 'Virtual PC');
        if (!ok) return;
        await idbDelete('hdd');
        await idbDelete('cdrom');
        await idbDelete('state');
        setStatus('Saved disk deleted', '');
        ctx.sfx.notify();
        refreshStorage();
      }

      async function saveState() {
        if (!running()) return wm.alert('Power the machine on first.', 'Virtual PC');
        setStatus('Saving machine state…', 'RAM + devices');
        try {
          const buf = await st.emu.save_state();
          await idbPut('state', { buffer: buf, at: Date.now(), memory: st.memory, boot: st.bootOrder });
          setStatus('Machine state saved', `resume any time (${fmtBytes(buf.byteLength)})`);
          ctx.sfx.notify();
        } catch (e) {
          setStatus('Save failed');
          wm.error(`Could not save the machine state.\n\n${e.message}`, 'Virtual PC');
        }
      }

      async function restoreState() {
        const rec = await idbGet('state').catch(() => null);
        if (!rec?.buffer) return wm.alert('No saved state yet.', 'Virtual PC');
        if (!running()) {
          await powerOn();
          await new Promise((r) => setTimeout(r, 800));
        }
        if (!running()) return;
        setStatus('Restoring machine state…', `${fmtBytes(rec.buffer.byteLength)}`);
        try {
          await st.emu.restore_state(rec.buffer);
          st.paused = false;
          setStatus('Machine state restored', 'resumed');
          ctx.sfx.notify();
        } catch (err) {
          wm.error(`Could not restore the state.\n\n${err.message}\n\n`
            + 'A saved state only fits the machine it came from: same RAM, same devices.', 'Virtual PC');
          setStatus('Restore failed');
        }
      }

      /* ---------------- power ---------------- */
      async function loadEmulator() {
        if (st.V86) return st.V86;
        const mod = await import(abs('vendor/v86/libv86.mjs'));
        st.V86 = mod.V86 || mod.default?.V86 || mod.default;
        return st.V86;
      }

      function failure(err) {
        setStatus('Could not start');
        stage.classList.remove('on');
        splash.classList.remove('hidden');
        splash.innerHTML = `<div class="vm-error"><h1>The machine could not start</h1>
          <p><code>${String(err.message || err)}</code></p>
          <p>Most often this is memory: a large disk plus 128 MB of RAM has to fit in one tab.
          Try a smaller disk or less RAM.</p>
          <p><button class="btn" data-act="power">Try again</button></p></div>`;
        setBusy(false, 'Power on');
      }

      async function powerOn() {
        if (running()) return;
        splash.classList.add('hidden');
        stage.classList.add('on');
        setBusy(true, 'Starting…');
        setStatus('Starting the machine…', 'loading v86…');
        let V86;
        try {
          V86 = await loadEmulator();
        } catch (err) {
          stage.classList.remove('on');
          splash.classList.remove('hidden');
          splash.innerHTML = `<div class="vm-error"><h1>Emulator failed to load</h1>
            <p><code>${String(err.message)}</code></p>
            <p>The v86 files live in <code>vendor/v86/</code>; if you copied only part of the project, that
            folder is missing.</p></div>`;
          setBusy(false, 'Power on');
          return;
        }

        const options = {
          wasm_path: abs('vendor/v86/v86.wasm'),
          memory_size: st.memory * MB,
          vga_memory_size: 8 * MB,
          screen_container: screenEl,
          bios: { url: abs('vendor/bios/seabios.bin') },
          vga_bios: { url: abs('vendor/bios/vgabios.bin') },
          boot_order: BOOT[st.bootOrder] || BOOT.cdrom,
          autostart: true,
          disable_speaker: false,
          disable_keyboard: false,
          disable_mouse: false,
        };
        if (st.cd) options.cdrom = { buffer: st.cd.buffer };
        if (st.hdd) options.hda = { buffer: st.hdd.buffer };
        if (st.fdd) options.fda = st.fdd.url ? { url: st.fdd.url } : { buffer: st.fdd.buffer };

        try {
          st.emu = new V86(options);
          st.paused = false;
          st.capture = null;
          setCapture(true);
          setBusy(true, st.cd && st.bootOrder === 'cdrom' ? 'Booting CD…' : 'Running');
          setStatus(`Running — ${st.memory} MB`, 'v86 · SeaBIOS');
          refreshChips();
          screenEl.focus();
          for (const ev of ['emulator-ready', 'emulator-started']) {
            try { st.emu.add_listener(ev, () => { if (running()) infoEl.textContent = 'v86 · SeaBIOS · running'; }); } catch (e) { /* ignore */ }
          }
          try {
            st.emu.add_listener('screen-set-size', (size) => {
              const [w, h] = Array.isArray(size) ? size : [];
              if (w && h) setStatus(`Running — ${w}×${h}`, 'v86 · SeaBIOS · running');
              applyScale();
            });
          } catch (e) { /* ignore */ }
          applyScale();
          if (st.hdd) {
            // anything the guest writes lands in the disk buffer: from now on there is
            // something worth saving
            setTimeout(() => { if (running() && st.hdd) { st.dirty = true; refreshChips(); } }, 5000);
          }
        } catch (err) {
          st.emu = null;
          failure(err);
        }
      }

      async function powerOff({ keepMedia = true } = {}) {
        if (!st.emu) return;
        if (st.dirty && st.hdd) await saveDisk({ quiet: true });
        try { st.emu.destroy(); } catch (e) { /* ignore */ }
        st.emu = null;
        st.paused = false;
        st.capture = null;
        window.__vmCapture = false;
        screenEl.classList.remove('captured');
        screenEl.innerHTML = '';
        stage.classList.remove('on');
        splash.classList.remove('hidden');
        setBusy(false, 'Power on');
        pauseBtn.innerHTML = '⏸ <span>Pause</span>';
        setStatus('Powered off', 'v86 · SeaBIOS');
        if (!keepMedia) { st.cd = null; st.hdd = null; st.fdd = null; }
        refreshChips();
      }

      /* ---------------- scaling ---------------- */
      function applyScale() {
        const canvas = screenEl.querySelector('canvas');
        if (!canvas) return;
        if (st.fit) {
          const availW = Math.max(200, stage.clientWidth - 16);
          const availH = Math.max(150, stage.clientHeight - 16);
          const w = canvas.width || 640;
          const h = canvas.height || 480;
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

      /* ---------------- guided flows ---------------- */
      async function bootKolibri() {
        st.cd = null;
        st.hdd = null;
        st.fdd = { name: KOLIBRI.name, url: abs(KOLIBRI.url) };
        st.bootOrder = 'floppy';
        refreshChips();
        await powerOn();
      }

      async function installWindowsFlow() {
        const step = await wm.msgBox({
          title: 'Install Windows from an ISO',
          iconName: 'question',
          width: 520,
          sound: false,
          text: 'You need a disc image of a 32-bit Windows: 95, 98, ME, NT 4.0, 2000 or XP.\n\n'
            + '64-bit Windows cannot run here — v86 emulates a 32-bit Pentium-class CPU.\n\n'
            + 'Next: choose the ISO, then a hard disk to install onto.',
          buttons: ['Choose ISO…', 'Not now'],
        });
        if (step !== 'Choose ISO…') return;
        kick('cd');
      }

      async function afterIsoInserted() {
        if (!st.hdd) {
          const make = await wm.msgBox({
            title: 'Windows setup',
            iconName: 'info',
            width: 500,
            text: `The CD is ready: ${st.cd.name}\n\n`
              + 'Windows needs somewhere to install itself. Create a hard-disk image now?\n\n'
              + 'It lives in this browser and can be saved, exported or deleted at any time.',
            buttons: ['Create a disk…', 'Use the existing one', 'Cancel'],
          });
          if (make === 'Create a disk…') await createDisk();
          else if (make === 'Cancel') return;
        }
        st.bootOrder = 'cdrom';
        refreshChips();
        await powerOn();
      }

      /* ---------------- boot-time restore ---------------- */
      (async () => {
        try {
          const hdd = await idbGet('hdd').catch(() => null);
          if (hdd?.buffer) { st.hdd = { name: hdd.name || 'disk.img', buffer: hdd.buffer }; st.dirty = false; }
          const cdrom = await idbGet('cdrom').catch(() => null);
          if (cdrom?.buffer) st.cd = { name: cdrom.name, buffer: cdrom.buffer };
        } catch (e) { /* ignore */ }
        if (st.hdd || st.cd) {
          st.fdd = null;
          st.bootOrder = 'hdd';
        } else {
          st.bootOrder = 'floppy';
        }
        refreshChips();
        setStatus('Powered off', st.hdd ? 'saved disk ready — press Power on' : 'Floppy: KolibriOS 0.7.7');
        if (opts.power) setTimeout(() => powerOn(), 250);
      })();

      /* ---------------- inputs ---------------- */
      fileCd.addEventListener('change', async () => {
        const f = fileCd.files?.[0];
        fileCd.value = '';
        if (!f) return;
        await insertCd(f);
        if (!running()) await afterIsoInserted();
      });
      fileDisk.addEventListener('change', async () => {
        const f = fileDisk.files?.[0];
        fileDisk.value = '';
        if (f) await attachDisk(f);
      });
      fileFloppy.addEventListener('change', async () => {
        const f = fileFloppy.files?.[0];
        fileFloppy.value = '';
        if (f) await insertFloppy(f);
      });

      ['dragenter', 'dragover'].forEach((ev) => stage.addEventListener(ev, (e) => {
        e.preventDefault();
        dropElShow(true);
      }));
      ['dragleave', 'drop'].forEach((ev) => stage.addEventListener(ev, (e) => {
        e.preventDefault();
        dropElShow(false);
        const f = e.dataTransfer?.files?.[0];
        if (ev === 'drop' && f) routeFile(f);
      }));
      function dropElShow(on) { body.querySelector('.vm-drop').classList.toggle('show', on); }

      async function routeFile(file) {
        const ext = file.name.split('.').pop().toLowerCase();
        if (ext === 'iso') { await insertCd(file); if (!running()) await afterIsoInserted(); }
        else if (await isFloppySized(file)) await insertFloppy(file);
        else await attachDisk(file);
      }
      async function isFloppySized(file) {
        return file.size === 1474560 || file.size === 737280 || file.size === 2949120;
      }

      /* ---------------- clicks ---------------- */
      body.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-act]');
        if (!b) return;
        const a = b.dataset.act;
        if (a === 'power') powerOn();
        else if (a === 'kolibri') bootKolibri();
        else if (a === 'windows') installWindowsFlow();
        else if (a === 'cd') kick('cd');
        else if (a === 'hdd') {
          const choice = await wm.msgBox({
            title: 'Hard disk',
            iconName: 'question',
            width: 460,
            text: st.hdd
              ? `Attached: ${st.hdd.name} (${fmtBytes(st.hdd.buffer.byteLength)})${st.dirty ? '\n\nThere are unsaved changes.' : ''}`
              : 'No hard disk is attached. Windows needs one to install onto.',
            buttons: ['Create new…', 'Attach a file…', st.dirty ? 'Save disk' : 'Export disk', 'Cancel'],
          });
          if (choice === 'Create new…') await createDisk();
          else if (choice === 'Attach a file…') kick('disk');
          else if (choice === 'Save disk') await saveDisk();
          else if (choice === 'Export disk') await exportDisk();
        } else if (a === 'floppy') {
          const choice = await wm.msgBox({
            title: 'Floppy drive',
            iconName: 'question',
            width: 440,
            text: st.fdd ? `Inserted: ${st.fdd.name}` : 'The floppy drive is empty.',
            buttons: ['Insert a file…', 'KolibriOS', 'Eject', 'Cancel'],
          });
          if (choice === 'Insert a file…') kick('floppy');
          else if (choice === 'KolibriOS') { st.fdd = { name: KOLIBRI.name, url: abs(KOLIBRI.url) }; refreshChips(); }
          else if (choice === 'Eject') { st.fdd = null; refreshChips(); }
        } else if (a === 'boot') {
          const choice = await wm.msgBox({
            title: 'Boot order',
            iconName: 'question',
            width: 420,
            text: 'Which device should SeaBIOS try first?',
            buttons: ['CD-ROM', 'Hard disk', 'Floppy', 'Cancel'],
          });
          if (choice === 'CD-ROM') st.bootOrder = 'cdrom';
          else if (choice === 'Hard disk') st.bootOrder = 'hdd';
          else if (choice === 'Floppy') st.bootOrder = 'floppy';
          refreshChips();
        } else if (a === 'memory') {
          const choice = await wm.msgBox({
            title: 'Memory',
            iconName: 'question',
            width: 430,
            text: 'How much RAM should the machine have?\n\nWindows 98 is happy with 128 MB, 2000 with 256 MB, XP with 512 MB.',
            buttons: ['64 MB', '128 MB', '256 MB', '512 MB', 'Cancel'],
          });
          const mb = parseInt(choice, 10);
          if (mb) {
            st.memory = mb;
            refreshChips();
            if (running()) wm.alert('Memory is applied next time the machine starts.', 'Virtual PC');
          }
        } else if (a === 'pause') {
          if (!running()) return;
          st.paused = !st.paused;
          try { st.paused ? st.emu.stop() : st.emu.run(); } catch (err) { /* ignore */ }
          b.innerHTML = st.paused ? '▶ <span>Resume</span>' : '⏸ <span>Pause</span>';
          setStatus(st.paused ? 'Paused' : 'Running');
        } else if (a === 'reset') {
          if (!running()) return;
          try { st.emu.restart(); setStatus('Reset', 'booting again'); } catch (err) { await powerOff(); powerOn(); }
        } else if (a === 'save') saveDisk();
        else if (a === 'scale') {
          st.fit = !st.fit;
          b.textContent = st.fit ? 'Fit' : '1:1';
          applyScale();
        } else if (a === 'fullscreen') {
          if (document.fullscreenElement) document.exitFullscreen?.();
          else stage.requestFullscreen?.().catch(() => {});
        }
      });

      /* ---------------- menu ---------------- */
      menuBar(body, [
        { label: 'Machine', items: () => [
          { label: running() ? 'Power off' : 'Power on', action: () => (running() ? powerOff() : powerOn()) },
          { label: 'Reset', disabled: !running(), action: () => { try { st.emu.restart(); } catch (e) { powerOff().then(() => powerOn()); } } },
          { label: st.paused ? 'Resume' : 'Pause', disabled: !running(), action: () => { if (running()) { st.paused ? st.emu.run() : st.emu.stop(); st.paused = !st.paused; } } },
          { sep: true },
          { label: 'Memory…', action: () => body.querySelector('[data-act="memory"]').click() },
          { label: 'Save machine state', disabled: !running(), action: saveState },
          { label: 'Restore machine state', action: restoreState },
          { sep: true },
          { label: 'Close', action: () => win.close() },
        ] },
        { label: 'Media', items: () => [
          { label: st.cd ? `CD: ${st.cd.name}` : 'Insert CD (ISO)…', action: () => kick('cd') },
          { label: st.fdd ? `Floppy: ${st.fdd.name}` : 'Insert floppy…', action: () => kick('floppy') },
          { label: st.hdd ? `Disk: ${st.hdd.name}` : 'No hard disk', action: () => body.querySelector('[data-act="hdd"]').click() },
          { sep: true },
          { label: 'Create a hard disk…', action: createDisk },
          { label: 'Save disk to this browser', disabled: !st.hdd, action: () => saveDisk() },
          { label: 'Export disk to a file…', disabled: !st.hdd, action: exportDisk },
          { label: 'Forget saved images', action: forgetDisk },
          { sep: true },
          { label: 'Eject everything', action: ejectAll },
        ] },
        { label: 'Boot', items: () => [
          { label: 'KolibriOS (bundled, instant)', action: bootKolibri },
          { sep: true },
          { label: 'CD-ROM first', checked: st.bootOrder === 'cdrom', action: () => { st.bootOrder = 'cdrom'; refreshChips(); } },
          { label: 'Hard disk first', checked: st.bootOrder === 'hdd', action: () => { st.bootOrder = 'hdd'; refreshChips(); } },
          { label: 'Floppy first', checked: st.bootOrder === 'floppy', action: () => { st.bootOrder = 'floppy'; refreshChips(); } },
          { sep: true },
          { label: 'Install Windows from an ISO…', action: installWindowsFlow },
        ] },
        { label: 'View', items: () => [
          { label: 'Fit to window', checked: st.fit, action: () => { st.fit = true; applyScale(); } },
          { label: 'Actual size', checked: !st.fit, action: () => { st.fit = false; applyScale(); } },
          { sep: true },
          { label: 'Full screen', action: () => stage.requestFullscreen?.().catch(() => {}) },
        ] },
        { label: 'Help', items: () => [
          { label: 'Installing Windows — step by step', action: () => wm.msgBox({
            title: 'Installing Windows in the Virtual PC',
            iconName: 'info',
            width: 560,
            buttons: ['OK'],
            text: '1. Insert the ISO (💿 CD) and create a hard disk (🗄 Disk → Create new…).\n\n'
              + '2. Boot order must be CD first, then press Power on.\n\n'
              + '3. Windows 98/ME: setup starts by itself and partitions the blank disk.\n'
              + '   Windows 95: needs a boot floppy — insert one, boot from it, run SETUP.EXE from D:.\n\n'
              + '4. Windows 2000/XP: when setup says "Press F6", wait; at "Press F5" choose Standard PC —\n'
              + '   the emulated machine has no ACPI, and Standard PC installs cleanly. If setup hangs,\n'
              + '   reboot and press F7 ("Disable ACPI") instead.\n\n'
              + '5. When the installer reboots, let it: the disk keeps the installation. Saving the disk\n'
              + '   (Media → Save disk) keeps it across reloads; exporting it gives you a .img file.\n\n'
              + 'Expect a 10–40 minute install, and a machine that feels like 1999 afterwards.',
          }) },
          { label: 'About Virtual PC', action: () => wm.alert(
            'Virtual PC\n\nv86 (WebAssembly) emulating a 32-bit Pentium-class PC: SeaBIOS, standard VGA with VBE, '
            + 'PS/2 keyboard and mouse, IDE (hard disk + CD-ROM), a floppy controller and a Sound Blaster 16.\n\n'
            + 'It is a 32-bit machine: 64-bit Windows cannot run on it.\n\n'
            + 'v86 is BSD-2-Clause, SeaBIOS and VGABIOS are LGPL, KolibriOS is GPL-2.0. See vendor/NOTICE.md.',
            'About Virtual PC') },
        ] },
      ]);
      const bar = body.querySelector('.menubar');
      if (bar) body.insertBefore(bar, body.firstChild);

      win.onClose(() => {
        window.removeEventListener('resize', onResize);
        window.__vmCapture = false;
        if (st.dirty && st.hdd) saveDisk({ quiet: true });
        if (st.emu) { try { st.emu.destroy(); } catch (e) { /* ignore */ } }
        return true;
      });

      refreshChips();
    },
  });
}

export default launch;
