# Windows XP — in your browser

A complete, working Windows XP desktop that runs in a single web page.
No installation, no download, no VM image, no plugins. Open the page and the machine boots.

```bash
cd winvm
node server.mjs 8080      # then open http://localhost:8080/
```

(Any static file server works — `python3 -m http.server` is fine too. There is no build step.)

## What actually works

| Area | Details |
| --- | --- |
| **Shell** | Luna Blue / Olive / Silver / Classic themes, desktop icons, drag **marquee** selection, right-click menus, Start menu with **All Programs** flyout, quick launch, system tray with live clock, Alt+Tab, Alt+F4, F1, F5 |
| **Windows** | Drag by title bar, resize from eight handles, minimize with taskbar animation, maximize/restore (double-click the title bar), z-order and focus, taskbar buttons |
| **File system** | A real virtual `C:` drive (plus `A:` and `D:`) in `localStorage`, folders, text files and PNG images, rename/delete/copy/move, Recycle Bin with restore and empty |
| **Programs** | My Computer / Explorer (icons, list and details views), Notepad, Paint, Command Prompt, Calculator, Minesweeper, Solitaire, Internet Explorer, Media Player, Control Panel, Display Properties, Task Manager, Help and Support, Run…, Character/About dialogs |
| **Command Prompt** | `help`, `ver`, `dir`, `cd`, `cls`, `echo`, `type`, `mkdir`, `rmdir`, `del`, `copy`, `move`, `ren`, `tree`, `date`, `time`, `set`, `path`, `hostname`, `whoami`, `vol`, `ipconfig`, `ping`, `systeminfo`, `tasklist`, `title`, `color`, `start`, `shutdown /s|/r|/l`, `exit`, history with ↑/↓ and Ctrl+L |
| **Paint** | Pencil, brush, eraser, airbrush, flood fill, colour picker, line, rectangle, ellipse, palette, undo, invert and flip, saves real PNGs into My Pictures |
| **Games** | Minesweeper (three levels, flags, timer, best times) and Klondike Solitaire (click-to-move or double-click to send home, undo) |
| **Sound** | A tiny Web Audio synth: startup and shutdown chimes, clicks, error dings, and four playable tracks in Media Player with a live visualiser |
| **Personalisation** | Eight wallpapers, four colour schemes, starfield and Mystify screen savers with idle detection, volume, user name, clock format |
| **Boot flows** | BIOS/POST screen, Windows boot screen with progress blocks, welcome/logon screen, shutdown, restart, log off, stand by |

## Design notes

* **It is not an emulator.** There is no x86 virtual machine and no Windows disk image —
  shipping one would mean hundreds of megabytes and a Microsoft licence. This is a
  from-scratch re-implementation of the XP shell and its programs in HTML, CSS and
  JavaScript, which is why it boots in about a second and runs on a phone.
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
                    ie&url=http://help.local/, media, control, display, taskmgr, help)
?saver=mystify      start a screen saver immediately
?nosound            boot silently
```

## Layout

```
winvm/
├── index.html          the shell markup
├── css/xp.css          desktop, taskbar, start menu, window chrome, boot screens
├── css/apps.css        per-program styling
├── assets/bliss.jpg    the wallpaper
├── js/main.js          boot, wiring, taskbar, keyboard
├── js/core/            fs, wm (window manager), menu, shell, icons, sound, settings,
│                       desktop, startmenu, boot, screensaver, wallpapers, util
└── js/apps/            explorer, notepad, paint, cmd, calc, minesweeper, solitaire,
                        ie, media, control, display, taskmgr, recycle, help, filedialog
```

Windows and Windows XP are trademarks of Microsoft Corporation. This is an independent
homage built by Arena.ai, not a Microsoft product.
