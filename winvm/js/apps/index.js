/* ============================================================
   index.js — the program registry
   ============================================================ */

import * as explorer from './explorer.js';
import * as notepad from './notepad.js';
import * as paint from './paint.js';
import * as cmd from './cmd.js';
import * as calc from './calc.js';
import * as winmine from './minesweeper.js';
import * as solitaire from './solitaire.js';
import * as ie from './ie.js';
import * as media from './media.js';
import * as control from './control.js';
import * as display from './display.js';
import * as taskmgr from './taskmgr.js';
import * as recycle from './recycle.js';
import * as vm from './vm.js';
import * as help from './help.js';

export const APPS = {
  explorer,
  notepad,
  paint,
  cmd,
  calc,
  winmine,
  solitaire,
  ie,
  media,
  control,
  display,
  taskmgr,
  recycle,
  vm,
  help,
  about: { launch: help.launchAbout },
  run: { launch: help.launchRun },
};

export default APPS;
