/* ============================================================
   icons.js — hand-drawn XP-ish SVG icons (no external assets)
   Every icon is an inline <svg> string, 32x32 viewBox.
   ============================================================ */

const grad = (id, from, to, vertical = true) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${vertical ? 0 : 1}" y2="${vertical ? 1 : 0}">
     <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
   </linearGradient>`;

const defs = {
  folder: grad('gFolder', '#ffdf7d', '#e0a111'),
  folderD: grad('gFolderD', '#f7c948', '#c98a08'),
  screen: grad('gScreen', '#9fd4ff', '#1b62c0'),
  metal: grad('gMetal', '#f6f7f9', '#b9bfc9'),
  blue: grad('gBlue', '#7fb8f5', '#1d4f9e'),
  green: grad('gGreen', '#a8e063', '#3f8f1e'),
  red: grad('gRed', '#ff9b8a', '#c0291a'),
  paper: grad('gPaper', '#ffffff', '#e8e8e8'),
  gold: grad('gGold', '#ffe9a8', '#c99b23'),
  glass: grad('gGlass', '#eaf4ff', '#9ec4ee'),
  purple: grad('gPurple', '#c9a6f2', '#6a3fb0'),
  dark: grad('gDark', '#4a5360', '#14181e'),
};

const wrap = (inner, extra = '') =>
  `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" ${extra} aria-hidden="true">${inner}</svg>`;

const I = {};

/* ---------- Shell / system ---------- */
I.computer = wrap(`
  <defs>${defs.metal}${defs.screen}${defs.dark}</defs>
  <rect x="3" y="4" width="26" height="18" rx="2" fill="url(#gMetal)" stroke="#6f7885" stroke-width="1.2"/>
  <rect x="5" y="6" width="22" height="13" rx="1" fill="url(#gScreen)"/>
  <path d="M5 6h22v5H5z" fill="#ffffff44"/>
  <rect x="13" y="22" width="6" height="4" fill="#9aa3ae"/>
  <path d="M8 27h16l1.5 3h-19z" fill="url(#gDark)"/>
  <circle cx="25" cy="20.4" r="1" fill="#7bff7b"/>`);

I.drive = wrap(`
  <defs>${defs.metal}</defs>
  <path d="M4 19h24l-3 7H7z" fill="#c9ced6" stroke="#77808c" stroke-width="1.1"/>
  <rect x="4" y="11" width="24" height="9" rx="2" fill="url(#gMetal)" stroke="#77808c" stroke-width="1.1"/>
  <rect x="7" y="14" width="12" height="3" rx="1" fill="#8f98a4"/>
  <circle cx="25" cy="15.5" r="1.3" fill="#5ad35a"/>`);

I.floppy = wrap(`
  <rect x="5" y="4" width="22" height="24" rx="2" fill="#2b2f36" stroke="#14171b"/>
  <rect x="9" y="5" width="14" height="9" fill="#c8ced6"/>
  <rect x="16" y="6.5" width="5" height="6" fill="#8f98a4"/>
  <rect x="9" y="18" width="14" height="10" fill="#e8ebef"/>
  <path d="M12 19h8v7h-8z" fill="#fff" stroke="#b9c0c9"/>`);

I.cd = wrap(`
  <defs>${defs.glass}</defs>
  <circle cx="16" cy="16" r="13" fill="url(#gGlass)" stroke="#8fb0d4"/>
  <circle cx="16" cy="16" r="9" fill="#cfe6ff" opacity=".55"/>
  <circle cx="16" cy="16" r="4" fill="#f6fbff" stroke="#9cb6cf"/>
  <circle cx="16" cy="16" r="1.6" fill="#b9cfe6"/>`);

I.network = wrap(`
  <defs>${defs.metal}</defs>
  <rect x="3" y="18" width="12" height="9" rx="1.5" fill="url(#gMetal)" stroke="#6f7885"/>
  <rect x="17" y="18" width="12" height="9" rx="1.5" fill="url(#gMetal)" stroke="#6f7885"/>
  <rect x="10" y="4" width="12" height="9" rx="1.5" fill="url(#gMetal)" stroke="#6f7885"/>
  <path d="M16 18v-5M9 18v-3h14v3" stroke="#5a6472" stroke-width="1.6" fill="none"/>
  <circle cx="16" cy="8.5" r="1.6" fill="#4a9f4a"/>`);

I.recycle = wrap(`
  <defs>${defs.glass}${defs.green}</defs>
  <path d="M9 10h14l-1.6 17a2 2 0 0 1-2 1.8h-6.8a2 2 0 0 1-2-1.8z" fill="#cfe0ef" stroke="#7c93a8"/>
  <path d="M9 10h14l-.3 3H9.3z" fill="#a9bfd2"/>
  <ellipse cx="16" cy="10" rx="7" ry="2" fill="#eaf4ff" stroke="#7c93a8"/>
  <path d="M14 15l3.5 9M18 15l-3.5 9M13 19.5h6" stroke="#3f8f1e" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M13 13.5v2.5" stroke="#7c93a8" stroke-width="1"/>`);

I.recycleEmpty = wrap(`
  <path d="M9 10h14l-1.6 17a2 2 0 0 1-2 1.8h-6.8a2 2 0 0 1-2-1.8z" fill="#e6eef5" stroke="#9aa9b8"/>
  <path d="M9 10h14l-.3 3H9.3z" fill="#bccbd8"/>
  <ellipse cx="16" cy="10" rx="7" ry="2" fill="#f7fbfe" stroke="#9aa9b8"/>
  <path d="M13.5 16l2.5 6M18.5 16l-2.5 6" stroke="#9fc4b4" stroke-width="2" stroke-linecap="round"/>`);

I.user = wrap(`
  <defs>${defs.blue}${defs.purple}</defs>
  <circle cx="16" cy="11" r="6" fill="#f2c9a0" stroke="#c99b74"/>
  <path d="M4 30c0-6.6 5.4-9.6 12-9.6S28 23.4 28 30z" fill="url(#gBlue)" stroke="#1d4f9e"/>
  <path d="M9 9.5c0-4 3-6.5 7-6.5s7 2.5 7 6.5c0-2-2-3.2-7-3.2S9 7.5 9 9.5z" fill="#6b4a2f"/>`);

I.gear = wrap(`
  <defs>${defs.metal}</defs>
  <path d="M16 3l3 3 4-1 1 4 4 1-1 4 3 3-3 3 1 4-4 1-1 4-4-1-3 3-3-3-4 1-1-4-4-1 1-4-3-3 3-3-1-4 4-1 1-4 4 1z" fill="url(#gMetal)" stroke="#77808c" stroke-width="1"/>
  <circle cx="16" cy="16" r="6" fill="#dfe4ea" stroke="#77808c"/>
  <circle cx="16" cy="16" r="2.4" fill="#8f98a4"/>`);

I.display = wrap(`
  <defs>${defs.metal}${defs.screen}${defs.gold}</defs>
  <rect x="2" y="5" width="28" height="18" rx="2" fill="url(#gMetal)" stroke="#6f7885"/>
  <rect x="4" y="7" width="24" height="13" fill="url(#gScreen)"/>
  <path d="M6 18c4-6 8-8 20-9v11z" fill="#8fd67a" opacity=".8"/>
  <rect x="14" y="23" width="4" height="3" fill="#9aa3ae"/>
  <path d="M9 28h14l1 2H8z" fill="#4a5360"/>
  <path d="M23 3l3 3-6 6-3-3z" fill="url(#gGold)"/>
  <path d="M20 12l-4-4-2 5z" fill="#c0392b"/>`);

I.windows = wrap(`
  <defs><linearGradient id="gW1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff8a7a"/><stop offset="1" stop-color="#c0392b"/></linearGradient>
  ${grad('gW2', '#ffe08a', '#e0a111')}${grad('gW3', '#a8e063', '#3f8f1e')}${grad('gW4', '#9fd4ff', '#1b62c0')}</defs>
  <path d="M4 9l11-2.2v9.4H4z" fill="url(#gW1)"/>
  <path d="M16.4 6.5L28 4v12.2H16.4z" fill="url(#gW3)"/>
  <path d="M4 17.4h11v9.4L4 24.6z" fill="url(#gW4)"/>
  <path d="M16.4 17.4H28V28l-11.6-2.3z" fill="url(#gW2)"/>`);

I.shutdown = wrap(`
  <defs>${defs.red}</defs>
  <circle cx="16" cy="16" r="12" fill="url(#gRed)" stroke="#8e1e12" stroke-width="1.2"/>
  <path d="M16 8v8" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
  <path d="M10.5 11.5a8 8 0 1 0 11 0" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>`);

I.logoff = wrap(`
  <defs>${defs.gold}</defs>
  <circle cx="16" cy="16" r="12" fill="url(#gGold)" stroke="#a8791a"/>
  <path d="M20 9l-7 7 7 7" stroke="#7a5410" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <path d="M13 16h10" stroke="#7a5410" stroke-width="2.6" stroke-linecap="round"/>`);

I.help = wrap(`
  <defs>${defs.blue}</defs>
  <circle cx="16" cy="16" r="13" fill="url(#gBlue)" stroke="#1d4f9e"/>
  <text x="16" y="24" text-anchor="middle" font-family="Tahoma,sans-serif" font-size="19" font-weight="bold" fill="#fff">?</text>`);

I.search = wrap(`
  <circle cx="14" cy="14" r="8" fill="#dff0ff" stroke="#4a6f9e" stroke-width="2.4"/>
  <path d="M20 20l7 7" stroke="#4a6f9e" stroke-width="3.4" stroke-linecap="round"/>
  <path d="M10 11a5 5 0 0 1 5-2" stroke="#fff" stroke-width="2" fill="none"/>`);

I.run = wrap(`
  <defs>${defs.metal}</defs>
  <rect x="3" y="6" width="26" height="20" rx="2" fill="url(#gMetal)" stroke="#77808c"/>
  <rect x="5" y="8" width="22" height="16" fill="#1b2430"/>
  <path d="M8 13l4 3-4 3" stroke="#7bff7b" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <path d="M14 19h6" stroke="#7bff7b" stroke-width="1.8" stroke-linecap="round"/>`);

/* ---------- Files ---------- */
I.folder = wrap(`
  <defs>${defs.folder}${defs.folderD}</defs>
  <path d="M3 8a2 2 0 0 1 2-2h7l3 3h10a2 2 0 0 1 2 2v3H3z" fill="url(#gFolderD)" stroke="#b8860b" stroke-width=".8"/>
  <path d="M4.5 12h24.8l-2 15a2 2 0 0 1-2 1.7H7.4a2 2 0 0 1-2-1.7z" fill="url(#gFolder)" stroke="#b8860b" stroke-width=".8"/>
  <path d="M4.5 12h24.8l-.4 3H4.9z" fill="#fff6cc" opacity=".7"/>`);

I.folderOpen = wrap(`
  <defs>${defs.folder}${defs.folderD}</defs>
  <path d="M3 8a2 2 0 0 1 2-2h7l3 3h10a2 2 0 0 1 2 2v3H3z" fill="url(#gFolderD)" stroke="#b8860b" stroke-width=".8"/>
  <path d="M2.5 13h25l-3.4 14.5a2 2 0 0 1-2 1.5H6.6a2 2 0 0 1-2-1.6z" fill="url(#gFolder)" stroke="#b8860b" stroke-width=".8"/>
  <path d="M2.5 13h25l-.8 3.4H3.3z" fill="#fff6cc" opacity=".65"/>`);

I.txt = wrap(`
  <defs>${defs.paper}</defs>
  <path d="M7 3h12l7 7v19H7z" fill="url(#gPaper)" stroke="#9aa3ae"/>
  <path d="M19 3l7 7h-7z" fill="#d7dde4" stroke="#9aa3ae"/>
  <path d="M10 14h12M10 18h12M10 22h8" stroke="#8892a0" stroke-width="1.4"/>`);

I.image = wrap(`
  <rect x="5" y="5" width="22" height="22" rx="1.5" fill="#fff" stroke="#9aa3ae"/>
  <rect x="6.5" y="6.5" width="19" height="19" fill="#bfe3ff"/>
  <circle cx="12" cy="12" r="2.6" fill="#ffe066"/>
  <path d="M6.5 22l6-7 5 5 3-3 5 5v4.5h-19z" fill="#5aa469"/>`);

I.exe = wrap(`
  <defs>${defs.glass}</defs>
  <rect x="5" y="5" width="22" height="22" rx="3" fill="url(#gGlass)" stroke="#7a93ad"/>
  <rect x="7" y="7" width="18" height="7" fill="#2f6fd0"/>
  <path d="M10 11h4M10 19h12M10 22h8" stroke="#5a6b7d" stroke-width="1.4"/>
  <path d="M9 21h14" stroke="#c9d6e3"/>`);

I.file = wrap(`
  <path d="M7 3h12l7 7v19H7z" fill="#fff" stroke="#9aa3ae"/>
  <path d="M19 3l7 7h-7z" fill="#d7dde4" stroke="#9aa3ae"/>
  <path d="M10 16h12M10 20h9" stroke="#a9b3c0" stroke-width="1.4"/>`);

/* ---------- Apps ---------- */
I.notepad = wrap(`
  <defs>${defs.paper}</defs>
  <rect x="5" y="3" width="22" height="26" rx="1.5" fill="url(#gPaper)" stroke="#8a94a2"/>
  <rect x="8" y="7" width="16" height="2.4" fill="#cdd6e0"/>
  <path d="M9 9h13v15H9z" fill="#bfe3ff"/>
  <path d="M10.5 12h9M10.5 15h9M10.5 18h6" stroke="#5b7f9e" stroke-width="1.2"/>
  <path d="M5 3h22v4H5z" fill="#2f6fd0" opacity=".85"/>`);

I.paint = wrap(`
  <defs>${defs.gold}${defs.blue}${defs.red}${defs.green}</defs>
  <path d="M16 3c7.2 0 13 4.9 13 11 0 3.4-2.6 4.6-5 4.6h-3c-1.6 0-2.6 1.1-2.6 2.4 0 1 .4 1.6.4 2.6 0 1.8-1.5 3.4-3.8 3.4C8.5 27 3 21.6 3 15.4 3 8.4 8.9 3 16 3z"
        fill="#f7f0d8" stroke="#a8956a"/>
  <circle cx="10" cy="12" r="2.3" fill="#e04a3a"/>
  <circle cx="15" cy="9" r="2.3" fill="#f2c14e"/>
  <circle cx="20.5" cy="10.5" r="2.3" fill="#3d8fd8"/>
  <circle cx="23" cy="16" r="2.3" fill="#7bc043"/>
  <circle cx="9.5" cy="18" r="2.3" fill="#a463d8"/>`);

I.cmd = wrap(`
  <rect x="2.5" y="5" width="27" height="21" rx="2" fill="#0b0f14" stroke="#5a6472"/>
  <rect x="4" y="6.5" width="24" height="18" fill="#000"/>
  <path d="M7 12l4 3-4 3" stroke="#e6e6e6" stroke-width="1.7" fill="none" stroke-linecap="round"/>
  <path d="M13 18h6" stroke="#e6e6e6" stroke-width="1.7" stroke-linecap="round"/>
  <rect x="2.5" y="3" width="27" height="3" rx="1" fill="#3f8cf3"/>`);

I.calc = wrap(`
  <defs>${defs.metal}</defs>
  <rect x="6" y="2" width="20" height="28" rx="2" fill="url(#gMetal)" stroke="#77808c"/>
  <rect x="8.5" y="4.5" width="15" height="5" fill="#cfe8a8" stroke="#8a9a6a"/>
  <g fill="#5a6472">
    <rect x="8.5" y="12" width="4" height="3.4"/><rect x="14" y="12" width="4" height="3.4"/><rect x="19.5" y="12" width="4" height="3.4"/>
    <rect x="8.5" y="17" width="4" height="3.4"/><rect x="14" y="17" width="4" height="3.4"/><rect x="19.5" y="17" width="4" height="3.4"/>
    <rect x="8.5" y="22" width="4" height="3.4"/><rect x="14" y="22" width="4" height="3.4"/>
  </g>
  <rect x="19.5" y="22" width="4" height="3.4" fill="#c0392b"/>`);

I.mine = wrap(`
  <circle cx="16" cy="17" r="9" fill="#111" stroke="#444"/>
  <circle cx="13" cy="14" r="2.6" fill="#ffffff55"/>
  <path d="M16 4v5M9 6l3 4M23 6l-3 4M5 17h4M23 17h4M8 25l3-3M24 25l-3-3" stroke="#222" stroke-width="2" stroke-linecap="round"/>
  <circle cx="16" cy="5" r="1.6" fill="#c0392b"/>`);

I.cards = wrap(`
  <rect x="4" y="6" width="16" height="22" rx="2" fill="#fff" stroke="#8892a0" transform="rotate(-8 12 17)"/>
  <rect x="11" y="4" width="16" height="22" rx="2" fill="#fff" stroke="#8892a0" transform="rotate(6 19 15)"/>
  <text x="19" y="18" text-anchor="middle" font-family="Tahoma,sans-serif" font-size="12" font-weight="bold" fill="#c0392b" transform="rotate(6 19 15)">A♥</text>`);

I.ie = wrap(`
  <defs>${defs.blue}</defs>
  <circle cx="16" cy="17" r="11" fill="url(#gBlue)" stroke="#123f80"/>
  <text x="16" y="25" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-weight="bold" font-size="21" fill="#fff">e</text>
  <ellipse cx="16" cy="12" rx="15" ry="5" fill="none" stroke="#f2c14e" stroke-width="2.6" transform="rotate(-18 16 12)"/>`);

I.media = wrap(`
  <defs>${defs.blue}${defs.glass}</defs>
  <rect x="2" y="16" width="28" height="13" rx="4" fill="url(#gBlue)" stroke="#123f80"/>
  <path d="M2 22h28" stroke="#ffffff55"/>
  <rect x="2" y="3" width="28" height="14" rx="3" fill="url(#gGlass)" stroke="#7a93ad"/>
  <path d="M14 7l6 3.6-6 3.6z" fill="#1b62c0"/>
  <circle cx="9" cy="25.5" r="2" fill="#e9f4ff"/><circle cx="16" cy="25.5" r="2" fill="#e9f4ff"/><circle cx="23" cy="25.5" r="2" fill="#e9f4ff"/>`);

I.mail = wrap(`
  <rect x="3" y="8" width="26" height="17" rx="2" fill="#f3f7fd" stroke="#7a93ad"/>
  <path d="M3 9l13 9 13-9" fill="none" stroke="#4a83c4" stroke-width="1.8"/>
  <path d="M3 24l9-8M29 24l-9-8" stroke="#c3d3e2" stroke-width="1.4"/>`);

I.control = wrap(`
  <defs>${defs.metal}${defs.blue}</defs>
  <rect x="2" y="5" width="28" height="22" rx="2" fill="url(#gMetal)" stroke="#77808c"/>
  <rect x="4" y="7" width="24" height="18" fill="#fff"/>
  <circle cx="10" cy="12" r="2.4" fill="#3f8cf3"/><circle cx="16" cy="12" r="2.4" fill="#e04a3a"/>
  <circle cx="22" cy="12" r="2.4" fill="#7bc043"/><circle cx="10" cy="19" r="2.4" fill="#f2c14e"/>
  <circle cx="16" cy="19" r="2.4" fill="#a463d8"/><circle cx="22" cy="19" r="2.4" fill="#3a6ea5"/>`);

I.messenger = wrap(`
  <defs>${defs.blue}</defs>
  <circle cx="14" cy="12" r="7" fill="#7bc043" stroke="#3f6b1e"/>
  <circle cx="21" cy="19" r="6" fill="#3f8cf3" stroke="#123f80"/>
  <circle cx="11.5" cy="11" r="1.2" fill="#123"/><circle cx="17" cy="11" r="1.2" fill="#123"/>
  <path d="M11 15c2 1.4 4.5 1.4 6.6 0" stroke="#123" stroke-width="1.2" fill="none"/>`);

/* toolbar / action icons (16px designed, scale up fine) */
I.back = wrap(`<path d="M20 8L11 16l9 8" fill="none" stroke="#2f6fd0" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 16h13" stroke="#2f6fd0" stroke-width="3.2" stroke-linecap="round"/>`);
I.forward = wrap(`<path d="M12 8l9 8-9 8" fill="none" stroke="#2f6fd0" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 16H8" stroke="#2f6fd0" stroke-width="3.2" stroke-linecap="round"/>`);
I.up = wrap(`<path d="M16 7l9 9h-5v9h-8v-9H7z" fill="#3f8f1e" stroke="#2c6b14" stroke-width="1"/>`);
I.upFolder = wrap(`<path d="M16 6l10 10h-6v10H12V16H6z" fill="#f7c948" stroke="#b8860b"/>`);
I.refresh = wrap(`<path d="M26 16a10 10 0 1 1-3-7.2" fill="none" stroke="#2f6fd0" stroke-width="3" stroke-linecap="round"/><path d="M26 5v7h-7" fill="none" stroke="#2f6fd0" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`);
I.home = wrap(`<path d="M16 5L4 16h4v11h7v-7h2v7h7V16h4z" fill="#f7c948" stroke="#a8791a"/>`);
I.stop = wrap(`<circle cx="16" cy="16" r="11" fill="#e04a3a" stroke="#8e1e12"/><path d="M11 11l10 10M21 11L11 21" stroke="#fff" stroke-width="3"/>`);
I.save = wrap(`<rect x="4" y="4" width="24" height="24" rx="2" fill="#2b2f36"/><rect x="9" y="5" width="14" height="9" fill="#c8ced6"/><rect x="16" y="6.5" width="5" height="6" fill="#8f98a4"/><rect x="9" y="18" width="14" height="10" fill="#e8ebef"/>`);
I.open = wrap(`<defs></defs><path d="M3 9a2 2 0 0 1 2-2h7l3 3h9a2 2 0 0 1 2 2v2H3z" fill="#e0a111"/><path d="M3 12h26l-3 15H6z" fill="#ffdf7d" stroke="#c98a08"/>`);
I.new = wrap(`<path d="M7 3h12l7 7v19H7z" fill="#fff" stroke="#9aa3ae"/><path d="M19 3l7 7h-7z" fill="#d7dde4" stroke="#9aa3ae"/><path d="M16 15v9M11.5 19.5h9" stroke="#3f8f1e" stroke-width="2.4" stroke-linecap="round"/>`);
I.play = wrap(`<path d="M10 6l14 10-14 10z" fill="#fff"/>`);
I.pause = wrap(`<rect x="9" y="7" width="5" height="18" fill="#fff"/><rect x="18" y="7" width="5" height="18" fill="#fff"/>`);
I.stopSq = wrap(`<rect x="9" y="9" width="14" height="14" fill="#fff"/>`);
I.next = wrap(`<path d="M9 6l10 10-10 10z" fill="#fff"/><rect x="20" y="6" width="3" height="20" fill="#fff"/>`);
I.prev = wrap(`<path d="M23 6l-10 10 10 10z" fill="#fff"/><rect x="9" y="6" width="3" height="20" fill="#fff"/>`);
I.volume = wrap(`<path d="M5 12h5l7-6v20l-7-6H5z" fill="#fff"/><path d="M21 11a7 7 0 0 1 0 10M24 8a11 11 0 0 1 0 16" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>`);
I.mute = wrap(`<path d="M5 12h5l7-6v20l-7-6H5z" fill="#fff"/><path d="M21 12l7 8M28 12l-7 8" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`);
I.disk = wrap(`<circle cx="16" cy="16" r="11" fill="#2f6fd0" stroke="#123f80"/><circle cx="16" cy="16" r="3" fill="#fff"/>`);
I.clockIcon = wrap(`<circle cx="16" cy="16" r="12" fill="#fff" stroke="#6f7885" stroke-width="2"/><path d="M16 8v8l6 4" fill="none" stroke="#123" stroke-width="2.4" stroke-linecap="round"/>`);
I.cut = wrap(`<path d="M8 5l16 18M24 5L8 23" stroke="#5a6472" stroke-width="2.2"/><circle cx="7" cy="25" r="3.4" fill="#c9d6e3" stroke="#5a6472"/><circle cx="25" cy="25" r="3.4" fill="#c9d6e3" stroke="#5a6472"/>`);
I.copy = wrap(`<rect x="6" y="5" width="16" height="20" fill="#fff" stroke="#7a93ad"/><rect x="11" y="9" width="16" height="20" fill="#f4f9ff" stroke="#7a93ad"/>`);
I.paste = wrap(`<rect x="6" y="5" width="20" height="24" rx="1" fill="#eef3f9" stroke="#7a93ad"/><rect x="11" y="3" width="10" height="5" fill="#c9d6e3" stroke="#7a93ad"/><path d="M10 16h12M10 20h12M10 24h8" stroke="#8892a0"/>`);
I.delete = wrap(`<path d="M11 8h10l-1 19h-8z" fill="#e6eef5" stroke="#8a94a2"/><path d="M8 8h16" stroke="#8a94a2" stroke-width="2.4"/><path d="M13 4h6" stroke="#8a94a2" stroke-width="2.4"/>`);
I.rename = wrap(`<path d="M6 24l2-6L22 4l4 4L12 22z" fill="#f2c14e" stroke="#a8791a"/><path d="M20 6l4 4" stroke="#a8791a"/>`);
I.props = wrap(`<rect x="5" y="4" width="22" height="24" rx="2" fill="#fff" stroke="#7a93ad"/><rect x="5" y="4" width="22" height="6" fill="#2f6fd0"/><path d="M9 14h14M9 18h14M9 22h9" stroke="#8892a0" stroke-width="1.4"/>`);
I.power = wrap(`<path d="M16 4v10" stroke="#2f6fd0" stroke-width="3.4" stroke-linecap="round"/><path d="M9 9a9 9 0 1 0 14 0" fill="none" stroke="#2f6fd0" stroke-width="3.4" stroke-linecap="round"/>`);
I.star = wrap(`<path d="M16 4l3.8 8 8.7 1-6.4 6 1.6 8.6L16 23.8 8.3 27.6l1.6-8.6-6.4-6 8.7-1z" fill="#f2c14e" stroke="#b8860b"/>`);
I.lock = wrap(`<rect x="7" y="14" width="18" height="14" rx="2" fill="#f2c14e" stroke="#a8791a"/><path d="M11 14v-4a5 5 0 0 1 10 0v4" fill="none" stroke="#a8791a" stroke-width="2.4"/>`);
I.info = wrap(`<circle cx="16" cy="16" r="13" fill="#2f6fd0" stroke="#123f80"/><circle cx="16" cy="10" r="1.8" fill="#fff"/><path d="M16 14v9" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`);
I.warn = wrap(`<path d="M16 4l13 24H3z" fill="#f2c14e" stroke="#a8791a" stroke-linejoin="round"/><path d="M16 11v8" stroke="#5b4210" stroke-width="2.6" stroke-linecap="round"/><circle cx="16" cy="23" r="1.6" fill="#5b4210"/>`);
I.error = wrap(`<circle cx="16" cy="16" r="13" fill="#d63c2a" stroke="#8e1e12"/><path d="M11 11l10 10M21 11L11 21" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/>`);
I.question = I.help;

/* Paint tools */
I.tPencil = wrap(`<path d="M6 26l3-8L23 4l4 5L13 23z" fill="#f2c14e" stroke="#a8791a"/><path d="M23 4l4 5 3-3-4-4z" fill="#c9d6e3"/><path d="M6 26l3-1.4L7.4 23z" fill="#333"/>`);
I.tBrush = wrap(`<path d="M8 24c4 0 6-3 6-6l8-11 4 3-9 11c-3 3-5 4-9 3z" fill="#c9d6e3" stroke="#7a93ad"/><path d="M6 26c2 2 6 3 8 1s-1-5-3-5-4 0-5 4z" fill="#c0392b"/>`);
I.tEraser = wrap(`<path d="M5 20L17 8l8 8-12 12H9z" fill="#f6c9c0" stroke="#b5766a"/><path d="M13 12l8 8-4 4-8-8z" fill="#fff"/>`);
I.tLine = wrap(`<path d="M6 26L26 6" stroke="#333" stroke-width="2.6"/><circle cx="6" cy="26" r="2" fill="#333"/><circle cx="26" cy="6" r="2" fill="#333"/>`);
I.tRect = wrap(`<rect x="5" y="8" width="22" height="16" fill="none" stroke="#333" stroke-width="2.4"/>`);
I.tEllipse = wrap(`<ellipse cx="16" cy="16" rx="11" ry="8" fill="none" stroke="#333" stroke-width="2.4"/>`);
I.tFill = wrap(`<path d="M6 18l10-9 8 8-9 10z" fill="#9fd4ff" stroke="#4a83c4"/><path d="M23 16c3 4 4 6 4 8a4 4 0 0 1-8 0c0-2 1-4 4-8z" fill="#2f6fd0"/>`);
I.tPicker = wrap(`<path d="M22 4l6 6-4 4-2-2-9 9-4 1 1-4 9-9-2-2z" fill="#c9d6e3" stroke="#5a6472"/><circle cx="8" cy="24" r="3" fill="#c0392b"/>`);
I.tSpray = wrap(`<rect x="12" y="12" width="9" height="16" rx="2" fill="#c9d6e3" stroke="#5a6472"/><rect x="14" y="7" width="5" height="6" fill="#8f98a4"/><g fill="#2f6fd0"><circle cx="8" cy="10" r="1.4"/><circle cx="6" cy="15" r="1.2"/><circle cx="9" cy="20" r="1.3"/><circle cx="5" cy="21" r="1.1"/><circle cx="11" cy="6" r="1.2"/></g>`);
I.tText = wrap(`<path d="M7 6h18v4h-6v16h-6V10H7z" fill="#5a6472"/>`);

let cache = new Map();

/** Returns raw SVG markup for a named icon. */
export function icon(name, cls = '') {
  const key = name + '|' + cls;
  if (cache.has(key)) return cache.get(key);
  let svg = I[name] || I.file;
  if (cls) svg = svg.replace('<svg ', `<svg class="${cls}" `);
  cache.set(key, svg);
  return svg;
}

/** A detached <svg> element (handy when you need a DOM node). */
export function iconEl(name, cls = '') {
  const t = document.createElement('template');
  t.innerHTML = icon(name, cls).trim();
  return t.content.firstElementChild;
}

/** Guess an icon name from a filename. */
export function fileIcon(name = '') {
  const ext = name.split('.').pop().toLowerCase();
  if (name.includes('.')) {
    if (['txt', 'log', 'ini', 'bat', 'sys', 'cfg'].includes(ext)) return 'txt';
    if (['png', 'jpg', 'jpeg', 'gif', 'bmp'].includes(ext)) return 'image';
    if (['exe', 'com', 'dll'].includes(ext)) return 'exe';
    if (['wav', 'mp3', 'mid'].includes(ext)) return 'media';
  }
  return 'file';
}

export function extLabel(name = '') {
  const parts = name.split('.');
  if (parts.length < 2) return 'File';
  const ext = parts.pop().toLowerCase();
  const map = { txt: 'Text Document', png: 'PNG Image', jpg: 'JPEG Image', exe: 'Application',
    bat: 'MS-DOS Batch File', ini: 'Configuration Settings', wav: 'Wave Sound', dll: 'Application Extension',
    lnk: 'Shortcut', sys: 'System File', log: 'Text Document', mp3: 'MP3 Audio' };
  return map[ext] || (ext.toUpperCase() + ' File');
}

export default I;
