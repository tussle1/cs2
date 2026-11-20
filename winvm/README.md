# Windows XP — in your browser

A complete, working Windows XP desktop that runs in a single web page.
No installation, no download, no plugins. Open the page and the machine boots.

It also does the two things you would not expect a web page to do:

* **it reaches the real internet** — type any address into Internet Explorer and the little proxy in
  `server.mjs` fetches the real site (scripts stripped, links routed back through the proxy); and
* **it runs a real computer** — the *Virtual PC* is an actual x86 machine emulated in WebAssembly
  (v86 + SeaBIOS), booting a real operating system, with support for your own floppy, CD or disk images.

```bash
cd winvm
node server.mjs 8080      # then open http://localhost:8080/
```

`node server.mjs` gives you both features. Any plain static server
(`python3 -m http.server`, GitHub Pages, Netlify) gives you the desktop, the Virtual PC and the built-in
five-page web, but **not** the real internet — a static host has no server to fetch pages for you.

It is also an **installable web app** (manifest + service worker + icons): in Chrome or Edge it installs from
the address bar, opens in its own window, and then runs **completely offline** — which is the easiest way to
put it on a Chromebook. See [Install on a Chromebook](#install-on-a-chromebook).

## The real internet

Internet Explorer has two internets, switched with the **🌐 Real web** button:

| | What it is |
| --- | --- |
| **Built-in web** | Five hand-written pages that work offline: Arena, "Microsoft Windows XP", Help and Support, a search page, and `about:blank`. |
| **Real web** | Anything you type is fetched for real by `server.mjs` (`GET /api/fetch?url=…`) and rendered in a sandboxed frame. |

What the proxy does to every page before you see it:

* **strips all JavaScript** — `<script>`, inline event handlers, `javascript:` URLs, `<noscript>` — so a website
  can never run code inside this desktop;
* **strips frames, objects, embeds and auto-refresh**;
* **injects `<base href>`** so the site's own CSS and images still load from the site;
* **rewrites every link** to travel back through the proxy, so clicking around keeps working;
* **refuses private addresses** (`localhost`, `127.0.0.1`, `10.x`, `192.168.x`, `169.254.x`, link-local v6) and
  non-80/443 ports, so it cannot be used to poke at your router or the machine it runs on;
* **non-HTML addresses** (images, ZIPs, PDFs) are offered as a download into
  **My Documents\\Downloads** on the virtual C: drive.

Honest limits: sites that need JavaScript — most of the modern web — will look empty or broken, and TLS errors are
reported rather than ignored. The **↗** button opens the current address in a normal browser tab, which is the right
answer for anything interactive. Behind a corporate TLS-inspecting proxy, start the server with
`NODE_EXTRA_CA_CERTS=/path/to/ca.pem node server.mjs`.

## A real computer in a window: Virtual PC

*Start → All Programs → System Tools → Virtual PC*, or the desktop icon, or `?app=vm`.

This is not a simulation of a computer. v86 emulates a Pentium-class CPU in WebAssembly, with SeaBIOS, a VGA card,
a PS/2 keyboard and mouse, a floppy controller and an IDE controller; the guest really executes x86 instructions.
It boots **KolibriOS 0.7.7**, a complete open-source graphical operating system that fits on a 1.44 MB floppy.

| Feature | How |
| --- | --- |
| Boot the bundled OS | Press **⏻ Power on**; KolibriOS reaches its desktop in a few seconds. |
| Boot your own OS | **Boot from → Your own floppy / ISO / disk image…**, or drag a file onto the window. `.iso` → CD-ROM, 1.44 MB images → floppy, everything else → hard disk. Windows 95/98 discs work if you own one. |
| Keep installed programs | The image you inserted is remembered in this browser (IndexedDB); a hard-disk image keeps its writes, so an OS you install stays installed. |
| Freeze the whole machine | **Save state** / **Restore state** — the CPU, RAM and devices are written to IndexedDB and resumed later. |
| Speed | Pause, reset, full screen, and a Fit/1:1 zoom for the 1024×768 screen. |
| Media | **⏏ Eject** drops back to the bundled floppy. |

Expect roughly what a 1999 machine felt like: the emulator runs tens of millions of instructions per second, which
is plenty for KolibriOS and fine for Windows 95/98, and slow for anything modern. Loading the emulator the first time
downloads 2 MB of WebAssembly; it is cached afterwards, offline included.

Licences for everything in `vendor/` (v86 = BSD-2-Clause, SeaBIOS/VGABIOS = LGPL, KolibriOS = GPL-2.0, with source
links) are listed in [`vendor/NOTICE.md`](vendor/NOTICE.md).

## Install on a Chromebook

### Option 1 — install it as an app (no developer mode, 20 seconds)

1. Open the page in Chrome on the Chromebook (the live preview URL, or your own hosted copy).
2. Click the **install** icon at the right end of the address bar — or **⋮ → Cast, save and share → Install page
   as app…** (older ChromeOS: **⋮ → More tools → Create shortcut…** and tick **Open as window**).
3. Name it **Windows XP** → **Install**. It now sits in the Launcher (press the Everything key and type
   "Windows XP"), opens in a bare window with no browser chrome, and keeps working with Wi-Fi switched off,
   because the service worker caches every file on first load.

To remove it: right-click the icon in the Launcher → **Uninstall**. It stores about 1&nbsp;MB in the browser
profile; nothing is written to ChromeOS itself.

### Option 2 — run it locally on the Chromebook (Linux container)

1. **Settings → About ChromeOS → Developers → Linux development environment → Turn on** (one-time, ~10 min).
2. Download this folder: GitHub → **Code → Download ZIP**, unzip in Files, then move the `winvm` folder into
   the **Linux files** area.
3. Open the **Terminal** app and run:

   ```bash
   cd winvm && node server.mjs 8080      # Node is pre-installed in the Linux container
   ```

   (`python3 -m http.server 8080` also works, but only `node server.mjs` gives you the real-internet proxy.)

4. Open `http://localhost:8080` in Chrome and install it as an app (Option 1, step 2). After the first load the
   installed window keeps working even if you stop the server.

### Option 3 — give it a permanent URL

Any static host works, because there is no build step and no server-side code:

- **GitHub Pages** — fork the repo, then *Settings → Pages → Deploy from a branch* with the folder `/winvm`.
- **Netlify Drop** — drag the `winvm` folder onto <https://app.netlify.com/drop>.
- Or any object storage / web server you already have.

> The sandbox preview URL only lives as long as this session, so host it (or run it locally) if you want an
> install that stays put.

## What actually works

| Area | Details |
| --- | --- |
| **Shell** | Luna Blue / Olive / Silver / Classic themes, desktop icons, drag **marquee** selection, right-click menus, Start menu with **All Programs** flyout, quick launch, system tray with live clock, Alt+Tab, Alt+F4, F1, F5 |
| **Windows** | Drag by title bar, resize from eight handles, minimize with taskbar animation, maximize/restore (double-click the title bar), z-order and focus, taskbar buttons |
| **File system** | A real virtual `C:` drive (plus `A:` and `D:`) in `localStorage`, folders, text files and PNG images, rename/delete/copy/move, Recycle Bin with restore and empty |
| **Programs** | My Computer / Explorer (icons, list and details views), Notepad, Paint, Command Prompt, Calculator, Minesweeper, Solitaire, Internet Explorer, Media Player, Control Panel, Display Properties, Task Manager, Help and Support, Virtual PC, Run…, Character/About dialogs |
| **Real internet** | Internet Explorer through the `server.mjs` proxy: any address, sanitised HTML in a sandboxed frame, proxy-routed links, downloads into `C:\\…\\My Documents\\Downloads`, ↗ to a real tab |
| **Virtual PC** | v86 (WebAssembly) + SeaBIOS + a bundled KolibriOS 0.7.7 floppy; boot your own floppy/ISO/disk image by picker or drag-and-drop; disk persistence and full machine save/restore in IndexedDB |
| **Command Prompt** | `help`, `ver`, `dir`, `cd`, `cls`, `echo`, `type`, `mkdir`, `rmdir`, `del`, `copy`, `move`, `ren`, `tree`, `date`, `time`, `set`, `path`, `hostname`, `whoami`, `vol`, `ipconfig`, `ping`, `systeminfo`, `tasklist`, `title`, `color`, `start`, `shutdown /s|/r|/l`, `exit`, history with ↑/↓ and Ctrl+L |
| **Paint** | Pencil, brush, eraser, airbrush, flood fill, colour picker, line, rectangle, ellipse, palette, undo, invert and flip, saves real PNGs into My Pictures |
| **Games** | Minesweeper (three levels, flags, timer, best times) and Klondike Solitaire (click-to-move or double-click to send home, undo) |
| **Sound** | A tiny Web Audio synth: startup and shutdown chimes, clicks, error dings, and four playable tracks in Media Player with a live visualiser |
| **Personalisation** | Eight wallpapers, four colour schemes, starfield and Mystify screen savers with idle detection, volume, user name, clock format |
| **Boot flows** | BIOS/POST screen, Windows boot screen with progress blocks, welcome/logon screen, shutdown, restart, log off, stand by |

## Design notes

* **The XP desktop itself is not an emulator.** There is no Windows disk image —
  shipping one would mean hundreds of megabytes and a Microsoft licence. The shell and its
  programs are a from-scratch re-implementation in HTML, CSS and JavaScript, which is why it
  boots in about a second and runs on a phone.
* **The Virtual PC is a real emulator, on purpose.** When you want to install and run actual
  software, one window hosts v86: a genuine x86 machine running a genuine OS. Keeping it separate
  means a 2 MB WebAssembly download and a slow, authentic 1999 experience only when you ask for it.
* **Internet Explorer renders real pages without running their code.** The proxy does the fetching and
  sanitising; the page lands in a sandboxed frame with no scripting, so the desktop cannot be reached by
  a website.
* **No dependencies, no build step.** Plain ES modules, hand-drawn inline SVG icons and one
  photograph for the Bliss wallpaper. `server.mjs` is ~50 lines of Node.
* **Your data stays in your browser.** Files live in `localStorage`; nothing is uploaded.
  *Control Panel → System → Restore this computer* wipes them.

## Controls worth knowing

| Keys | Action |
| --- | --- |
| `Alt`+`Tab` | Cycle windows |
| `Alt`+`F4` | Close the active window |
| `F1` | Help and Support |
| `F5` | Refresh the desktop |
| `Esc` | Close menus and dialogs |

Handy URL parameters for demos and screenshots:

```
?app=cmd            open a program on boot (explorer, notepad, paint, winmine, solitaire,
                    ie&url=http://help.local/, ie&url=https://example.com/, vm, media,
                    control, display, taskmgr, help)
?app=vm&boot=1      open the Virtual PC and press Power on for you
?saver=mystify      start a screen saver immediately
?nosound            boot silently
```

## Layout

```
winvm/
├── index.html          the shell markup
├── server.mjs          static server + /api/fetch, the real-internet proxy
├── css/xp.css          desktop, taskbar, start menu, window chrome, boot screens
├── css/apps.css        per-program styling
├── manifest.webmanifest  PWA manifest (name, icons, shortcuts)
├── sw.js               service worker: full offline cache
├── assets/             wallpaper + app icons (192/512/maskable/apple-touch)
├── js/main.js          boot, wiring, taskbar, keyboard
├── js/core/            fs, wm (window manager), menu, shell, icons, sound, settings,
│                       desktop, startmenu, boot, screensaver, wallpapers, util
└── js/apps/            explorer, notepad, paint, cmd, calc, minesweeper, solitaire,
                        ie, media, control, display, taskmgr, recycle, help, filedialog
```

Windows and Windows XP are trademarks of Microsoft Corporation. This is an independent
homage built by Arena.ai, not a Microsoft product.
