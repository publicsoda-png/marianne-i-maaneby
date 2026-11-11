// Liv på bykortet (POLISH-PLAN P2): festpynt der vokser med hver løst opgave, røg fra bageriet, lampen der tænder,
// Fnugger der holder pynt og Konstabel Knolds runde. Alt på trin-ur og hårde pixels (docs/LOOK.md: "Alt går på trin-ur
// (100 ms eller langsommere). Svaj er 1 px. Ingen easing, ingen blur." / "Lys tændes og slukkes i hårde trin").
// Kun fillRect/drawImage pr. frame; alle tabeller er konstanter, stipple-mønstre caches i stage.js.
import { stipple } from '../core/stage.js';
import { sprite, contactShadow } from './placeholder.js';
import { stand, hasPose } from './figs.js';

const PYNT = ['#ffd21f', '#e04040', '#5cc85c', '#4f8fd0']; // gul/rød/grøn/blå, samme toner som skiltene

/** Antal løste minispil (0–10). Afledes af save, gemmes ikke. */
export const festTrin = (plots, save) => plots.filter((p) => p.game && save.done[p.id]).length;

/** Vimpelrække mellem to punkter med 3 px nedhæng på midten. Vimpler 6×7 px for hver 12 px, trekant i hårde rækker. */
function vimpler(g, x0, y0, x1, y1, tm) {
  const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 12)), sw = Math.floor(tm / 800) % 2;
  g.fillStyle = '#3a2a1a';
  for (let i = 0; i <= n * 3; i++) { const t = i / (n * 3), x = Math.round(x0 + (x1 - x0) * t), y = Math.round(y0 + (y1 - y0) * t + 3 * Math.sin(Math.PI * t)); g.fillRect(x, y, 2, 1); }
  for (let i = 1; i < n; i++) {
    const t = i / n, x = Math.round(x0 + (x1 - x0) * t), y = Math.round(y0 + (y1 - y0) * t + 3 * Math.sin(Math.PI * t)) + 1;
    g.fillStyle = PYNT[i % 4];
    const d = (i + sw) % 2; // hver anden vimpel svajer 1 px
    for (let r = 0; r < 7; r++) { const hw = Math.round(3 - r * 3 / 7); g.fillRect(x - hw + (r > 3 ? d : 0), y + r, hw * 2 + 1, 1); }
  }
}

/** Lyskæde: pærer 2×2 for hver 10 px langs punkterne. løb=true: hver tredje pære tændt, skifter hvert 300 ms. */
function lyskaede(g, pts, tm, loeb) {
  const step = Math.floor(tm / 300) % 3; let k = 0;
  for (let s = 0; s < pts.length - 1; s++) {
    const [x0, y0] = pts[s], [x1, y1] = pts[s + 1], n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / 10));
    for (let i = 0; i < n; i++, k++) {
      const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n) + 2;
      const on = loeb ? k % 3 === step : (k + Math.floor(tm / 900)) % 5 !== 0; // stille kæde: en enkelt pære blinker ud
      g.fillStyle = '#1b1b1b'; g.fillRect(x - 1, y - 1, 4, 4);
      g.fillStyle = on ? PYNT[k % 4] : '#4a4a52'; g.fillRect(x, y, 2, 2);
      if (on) { g.fillStyle = '#ffffff'; g.fillRect(x, y, 1, 1); }
    }
  }
}

/** Ballon (r = radius) med snor ned til (sx, sy). Svajer 1 px på 800 ms-ur. */
function ballon(g, x, y, r, col, sx, sy, tm, off = 0) {
  const d = (Math.floor(tm / 800) + off) % 2; x += d;
  g.fillStyle = '#dfe1ea'; for (let i = 0; i < sy - (y + r); i++) g.fillRect(Math.round(x + (sx - x) * i / (sy - y - r)), y + r + i, 1, 1);
  g.fillStyle = '#1b1b1b'; for (let dy = -r - 1; dy <= r + 1; dy++) { const hw = Math.round((r + 1) * Math.sqrt(Math.max(0, 1 - (dy * dy) / ((r + 1) * (r + 1)))) * 0.85); g.fillRect(x - hw, y + dy, hw * 2 + 1, 1); }
  g.fillStyle = col; for (let dy = -r; dy <= r; dy++) { const hw = Math.round(r * Math.sqrt(1 - (dy * dy) / (r * r)) * 0.85); g.fillRect(x - hw, y + dy, hw * 2 + 1, 1); }
  g.fillStyle = '#ffffff'; g.fillRect(x - Math.round(r / 2), y - Math.round(r / 2), 2, 2); // hårdt glanspunkt øverst til venstre
  g.fillStyle = col; g.fillRect(x - 1, y + r + 1, 3, 1);
}

/** Lille flag på stang (Fnug-pynt). */
function flag(g, x, y, col, tm) {
  g.fillStyle = '#3a2a1a'; g.fillRect(x, y, 1, 18);
  const d = Math.floor(tm / 800) % 2;
  g.fillStyle = '#1b1b1b'; g.fillRect(x + 1, y - 1, 10, 8);
  g.fillStyle = col; g.fillRect(x + 1, y, 9 - d, 6);
  g.fillStyle = '#ffffff'; g.fillRect(x + 1, y + 2, 9 - d, 2);
}

/** Pynt på Drivhus 7 (ligger i baggrunden, så det tegnes før de y-sorterede ting). */
export function festDrivhus(g, n, tm) {
  if (n >= 3) lyskaede(g, [[192, 234], [255, 158], [328, 243]], tm, n >= 10);
  if (n >= 1) vimpler(g, 255, 157, 428, 191, tm);
  if (n >= 6) vimpler(g, 330, 241, 460, 223, tm);
  if (n >= 9) { ballon(g, 248, 136, 5, PYNT[1], 255, 157, tm); ballon(g, 258, 130, 5, PYNT[0], 255, 157, tm, 1); ballon(g, 266, 139, 5, PYNT[3], 255, 157, tm); }
}

/** Pynt som en Fnug holder (efter drawFnug). i = Fnug-id, (x, y) = fodpunkt, s = skala, dy = skridt-løft. */
const FNUG_PYNT = [[8, 'ballon', 1], [3, 'ballon', 0], [7, 'flag', 3], [0, 'ballon', 2], [2, 'flag', 2], [8, 'flag', 1]]; // [Fnug-id, type, farve]; tærskel = n
const FNUG_TRIN = { 3: 2, 7: 5, 0: 8, 2: 10, 8: 10 };
export function fnugPynt(g, i, x, y, s, n, dy, tm) {
  const t = FNUG_TRIN[i]; if (t === undefined || n < t) return;
  const e = FNUG_PYNT.find((f) => f[0] === i && (i !== 8 || n >= 10)); if (!e) return;
  const hx = Math.round(x + 10 * s), hy = Math.round(y - 20 * s) + dy; // hånden
  if (e[1] === 'ballon') ballon(g, hx + 2, Math.round(y - 52 * s) + dy, 5, PYNT[e[2]], hx, hy, tm, i);
  else flag(g, hx, Math.round(y - 38 * s) + dy, PYNT[e[2]], tm);
}

/** Boder (render, mg_hubfest_0/1). Tegnes i y-sorteringen; mangler spriten, tegnes intet. */
export const BODER = [{ n: 4, spr: 'mg_hubfest_0', x: 100, y: 224 }, { n: 7, spr: 'mg_hubfest_1', x: 570, y: 404 }];
export function bod(g, b) {
  const im = sprite(b.spr); if (!im) return;
  contactShadow(g, b.x - im.width / 2, b.y, im.width);
  g.drawImage(im, Math.round(b.x - im.width / 2), b.y - im.height);
}

/** Røg fra bageriets skorsten (kun trin 3): tre stipple-puffer der stiger 3 px og driver 1 px pr. 400 ms-trin. */
export function roeg(g, x, y, tm) {
  const step = Math.floor(tm / 400);
  for (let k = 0; k < 3; k++) {
    const c = (step + k * 2) % 6, r = [2, 3, 4][k], px = x + c, py = y - c * 3 - 2;
    g.fillStyle = stipple('#dfe1ea', c < 4 ? 3 : 2);
    for (let dy = -r; dy <= r; dy++) { const hw = Math.round(r * Math.sqrt(1 - (dy * dy) / (r * r))); g.fillRect(px - hw, py + dy, hw * 2 + 1, 1); }
  }
}

/** Lampens glorie (kun trin 3): 20 trin à 300 ms — slukket 8, op 1-2-3, fuld 6, ned 3-2. */
const LAMPE_CYK = [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 3, 3, 3, 3, 3, 2, 1, 0];
export function lampe(g, x, y, tm) {
  const lvl = LAMPE_CYK[Math.floor(tm / 300) % LAMPE_CYK.length]; if (!lvl) return;
  for (let k = lvl; k >= 1; k--) {
    const r = [0, 6, 10, 14][k]; g.fillStyle = stipple('#ffd21f', k === 1 ? 3 : 1);
    for (let dy = -r; dy <= r; dy++) { const hw = Math.round(r * Math.sqrt(1 - (dy * dy) / (r * r))); g.fillRect(x - hw, y + dy, hw * 2 + 1, 1); }
  }
  g.fillStyle = '#fff6c0'; g.fillRect(x - 2, y - 2, 5, 5);
}

/** Knolds runde: står ved P0 20 s, går 4,8 s til P1, står 6 s, går hjem 4,8 s. 2 px pr. 200 ms-trin. kt = ms. */
const P0 = [478, 392], P1 = [526, 380], STAA0 = 20000, GAA = 4800, STAA1 = 6000, CYK = STAA0 + GAA + STAA1 + GAA;
export function knoldPos(kt) {
  const t = kt % CYK;
  const at = (k) => ({ x: P0[0] + 2 * k, y: P0[1] - Math.round(12 * k / 24) });
  if (t < STAA0) return { ...at(0), walk: false, flip: false };
  if (t < STAA0 + GAA) { const k = Math.floor((t - STAA0) / 200); return { ...at(k), walk: true, flip: false, frame: [0, 1, 0, 2][k % 4] }; }
  if (t < STAA0 + GAA + STAA1) return { ...at(24), walk: false, flip: true };
  const k = 24 - Math.floor((t - STAA0 - GAA - STAA1) / 200); return { ...at(k), walk: true, flip: true, frame: [0, 1, 0, 2][k % 4] };
}
export function drawKnold(g, kp, h, tm) {
  contactShadow(g, kp.x - 14, kp.y, 22);
  if (!kp.walk || !hasPose('knold', 'gaa')) { stand(g, 'knold', kp.x, kp.y, h, tm); return; }
  g.save();
  if (kp.flip) { g.translate(kp.x * 2, 0); g.scale(-1, 1); }
  stand(g, 'knold', kp.x, kp.y, h, tm, { pose: 'gaa', frame: kp.frame });
  g.restore();
}

/** Stuevæg med vindue foran Sofus' sofa (render, mg_hubvindue_0); fodpunkt (x, y). Mangler spriten, tegnes intet. */
export const VINDUE = true;
export function vindue(g, x, y) {
  const im = VINDUE && sprite('mg_hubvindue_0'); if (!im) return;
  contactShadow(g, x - im.width / 2, y, im.width, false, { ry: 4 });
  g.drawImage(im, Math.round(x - im.width / 2), y - im.height);
}
