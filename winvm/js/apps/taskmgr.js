/* ============================================================
   taskmgr.js — Task Manager (applications, processes, CPU graph)
   ============================================================ */

import { menuBar } from '../core/menu.js';

export function launch(ctx) {
  const { wm } = ctx;

  wm.open({
    title: 'Windows Task Manager',
    icon: 'exe',
    width: 480, height: 480, minWidth: 420, minHeight: 320,
    appId: 'taskmgr',
    singleton: 'taskmgr',
    onMount: (body, win) => {
      body.innerHTML = `
        <div class="tm">
          <div class="tabs">
            <button data-tab="apps" class="on">Applications</button>
            <button data-tab="procs">Processes</button>
            <button data-tab="perf">Performance</button>
          </div>
          <div class="panel"></div>
        </div>`;
      const panel = body.querySelector('.panel');
      const tabs = body.querySelector('.tabs');
      let tab = 'apps';
      let selected = null;
      let cpuHistory = new Array(60).fill(6);
      let memHistory = new Array(60).fill(30);

      const renderApps = () => {
        const list = wm.list().filter((w) => w.spec.showInTaskbar !== false);
        panel.innerHTML = `
          <div class="list">
            <div class="hd"><span>Task</span><span>Status</span></div>
            ${list.map((w) => `<div class="r ${selected === w.id ? 'on' : ''}" data-id="${w.id}">
              <span>${w.iconName === 'exe' ? '' : ''}${w.title}</span><span>Running</span></div>`).join('')
              || '<div class="r"><span style="color:#888">No applications are running.</span><span></span></div>'}
          </div>
          <div class="foot">
            <button class="btn" data-act="end">End Task</button>
            <button class="btn" data-act="switch">Switch To</button>
            <button class="btn" data-act="new">New Task…</button>
          </div>`;
        panel.querySelectorAll('.r[data-id]').forEach((r) => r.addEventListener('click', () => {
          selected = r.dataset.id;
          renderApps();
        }));
        panel.querySelector('[data-act="end"]').addEventListener('click', () => {
          const target = wm.windows.get(selected);
          if (target) { target.close(); selected = null; renderApps(); }
          else ctx.sfx.error();
        });
        panel.querySelector('[data-act="switch"]').addEventListener('click', () => {
          const target = wm.windows.get(selected);
          if (target) wm.focus(target);
        });
        panel.querySelector('[data-act="new"]').addEventListener('click', () => {
          wm.prompt({ title: 'Create New Task', label: 'Open:', value: 'notepad' })
            .then((v) => { if (v) ctx.shell.runCommand(v); });
        });
      };

      const renderProcs = () => {
        const rows = [
          ['System Idle Process', 0, 'SYSTEM', 28],
          ['explorer.exe', 892, ctx.settings.get('userName'), 14208],
          ['svchost.exe', 932, 'SYSTEM', 4820],
          ['lsass.exe', 660, 'SYSTEM', 1832],
          ['csrss.exe', 604, 'SYSTEM', 4128],
          ...wm.list().map((w, i) => [`${w.appId}.exe`, 1200 + i * 8, ctx.settings.get('userName'), 6000 + i * 2400]),
        ];
        panel.innerHTML = `
          <div class="list">
            <div class="hd"><span>Image Name</span><span>Mem Usage</span></div>
            ${rows.map(([n, pid, user, mem]) => `<div class="r"><span>${n} <span style="color:#888">(${pid})</span></span><span>${mem.toLocaleString()} K</span></div>`).join('')}
          </div>
          <div class="foot"><span style="margin-right:auto;color:#555">Processes: ${rows.length}</span>
            <button class="btn" data-act="endp">End Process</button></div>`;
        panel.querySelector('[data-act="endp"]').addEventListener('click', () => {
          wm.alert('Access is denied.\n\nThese processes are simulated, but the refusal is authentic.', 'Task Manager');
        });
      };

      let perfTimer = null;
      const renderPerf = () => {
        clearInterval(perfTimer);
        panel.innerHTML = `
          <div class="perf">
            <div class="meter">
              <h5>CPU Usage</h5>
              <canvas width="260" height="64"></canvas>
              <div class="val"><span>CPU Usage</span><b data-cpu>6%</b></div>
            </div>
            <div class="meter">
              <h5>PF Usage</h5>
              <canvas width="260" height="64"></canvas>
              <div class="val"><span>Page File Usage</span><b data-mem>210 MB</b></div>
            </div>
            <div class="meter" style="flex:1 1 100%">
              <h5>Totals</h5>
              <table style="font-size:11px;border-collapse:collapse;width:100%">
                <tr><td>Handles</td><td style="text-align:right">4,128</td><td>Threads</td><td style="text-align:right">312</td></tr>
                <tr><td>Processes</td><td style="text-align:right">${18 + wm.count}</td><td>Physical Memory</td><td style="text-align:right">1,048 MB</td></tr>
                <tr><td>Commit Charge</td><td style="text-align:right">${210 + wm.count * 12} MB</td><td>Kernel Memory</td><td style="text-align:right">64 MB</td></tr>
              </table>
            </div>
          </div>`;
        const canvases = panel.querySelectorAll('canvas');
        const cpuEl = panel.querySelector('[data-cpu]');
        const memEl = panel.querySelector('[data-mem]');

        const drawGraph = (cv, hist, color) => {
          const g = cv.getContext('2d');
          g.fillStyle = '#0b0f00';
          g.fillRect(0, 0, cv.width, cv.height);
          g.strokeStyle = '#2b3a12';
          g.lineWidth = 1;
          for (let x = 0; x < cv.width; x += 20) {
            g.beginPath(); g.moveTo(x, 0); g.lineTo(x, cv.height); g.stroke();
          }
          for (let y = 0; y < cv.height; y += 16) {
            g.beginPath(); g.moveTo(0, y); g.lineTo(cv.width, y); g.stroke();
          }
          g.fillStyle = color;
          const step = cv.width / hist.length;
          hist.forEach((v, i) => {
            const h = (v / 100) * cv.height;
            g.fillRect(i * step, cv.height - h, Math.max(2, step - 0.5), h);
          });
          g.fillStyle = '#c8ff30';
        };

        const tick = () => {
          const load = Math.min(96, 6 + wm.count * 7 + Math.random() * 14 + (ctx.__busy ? 18 : 0));
          cpuHistory.push(load); cpuHistory.shift();
          memHistory.push(Math.min(92, 26 + wm.count * 3 + Math.random() * 6)); memHistory.shift();
          drawGraph(canvases[0], cpuHistory, '#7bff3c');
          drawGraph(canvases[1], memHistory, '#ffd23c');
          cpuEl.textContent = `${Math.round(load)}%`;
          memEl.textContent = `${Math.round(180 + wm.count * 24)} MB`;
        };
        tick();
        perfTimer = setInterval(tick, 900);
        win.onClose(() => { clearInterval(perfTimer); return true; });
      };

      const render = () => {
        tabs.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
        clearInterval(perfTimer);
        if (tab === 'apps') renderApps();
        else if (tab === 'procs') renderProcs();
        else renderPerf();
      };

      tabs.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-tab]');
        if (!b) return;
        tab = b.dataset.tab;
        render();
      });

      const mb = menuBar(body, [
        { label: 'File', items: () => [
          { label: 'New Task (Run…)', action: () => wm.prompt({ title: 'Create New Task', label: 'Open:', value: 'notepad' })
            .then((v) => { if (v) ctx.shell.runCommand(v); }) },
          { label: 'Exit Task Manager', action: () => win.close() },
        ] },
        { label: 'Options', items: () => [
          { label: 'Always On Top', checked: false, disabled: true },
          { label: 'Minimize On Use', checked: false, disabled: true },
        ] },
        { label: 'View', items: () => [
          { label: 'Refresh Now', kbd: 'F5', action: render },
          { label: 'Update Speed', submenu: [{ label: 'High' }, { label: 'Normal', checked: true }, { label: 'Low' }] },
        ] },
        { label: 'Help', items: () => [
          { label: 'Task Manager Help', action: () => ctx.openApp('help') },
        ] },
      ]);
      body.insertBefore(mb.el, body.firstChild);

      render();
      const unsub = wm.subscribe(() => { if (!win.closed) render(); });
      win.onClose(() => { unsub(); return true; });
    },
  });
}

export default launch;
