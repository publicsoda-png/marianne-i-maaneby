// Teksturer til 3D-missionerne: hent assets/fp/<navn>.png hvis den findes, ellers procedural pladsholder.
// Navne, mål og tekstfelter står i docs/FP-ASSETS.md — hold de to i takt.
import { TEX, texFrom, shade, limitColors } from './ray.js';
import { text1bit, rng, img } from '../core/stage.js';

const FONT = (n) => '700 ' + n + 'px "Comic Neue","Comic Sans MS",sans-serif';
export const hex = (h) => { const n = parseInt(h.slice(1), 16); return (255 << 24) | ((n & 255) << 16) | (n & 0xff00) | (n >> 16); };
function canvas(fn) { const c = document.createElement('canvas'); c.width = c.height = TEX; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; fn(g); return c; }
const R = (g, col, x, y, w, h) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
const disc = (g, col, cx, cy, r) => { g.fillStyle = col; for (let y = -r; y <= r; y++) { const w = Math.round(Math.sqrt(r * r - y * y)); g.fillRect(cx - w, cy + y, w * 2, 1); } };

// ---------- vægge ----------
function glas(g) {
  R(g, '#9fd0c4', 0, 0, TEX, TEX);
  for (let i = 0; i < 4; i++) R(g, '#c6e8dc', 6 + i * 16, 4, 3, 56);
  for (let i = 0; i <= 4; i++) R(g, '#4f6f66', i * 16 - 1, 0, 2, TEX);
  R(g, '#4f6f66', 0, 0, TEX, 3); R(g, '#4f6f66', 0, 30, TEX, 3); R(g, '#4f6f66', 0, 61, TEX, 3);
}
function haek(g) {
  const r = rng(3), cols = ['#3f8a35', '#245220', '#57a544'];
  R(g, '#2f6b2a', 0, 0, TEX, TEX);
  for (let i = 0; i < 150; i++) R(g, cols[(r() * 3) | 0], (r() * 62) | 0, (r() * 62) | 0, 3, 2);
  R(g, '#6b4a2a', 0, 58, TEX, 6);
}
function skilt(g) {
  haek(g); R(g, '#6b4a2a', 30, 40, 4, 24);
  R(g, '#f2e6b8', 6, 14, 52, 28); R(g, '#6b4a2a', 6, 14, 52, 2); R(g, '#6b4a2a', 6, 40, 52, 2);
}
function kiosk(g) {
  R(g, '#5a6488', 0, 0, TEX, TEX);
  const r = rng(11);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if (r() < 0.25) R(g, '#6a74a0', x * 16, y * 16, 16, 16);
  for (let i = 0; i < 4; i++) { R(g, '#48507a', i * 16, 0, 1, TEX); R(g, '#48507a', 0, i * 16, TEX, 1); }
  R(g, '#2e3350', 0, 58, TEX, 6);
}
function vindue(g) {
  kiosk(g); R(g, '#2e3350', 8, 8, 48, 38); R(g, '#141a3c', 11, 11, 42, 32);
  disc(g, '#e8e4c0', 40, 23, 7); disc(g, '#b8b494', 38, 21, 2); disc(g, '#b8b494', 43, 26, 1);
  for (const [x, y] of [[15, 15], [22, 30], [28, 18], [18, 38], [48, 36]]) R(g, '#e8e4c0', x, y, 1, 1);
  R(g, '#2e3350', 31, 11, 2, 32);
}
function reol(g) {
  const r = rng(5), cols = ['#d9b23c', '#c94f4f', '#4f8fc9', '#57a544', '#e88a3c', '#b06ac0'];
  R(g, '#3c2f28', 0, 0, TEX, TEX);
  for (let s = 0; s < 4; s++) {
    const y = s * 16;
    for (let x = 2; x < 60;) { const w = 4 + ((r() * 5) | 0), h = 6 + ((r() * 7) | 0); R(g, cols[(r() * 6) | 0], x, y + 14 - h, w, h); x += w + 1; }
    R(g, '#7a5a3a', 0, y + 14, TEX, 2);
  }
  R(g, '#2a201c', 0, 0, 2, TEX); R(g, '#2a201c', 62, 0, 2, TEX);
}
function disk(g) {
  kiosk(g); R(g, '#7a5a3a', 0, 40, TEX, 3);
  for (const [x, c] of [[6, '#c94f4f'], [20, '#d9b23c'], [34, '#57a544']]) { R(g, '#c6d0e8', x, 26, 10, 14); R(g, c, x + 1, 31, 8, 8); R(g, '#2e3350', x + 1, 24, 8, 2); }
  disc(g, '#e8e4c0', 52, 16, 7); R(g, '#2e3350', 52, 16, 4, 1); R(g, '#2e3350', 52, 16, 1, 1); R(g, '#2e3350', 53, 17, 2, 1); R(g, '#2e3350', 55, 18, 2, 1); // kl. 16:20: begge visere peger mod 4
}
function klippe(g) {
  const r = rng(21);
  R(g, '#a9a6b4', 0, 0, TEX, TEX);
  for (let i = 0; i < 9; i++) R(g, i % 2 ? '#9c99a8' : '#b6b3c0', 0, (r() * 60) | 0, TEX, 2 + ((r() * 3) | 0));
  for (let i = 0; i < 5; i++) { const x = 6 + ((r() * 52) | 0), y = 6 + ((r() * 52) | 0); disc(g, '#8e8b9c', x, y, 3); disc(g, '#b6b3c0', x + 1, y + 1, 2); }
}
function vejskilt(g) {
  klippe(g); R(g, '#6b5a4a', 12, 48, 4, 16); R(g, '#6b5a4a', 48, 48, 4, 16);
  R(g, '#6b5a4a', 2, 6, 60, 44); R(g, '#f2e6b8', 4, 8, 56, 40);
}

// ---------- billboards ----------
const bed = (wet) => (g) => {
  R(g, '#6b4a2a', 8, 44, 48, 18); R(g, wet ? '#3a2a1a' : '#8a6a3a', 10, 46, 44, 6);
  const c = wet ? '#57a544' : '#3f8a35';
  R(g, c, 16, wet ? 20 : 30, 6, wet ? 26 : 16); R(g, c, 30, wet ? 14 : 26, 6, wet ? 32 : 20); R(g, c, 44, wet ? 22 : 32, 6, wet ? 24 : 14);
  R(g, '#6b4a2a', 32, 16, 2, 30); R(g, '#f2e6b8', 22, 2, 22, 14);
};
function kande(g) {
  R(g, '#c94f4f', 20, 38, 24, 22); R(g, '#c94f4f', 44, 44, 12, 4); R(g, '#c94f4f', 54, 38, 4, 8);
  R(g, '#8f2f2f', 20, 56, 24, 4); R(g, '#8f2f2f', 12, 40, 3, 16); R(g, '#8f2f2f', 12, 40, 8, 3); R(g, '#8f2f2f', 12, 53, 8, 3);
  R(g, '#e88888', 23, 41, 3, 12);
}
const fnugProc = (wave) => (g, f) => { // reserve, hvis Fnug-arket (assets/sprites/aliens.png) heller ikke findes
  disc(g, '#7ab0d8', 32, 44, 14); disc(g, '#7ab0d8', 32, 24, 10); R(g, '#4a78a8', 24, 58, 6, 5); R(g, '#4a78a8', 34, 58, 6, 5);
  if (f === 1 && !wave) { R(g, '#4a78a8', 26, 22, 5, 1); R(g, '#4a78a8', 34, 22, 5, 1); } else { disc(g, '#ffffff', 28, 22, 3); disc(g, '#ffffff', 36, 22, 3); R(g, '#222222', 28, 22, 2, 2); R(g, '#222222', 36, 22, 2, 2); }
  R(g, '#4a78a8', 29, 30, 6, 1);
  if (wave) R(g, '#7ab0d8', f ? 46 : 14, 22, 4, 16); else { R(g, '#7ab0d8', 14, 40, 4, 12); R(g, '#7ab0d8', 46, 40, 4, 12); }
};
const snack = (kind) => (g) => {
  R(g, '#7a5a3a', 14, 40, 36, 6); // lille kasse, varen står på
  if (kind === 'chips') { R(g, '#d9b23c', 20, 8, 24, 32); R(g, '#b08a24', 20, 8, 24, 3); disc(g, '#fff4c0', 32, 24, 6); disc(g, '#d9b23c', 35, 22, 5); }
  else if (kind === 'kiks') { R(g, '#8a5a3a', 16, 16, 32, 24); disc(g, '#e0b878', 26, 28, 6); disc(g, '#e0b878', 39, 28, 6); R(g, '#8a5a3a', 25, 27, 2, 2); R(g, '#8a5a3a', 38, 27, 2, 2); }
  else if (kind === 'lakrids') { R(g, '#4a2a6a', 20, 10, 24, 30); R(g, '#2a1840', 20, 10, 24, 3); disc(g, '#111111', 28, 24, 3); disc(g, '#111111', 36, 30, 3); disc(g, '#111111', 35, 19, 2); }
  else if (kind === 'ostepops') { R(g, '#e88a3c', 19, 8, 26, 32); R(g, '#b0601c', 19, 8, 26, 3); disc(g, '#ffd070', 29, 22, 4); disc(g, '#ffd070', 36, 30, 4); R(g, '#ffd070', 33, 18, 6, 2); }
  else if (kind === 'sodavand') { R(g, '#8fc4e8', 24, 12, 16, 28); R(g, '#c6d0e8', 24, 12, 16, 3); R(g, '#c6d0e8', 24, 37, 16, 3); R(g, '#ffffff', 28, 20, 2, 2); R(g, '#ffffff', 34, 26, 2, 2); R(g, '#ffffff', 30, 31, 2, 2); }
  else if (kind === 'vingummi') { R(g, '#57a544', 19, 10, 26, 30); R(g, '#3f8a35', 19, 10, 26, 3); R(g, '#f2e6b8', 24, 24, 16, 3); disc(g, '#f2e6b8', 32, 22, 4); R(g, '#c94f4f', 26, 30, 12, 2); }
  else if (kind === 'chokolade') { R(g, '#c94f4f', 14, 24, 36, 16); R(g, '#8f2f2f', 14, 24, 4, 16); disc(g, '#f2e6b8', 38, 32, 3); R(g, '#f2e6b8', 24, 31, 12, 2); }
  else if (kind === 'poelse') { R(g, '#c6d0e8', 10, 30, 44, 10); R(g, '#8a94b0', 10, 38, 44, 2); R(g, '#c98060', 6, 32, 4, 6); R(g, '#c98060', 54, 32, 4, 6); }
  else { R(g, '#5a4028', 16, 26, 32, 14); R(g, '#3c2a1a', 18, 28, 28, 12); } // tom plads
};
function kurt(g, f) {
  R(g, '#3a4a8a', 18, 22, 28, 24); disc(g, '#e8b890', 32, 14, 9); R(g, '#5a3a2a', 23, 4, 18, 5); // kittel, hoved, hår
  if (f) { R(g, '#5a3a2a', 27, 13, 4, 1); R(g, '#5a3a2a', 34, 13, 4, 1); R(g, '#5a3a2a', 34, 10, 5, 1); } else { R(g, '#222222', 28, 12, 2, 2); R(g, '#222222', 35, 12, 2, 2); }
  R(g, '#5a3a2a', 27, 18, 10, 2); // overskæg
  R(g, '#e8b890', 46, 20, 4, 10); R(g, '#f2e6b8', 44, 10, 14, 10); R(g, '#c94f4f', 46, 13, 10, 1); R(g, '#c94f4f', 46, 16, 7, 1); // prisskilt i hånden
  R(g, '#8a6a4a', 2, 44, 60, 20); R(g, '#b08a5a', 2, 44, 60, 3); R(g, '#6b4a2a', 2, 60, 60, 4); // disk
  R(g, '#8a94b0', 6, 32, 14, 12); R(g, '#c6d0e8', 8, 34, 10, 4); // kasseapparat
}
function sloev(g, f) {
  R(g, '#6b5a4a', 4, 14, 3, 50); R(g, '#6b5a4a', 57, 14, 3, 50);
  const d = f === 1 || f === 2 ? 1 : 0; // vejrtrækning
  for (let x = 7; x < 57; x++) { const y = 26 + Math.round(16 * Math.sin(((x - 7) / 50) * Math.PI)); R(g, '#d8c8a0', x, y, 1, 5); R(g, '#b0a078', x, y + 5, 1, 1); }
  R(g, '#3a5a8a', 18, 32 - d, 26, 9 + d); disc(g, '#e8b890', 46, 32, 5); R(g, '#f2f2f2', 42, 26, 10, 4); R(g, '#2a3a5a', 42, 29, 12, 2); // krop, hoved, kasket
  R(g, '#e8e8e8', 43, 36, 6, 3); // skæg
  if (f >= 1) text(g, 'z', 50, 18, 9, '#ffffff'); if (f >= 2) text(g, 'Z', 44, 9, 12, '#ffffff'); if (f === 3) text(g, 'Z', 54, 5, 9, '#ffffff');
}
function busstop(g) {
  R(g, '#6b6b7a', 30, 28, 4, 36); R(g, '#4a4a58', 24, 60, 16, 4);
  R(g, '#d9b23c', 12, 2, 40, 28); R(g, '#f2e6b8', 14, 4, 36, 24);
  R(g, '#f2e6b8', 22, 36, 20, 14); R(g, '#6b6b7a', 24, 39, 16, 1); R(g, '#6b6b7a', 24, 42, 16, 1); R(g, '#6b6b7a', 24, 45, 10, 1);
}
function lygte(g, f) {
  R(g, '#3a3a48', 30, 18, 4, 46); R(g, '#3a3a48', 24, 60, 16, 4); R(g, '#3a3a48', 24, 4, 16, 3); R(g, '#3a3a48', 26, 16, 12, 2);
  R(g, f ? '#e8d890' : '#fff0a0', 26, 7, 12, 9);
}

/** Hårdkantet tekst centreret om (cx, cy) på en tekstur. */
export function text(g, str, cx, cy, size = 12, color = '#222222') {
  const t = text1bit(str, FONT(size), color); g.drawImage(t, Math.round(cx - t.width / 2), Math.round(cy - t.height / 2));
}

/** navn → { n: antal frames, draw(g, frame) } — samme navne som docs/FP-ASSETS.md. */
export const DEFS = {
  v_glas: { n: 1, draw: glas }, v_haek: { n: 1, draw: haek }, v_skilt: { n: 1, draw: skilt },
  v_kiosk: { n: 1, draw: kiosk }, v_vindue: { n: 1, draw: vindue }, v_reol: { n: 1, draw: reol }, v_disk: { n: 1, draw: disk },
  v_klippe: { n: 1, draw: klippe }, v_vejskilt: { n: 1, draw: vejskilt },
  bed_toert: { n: 1, draw: bed(false) }, bed_vandet: { n: 1, draw: bed(true) }, vandkande: { n: 1, draw: kande },
  fnug: { n: 2, draw: fnugProc(false), alien: 3 }, fnug_syv: { n: 2, draw: fnugProc(true), alien: 6 },
  snack_chips: { n: 1, draw: snack('chips') }, snack_kiks: { n: 1, draw: snack('kiks') }, snack_lakrids: { n: 1, draw: snack('lakrids') },
  snack_ostepops: { n: 1, draw: snack('ostepops') }, snack_sodavand: { n: 1, draw: snack('sodavand') }, snack_vingummi: { n: 1, draw: snack('vingummi') },
  snack_chokolade: { n: 1, draw: snack('chokolade') }, snack_poelse: { n: 1, draw: snack('poelse') }, snack_tom: { n: 1, draw: snack('tom') },
  kurt: { n: 2, draw: kurt }, sloev: { n: 4, draw: sloev }, busstop: { n: 1, draw: busstop }, lygte: { n: 2, draw: lygte },
};

/** Hold én tekstur på få farver, så 8 lystrin × alle teksturer i en bane kan holde palette-gaten. */
function fewColors(c, max = 14) {
  const g = c.getContext('2d'), d = g.getImageData(0, 0, TEX, TEX), px = new Uint32Array(d.data.buffer);
  for (let i = 0; i < px.length; i++) px[i] = (px[i] >>> 24) > 127 ? (px[i] | 0xff000000) : 0;
  limitColors([px], max); g.putImageData(d, 0, 0); return c;
}
const load = async (src) => { try { return await img(src); } catch { return null; } }; // img() løser til null ved onerror; kast aldrig
// assets/fp/index.json = liste over de teksturfiler, der findes (skrives af tools/art/fp_index.py) → ingen 404 for manglende filer.
let have = null;
const haveFiles = () => have || (have = fetch('assets/fp/index.json').then((r) => (r.ok ? r.json() : [])).catch(() => []).then((l) => new Set(l)));

/** Hent teksturerne til en mission. → { navn: [canvas pr. frame] }. Manglende filer giver pladsholdere, aldrig fejl.
 *  fromFile får navnene på dem, der kom fra en rigtig fil. */
export async function loadTex(names, fromFile = []) {
  const out = {};
  await Promise.all(names.map(async (name) => {
    const def = DEFS[name], frames = [], im = (await haveFiles()).has(name) ? await load('assets/fp/' + name + '.png') : null;
    if (im && im.width >= TEX && im.height >= TEX) {
      const k = Math.max(1, Math.floor(im.width / im.height)), s = im.height; // vandret strip, kvadratiske frames
      fromFile.push(name);
      for (let f = 0; f < k; f++) frames.push(fewColors(canvas((g) => g.drawImage(im, f * s, 0, s, s, 0, 0, TEX, TEX))));
    } else {
      const sheet = def.alien != null ? await load('assets/sprites/aliens.png') : null; // Fnug-pladsholder: Mords ark, 3×4 celler à 96 px
      for (let f = 0; f < def.n; f++) frames.push(sheet
        ? fewColors(canvas((g) => g.drawImage(sheet, (def.alien % 3) * 96, Math.floor(def.alien / 3) * 96, 96, 96, 4, 8 + f, 56, 56)), 20)
        : canvas((g) => def.draw(g, f)));
    }
    out[name] = frames;
  }));
  return out;
}

/** Skyggefabrik for én bane: canvas → 8 lystrin mod banens tågefarve. */
export const shader = (fog) => (c) => shade(texFrom(c), fog);
/** Kopi af en tekstur med noget tegnet ovenpå (tal på skilte, prisskilte). */
export const paint = (src, fn) => canvas((g) => { g.drawImage(src, 0, 0); fn(g); });
/** Billboard med frames på 10 fps step-uret. seq = frame-nummer pr. tick. */
export const anim = (S, canvases, seq) => { const frames = canvases.map(S); return { frames, tex: frames[0], seq: seq.map((i) => i % frames.length) }; };
const rep = (f, n) => Array(n).fill(f);
export const SEQ = {
  blink: [...rep(0, 26), 1, 1],
  vink: [...rep(0, 4), ...rep(1, 4)],
  kurt: [...rep(0, 34), ...rep(1, 6)],
  sov: [...rep(0, 8), ...rep(1, 8), ...rep(2, 8), ...rep(3, 8)],
  lygte: [...rep(0, 24), ...rep(1, 12)],
};
