/* ============================================================
   cmd.js — Command Prompt (a real little shell over the VFS)
   ============================================================ */

import { normalize, join, dirname, basename, HOME } from '../core/fs.js';
import { fmtBytes } from '../core/util.js';

const VER = 'Microsoft Windows XP [Version 5.1.2600]';
const PALETTE = {
  0: '#000000', 1: '#000080', 2: '#008000', 3: '#008080', 4: '#800000', 5: '#800080',
  6: '#808000', 7: '#c0c0c0', 8: '#808080', 9: '#0000ff', a: '#00ff00', b: '#00ffff',
  c: '#ff0000', d: '#ff00ff', e: '#ffff00', f: '#ffffff',
};

export function launch(ctx, opts = {}) {
  const { wm, fs, shell } = ctx;

  wm.open({
    title: opts.title || 'C:\\WINDOWS\\system32\\cmd.exe',
    icon: 'cmd',
    width: 700, height: 430, minWidth: 380, minHeight: 200,
    appId: 'cmd',
    singleton: opts.singleton,
    onMount: (body, win) => {
      const term = document.createElement('div');
      term.className = 'cmd scroll';
      term.style.cssText = 'position:absolute;inset:0';
      const wrap = document.createElement('div');
      wrap.style.cssText = 'position:relative;height:100%;background:#000';
      wrap.appendChild(term);
      body.style.position = 'relative';
      body.appendChild(wrap);

      let cwd = HOME;
      const history = [];
      let hIndex = 0;

      const scrollDown = () => { term.scrollTop = term.scrollHeight; };

      function print(text = '', cls = '') {
        const line = document.createElement('div');
        line.className = 'line ' + cls;
        line.textContent = text === '' ? '\u00a0' : text;
        term.appendChild(line);
        scrollDown();
      }

      function printHtml(html) {
        const line = document.createElement('div');
        line.className = 'line';
        line.innerHTML = html;
        term.appendChild(line);
        scrollDown();
      }

      const inputLine = document.createElement('div');
      inputLine.className = 'input-line';
      const promptEl = document.createElement('span');
      promptEl.className = 'prompt';
      const input = document.createElement('input');
      input.spellcheck = false;
      input.autocomplete = 'off';
      input.setAttribute('aria-label', 'Command prompt');
      inputLine.append(promptEl, input);
      term.appendChild(inputLine);

      const promptText = () => `${cwd}>`;
      function refreshPrompt() {
        promptEl.textContent = promptText();
        term.appendChild(inputLine);
        scrollDown();
      }

      const pad = (s, n) => String(s).padEnd(n);
      const commas = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

      function dirOf(target) {
        const p = normalize(target || cwd);
        const items = fs.list(p);
        if (!items) { print('File Not Found', 'err'); return; }
        print(` Volume in drive ${p.slice(0, 1)} has no label.`);
        print(` Volume Serial Number is 1A2B-3C4D`);
        print('');
        print(` Directory of ${p}`);
        print('');
        let files = 0, dirs = 0, bytes = 0;
        const stamp = (ts) => {
          const d = new Date(ts || Date.now());
          const date = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
          const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
          return `${pad(date, 11)}${pad(time, 9)}`;
        };
        for (const n of items) {
          const size = n.type === 'file' ? ` ${commas((n.content || '').length)}` : '';
          print(`${stamp(n.modified)} ${n.type === 'dir' ? pad('<DIR>', 13) : pad(size, 13)}${n.name}`);
          if (n.type === 'dir') dirs++; else { files++; bytes += (n.content || '').length; }
        }
        print(`${pad('', 18)}${pad(files + ' File(s)', 16)}${commas(bytes)} bytes`);
        const free = 18_400_000_000 - fs.size('C:\\');
        print(`${pad('', 18)}${pad(dirs + ' Dir(s)', 16)}${commas(free)} bytes free`);
      }

      function formatSize(n) { return fmtBytes(n); }

      function run(raw) {
        const line = raw.trim();
        print(`${promptText()}${raw}`);
        if (!line) return;

        const toks = line.match(/"[^"]*"|\S+/g).map((t) => t.replace(/^"|"$/g, ''));
        const cmd = toks[0].toLowerCase();
        const args = toks.slice(1);
        const arg = args.join(' ');
        const rest = args.join(' ');

        switch (cmd) {
          case 'help':
          case '/?':
            print('For more information on a specific command, type HELP command-name.');
            print('CD            Displays the name of or changes the current directory.');
            print('CLS           Clears the screen.');
            print('COLOR         Sets the default console foreground and background colours.');
            print('COPY          Copies one or more files to another location.');
            print('DATE          Displays or sets the date.');
            print('DEL           Deletes one or more files.');
            print('DIR           Displays a list of files and subdirectories.');
            print('ECHO          Displays messages.');
            print('EXIT          Quits the CMD.EXE program (the window).');
            print('HOSTNAME      Prints the name of the computer.');
            print('IPCONFIG      Displays Windows IP configuration.');
            print('MKDIR / MD    Creates a directory.');
            print('MOVE          Moves files.');
            print('PING          Sends test packets to a host.');
            print('REN           Renames files.');
            print('RMDIR / RD    Removes a directory.');
            print('SET           Displays environment variables.');
            print('SHUTDOWN      Shuts down or restarts the computer (try /r).');
            print('START         Starts a program: notepad, calc, mspaint, iexplore…');
            print('SYSTEMINFO    Displays machine configuration.');
            print('TASKLIST      Lists running applications.');
            print('TIME          Displays or sets the time.');
            print('TITLE         Sets the window title.');
            print('TREE          Graphically displays the folder structure.');
            print('TYPE          Displays the contents of a text file.');
            print('VER           Displays the Windows version.');
            print('VOL           Displays a disk volume label and serial number.');
            break;

          case 'ver': print(''); print(VER); print(''); break;

          case 'vol':
            print(` Volume in drive C is LOCAL DISK`);
            print(` Volume Serial Number is 1A2B-3C4D`);
            break;

          case 'cls': term.querySelectorAll('.line').forEach((n) => n.remove()); break;

          case 'echo':
            if (!rest) print('ECHO is on.');
            else print(rest.replace(/^\./, ''));
            break;

          case 'cd':
          case 'chdir': {
            if (!arg) { print(cwd); break; }
            let target = arg.replace(/^\/d\s+/i, '');
            if (target === '..') target = dirname(cwd);
            else if (target === '\\') target = cwd.slice(0, 3);
            else target = /^[A-Za-z]:/.test(target) ? normalize(target) : join(cwd, target);
            if (fs.isDir(target)) cwd = normalize(target);
            else print('The system cannot find the path specified.', 'err');
            break;
          }

          case 'dir': dirOf(arg || cwd); break;

          case 'tree': {
            const walk = (p, prefix) => {
              const items = fs.list(p) || [];
              items.forEach((n, i) => {
                const last = i === items.length - 1;
                print(prefix + (last ? '└───' : '├───') + n.name);
                if (n.type === 'dir') walk(join(p, n.name), prefix + (last ? '    ' : '│   '));
              });
            };
            print(`Folder PATH listing for volume ${cwd.slice(0, 1)}`);
            print(`Volume serial number is 1A2B-3C4D`);
            print(cwd);
            walk(cwd, '');
            break;
          }

          case 'type': {
            if (!arg) { print('The syntax of the command is incorrect.', 'err'); break; }
            const p = /^[A-Za-z]:/.test(arg) ? normalize(arg) : join(cwd, arg);
            if (!fs.isFile(p)) { print('The system cannot find the file specified.', 'err'); break; }
            const content = fs.readFile(p);
            if (content.startsWith('data:')) { print('<binary file>', 'dim'); break; }
            String(content).split('\n').forEach((l) => print(l.replace(/\r$/, '')));
            break;
          }

          case 'mkdir':
          case 'md':
            if (!arg) { print('The syntax of the command is incorrect.', 'err'); break; }
            if (!fs.mkdir(/^[A-Za-z]:/.test(arg) ? arg : join(cwd, arg), { silent: true })) print('Access is denied.', 'err');
            else { fs.save(); ctx.refreshDesktop?.(); }
            break;

          case 'rmdir':
          case 'rd':
            if (!arg) { print('The syntax of the command is incorrect.', 'err'); break; }
            print('Are you sure (Y/N)?', 'dim');
            fs.remove(/^[A-Za-z]:/.test(arg) ? arg : join(cwd, arg));
            ctx.refreshDesktop?.();
            break;

          case 'del':
          case 'erase': {
            if (!arg) { print('The syntax of the command is incorrect.', 'err'); break; }
            const p = /^[A-Za-z]:/.test(arg) ? normalize(arg) : join(cwd, arg);
            if (!fs.isFile(p)) { print('Could Not Find ' + p, 'err'); break; }
            fs.remove(p);
            ctx.refreshDesktop?.();
            break;
          }

          case 'copy': {
            if (args.length < 2) { print('The syntax of the command is incorrect.', 'err'); break; }
            const from = /^[A-Za-z]:/.test(args[0]) ? normalize(args[0]) : join(cwd, args[0]);
            const to = /^[A-Za-z]:/.test(args[1]) ? normalize(args[1]) : join(cwd, args[1]);
            if (!fs.isFile(from)) { print('The system cannot find the file specified.', 'err'); break; }
            const node = fs.node(from);
            const dest = fs.isDir(to) ? join(to, basename(from)) : to;
            fs.writeFile(dest, node.content, { mime: node.mime });
            print('        1 file(s) copied.');
            break;
          }

          case 'move': {
            if (args.length < 2) { print('The syntax of the command is incorrect.', 'err'); break; }
            const from = /^[A-Za-z]:/.test(args[0]) ? normalize(args[0]) : join(cwd, args[0]);
            const to = /^[A-Za-z]:/.test(args[1]) ? normalize(args[1]) : join(cwd, args[1]);
            print(fs.move(from, to) ? '        1 file(s) moved.' : 'The system cannot find the file specified.');
            break;
          }

          case 'ren':
          case 'rename': {
            if (args.length < 2) { print('The syntax of the command is incorrect.', 'err'); break; }
            const from = /^[A-Za-z]:/.test(args[0]) ? normalize(args[0]) : join(cwd, args[0]);
            const ok = fs.rename(from, args[1]);
            print(ok ? '' : 'The system cannot find the file specified.');
            ctx.refreshDesktop?.();
            break;
          }

          case 'date': print(`The current date is: ${new Date().toLocaleDateString()}`); break;
          case 'time': print(`The current time is: ${new Date().toLocaleTimeString()}`); break;
          case 'hostname': print('ARENA-XP'); break;
          case 'whoami': print('arena-xp\\administrator'); break;

          case 'set':
            print('ALLUSERSPROFILE=C:\\Documents and Settings\\All Users');
            print('COMPUTERNAME=ARENA-XP');
            print('HOMEDRIVE=C:');
            print(`HOMEPATH=\\Documents and Settings\\${ctx.settings.get('userName')}`);
            print('OS=Windows_NT');
            print('PROCESSOR_ARCHITECTURE=x86');
            print('PROMPT=$P$G');
            print('SystemRoot=C:\\WINDOWS');
            print('TEMP=C:\\WINDOWS\\Temp');
            print(`USERNAME=${ctx.settings.get('userName')}`);
            print('windir=C:\\WINDOWS');
            break;

          case 'path': print('PATH=C:\\WINDOWS\\system32;C:\\WINDOWS;C:\\WINDOWS\\System32\\Wbem'); break;

          case 'ipconfig':
            print('');
            print('Windows IP Configuration');
            print('');
            print('Ethernet adapter Local Area Connection:');
            print('');
            print('        Connection-specific DNS Suffix  . : arena.local');
            print('        IP Address. . . . . . . . . . . . : 192.168.1.42');
            print('        Subnet Mask . . . . . . . . . . . : 255.255.255.0');
            print('        Default Gateway . . . . . . . . . : 192.168.1.1');
            break;

          case 'ping': {
            const host = arg || 'localhost';
            print('');
            print(`Pinging ${host} [93.184.216.34] with 32 bytes of data:`);
            let i = 0;
            const tick = () => {
              print(`Reply from 93.184.216.34: bytes=32 time=${8 + i * 3}ms TTL=118`);
              if (++i < 4) setTimeout(tick, 260);
              else setTimeout(() => {
                print('');
                print(`Ping statistics for 93.184.216.34:`);
                print('    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),');
                print('Approximate round trip times in milli-seconds:');
                print('    Minimum = 8ms, Maximum = 17ms, Average = 12ms');
              }, 280);
            };
            setTimeout(tick, 240);
            break;
          }

          case 'systeminfo':
            print('');
            print('Host Name:                 ARENA-XP');
            print('OS Name:                   Microsoft Windows XP Professional');
            print('OS Version:                5.1.2600 Service Pack 3 Build 2600');
            print('OS Manufacturer:           Microsoft Corporation');
            print('Registered Owner:          ' + ctx.settings.get('userName'));
            print('System Type:               X86-based PC');
            print('Processor(s):              1 Processor(s) Installed.');
            print('BIOS Version:              Arena/VM 1.00, 11/20/2026');
            print('Total Physical Memory:     1,048 MB');
            print('Available Physical Memory: 812 MB');
            print('Virtual Memory: Max Size:  2,048 MB');
            print('Screen Resolution:         ' + `${window.screen.width}x${window.screen.height}` + ' in browser tab');
            break;

          case 'tasklist': {
            print('');
            print('Image Name                   PID Session Name        Mem Usage');
            print('========================= ====== ================ ============');
            print('System Idle Process            0 Console                  28 K');
            print('explorer.exe                 892 Console              14,208 K');
            ctx.wm.list().forEach((w, i) => {
              print(`${pad(w.appId.padEnd(24), 25)}${pad(String(1000 + i * 4), 6)} Console              ${pad((9000 + i * 733).toLocaleString(), 8)} K`);
            });
            break;
          }

          case 'title':
            if (arg) win.setTitle(arg);
            break;

          case 'color': {
            if (!/^[0-9a-f]{2}$/i.test(arg)) { print('Invalid syntax. Try COLOR 0A', 'err'); break; }
            const bg = PALETTE[arg[0].toLowerCase()] || '#000';
            const fg = PALETTE[arg[1].toLowerCase()] || '#c0c0c0';
            term.style.background = bg;
            wrap.style.background = bg;
            term.style.color = fg;
            term.querySelectorAll('.line').forEach((l) => { if (!l.classList.contains('err')) l.style.color = fg; });
            input.style.color = fg;
            promptEl.style.color = fg;
            break;
          }

          case 'start': {
            if (!arg) { print('The syntax of the command is incorrect.', 'err'); break; }
            shell.runCommand(arg);
            break;
          }

          case 'notepad': case 'calc': case 'mspaint': case 'winmine': case 'sol':
          case 'iexplore': case 'explorer': case 'taskmgr': case 'control': case 'wmplayer':
            shell.runExe(cmd);
            break;

          case 'exit': win.close(); break;

          case 'shutdown': {
            const f = arg.toLowerCase();
            if (f.includes('/r')) { print('Restarting…'); setTimeout(() => ctx.restart(), 600); }
            else if (f.includes('/l')) { print('Logging off…'); setTimeout(() => ctx.logoff(), 600); }
            else if (f.includes('/s')) { print('Shutting down…'); setTimeout(() => ctx.shutdown(), 600); }
            else print('Usage: shutdown /s | /r | /l');
            break;
          }

          case 'format': print('Invalid drive specification. (Nice try.)', 'err'); break;
          case 'rm': case 'sudo': case 'rmdir.exe':
            print('Access is denied. This is a browser tab, not a root shell.', 'err'); break;

          default: {
            // maybe a file in the current folder or an exe alias
            const p = join(cwd, cmd);
            if (fs.isFile(p)) { shell.openPath(p); break; }
            print(`'${toks[0]}' is not recognized as an internal or external command,`, 'err');
            print('operable program or batch file.', 'err');
          }
        }
      }

      input.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
          const value = input.value;
          input.value = '';
          if (value.trim()) { history.push(value); hIndex = history.length; }
          run(value);
          refreshPrompt();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (hIndex > 0) { hIndex--; input.value = history[hIndex] || ''; }
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (hIndex < history.length - 1) { hIndex++; input.value = history[hIndex] || ''; }
          else { hIndex = history.length; input.value = ''; }
        } else if (e.key === 'l' && e.ctrlKey) {
          e.preventDefault();
          term.querySelectorAll('.line').forEach((n) => n.remove());
          refreshPrompt();
        }
      });

      term.addEventListener('click', () => input.focus());
      win.el.addEventListener('pointerdown', () => setTimeout(() => input.focus(), 30), true);

      /* banner */
      print(VER);
      print('');
      print('Welcome to the Windows XP simulation. Type HELP for a list of commands.', 'dim');
      print('');
      refreshPrompt();
      setTimeout(() => input.focus(), 80);
    },
  });
}

export default launch;
