// Bykortet: steder i Måneby, figurer, Fnugger, hjælper i hjørnet. save.act styrer, hvad der er åbent. Klokken er altid 16:20.
import { register, goto, button, lock } from '../core/scene.js';
import { drawText } from '../core/stage.js';
import { bg, drawFnug, castShadow, sprite, contactShadow } from '../art/placeholder.js';
import { buildSwap, drawPlot } from '../art/fx.js';
import { helper, countHelpClick, showHelper } from '../core/dialog.js';
import { save, persist, touch } from '../core/state.js';
import { sfx, play, music, preload, audioCtx } from '../core/audio.js';
import { tell } from '../script.js';
import { stand, hasPose } from '../art/figs.js';

// Kontrakt (docs/RETNING.md): plot-id → minispil-fil. game = fil i src/ware/games (og baggrundsnavn); act = akten stedet åbner i;
// fig = figuren der står ved stedet; mission = 3D-mission der startes herfra.
export const PLOTS = [
  { id: 'drivhus', name: 'Drivhus 7', x: 320, y: 255, kind: 'hall', scene: 'drivhus', act: 1, fig: 'marianne' },
  { id: 'vaegt', name: 'Vægten', x: 205, y: 428, kind: 'pad', game: 'landing', act: 1, fig: 'gram' },
  { id: 'bageri', name: 'Munchies-bageriet', x: 275, y: 362, kind: 'dome', game: 'bakery', act: 1, fig: 'krumme' },
  { id: 'skole', name: 'Frk. Decimals time', x: 185, y: 335, kind: 'box', game: 'school', act: 1, fig: 'decimal' },
  { id: 'vanding', name: 'Vandingen', x: 372, y: 350, kind: 'tower', game: 'ice', act: 2, fig: 'marianne' },
  { id: 'bed', name: 'Plantebedet', x: 520, y: 285, kind: 'dome', game: 'scope', act: 2, fig: 'ulla' },
  { id: 'blanding', name: 'Blandeforholdet', x: 462, y: 340, kind: 'box', game: 'ratio', act: 2, fig: 'mumle' },
  { id: 'popcorn', name: 'Popcorn-fabrikken', x: 405, y: 432, kind: 'pit', game: 'quarry', act: 3, fig: 'knold' },
  { id: 'lampe', name: 'Lampen', x: 608, y: 318, kind: 'tower', game: 'light', act: 3, fig: 'gram' },
  { id: 'kiosk', name: 'Kiosken', x: 305, y: 448, kind: 'pad', game: 'kiosk', act: 3, fig: 'kurt' },
  { id: 'afstemning', name: 'Afstemningen', x: 160, y: 250, kind: 'hall', game: 'hall', act: 4, fig: 'decimal' },
  { id: 'krater', name: 'Krateret', x: 590, y: 232, kind: 'pit', mission: 'taage', act: 4, fig: 'ulla' },
];
export const ACT_NAMES = ['Frø', 'Vækst', 'Blomst', 'Høst'];
export const MISSION = { 2: 'drivhus', 3: 'kiosk', 4: 'taage' }; // akt → 3D-mission (sætter save.flags['fp_' + mission])
export const FNUG_POS = [[235, 298], [332, 302], [430, 296], [150, 372], [512, 366], [248, 404], [335, 392], [562, 348], [286, 292], [256, 470], [424, 476], [395, 262]]; // alle 12 er hjemme
const HUBFIGS = [ // figurer der står i byen: fodpunkt + højde
  { id: 'ulla', x: 248, y: 266, h: 52 },
  { id: 'knold', x: 478, y: 404, h: 58 },
  { id: 'kurt', x: 362, y: 468, h: 64 },
  { id: 'mumle', x: 602, y: 462, h: 64 },
];
const SOFA = { x: 512, y: 468 };
export const persp = (y) => Math.round((0.84 + 0.16 * Math.min(1, Math.max(0, (y - 250) / 210))) * 100) / 100;
export const act = () => Math.max(1, Math.min(4, save.act || 1));
/** Aktens minispil er løst. */
export const actDone = (n = act()) => PLOTS.filter((p) => p.game && p.act === n).every((p) => save.done[p.id]);
/** Aktens 3D-mission er løst (akt 1 har ingen). */
export const missionDone = (n = act()) => !MISSION[n] || !!save.flags['fp_' + MISSION[n]];
/** Alt i akten er klaret → Dagens regnskab kan læses. */
export const actReady = (n = act()) => actDone(n) && missionDone(n);
/** Hvor "Fortsæt" på titlen skal føre hen: [scene-id, arg]. */
export function resumeTarget() {
  if (save.flags.regn4) return ['fest'];
  if (!save.flags['akt' + act()]) return ['drivhus'];
  return ['hub', { back: true }];
}
const F12 = '700 12px "Comic Neue","Comic Sans MS",sans-serif', F14 = '700 14px "Comic Neue","Comic Sans MS",sans-serif';

// ---------- musik efter kontrakten (assets/music/<navn>.ogg). Manglende fil giver hverken fejl eller ventetid. ----------
const mangler = new Set();
let oensket = null;
export function spil(navn) {
  oensket = navn;
  if (!navn || mangler.has(navn) || !audioCtx()) return;
  const src = `assets/music/${navn}.ogg`;
  try {
    preload([src]).then(([buf]) => { if (!buf) { mangler.add(navn); return; } if (oensket === navn) return music(src); }).catch(() => {});
  } catch { /* ingen lyd */ }
}
addEventListener('pointerdown', () => setTimeout(() => oensket && spil(oensket), 80), { once: true }); // lyden tændes først ved første klik

/** Hjælperen står i DOM-canvasset #helper; skyggen tegnes på scenen. */
export function helperShadow(g) {
  if (!helper.visible) return;
  const im = sprite('helper'); if (!im) return;
  const n = Math.max(1, Math.round(im.width / (im.height / 2))), fw = im.width / n;
  const k = Math.min(130 / fw, 250 / im.height), w = Math.round(fw * k), h = Math.round(im.height * k), x0 = 6 + Math.round((130 - w) / 2);
  castShadow(g, im, 0, 0, fw, im.height, x0, 476, w, h, false);
}
/** Lille skilt på en pæl (bus, priser, program). Hårde rektangler. */
export function skilt(g, x, y, lines, { w = 54, col = '#f2e6b8', ink = '#222222' } = {}) {
  const h = 6 + lines.length * 12;
  g.fillStyle = '#3a2a1a'; g.fillRect(x - 1, y - 14, 3, 14);
  g.fillStyle = '#1b1b1b'; g.fillRect(x - w / 2 - 1, y - 14 - h - 1, w + 2, h + 2);
  g.fillStyle = col; g.fillRect(x - w / 2, y - 14 - h, w, h);
  lines.forEach((s, i) => drawText(s, x, y - 14 - h + 1 + i * 12, { align: 'center', font: '700 10px "Comic Neue","Comic Sans MS",sans-serif', color: ink }));
}
/** Sofus i sofaen: stadie 1–4, han synker længere ned for hver akt. */
export function drawSofus(g, x, y, stage, tm, h = 60) {
  g.fillStyle = '#1b1b1b'; g.fillRect(x - 37, y - 39, 74, 40);
  g.fillStyle = '#7a4a3a'; g.fillRect(x - 36, y - 38, 72, 38); // ryglæn
  g.fillStyle = '#93604c'; g.fillRect(x - 32, y - 34, 64, 4);
  if (hasPose('sofus', 'synke')) stand(g, 'sofus', x, y - 6, h, tm, { pose: 'synke', frame: stage - 1 });
  else {
    const sink = [0, 14, 28, 40][stage - 1];
    g.save(); g.beginPath(); g.rect(x - 40, y - 120, 80, 120 - 16); g.clip(); // alt under sædekanten er sunket ned i sofaen
    stand(g, 'sofus', x, y - 8 + sink, h, tm);
    g.restore();
  }
  g.fillStyle = '#1b1b1b'; g.fillRect(x - 41, y - 17, 82, 18);
  g.fillStyle = '#8a5644'; g.fillRect(x - 40, y - 16, 80, 16); // sæde/front
  g.fillStyle = '#a56a54'; g.fillRect(x - 40, y - 16, 80, 3);
  g.fillStyle = '#6b4032'; g.fillRect(x - 44, y - 26, 10, 26); g.fillRect(x + 34, y - 26, 10, 26); // armlæn
}

// Liv på himlen (docs/LOOK.md: mindst tre ting bevæger sig, alt på trin-ur): stjerner der blinker i hårde trin, og en satellit der kravler forbi.
const STJERNER = [[38, 52], [96, 118], [150, 38], [214, 96], [262, 56], [322, 124], [372, 44], [436, 92], [470, 30], [512, 132], [628, 150], [70, 150]];
export function himmel(g, tm) {
  const step = Math.floor(tm / 300);
  STJERNER.forEach(([x, y], i) => {
    const f = (step + i * 7) % 23; // hver stjerne blinker 2 trin ud af 23, forskudt
    if (f > 1) return;
    g.fillStyle = '#ffffff'; g.fillRect(x, y, 1, 1);
    if (f === 0) { g.fillStyle = '#bfd0ff'; g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); }
  });
  const t = Math.floor(tm / 200) % 520, sx = 660 - t * 2; // satellit: 2 px pr. trin fra højre mod venstre, pause når den er ude
  if (sx > -10) { const sy = 34 + Math.floor(t / 22); g.fillStyle = '#dfe1ea'; g.fillRect(sx, sy, 3, 2); g.fillStyle = '#4f8fd0'; g.fillRect(sx - 4, sy, 3, 2); g.fillRect(sx + 4, sy, 3, 2); if (Math.floor(tm / 600) % 2) { g.fillStyle = '#ff4030'; g.fillRect(sx + 1, sy - 1, 1, 1); } }
}

register({
  id: 'hub',
  async enter(arg = {}) {
    this.bgc = bg('hub');
    this.n = this.n || {};
    helper.present = true; showHelper(true);
    spil('byen');
    const a = act();
    const jb = save.flags.justBuilt; if (jb) { delete save.flags.justBuilt; touch(); }
    button('Gem', 8, 8, async () => { sfx.ok(); persist(true); await tell('gemt', { i: save.log.length >= 2 ? 1 : 0, auto: 900, noPortrait: true }); }, { w: 60 });
    button('Luk', 76, 8, () => { persist(true); goto('title'); }, { w: 60 });
    lock(false);
    if (jb) { const p = PLOTS.find((x) => x.id === jb.id); if (p) await buildSwap(p, Math.max(0, jb.stage - 1), jb.stage, {}); }
    if (arg.first) await tell('hub_first');
    else if (arg.ny) await tell('hub_ny', { i: a - 2 });
    else if (arg.back) {
      if (!actDone(a)) await tell('hub_back', { auto: 1800 });
      else if (!missionDone(a)) await tell('hub_klar', { i: a - 1 });
      else if (a === 1) await tell('hub_klar', { i: 0 });
      else {
        const m = MISSION[a], efter = { kiosk: 'kiosk_mission_efter', taage: 'krater_efter' }[m];
        if (efter && !save.flags['sagt_' + m]) { save.flags['sagt_' + m] = true; touch(); await tell(efter); await tell('hub_regn', { i: a - 2 }); } // lige hjemme fra ægte 3D
        else await tell('hub_regn', { i: a - 2 });
      }
    }
  },
  exit() { showHelper(false); },
  hotspots() {
    const a = act();
    const hs = [{ id: 'help', x: 6, y: 226, w: 130, h: 250, label: 'Hjælp', on: () => this.help() }]; // først i listen: alt andet vinder over Hjælp
    const [sx, sy] = FNUG_POS[6];
    hs.push({ id: 'syv', x: sx - 16, y: sy - 44, w: 32, h: 46, label: 'Syv', on: () => this.snak('syv') });
    hs.push({ id: 'ur', x: 556, y: 4, w: 80, h: 22, label: 'Uret', on: () => this.snak('ur') });
    hs.push({ id: 'bus', x: 18, y: 172, w: 56, h: 52, label: 'Busstoppested', on: () => { play('fx_bus_horn'); this.snak('bus'); } });
    hs.push({ id: 'program', x: 492, y: 172, w: 58, h: 44, label: 'Festprogram', on: () => this.snak('program', a - 1) });
    for (const p of PLOTS) hs.push({ id: p.id, x: p.x - 34, y: p.y - 48, w: 68, h: 58, label: p.act > a ? '?' : p.name + (save.buildings[p.id] ? ` (${save.buildings[p.id]}/3)` : ''), cursor: 'hand', on: () => this.pick(p) });
    for (const f of HUBFIGS) hs.push({ id: 'fig_' + f.id, x: f.x - 18, y: f.y - f.h, w: 36, h: f.h + 4, label: f.id === 'kurt' ? 'Kiosk-Kurt' : { ulla: 'Ufo-Ulla', knold: 'Konstabel Knold', mumle: 'Mumle' }[f.id], on: () => this.figur(f.id) });
    hs.push({ id: 'fig_sofus', x: SOFA.x - 44, y: SOFA.y - 62, w: 88, h: 64, label: 'Sofus Sofa', on: () => this.figur('sofus') });
    return hs;
  },
  async snak(k, i) { sfx.click(); await tell(k, { i }); },
  async figur(id) {
    const a = act();
    sfx.click();
    if (id === 'kurt') return tell('kurt_pris', { i: a - 1 });
    const n = this.n[id] = (this.n[id] || 0) + 1;
    await tell(id + '_hub', { i: (a - 1) * 2 + ((n - 1) % 2) });
  },
  async pick(p) {
    const a = act();
    if (p.id === 'kiosk' && a < 3) { sfx.bzzt(); await tell('kurt_pris', { i: a - 1 }); return; } // Kurt svarer selv for sin lukkede kiosk
    if (p.act > a) { sfx.bzzt(); await tell('laast', { i: p.act - 2, auto: 1600, noPortrait: true }); return; }
    play('ui_hub_klik');
    if (p.mission) { // Krateret: kun et afsæt til 3D-missionen
      if (!actDone(a)) return tell('krater_vent');
      if (save.flags['fp_' + p.mission]) return tell('krater_efter');
      return goto('sted', p);
    }
    if (p.id === 'kiosk' && a === 3 && save.done.kiosk && !save.flags.fp_kiosk) return actDone(3) ? goto('sted', p) : tell('kiosk_vent');
    goto(p.scene || 'task', p);
  },
  async help() { countHelpClick(); sfx.click(); await tell('help'); },
  bg(g, dt, tm) {
    const a = act();
    g.drawImage(this.bgc, 0, 0);
    himmel(g, tm);
    helperShadow(g);
    skilt(g, 46, 222, ['BUS', '7 MIN'], { w: 46, col: '#ffd21f' });
    skilt(g, 521, 214, ['FEST-', 'PROGRAM'], { w: 54 });
    // tegn alt bagfra og frem (y-sorteret), så figurer og huse dækker hinanden rigtigt
    const items = [];
    for (const p of PLOTS) if (!p.scene) items.push({ y: p.y, draw: () => { // Drivhus 7 står i selve baggrunden
      drawPlot(g, p, save.buildings[p.id] || (p.mission && save.flags['fp_' + p.mission] ? 3 : 0), false, persp(p.y));
      if (p.act > a) drawText('?', p.x, p.y - 62, { align: 'center', font: '700 30px "Comic Neue","Comic Sans MS",sans-serif', color: '#ffd21f', outline: '#000' });
    } });
    const stepper = Math.floor(tm / 3200) % FNUG_POS.length, stepPhase = (tm % 3200) < 400 ? 1 : 0;
    // Fnuggerne står STILLE (æra-regel) — én tager et enkelt skridt ad gangen. Syv (id 6) vinker.
    FNUG_POS.forEach(([x, y], i) => items.push({ y, draw: () => drawFnug(g, x, y, persp(y) * 0.8, { id: i, frame: i === 6 ? Math.floor(tm / 500) % 2 : (i === stepper ? stepPhase : 0) }) }));
    for (const f of HUBFIGS) items.push({ y: f.y, draw: () => { contactShadow(g, f.x - 14, f.y, 22); stand(g, f.id, f.x, f.y, f.h, tm); } });
    items.push({ y: SOFA.y, draw: () => drawSofus(g, SOFA.x, SOFA.y, a, tm) });
    items.sort((p, q) => p.y - q.y).forEach((it) => it.draw());
    skilt(g, 314, 479, ['PRISER', ['+1/2', '+1/3', '+1/4', '+1/5'][a - 1]], { w: 40, col: '#ffffff', ink: '#a02020' });
    drawText('DRIVHUS 7', 320, 188, { align: 'center', font: F12, color: '#bfffb0', outline: '#000' });
  },
  draw(g) {
    if (!document.getElementById('dialog').hidden) return; // topbjælken viger for tekstboksen
    drawText('Kl. 16:20', 630, 10, { align: 'right', font: F14, color: '#fff', outline: '#000' });
    drawText(`${save.name} · Akt ${act()}: ${ACT_NAMES[act() - 1]}`, 146, 12, { font: F12, color: '#fff', outline: '#000' });
  },
});
