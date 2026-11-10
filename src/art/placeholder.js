// Kodetegnede pladsholder-baggrunde (gråblå måne, Jorden, mørk himmel), indtil PNG8-renders ligger i assets/bg.
// API: bg(navn) → canvas/billede. Parametre navngivet _u er ubrugte og står der kun, fordi andre spor kalder med den position.
import { proc, rng, W, H, stipple, bands } from '../core/stage.js';

function sky(g, r) {
  bands(g, 0, 0, W, 240, ['#0b0620', '#2a1140', '#4a1d4f'], 8);
  const STAR = ['#808080', '#c4c5c5', '#ffffff'];
  for (let i = 0; i < 260; i++) { g.fillStyle = STAR[Math.floor(r() * 3)]; g.fillRect(Math.floor(r() * W), Math.floor(r() * 200), 1 + (r() < 0.1 ? 1 : 0), 1); }
  // Earth
  g.fillStyle = '#3f7fd0';
  g.beginPath(); g.arc(560, 60, 26, 0, 7); g.fill();
  g.fillStyle = '#49a05a';
  g.beginPath(); g.ellipse(552, 56, 9, 13, 0.5, 0, 7); g.fill(); g.beginPath(); g.ellipse(570, 70, 7, 5, 0, 0, 7); g.fill();
  g.fillStyle = '#c4c5c5'; g.beginPath(); g.ellipse(566, 48, 10, 3, -0.4, 0, 7); g.fill();
  g.fillStyle = '#9aa0b4'; g.beginPath(); g.arc(548, 50, 8, 0, 7); g.fill();
}
function terrain(g, r, { craters = 14, band = 0 } = {}) {
  const top = 180 + band;
  g.save(); g.beginPath(); g.moveTo(0, top + 30);
  for (let x = 0; x <= W; x += 40) g.lineTo(x, top + 24 * Math.sin(x / 70) + r() * 14);
  g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.clip();
  bands(g, 0, top, W, H - top, ['#b9bccb', '#8d93a8', '#5f6478'], 6);
  g.restore();
  // far ridge
  g.fillStyle = '#6e7389';
  g.beginPath(); g.moveTo(0, top + 36);
  for (let x = 0; x <= W; x += 24) g.lineTo(x, top + 20 + 22 * Math.abs(Math.sin(x / 41)) * (0.6 + r() * 0.8));
  g.lineTo(W, top + 70); g.lineTo(0, top + 70); g.closePath(); g.fill();
  for (let i = 0; i < craters; i++) {
    const cx = r() * W, cy = top + 70 + r() * (H - top - 90), rr = 8 + r() * 36;
    g.fillStyle = '#6b7088';
    g.beginPath(); g.ellipse(cx, cy, rr, rr * 0.45, 0, 0, 7); g.fill();
    g.fillStyle = '#d4d0c8';
    g.beginPath(); g.ellipse(cx, cy - rr * 0.1, rr * 0.9, rr * 0.3, 0, Math.PI, 2 * Math.PI); g.fill();
    g.fillStyle = '#5a5d6a';
    g.beginPath(); g.ellipse(cx, cy + rr * 0.08, rr * 0.75, rr * 0.3, 0, 0, Math.PI); g.fill();
  }
  // hard "raytraced" shadow of the frame edge, Bryce style
  g.fillStyle = stipple('#000', 1); g.fillRect(0, top + 20, W, 6);
}
// Renderede baggrunde (assets/bg/<navn>.png, PNG8) vinder over de kodetegnede. Manglende fil = ingen fejl.
const IMGS = new Map();
export function loadBgs(names) {
  return Promise.all(names.map((key) => new Promise((res) => {
    const im = new Image(); im.onload = () => { IMGS.set(key, im); res(true); }; im.onerror = () => res(false); im.src = `assets/bg/${key}.png`;
  })));
}
export const hasBg = (name) => IMGS.has(name);
export function bg(name) {
  const im = IMGS.get(name);
  if (im) return im;
  return proc(name, (g) => {
    const r = rng(name.length * 977 + 13);
    sky(g, r);
    switch (name) {
      case 'hub': terrain(g, r, { craters: 16 }); break;
      case 'landing': terrain(g, r, { craters: 5, band: 40 });
        // landing pad
        g.fillStyle = '#c9ccd8'; g.beginPath(); g.ellipse(320, 390, 190, 48, 0, 0, 7); g.fill();
        g.strokeStyle = '#ffd34a'; g.lineWidth = 4; g.beginPath(); g.ellipse(320, 390, 150, 34, 0, 0, 7); g.stroke();
        g.fillStyle = '#ff8a3c'; g.fillRect(312, 352, 16, 16);
        break;
      case 'bakery': terrain(g, r, { craters: 3, band: 60 });
        g.fillStyle = '#d9b48a'; g.fillRect(120, 150, 400, 250);
        g.fillStyle = '#8a5a3a'; g.fillRect(120, 150, 400, 20); g.fillRect(120, 380, 400, 100);
        break;
      case 'school': terrain(g, r, { craters: 2, band: 80 });
        g.fillStyle = '#e4e1d6'; g.fillRect(0, 120, W, 300);
        g.fillStyle = '#234d2b'; g.fillRect(60, 150, 320, 150); // chalkboard
        g.strokeStyle = '#8b6b3a'; g.lineWidth = 8; g.strokeRect(60, 150, 320, 150);
        g.fillStyle = '#c7b89a'; g.fillRect(420, 160, 190, 130); // notice board
        break;
      default: terrain(g, r);
    }
  });
}
// Kolonne C runde 3 (b8 10-11): ÉN lysretning. Bænken i renderen kaster en lang hård skygge mod højre/opad (grundplanet bagud),
// så alle sprites får deres alfa-maske projiceret samme vej: shear SHX mod højre, højde SHY af figuren, palette-sort 2×2-dither,
// alfa snappet til 0/255 (ingen AA-farver, A3). Cache pr. kilde/celle/størrelse.
const SHX = 1.2, SHY = 0.4;
const shadowCache = new Map();
/** Projiceret skygge af billedcellen (im, sx, sy, sw, sh) tegnet i størrelsen w×h med foden i (x0, y) (x0 = venstre kant). */
export function castShadow(g, im, sx, sy, sw, sh, x0, y, w, h, _u = false, flip = false) {
  const key = [im.src || im.__id || 'c', sx, sy, sw, sh, w, h, flip ? 1 : 0].join('|');
  let c = shadowCache.get(key);
  if (!c) {
    const cw = Math.ceil(w + h * SHX) + 2, chh = Math.ceil(h * SHY) + 2;
    c = document.createElement('canvas'); c.width = cw; c.height = chh;
    const cg = c.getContext('2d'); cg.imageSmoothingEnabled = false;
    cg.setTransform(flip ? -1 : 1, 0, -SHX, SHY, flip ? w : 0, chh - 1);
    cg.drawImage(im, sx, sy, sw, sh, 0, -h, w, h);
    cg.setTransform(1, 0, 0, 1, 0, 0);
    const d = cg.getImageData(0, 0, cw, chh), px = d.data;
    for (let i = 0; i < px.length; i += 4) { px[i] = px[i + 1] = px[i + 2] = 0; px[i + 3] = px[i + 3] < 128 ? 0 : 255; }
    cg.putImageData(d, 0, 0);
    cg.globalCompositeOperation = 'source-in'; cg.fillStyle = stipple('#000000', 2); cg.fillRect(0, 0, cw, chh);
    shadowCache.set(key, c);
  }
  g.drawImage(c, Math.round(x0), Math.round(y) - c.height + 1);
}
/** Flagplade (tom byggeplads) som stenflise: lys top, 2 px bevel, mørk kontur (klikmål), flagstang 2 px. Tegnes i et lille canvas pr. skala,
 *  så fliserne kan kaste samme retningsskygge som alt andet. Foden = flisens underkant. */
const tileCache = new Map();
function tileCanvas(s) {
  const key = 'd' + s;
  let c = tileCache.get(key); if (c) return c;
  const pw = Math.round(52 * s), ph = Math.round(12 * s), fh = Math.round(20 * s), fl = Math.round(12 * s), fhh = Math.round(8 * s);
  c = document.createElement('canvas'); c.width = pw + 2; c.height = ph + fh + 2; c.__id = 'tile' + key;
  const g = c.getContext('2d'), x0 = 1, y0 = fh + 1;
  g.fillStyle = '#5a5d6a'; g.fillRect(x0 - 1, y0 - 1, pw + 2, ph + 2); // kontur
  g.fillStyle = '#dfe1ea'; g.fillRect(x0, y0, pw, ph); // top
  g.fillStyle = '#ffffff'; g.fillRect(x0, y0, pw, 2); g.fillRect(x0, y0, 2, ph); // bevel lys
  g.fillStyle = '#8d93a8'; g.fillRect(x0, y0 + ph - 2, pw, 2); g.fillRect(x0 + pw - 2, y0, 2, ph); // bevel mørk
  const mx = x0 + Math.round(pw / 2);
  g.fillStyle = '#ffffff'; g.fillRect(mx - 1, y0 - fh + 1, 2, fh); // flagstang 2 px
  g.fillStyle = '#ffbf2f'; g.fillRect(mx + 1, y0 - fh + 1, fl, fhh); // flag
  tileCache.set(key, c); return c;
}
/** Fnug: fluffy grey tuft with a helmet; frame 0..2 pose; back=true shows its back. */
// Rendered sprites (assets/sprites/<name>.png, chroma-keyed PNG8 from retro.py --mode sprite). Fnug sheet = frames side by side, each frame square-ish.
const SPR = new Map();
export function loadSprites(names) {
  return Promise.all(names.map((n) => new Promise((res) => {
    const im = new Image(); im.onload = () => { SPR.set(n, im); res(true); }; im.onerror = () => res(false); im.src = `assets/sprites/${n}.png`;
  })));
}
export const sprite = (name) => SPR.get(name);
/** Kolonne C (b8 10-11): hård kontaktskygge under alle hub-sprites, samme retning/hårdhed som bænken i renderen (lys fra øverst
 *  venstre → skyggen ligger mod nederste højre). 2×2-dither af palette-sort tegnet som heltals-scanlinjer, så
 *  ingen AA-kanter giver nye farver (A3). (x, y) = sprite-fod, w = sprite-bredde. */
export function contactShadow(g, x, y, w, _u = false, { ry } = {}) {
  const rx = Math.max(6, Math.round(w * 0.55)), r2 = Math.max(3, ry || Math.round(w * 0.13));
  const cx = Math.round(x + w * 0.28), cy = Math.round(y) - 1;
  g.save(); g.fillStyle = stipple('#000000', 2);
  for (let dy = -r2; dy <= r2; dy++) { const hw = Math.round(rx * Math.sqrt(1 - (dy * dy) / (r2 * r2))); if (hw > 0) g.fillRect(cx - hw, cy + dy, hw * 2, 1); }
  g.restore();
}
/** Fnug = one of a flock of different retro aliens: assets/sprites/aliens.png is a grid (3×3 per sheet, several sheets stacked
 *  vertically or side by side); `id` picks the species. frame 1 = step (1 px up), frame 2 = look (flipped). */
export function drawFnug(g, x, y, s = 1, { frame = 0, back = false, fringe = false, id = 0, shadow = true } = {}) {
  const im = SPR.get('aliens');
  if (im) {
    // sheet is always 3 columns of square cells, any number of rows (sheets stacked vertically by tools/art/aliens.py)
    const cols = 3, cw = im.width / cols, rows = Math.max(1, Math.round(im.height / cw)), ch = im.height / rows, cells = cols * rows;
    const c = ((id % cells) + cells) % cells, sx = (c % cols) * cw, sy = Math.floor(c / cols) * ch;
    const h = Math.round(48 * s), w = Math.round(h * cw / ch), dy = frame === 1 ? -1 : 0;
    const flip = back || frame === 2;
    if (shadow) castShadow(g, im, sx, sy, cw, ch, x - w / 2, y, w, h, false, flip);
    g.save();
    if (back || frame === 2) { g.translate(x, y); g.scale(-1, 1); g.translate(-x, -y); }
    g.drawImage(im, sx, sy, cw, ch, Math.round(x - w / 2), Math.round(y - h) + dy, w, h);
    g.restore();
    if (fringe) { g.strokeStyle = '#ff00ff'; g.lineWidth = 1; g.strokeRect(Math.round(x - w / 2) + 0.5, Math.round(y - h) + 0.5, Math.round(w) - 1, Math.round(h) - 1); }
    return;
  }
  g.save(); g.translate(x, y); g.scale(s, s);
  if (fringe) { g.fillStyle = '#ff00ff'; g.beginPath(); g.arc(0, -14, 15, 0, 7); g.fill(); }
  g.fillStyle = '#b9b7ae';
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; g.beginPath(); g.arc(Math.cos(a) * 8, -14 + Math.sin(a) * 8, 7, 0, 7); g.fill(); }
  g.beginPath(); g.arc(0, -14, 11, 0, 7); g.fill();
  // helmet
  g.fillStyle = '#ffd21f'; g.beginPath(); g.arc(0, -22, 10, Math.PI, 2 * Math.PI); g.fill(); g.fillRect(-12, -22, 24, 3);
  if (!back) {
    g.fillStyle = '#fff'; g.beginPath(); g.arc(-4, -14, 3.2, 0, 7); g.arc(4, -14, 3.2, 0, 7); g.fill();
    g.fillStyle = '#111'; g.beginPath(); g.arc(-4 + (frame === 2 ? 1 : 0), -14, 1.5, 0, 7); g.arc(4 + (frame === 2 ? 1 : 0), -14, 1.5, 0, 7); g.fill();
    g.strokeStyle = '#333'; g.lineWidth = 1; g.beginPath(); g.arc(0, -9, 3, 0.2, Math.PI - 0.2); g.stroke();
  }
  // feet
  g.fillStyle = '#333'; g.fillRect(-7, -2 + (frame === 1 ? -2 : 0), 5, 3); g.fillRect(2, -2 + (frame === 1 ? 2 : 0), 5, 3);
  g.restore();
}
/** Building sprite by stage 0..3 (0 = empty plot, 1 wobbly, 2 plain, 3 fine). */
export function drawBuilding(g, x, y, stage, kind, _u = false, s = 1, id = null) {
  // eget ark pr. sted (docs/LOOK.md): assets/sprites/bld_<id>.png = 3 stadier side om side, bagt i endelig størrelse → tegnes i skala 1, fodlinje i bunden
  const own = id && stage > 0 && SPR.get('bld_' + id);
  if (own) {
    const fw = own.width / 3, fh = own.height, f = Math.min(2, stage - 1), x0 = Math.round(x - fw / 2);
    contactShadow(g, x0 + fw * 0.12, y + 5, fw * 0.62, false, { ry: Math.max(4, Math.round(fw * 0.07)) });
    g.drawImage(own, f * fw, 0, fw, fh, x0, y - fh + 6, fw, fh);
    return;
  }
  // rendered building: assets/sprites/bld_<kind>.png = 3 stages side by side (2:3 cells), ground line at the bottom. s = perspektiv-skala (hub)
  const im = stage > 0 && SPR.get('bld_' + kind);
  if (im) {
    const fw = im.width / 3, fh = im.height, h = Math.round(72 * s), w = Math.round(h * fw / fh), f = Math.min(2, stage - 1);
    castShadow(g, im, f * fw, 0, fw, fh, x - w / 2, y + 4, w, h);
    g.save();
    g.drawImage(im, f * fw, 0, fw, fh, Math.round(x - w / 2), y - h + 4, w, h); g.restore();
    if (kind === 'dome') { g.fillStyle = stipple('#3b4a7a', 2); g.fillRect(Math.round(x - w * 0.28), y + 2, Math.round(w * 0.56), 2); } // svag blålig jordrefleks ved kuplens fod (én palettefarve, dither)
    return;
  }
  if (stage === 0) { // stenflise med retningsskygge (kolonne C r3)
    const c = tileCanvas(s), x0 = Math.round(x - c.width / 2), yb = y + 6;
    castShadow(g, c, 0, 0, c.width, c.height, x0, yb, c.width, c.height);
    g.drawImage(c, x0, yb - c.height + 1); return;
  }
  g.save(); g.translate(x, y);
  const base = '#dfe1ea', dark = '#8d93a8', accent = '#ffbf2f';
  contactShadow(g, x, y + 2, Math.round((40 + stage * 6) * s));
  const lean = stage === 1 ? -0.12 : 0;
  g.rotate(lean);
  const h = 26 + stage * 10, w = 40 + stage * 6;
  g.fillStyle = dark; g.fillRect(-w / 2 + 3, -h + 4, w, h);
  g.fillStyle = base; g.fillRect(-w / 2, -h, w, h);
  if (kind === 'dome' || stage >= 2) { g.fillStyle = base; g.beginPath(); g.arc(0, -h, w / 2, Math.PI, 2 * Math.PI); g.fill(); g.fillStyle = dark; g.beginPath(); g.arc(0, -h, w / 2, Math.PI * 1.1, Math.PI * 1.5); g.lineTo(0, -h); g.fill(); }
  g.fillStyle = '#3b4a7a';
  for (let i = 0; i < stage + 1; i++) g.fillRect(-w / 2 + 6 + i * 12, -h + 10, 7, 9);
  if (stage === 1) { g.strokeStyle = '#6b5a3a'; g.lineWidth = 2; g.strokeRect(-w / 2 - 4, -h - 6, w + 8, h + 6); }
  if (stage === 3) { g.fillStyle = '#e33'; g.fillRect(-2, -h - 16, 2, 16); g.fillRect(0, -h - 16, 10, 6); }
  g.restore();
}

/** Syv: Fnug id 6 i 3/4 størrelse med bulet hjelm på skrå (Syv vinker). */
export function drawSyv(g, x, y, s = 1) {
  const k = s * 0.75;
  drawFnug(g, x, y, k, { id: 6 });
  g.save(); g.translate(Math.round(x), Math.round(y - 30 * k)); g.rotate(-0.28); g.scale(k, k);
  g.fillStyle = '#ffd21f'; g.beginPath(); g.ellipse(0, 0, 11, 7, 0, Math.PI, 2 * Math.PI); g.fill(); g.fillRect(-13, 0, 26, 3); // hjelmen, på skrå
  g.fillStyle = '#c9a516'; g.fillRect(3, -6, 4, 3); g.fillRect(2, -4, 1, 1); // 1 px mørkere bule
  g.restore();
}
