// Boot: hent gemt spil, registrér scener, dev-parametre, start.
import './core/stage.js';
import './core/cursor.js';
import { goto, current } from './core/scene.js';
import { loadState, save, persist } from './core/state.js';
import './scenes/boot.js';
import { PLOTS, MISSION, act } from './scenes/hub.js';
import { loadGames } from './scenes/task.js';
import './scenes/acts.js';
import './scenes/fp.js';
import { ensureAudio } from './core/audio.js';
import { showCursor } from './core/cursor.js';
import { loadBgs, loadSprites } from './art/placeholder.js';
import { loadFigs, drawFig } from './art/figs.js';
import { allLines } from './script.js';
import { lineCount } from './core/dialog.js';

const q = new URLSearchParams(location.search);
if (q.has('reset')) { localStorage.clear(); const { idbSet } = await import('./core/state.js'); await idbSet('save', null); } // skal køre FØR loadState
await loadState();
const games = await loadGames();
// Baggrunde, figurer og planten efter kontrakten i docs/RETNING.md — alt, der mangler, falder tilbage på kodetegnet grafik.
await loadBgs(['hub', 'drivhus', 'title', 'regnskab', 'fest', 'landing', 'bakery', 'school', 'ice', 'scope', 'ratio', 'quarry', 'light', 'kiosk', 'hall', 'krater']);
await loadSprites(['aliens', 'helper', 'plante_1', 'plante_2', 'plante_3', 'plante_4', 'drivhus_fg', 'drivhus_kurv', 'mg_vaegt_panel', 'mg_vaegt', 'mg_pose', 'mg_bakery_panel', 'mg_school_panel', 'mg_ice_panel', 'mg_ice_0', 'mg_ice_1', 'mg_ice_2', 'mg_scope_panel', 'mg_scope_1', 'mg_ratio_panel', 'mg_ratio_0', 'mg_ratio_1', 'mg_ratio_2', 'mg_ratiob_1', 'mg_ratiob_2', 'mg_quarry_panel', 'mg_quarry_0', 'mg_quarry_1', 'mg_quarry_2', 'mg_quarry_3', 'mg_light_panel', 'mg_light_0', 'mg_light_1', 'mg_light_2', 'mg_kiosk_panel', 'mg_kiosk_0', 'mg_kiosk_2', 'mg_kiosk_3', 'mg_kioskc_2', 'mg_kioskc_3', 'mg_hall_panel', 'mg_bakery_0', 'mg_bakery_1', 'mg_bakery_2', ...['vaegt', 'bageri', 'skole', 'vanding', 'bed', 'blanding', 'popcorn', 'lampe', 'kiosk', 'afstemning', 'krater'].map((n) => 'bld_' + n), ...['pad', 'dome', 'tower', 'box', 'pit', 'hall'].map((k) => 'bld_' + k)]);
const figs = await loadFigs();

/** Dev: markér en hel akt løst (minispil + 3D-mission + regnskab), som om den var spillet. */
function solveAct(n, { regn = true, mission = true } = {}) {
  for (const p of PLOTS) if (p.game && p.act === n && !save.done[p.id]) { save.done[p.id] = true; save.buildings[p.id] = 3; save.log.push({ id: p.id, name: p.name, wrong: 0, act: n }); }
  save.flags['akt' + n] = true;
  const m = MISSION[n];
  if (m && mission && !save.flags['fp_' + m]) { save.flags['fp_' + m] = true; save.log.push({ id: 'fp_' + m, name: { drivhus: 'Drivhuslabyrinten', kiosk: 'Munchies-natløbet', taage: 'Tågen over Krateret' }[m], wrong: 0, act: n }); }
  if (regn) save.flags['regn' + n] = true;
}

window.MB = { save, goto, scene: () => save.scene, cur: () => current, lines: allLines, lineCount, games, figs, drawFig, solveAct, persist };
if (q.has('dev')) {
  // ?dev&act=N (tidligere akter løst) · &klar (aktens minispil løst) · &mission (aktens 3D-mission løst) · &name=X · &scene=<id> · &plot=<plot-id>
  if (q.has('name')) save.name = q.get('name');
  if (q.has('act')) { const n = Math.max(1, Math.min(4, q.get('act') | 0)); for (let k = 1; k < n; k++) solveAct(k); save.act = n; }
  if (q.has('klar')) solveAct(act(), { regn: false, mission: q.has('mission') });
  if (q.get('scene') === 'fest') { for (let k = 1; k <= 4; k++) solveAct(k); save.act = 4; }
  if ((q.has('act') || q.has('klar') || q.get('scene') === 'fest') && !save.name) save.name = 'Praktikant';
}
if (q.has('dev') && q.get('scene')) {
  showCursor(true);
  addEventListener('pointerdown', () => ensureAudio(), { once: true });
  const plot = q.get('plot') && PLOTS.find((p) => p.id === q.get('plot'));
  if (q.get('scene') !== 'ident') { const { showOS } = await import('./core/os.js'); showOS(false); }
  await goto(q.get('scene'), plot || { first: q.has('first'), back: q.has('back') });
} else goto('ident');
