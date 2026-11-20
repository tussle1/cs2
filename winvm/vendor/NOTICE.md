# Third-party components in `vendor/`

Everything in `vendor/` is shipped unmodified so that the Virtual PC can boot
offline, from a static host, with no CDN and no installation step.

## `vendor/v86/` — v86

A JavaScript/WebAssembly x86 emulator by Fabian Hemmer and contributors.
Licence: **BSD-2-Clause** — see `vendor/v86/LICENSE`.
Source: <https://github.com/copy/v86>

Files: `libv86.mjs` (ES module build), `v86.wasm`, `v86-fallback.wasm`
(WebAssembly core, used when the browser cannot use the main module).

## `vendor/bios/` — SeaBIOS and VGABIOS

* `seabios.bin` — SeaBIOS, the x86 firmware used by QEMU/v86.
  Licence: **LGPL-3.0**. Source: <https://github.com/copy/v86/tree/master/bios>
  (upstream <https://www.seabios.org/>).
* `vgabios.bin` — VGABIOS (Bochs/QEMU VGA option ROM).
  Licence: **LGPL-2.1**. The full text is `vendor/bios/COPYING.LESSER`.

Both are redistributed as unmodified binary blobs, as the LGPL requires.

## `vendor/os/kolibrios.img` — KolibriOS 0.7.7.0

A complete, free, open-source 32-bit operating system written in assembly,
distributed on a 1.44 MB floppy image.
Licence: **GPL-2.0** (with the KolibriOS exception for linking).
Source code: <https://github.com/KolibriOS/kolibrios> · <https://kolibrios.org/>

The image is redistributed unmodified. The corresponding source is available
from the upstream repository above; the binary here is the official 0.7.7.0
release floppy.

---

The rest of `winvm/` (HTML, CSS, JavaScript, artwork) is original work for this
project. Windows XP itself is a trademark of Microsoft Corporation and is not
included — the desktop is an homage built from scratch.
