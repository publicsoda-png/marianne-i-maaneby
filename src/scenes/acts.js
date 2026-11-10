// Akt-scener: Drivhus 7 (hver akt starter her; planten er vokset ét trin), "sted" (afsæt til en 3D-mission),
// Dagens regnskab (hver akt slutter her), Høstfesten (finalen), credits og cd-kortet.
// Baggrunde og figurer er kodetegnede pladsholdere, indtil assets/bg/<navn>.png og assets/sprites/fig_<id>.png findes.
import { register, goto, button, lock } from '../core/scene.js';
import { W, H, drawText, proc, bands, stipple } from '../core/stage.js';
import { helper, showHelper } from '../core/dialog.js';
import { save, touch, persist } from '../core/state.js';
import { sfx, play, stopMusic, voice as playVoice } from '../core/audio.js';
import { t, tell, tellAll } from '../script.js';
import { voiceFor } from '../voicemap.js';
import { bg, hasBg, sprite, drawFnug, contactShadow } from '../art/placeholder.js';
import { stand, hasPose, drawFig } from '../art/figs.js';
import { ACT_NAMES, act, actDone, missionDone, helperShadow, spil, drawSofus } from './hub.js';

const F = (px) => `700 ${px}px "Comic Neue","Comic Sans MS",sans-serif`;
const dialogOpen = () => !document.getElementById('dialog').hidden;
const STEP = (tm) => Math.floor(tm / 100); // 10 fps step-ur
export const plantStage = () => act(); // frø, vækst, blomst, høst
const MISSION_I = { drivhus: 0, kiosk: 1, taage: 2 };

/** Skift til ÆGTE 3D efter kontrakten: fp-scenen sætter selv save.flags['fp_' + mission] og logger i save.log. */
async function start3d(mission, ret) {
  lock(true);
  await tell('tre_d', { i: MISSION_I[mission], auto: 1600 });
  lock(false);
  play('fx_3d_overgang');
  spil('fp');
  goto('fp', { mission, ret });
}
/** zzz over et hoved: tre z'er på step-ur. */
function zzz(g, x, y, tm, off = 0) {
  const n = (Math.floor(tm / 400) + off) % 4;
  for (let i = 0; i < n; i++) drawText('z', x + i * 6, y - i * 9, { font: F(10 + i * 2), color: '#ffffff', outline: '#000000' });
}

// ---------------------------------------------------------------- Drivhus 7
function drivhusBg() {
  if (hasBg('drivhus')) return bg('drivhus');
  return proc('drivhus@kode', (g) => {
    bands(g, 0, 0, W, 300, ['#bfe6da', '#9fd0c4'], 6);
    g.fillStyle = '#4f6f66'; for (let x = 0; x <= W; x += 80) g.fillRect(x - 2, 0, 4, 300); for (const y of [0, 96, 196, 296]) g.fillRect(0, y, W, 4); // ruder
    g.fillStyle = '#e8f6f0'; for (let x = 20; x < W; x += 80) g.fillRect(x, 106, 6, 70);
    bands(g, 0, 300, W, 180, ['#8a7a5a', '#6b5c40'], 4); // gulv
    g.fillStyle = '#6b4a2a'; g.fillRect(248, 84, 144, 30); g.fillStyle = '#f2e6b8'; g.fillRect(250, 86, 140, 26); // skilt
    g.font = F(16); g.textAlign = 'center'; g.textBaseline = 'top'; g.fillStyle = '#222'; g.fillText('DRIVHUS 7', 320, 91); g.textAlign = 'left';
    g.fillStyle = '#555'; g.fillRect(318, 114, 4, 14); g.fillStyle = '#ffe9a0'; g.fillRect(290, 128, 60, 8); // lampen
    g.fillStyle = '#5a4630'; g.fillRect(268, 432, 104, 8); // pottens skygge
    g.fillStyle = '#9a5a36'; g.fillRect(280, 384, 80, 50); g.fillStyle = '#b86e44'; g.fillRect(272, 376, 96, 12); g.fillStyle = '#3a2a1a'; g.fillRect(284, 378, 72, 6); // potten
  });
}
const PLANT_Y = 426, POT_H = 43; // pottens bund i billedet og pottens højde i plante_<n>.png
/** Skygge lige under lampen: flad oval midt under tingen (lampen hænger i midten, så skyggen falder ikke til siden). */
function plantShadow(g, cx, y, rx) {
  g.save(); g.fillStyle = stipple('#000000', 2);
  for (let dy = -7; dy <= 7; dy++) { const hw = Math.round(rx * Math.sqrt(1 - (dy * dy) / 49)); if (hw > 0) g.fillRect(cx - hw, y - 3 + dy, hw * 2, 1); }
  g.restore();
}
/** Lampen tænder i 3 hårde trin ved ankomst: mørke-raster over hele billedet, der bliver tyndere. Returnerer true når den er tændt. */
function lampOn(g, age) {
  const k = age < 350 ? 3 : age < 650 ? 2 : age < 900 ? 1 : 0;
  if (k) { g.save(); g.fillStyle = stipple('#05061a', k); g.fillRect(0, 0, W, H); g.restore(); }
  return !k;
}
/** Støvkorn i lyskeglen: faste korn, der synker i trin og driver 1 px til siden. Ingen bløde bevægelser. */
const MOTES = Array.from({ length: 16 }, (_, i) => ({ u: ((i * 37) % 16) / 15 - 0.5, y0: (i * 53) % 250, v: 1 + (i % 3), big: i % 5 === 0 }));
function dust(g, tm) {
  const step = Math.floor(tm / 200);
  g.save(); g.fillStyle = '#fff3c4';
  for (const m of MOTES) {
    const y = 120 + ((m.y0 + step * m.v) % 250), half = 30 + (y - 100) * 0.55;
    const x = Math.round(320 + m.u * 2 * half + ((step + m.y0) % 6 < 3 ? 0 : 1));
    g.fillRect(x, y, m.big ? 2 : 1, m.big ? 2 : 1);
  }
  g.restore();
}
/** Planten i 4 stadier. assets/sprites/plante_<n>.png hvis den findes (bundstillet i potten), ellers kodetegnet. Svajer 1 px på step-ur. */
function drawPlant(g, stage, tm) {
  const sway = Math.floor(tm / 800) % 2;
  const im = sprite('plante_' + stage);
  if (im) { // spriten har potten med: potten står stille, kun planten over kanten svajer 1 px
    const x = Math.round(320 - im.width / 2), base = hasBg('drivhus') ? PLANT_Y : 434, top = im.height - POT_H;
    plantShadow(g, 320, base, 54);
    g.drawImage(im, 0, top, im.width, POT_H, x, base - POT_H, im.width, POT_H);
    g.drawImage(im, 0, 0, im.width, top, x + (stage > 1 ? sway : 0), base - im.height, im.width, top);
    return;
  }
  const st = '#3f8a35', lf = '#57a544', dk = '#245220';
  if (stage === 1) { g.fillStyle = lf; g.fillRect(317, 368, 6, 10); g.fillRect(311 + sway, 364, 8, 5); g.fillRect(321 + sway, 364, 8, 5); return; }
  const hgt = [0, 0, 100, 170, 220][stage], base = 378;
  g.fillStyle = st; g.fillRect(316, base - hgt, 8, hgt);
  for (let y = base - hgt + 14, i = 0; y < base - 14; y += 26, i++) {
    const w = 26 + (i % 3) * 14 + stage * 6, dx = y < base - hgt / 2 ? sway : 0;
    g.fillStyle = i % 2 ? lf : dk; g.fillRect(320 - w + dx, y, w, 7); g.fillRect(320 - w + 6 + dx, y - 5, w - 12, 5);
    g.fillStyle = i % 2 ? dk : lf; g.fillRect(324 + dx, y + 9, w, 7); g.fillRect(324 + 6 + dx, y + 4, w - 12, 5);
  }
  if (stage >= 3) { g.fillStyle = '#c9e06a'; g.fillRect(310 + sway, base - hgt - 14, 20, 18); g.fillRect(314 + sway, base - hgt - 22, 12, 8); }
  if (stage >= 4) { g.fillStyle = '#e8c04a'; for (const [x, y] of [[282, 250], [350, 270], [296, 310], [344, 220]]) g.fillRect(x + sway, y, 10, 10); }
}
const AKT_INTRO = { 1: ['akt1_sloev', 'akt1_marianne'], 2: ['akt2_sloev', 'akt2_marianne'], 3: ['akt3_sloev', 'akt3_marianne'], 4: ['akt4_sloev', 'akt4_marianne', 'akt4_sloev2'] };

register({
  id: 'drivhus',
  async enter() {
    const a = act();
    this.stage = plantStage();
    this.bgc = drivhusBg();
    this.banner = false; this.t0 = null; this.vande = -1e9; this.lit = false;
    helper.present = true; showHelper(true);
    spil('drivhus');
    if (!save.flags['akt' + a]) { // akten starter: planten er vokset, Marianne siger noget nyt
      lock(true); this.banner = true; if (a > 1) play('fx_plante_vokser');
      for (const k of AKT_INTRO[a]) await tellAll(k);
      save.flags['akt' + a] = true; touch(); persist(true); lock(false);
      goto('hub', { first: a === 1, ny: a > 1 }); return;
    }
    button('Til byen', 150, 448, () => { sfx.click(); goto('hub', { back: true }); }, { w: 90 });
    if (!actDone(a)) { await tell('drivhus_vent', { i: a - 1 }); return; }
    if (a === 2 && !save.flags.fp_drivhus) {
      button('Gå ind mellem planterne', 250, 448, () => start3d('drivhus', 'drivhus'), { w: 190 });
      await tellAll('drivhus_mission'); return;
    }
    if (!missionDone(a)) { await tell('drivhus_mangler', { i: a - 3 }); return; }
    button('Dagens regnskab', 250, 448, () => { sfx.click(); goto('regnskab'); }, { w: 150 });
    await tell('drivhus_regn', { i: a - 1 });
  },
  exit() { showHelper(false); },
  hotspots() {
    return [
      { id: 'help', x: 6, y: 226, w: 130, h: 250, label: 'Hjælp', on: () => { sfx.click(); tell('drivhus_hjaelp'); } },
      { id: 'plante', x: 270, y: 426 - [0, 102, 127, 192, 196][this.stage], w: 100, h: [0, 102, 127, 192, 196][this.stage], label: 'Planten', on: () => { sfx.click(); this.vande = performance.now(); tell('plante', { i: this.stage - 1 }); } },
      { id: 'marianne', x: 414, y: 266, w: 92, h: 178, label: 'Marianne', on: () => { sfx.click(); tell('marianne_snak'); } },
    ];
  },
  bg(g, dt, tm) {
    if (this.t0 === null) this.t0 = tm;
    g.drawImage(this.bgc, 0, 0);
    if (hasBg('drivhus')) plantShadow(g, 71, 470, 58); else helperShadow(g); // Sløv sidder til venstre for lampen: kort skygge under ham, ikke et langt slag mod højre
    drawPlant(g, this.stage, tm);
    // Marianne står til højre for lampen: skyggen falder væk fra midten (mod højre)
    // klik på planten: Marianne træder hen til potten, vander i trin og er glad bagefter
    const dv = performance.now() - this.vande, vander = dv < 1900 && hasPose('marianne', 'vande'), mx = vander ? 398 : 460;
    const po = vander ? { pose: 'vande', frame: [0, 1, 2, 1, 2, 1, 2, 1][Math.floor(dv / 240)] } : dv < 3100 ? { pose: 'glad', frame: 0 } : {};
    contactShadow(g, mx - 14, 443, 50);
    if (vander) drawFig(g, 'marianne', 'vande', po.frame, mx, 444, 1); else stand(g, 'marianne', mx, 444, 180, tm, po); // vander færdig, også mens replikken står på skærmen
    const kurv = sprite('drivhus_kurv'), fg = sprite('drivhus_fg');
    if (kurv) g.drawImage(kurv, 536 + (Math.floor(tm / 1300) % 4 === 3 ? 1 : 0), 0); // kurven gynger 1 px i ny og næ
    if (fg) g.drawImage(fg, 0, 0); // forgrund: blade der overlapper kanten og trillebøren
    const lit = lampOn(g, tm - this.t0);
    if (lit && !this.lit) { this.lit = true; sfx.tick(); }
    if (lit) dust(g, tm);
    if (this.banner) drawText(`AKT ${act()} · ${ACT_NAMES[act() - 1].toUpperCase()}`, 16, 186, { font: F(26), color: '#ffd21f', outline: '#5a3a00' });
    if (!dialogOpen()) drawText('Kl. 16:20', 630, 10, { align: 'right', font: F(14), color: '#fff', outline: '#000' });
  },
});

// ---------------------------------------------------------------- sted: afsæt til 3D-missionen i Kiosken (akt 3) og Krateret (akt 4)
register({
  id: 'sted',
  async enter(p) {
    this.p = p;
    const mission = p.mission || p.id; // krater → taage, kiosk → kiosk
    this.bgc = bg(p.game || p.id);
    helper.present = true; showHelper(true);
    spil('plads_c');
    button('Til byen', 150, 448, () => { sfx.click(); goto('hub', { back: true }); }, { w: 90 });
    button(mission === 'taage' ? 'Gå ud i tågen' : 'Gå ind i kiosken', 250, 448, () => start3d(mission, 'hub'), { w: 160 });
    if (mission === 'taage') await tell('krater_foer'); else await tellAll('kiosk_mission');
  },
  exit() { showHelper(false); },
  bg(g, dt, tm) {
    g.drawImage(this.bgc, 0, 0); helperShadow(g);
    if (this.p.mission === 'taage') { g.fillStyle = stipple('#dfe1ea', 1); for (let i = 0; i < 3; i++) g.fillRect(0, 196 + i * 34 + (Math.floor(tm / 900 + i) % 2) * 4, W, 10); } // tågen ligger i renderen; tre tynde dither-bånd driver hen over krateret i trin
    drawText(this.p.name.toUpperCase(), 320, 96, { align: 'center', font: F(22), color: '#ffd21f', outline: '#000' });
    contactShadow(g, 540, 446, 50); stand(g, this.p.fig, 556, 446, 180, tm);
  },
});

// ---------------------------------------------------------------- Dagens regnskab (pr. akt), læst højt af Skipper Sløv
register({
  id: 'regnskab',
  async enter() {
    const a = this.a = act();
    this.rows = save.log.filter((r) => (r.act || 1) === a);
    this.shown = 0; this.total = false;
    this.bgc = hasBg('regnskab') ? bg('regnskab') : null;
    helper.present = true; showHelper(true);
    spil('drivhus'); play('fx_papir');
    lock(true);
    await tell('regn_intro', { i: a - 1 });
    for (const r of this.rows) {
      this.shown++; sfx.tick();
      await tell('regn_navn_' + r.id, { auto: 250 });
      await tell('regn_dom', { i: Math.min(3, r.wrong | 0), auto: 800 });
    }
    this.total = true; play('fx_stempel');
    await tell('regn_sum', { i: a - 1 });
    await tell('regn_slut', { i: a - 1 });
    save.flags['regn' + a] = true;
    if (a < 4) save.act = a + 1;
    touch(); persist(true); lock(false);
    goto(a < 4 ? 'drivhus' : 'fest');
  },
  exit() { showHelper(false); },
  bg(g) {
    if (this.bgc) g.drawImage(this.bgc, 0, 0); else { g.fillStyle = '#1a1230'; g.fillRect(0, 0, W, H); }
    helperShadow(g);
    g.fillStyle = '#0c0818'; g.fillRect(166, 96, 440, 340);
    g.fillStyle = '#f2e6b8'; g.fillRect(160, 90, 440, 340); g.fillStyle = '#6b4a2a'; g.fillRect(160, 90, 440, 4); g.fillRect(160, 426, 440, 4);
    drawText('DAGENS REGNSKAB', 380, 104, { align: 'center', font: F(20), color: '#222' });
    drawText(`Akt ${this.a}: ${ACT_NAMES[this.a - 1]} · Måneby, kl. 16:20`, 380, 132, { align: 'center', font: F(12), color: '#555' });
    g.fillStyle = '#6b4a2a'; g.fillRect(180, 154, 400, 1);
    this.rows.slice(0, this.shown).forEach((r, i) => {
      const y = 170 + i * 34;
      drawText(r.name, 184, y, { font: F(14), color: '#222' });
      const n = Math.min(5, r.wrong | 0);
      for (let k = 0; k < n; k++) { g.fillStyle = '#a02020'; g.fillRect(540 - k * 16 - 12, y + 3, 12, 12); } // forkerte: røde felter
      if ((r.wrong | 0) > 5) drawText('+' + ((r.wrong | 0) - 5), 540 - 5 * 16 - 6, y + 1, { font: F(12), color: '#a02020', align: 'right' });
      g.fillStyle = '#207a20'; g.fillRect(560, y + 3, 12, 12); // rigtigt: grønt felt
    });
    if (this.total) {
      const wrong = this.rows.reduce((s, r) => s + (r.wrong | 0), 0);
      g.fillStyle = '#6b4a2a'; g.fillRect(180, 376, 400, 2);
      drawText(`I alt: ${this.rows.length} rigtige · ${wrong} forkerte`, 184, 388, { font: F(16), color: '#222' });
    }
  },
});

// ---------------------------------------------------------------- Høstfesten
const GUESTS = ['marianne', 'krumme', 'decimal', 'gram', 'knold', 'kurt', 'ulla', 'mumle']; // + Sofus i sofaen yderst til højre
const SLEEP_ORDER = ['sofus', 'knold', 'krumme', 'gram', 'kurt', 'mumle', 'decimal', 'ulla', 'marianne'];
const guestX = (i) => 172 + i * 53;
const BURSTS = [[150, 150], [500, 130], [330, 112], [230, 190], [590, 180], [420, 160]];
const FYR_COL = ['#ffd21f', '#ff5a3c', '#7fe07a', '#ffffff', '#6ab0ff', '#ff8ad0'];
/** Rigtige og forkerte svar pr. akt ud fra save.log (hele spillet). */
export function tally() {
  return [1, 2, 3, 4].map((a) => { const rows = save.log.filter((r) => (r.act || 1) === a); return { ok: rows.length, wrong: rows.reduce((s, r) => s + (r.wrong | 0), 0) }; });
}
function festBg() {
  if (hasBg('fest')) return bg('fest');
  return proc('fest@kode', (g) => {
    g.drawImage(bg('hub'), 0, 0);
    g.fillStyle = '#3a2a1a'; g.fillRect(140, 84, 2, 60); g.fillRect(630, 84, 2, 60); g.fillRect(140, 92, 492, 1); // lanternesnor
    for (let x = 150, i = 0; x < 630; x += 30, i++) { g.fillStyle = '#1b1b1b'; g.fillRect(x - 1, 93, 12, 14); g.fillStyle = FYR_COL[i % 3]; g.fillRect(x, 94, 10, 12); }
  });
}

register({
  id: 'fest',
  async enter() {
    this.bgc = festBg();
    this.tal = tally();
    Object.assign(this, { chart: false, bars: 0, fyr: false, fyrT0: 0, lastBurst: -1, asleep: 0, sloevSover: false, diplom: false });
    helper.present = true; showHelper(true);
    spil('fest');
    lock(true);
    await tell('fest_velkomst', { i: 0 });
    this.chart = true;
    await tell('fest_velkomst', { i: 1 });
    for (let n = 0; n < 4; n++) { this.bars = n + 1; sfx.pop(); await tell('fest_akt', { i: n, auto: 700 }); } // hårde søjler, én akt ad gangen
    await tell('fest_soejler');
    await tell('fest_krumme'); await tell('fest_kurt');
    this.chart = false;
    await tell('fest_knold');
    this.fyr = true; this.fyrT0 = performance.now();
    await tell('fest_ulla');
    sfx.blip(440, 1.2, 0.07, 'triangle'); // Mumles tone
    await tell('fest_mumle');
    await tell('fest_gram'); await tell('fest_decimal'); await tell('fest_sofus'); await tell('fest_marianne');
    const sover = [0, 1, 3, 5, 6, 8, 8]; // hvor mange der sover, når hver del af talen begynder
    for (let i = 0; i < 7; i++) { this.asleep = sover[i]; if (i === 5) this.fyr = false; await tell('tale', { i }); }
    this.sloevSover = true; helper.mouth = 0;
    this.diplom = true; play('fx_diplom_fanfare');
    await tell('diplom', { i: 0 });
    await tell('diplom', { i: 1 });
    this.asleep = 9;
    save.flags.fest = true; touch(); persist(true);
    lock(false);
    button('Videre', 290, 340, () => { sfx.click(); goto('credits'); }, { w: 70 });
  },
  exit() { showHelper(false); },
  sleeping(id) { return SLEEP_ORDER.indexOf(id) < this.asleep; },
  bg(g, dt, tm) {
    g.drawImage(this.bgc, 0, 0); helperShadow(g);
    drawText('HØSTFEST', 386, 112, { align: 'center', font: F(30), color: '#ffd21f', outline: '#5a3a00' });
    if (this.fyr) this.fireworks(g, tm);
    // Fnuggerne: alle 12 i bagerste række. Syv (id 6) vinker — også når alle andre sover.
    const fa = Math.round((this.asleep / 9) * 12);
    for (let i = 0; i < 12; i++) {
      const x = 156 + i * 41, y = 366 + (i % 2) * 8;
      drawFnug(g, x, y, 0.72, { id: i, frame: i === 6 ? Math.floor(tm / 500) % 2 : 0 });
      if (i !== 6 && i < fa) zzz(g, x + 4, y - 44, tm, i);
    }
    GUESTS.forEach((id, i) => {
      const x = guestX(i), y = 452 + (i % 2) * 14, s = this.sleeping(id);
      contactShadow(g, x - 16, y, 30);
      stand(g, id, x, y, 92, tm, s ? { pose: 'sove', frame: 0 } : {});
      if (s) zzz(g, x + 8, y - 104, tm, i);
    });
    drawSofus(g, 598, 470, 4, tm, 60);
    if (this.sleeping('sofus')) zzz(g, 606, 398, tm, 2);
    if (this.sloevSover) zzz(g, 92, 232, tm, 1);
    if (this.chart) this.drawChart(g);
    if (this.diplom) this.drawDiplom(g);
  },
  fireworks(g, tm) {
    const s = STEP(tm - this.fyrT0); // step-ur: ny raket hvert 6. trin, hver lever 9 trin
    for (let b = Math.max(0, Math.floor(s / 6) - 1); b <= Math.floor(s / 6); b++) {
      const k = s - b * 6; if (k < 0 || k > 8) continue;
      const [bx, by] = BURSTS[b % BURSTS.length], col = FYR_COL[b % FYR_COL.length];
      if (k < 2) { g.fillStyle = '#ffffff'; g.fillRect(bx - 1, by + 60 - k * 30, 2, 10); continue; } // raketten stiger
      if (k === 2 && this.lastBurst !== b) { this.lastBurst = b; play('fx_fyrvaerkeri_' + (1 + b % 3), { gain: 0.7 }); }
      const r = (k - 1) * 7, drop = Math.round((k - 2) * (k - 2) * 0.6);
      g.fillStyle = k > 6 ? stipple(col, 2) : col;
      for (let i = 0; i < 12; i++) { const an = (i / 12) * Math.PI * 2; g.fillRect(Math.round(bx + Math.cos(an) * r) - 1, Math.round(by + Math.sin(an) * r) + drop - 1, 3, 3); }
      if (k < 6) for (let i = 0; i < 8; i++) { const an = (i / 8) * Math.PI * 2 + 0.4; g.fillRect(Math.round(bx + Math.cos(an) * r * 0.55), Math.round(by + Math.sin(an) * r * 0.55) + drop, 2, 2); }
    }
  },
  drawChart(g) {
    const x0 = 176, y0 = 148, w = 300, h = 176, base = y0 + h - 30;
    g.fillStyle = '#0c0818'; g.fillRect(x0 + 4, y0 + 4, w, h);
    g.fillStyle = '#f2e6b8'; g.fillRect(x0, y0, w, h); g.fillStyle = '#6b4a2a'; g.fillRect(x0, y0, w, 3); g.fillRect(x0, y0 + h - 3, w, 3);
    drawText('ALLE DINE SVAR', x0 + 12, y0 + 10, { font: F(14), color: '#222' });
    g.fillStyle = '#207a20'; g.fillRect(x0 + 152, y0 + 13, 10, 10); drawText('rigtige', x0 + 166, y0 + 10, { font: F(11), color: '#222' });
    g.fillStyle = '#a02020'; g.fillRect(x0 + 222, y0 + 13, 10, 10); drawText('forkerte', x0 + 236, y0 + 10, { font: F(11), color: '#222' });
    const max = Math.max(1, ...this.tal.map((v) => Math.max(v.ok, v.wrong))), unit = Math.max(4, Math.min(24, Math.floor(100 / max)));
    g.fillStyle = '#222'; g.fillRect(x0 + 14, base, w - 28, 2);
    this.tal.slice(0, this.bars).forEach((v, i) => {
      const gx = x0 + 28 + i * 66;
      const bar = (val, dx, col) => { const bh = Math.min(104, val * unit); g.fillStyle = col; g.fillRect(gx + dx, base - bh, 20, bh); drawText(String(val), gx + dx + 10, base - bh - 16, { align: 'center', font: F(12), color: '#222' }); };
      bar(v.ok, 0, '#207a20'); bar(v.wrong, 24, '#a02020');
      drawText('Akt ' + (i + 1), gx + 22, base + 6, { align: 'center', font: F(12), color: '#222' });
    });
  },
  drawDiplom(g) {
    const x0 = 180, y0 = 100, w = 300, h = 232;
    g.fillStyle = '#0c0818'; g.fillRect(x0 + 5, y0 + 5, w, h);
    g.fillStyle = '#c9a516'; g.fillRect(x0, y0, w, h); g.fillStyle = '#fbf6e0'; g.fillRect(x0 + 6, y0 + 6, w - 12, h - 12);
    g.fillStyle = '#c9a516'; g.fillRect(x0 + 12, y0 + 12, w - 24, 1); g.fillRect(x0 + 12, y0 + h - 13, w - 24, 1);
    const cx = x0 + w / 2;
    drawText('DIPLOM', cx, y0 + 22, { align: 'center', font: F(28), color: '#5a3a00' });
    drawText('tildeles', cx, y0 + 62, { align: 'center', font: F(12), color: '#555' });
    drawText(save.name || 'Praktikant', cx, y0 + 82, { align: 'center', font: F(24), color: '#222' });
    g.fillStyle = '#222'; g.fillRect(x0 + 60, y0 + 116, w - 120, 1);
    drawText('Festbestyrer, 2. grad (afrundet)', cx, y0 + 126, { align: 'center', font: F(15), color: '#222' });
    drawText('Høstfesten i Måneby, kl. 16:20', cx, y0 + 152, { align: 'center', font: F(12), color: '#555' });
    drawText('Krater Multimedie ApS, Valby', x0 + 22, y0 + 200, { font: F(10), color: '#555' });
    g.fillStyle = '#3f8a35'; for (const [dx, dy, ww] of [[0, 6, 14], [12, 2, 10], [20, 8, 16], [34, 3, 8], [40, 7, 12]]) g.fillRect(x0 + 208 + dx, y0 + 184 + dy, ww, 2); // plantens underskrift
    drawText('Planten', x0 + 236, y0 + 200, { align: 'center', font: F(10), color: '#555' });
  },
});

// ---------------------------------------------------------------- credits (kun tekst, over snorkelyde) og cd-kortet
const CREDITS = [
  ['MARIANNE I MÅNEBY', 26, '#ffd21f'], [''],
  ['En cd-rom fra Krater Multimedie ApS, Valby'], ['2005'], [''], [''],
  ['Idé og manuskript: Redaktionen på 2. sal'],
  ['Matematikfaglig konsulent: Frk. Decimal (kun brøker)'],
  ['Fortæller: Sara'],
  ['Programmering: Krater-drengene'],
  ['ÆGTE 3D: 3D-afdelingen (ét skrivebord)'],
  ['Musik: Mumle (én tone)'],
  ['Vejning: Vægtmester Gram'],
  ['Bagværk: Bager Krumme'],
  ['Orden: Konstabel Knold (bøder i alt: 0,00 kr.)'],
  ['Priser: Kiosk-Kurt (steget, mens du læste dette)'],
  ['Teorier: Ufo-Ulla'],
  ['Siddende medvirken: Sofus Sofa'],
  ['Drivhus 7: Marianne'],
  ['Planten: sig selv'],
  ['Fnuggerne: alle 12. Syv vinker.'], [''],
  ['Tak til Festkomitéen, som ikke kan huske hvorfor.'], [''],
  ['Klokken var 16:20 under hele produktionen.'],
  ['Bussen går om 7 minutter.'], [''], [''],
  ['Parodi. Alle figurer, steder og sorter er opdigtede.', 13, '#ffd21f'], [''],
  ['Krater Multimedie ApS, Valby', 12, '#aaaaaa'],
];
const CRED_LH = 24, CRED_LEN = CREDITS.length * CRED_LH;

register({
  id: 'credits',
  async enter() {
    this.t0 = performance.now(); this.off = 0; this.fast = false; this.lastStep = 0; this.snork = -1; this.gone = false;
    if (!save.flags.credits) { save.flags.credits = true; touch(); persist(true); } // Fortsæt efter genindlæsning starter her, ikke ved festen
    spil(null); stopMusic(0.5); // kun snorken
    play('fx_snork_loop', { loop: true }).then((h) => { if (this.gone) h?.stop(); else this.snorkLyd = h; }).catch(() => {});
    lock(false);
  },
  exit() { this.snorkLyd?.stop(); this.snorkLyd = null; },
  click() { this.fast = true; }, // et klik spoler
  bg(g, dt, tm) {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const s = STEP(tm - this.t0);
    if (s !== this.lastStep) { this.off += (s - this.lastStep) * (this.fast ? 24 : 3); this.lastStep = s; } // rul i hårde trin: 3 px pr. trin (30 px/s)
    CREDITS.forEach(([s2, px = 14, col = '#ffffff'], i) => {
      const y = H + 10 + i * CRED_LH - this.off;
      if (s2 && y > -30 && y < H) drawText(s2, 320, y, { align: 'center', font: F(px), color: col });
    });
    zzz(g, 590, 462, tm);
    if (!this.gone && this.off > H + CRED_LEN + 20) { this.gone = true; goto('cdkort'); }
  },
});

register({
  id: 'cdkort',
  async enter() {
    lock(true); // kortet står i 10 sekunder og kan ikke klikkes væk
    play('os_cd_eject');
    const v = voiceFor(t('cd')); if (v) { try { const p = playVoice(v.voice, v.mouth); p && p.catch && p.catch(() => {}); } catch { /* ingen tale */ } }
    await new Promise((r) => setTimeout(r, 10000));
    save.flags.slut = true; touch(); persist(true);
    lock(false);
    goto('title');
  },
  bg(g) {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#c9c3b3'; g.fillRect(120, 180, 400, 120); g.fillStyle = '#f4f1ea'; g.fillRect(120, 180, 400, 2); g.fillRect(120, 180, 2, 120);
    g.fillStyle = '#5e5a52'; g.fillRect(120, 298, 400, 2); g.fillRect(518, 180, 2, 120);
    g.fillStyle = '#1a1230'; g.fillRect(128, 188, 384, 104);
    drawText("Husk at tage cd'en ud.", 320, 226, { align: 'center', font: F(24), color: '#ffffff' });
  },
});
