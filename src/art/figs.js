// Figurer: assets/sprites/fig_<id>.png + fig_<id>.json (kontrakt i docs/RETNING.md).
//   json: { "cell": [w, h], "poses": { "idle": [række, frames], "talk": [række, 4], "blink": [række, 2], ... } }
// Mangler arket (eller json'en), tegnes en tydelig pladsholder: farvet klods med navn, øjne og simpel talemund.
// Intet herinde kaster: Image.onerror og fetch-fejl ender bare i pladsholderen.
import { text1bit } from '../core/stage.js';

export const FIGS = {
  sloev: { name: 'Skipper Sløv', col: '#5b6f9a', top: '#e8e4d8' },
  marianne: { name: 'Marianne', col: '#2f6f4a', top: '#d9c070' },
  krumme: { name: 'Bager Krumme', col: '#e8e4d8', top: '#ffffff' },
  decimal: { name: 'Frk. Decimal', col: '#7a3f6a', top: '#3a2a1a' },
  gram: { name: 'Vægtmester Gram', col: '#8a6a2a', top: '#5e5a52' },
  knold: { name: 'Konstabel Knold', col: '#27408a', top: '#16224a' },
  kurt: { name: 'Kiosk-Kurt', col: '#c0562a', top: '#f2e6b8' },
  sofus: { name: 'Sofus Sofa', col: '#6f8f3a', top: '#8a5a3a' },
  ulla: { name: 'Ufo-Ulla', col: '#4a8a8a', top: '#c4c5c5' },
  mumle: { name: 'Mumle', col: '#8a2f3f', top: '#222222' },
};
export const FIG_IDS = Object.keys(FIGS);
// Udtryk: rækkerne udtryk1/udtryk2 er enkeltbilleder (frame = udtryk). Navn → [række, frame].
export const UDTRYK = { glad: ['udtryk1', 0], sur: ['udtryk1', 1], forvirret: ['udtryk1', 2], taenker: ['udtryk1', 3], griner: ['udtryk2', 0], gaber: ['udtryk2', 1], vinker: ['udtryk2', 2], peger: ['udtryk2', 3] };
// Sofus står uden sofa i udtryk2: kun udtryk1 + hans egen vinke-pose; gaber findes ikke for ham.
const SOFUS_U = { griner: 'glad', peger: 'taenker', vinker: 'vinke', gaber: null };
// Egne poser, som figuren selv spiller i ny og næ, når ingen taler. Et udtryksnavn i listen holdes ca. 10 trin i stedet.
const ROLLE = {
  krumme: ['aelte', 'glad', 'smage', 'gaber', 'overrasket', 'taenker'], decimal: ['pegepind', 'taenker', 'rette', 'gaber', 'skuffet', 'glad'],
  gram: ['veje', 'taenker', 'aflaese', 'gaber', 'triumf', 'glad'], knold: ['spise', 'gaber', 'salut', 'glad', 'taenker'],
  kurt: ['taelle', 'glad', 'skeptisk', 'taenker', 'gaber'], sofus: ['zappe', 'taenker', 'vinke', 'glad'],
  ulla: ['spejde', 'taenker', 'notere', 'gaber', 'aha', 'glad'], mumle: ['spille', 'glad', 'bukke', 'taenker', 'gaber'],
};
export const figName = (id) => (FIGS[id] ? FIGS[id].name : id);
const PH_CELL = [48, 100]; // pladsholderens "celle", så skalering virker ens med og uden ark
const sheets = new Map(); // id → { im, cell, poses }

/** Hent alle ark, der findes. Returnerer listen af id'er med rigtigt ark. Kaster aldrig. */
export async function loadFigs(ids = FIG_IDS) {
  await Promise.all(ids.map(async (id) => {
    try {
      const [im, meta] = await Promise.all([
        new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = `assets/sprites/fig_${id}.png`; }),
        fetch(`assets/sprites/fig_${id}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);
      if (im && meta && Array.isArray(meta.cell) && meta.poses && meta.poses.idle) sheets.set(id, { im, cell: meta.cell, poses: meta.poses });
    } catch { /* pladsholder */ }
  }));
  return [...sheets.keys()];
}
export const hasFig = (id) => sheets.has(id);
export const hasPose = (id, pose) => sheets.has(id) && !!sheets.get(id).poses[pose];
export const figCell = (id) => (sheets.has(id) ? sheets.get(id).cell : PH_CELL);

/** Tegn én frame. (x, y) = fodpunkt (midt, bund). Ukendt pose → idle. scale ganges på cellens pixels. */
export function drawFig(g, id, pose = 'idle', frame = 0, x = 0, y = 0, scale = 1) {
  const sh = sheets.get(id);
  if (!sh) return placeholder(g, id, pose, frame, x, y, scale);
  const [cw, ch] = sh.cell;
  const p = sh.poses[pose] || sh.poses.idle;
  const n = Math.max(1, p[1] | 0), f = ((frame | 0) % n + n) % n;
  const w = Math.round(cw * scale), h = Math.round(ch * scale);
  g.imageSmoothingEnabled = false;
  g.drawImage(sh.im, f * cw, p[0] * ch, cw, ch, Math.round(x - w / 2), Math.round(y - h), w, h);
}

function placeholder(g, id, pose, frame, x, y, s) {
  const F = FIGS[id] || { name: id, col: '#888888', top: '#444444' };
  const R = (v) => Math.round(v * s);
  const X = Math.round(x), Y = Math.round(y);
  const bw = R(40), bh = R(62), hw = R(30), hh = R(30), bob = pose === 'idle' && (frame & 1) ? 1 : 0;
  const by = Y - bh, hy = by - hh + bob;
  g.fillStyle = '#1b1b1b'; g.fillRect(X - bw / 2 - 1, by - 1, bw + 2, bh + 1); // kontur
  g.fillStyle = F.col; g.fillRect(X - bw / 2, by, bw, bh);
  g.fillStyle = '#1b1b1b'; g.fillRect(X - hw / 2 - 1, hy - 1, hw + 2, hh + 2);
  g.fillStyle = '#e8c4a0'; g.fillRect(X - hw / 2, hy, hw, hh);
  g.fillStyle = F.top; g.fillRect(X - hw / 2 - R(3), hy - R(6), hw + R(6), R(8)); // hat/hår i figurens anden farve
  // øjne: blink frame 1 og sove = lukkede
  const closed = (pose === 'blink' && (frame & 1)) || pose === 'sove';
  const ex = Math.max(2, R(4)), ey = hy + R(11);
  g.fillStyle = '#1b1b1b';
  for (const dx of [-R(7), R(7) - ex + 1]) g.fillRect(X + dx, closed ? ey + ex - 1 : ey, ex, closed ? 1 : ex);
  // talemund: 4 trin
  const m = pose === 'talk' ? [0, 2, 4, 3][frame & 3] : 0, mw = R(10);
  g.fillRect(X - mw / 2, hy + R(21), mw, Math.max(1, R(1 + m)));
  // navneskilt på maven
  const font = `700 ${s >= 0.8 ? 10 : 9}px "Comic Neue","Comic Sans MS",sans-serif`;
  let lab = text1bit(F.name.toUpperCase(), font, '#ffffff', '#000000');
  if (lab.width > bw + 10) lab = text1bit(F.name.split(/[ -]/).pop().toUpperCase(), font, '#ffffff', '#000000'); // små figurer: kun sidste navn, så naboerne ikke dækker hinanden
  g.drawImage(lab, Math.round(X - lab.width / 2), by + R(18));
}

/** Udtryk → [pose, frame] for netop denne figur, eller null (intet ark/ingen række, Sofus uden gaber, Sløv/Marianne). */
export function udtryk(id, navn, t = performance.now()) {
  if (id === 'sofus' && navn in SOFUS_U) navn = SOFUS_U[navn];
  if (navn === 'vinke') return hasPose(id, 'vinke') ? ['vinke', Math.floor(t / 300) % 2] : null;
  const u = UDTRYK[navn];
  return u && hasPose(id, u[0]) ? [u[0], u[1]] : null;
}

// ---------- hvem taler (sættes af say() i core/dialog.js via opts.who) ----------
// mood = sætningens udtryk; openAt = sidst munden var åben (ms). held = figuren, der holder sit udtryk, mens der ventes på klik.
export const talk = { who: null, mouth: 0, mood: null, openAt: 0, held: null };
const kort = new Map(); // id → { navn, until }: kortvarigt udtryk uden for tale (hilsen, hover, opgave løst, fest)
/** Vis et udtryk i ms millisekunder, når figuren ikke taler. Taber altid til en tvungen pose i stand(). */
export function setMood(id, navn, ms) { kort.set(id, { navn, until: performance.now() + ms }); }
export const figDebug = {}; // id → [pose, frame], sidst tegnet af stand() (til test)

/** Automatisk pose på 10 fps step-ur: talk mens figuren taler, ellers idle med et blink i ny og næ. t = ms. */
export function autoPose(id, t) {
  const now = performance.now();
  if (talk.who === id) { // udtrykket vises, når munden har været lukket i mindst 120 ms
    const u = talk.mood && now - talk.openAt >= 120 && udtryk(id, talk.mood, t);
    return u || ['talk', talk.mouth | 0];
  }
  if (talk.held === id && talk.mood) { const u = udtryk(id, talk.mood, t); if (u) return u; }
  const m = kort.get(id);
  if (m && now < m.until) { const u = udtryk(id, m.navn, t); if (u) return u; }
  const step = Math.floor(t / 100), off = (FIG_IDS.indexOf(id) + 1) * 7;
  const k = (step + off) % 37; // blink ca. hvert 3,7 s, forskudt pr. figur
  if (k < 2) return ['blink', k];
  // rolle-animation ca. hvert 14. sekund (forskudt pr. figur), skiftevis figurens egne poser; 3 trin pr. frame, sidste frame holdes lidt
  const R = ROLLE[id], sh = sheets.get(id);
  if (R && sh && !talk.who) {
    const s2 = step + off * 9, c = s2 % 140, pose = R[Math.floor(s2 / 140) % R.length], p = sh.poses[pose];
    if (UDTRYK[pose]) { const u = c < 10 && udtryk(id, pose, t); if (u) return u; } // udtryk holdes ca. 1 s
    else if (p && c < p[1] * 3 + 6) return [pose, Math.min(p[1] - 1, Math.floor(c / 3))];
  }
  return ['idle', Math.floor(step / 5)];
}
/** Stil en figur i scenen med fodpunkt (x, y) og højde h px. opts.pose/opts.frame tvinger en pose (fx 'sove', 'synke'); den vinder over udtryk. */
export function stand(g, id, x, y, h, t, opts = {}) {
  const [pose, frame] = opts.pose ? (talk.who === id ? ['talk', talk.mouth | 0] : [opts.pose, opts.frame ?? Math.floor(t / 500)]) : autoPose(id, t);
  figDebug[id] = [pose, frame];
  drawFig(g, id, pose, frame, x, y, h / figCell(id)[1]);
}
