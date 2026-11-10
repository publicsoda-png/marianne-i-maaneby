// Stage: 640×480 canvas with integer nearest-neighbour scaling, image cache, palette tricks and 1-bit text.
export const W = 640, H = 480;
const app = document.getElementById('app');
const cv = document.getElementById('stage');
export const ctx = cv.getContext('2d', { alpha: false });
ctx.imageSmoothingEnabled = false;

export let scale = 1, offX = 0, offY = 0;
export function fit() {
  const vw = innerWidth, vh = innerHeight;
  let s = Math.min(vw / W, vh / H);
  s = s >= 1 ? Math.floor(s) : s; // integer when we can, fractional only on tiny screens
  scale = s;
  offX = Math.floor((vw - W * s) / 2);
  offY = Math.floor((vh - H * s) / 2);
  app.style.transform = `translate(${offX}px,${offY}px) scale(${s})`;
  document.getElementById('os').style.transform = '';
}
addEventListener('resize', fit);
fit();

/** Client → stage coordinates. */
export const toStage = (e) => ({ x: (e.clientX - offX) / scale, y: (e.clientY - offY) / scale });

// ---------- images ----------
const cache = new Map();
export function img(src) {
  if (cache.has(src)) return cache.get(src);
  const p = new Promise((res) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => res(null);
    i.src = src;
  });
  cache.set(src, p);
  return p;
}
export async function preload(list, onProgress) {
  let n = 0;
  for (const s of list) {
    await img(s);
    onProgress && onProgress(++n / list.length);
  }
}

// ---------- 1-bit text (Director-era: no anti-aliasing) ----------
const tcache = new Map();
const off = document.createElement('canvas');
const octx = off.getContext('2d', { willReadFrequently: true });
/** Returns a canvas with the text rendered hard-edged. */
export function text1bit(str, font = '700 14px "Comic Neue", "Comic Sans MS", sans-serif', color = '#fff', outline = null) {
  const key = str + '|' + font + '|' + color + '|' + outline;
  if (tcache.has(key)) return tcache.get(key);
  octx.font = font;
  const m = octx.measureText(str);
  const w = Math.ceil(m.width) + 4, h = Math.ceil((m.actualBoundingBoxAscent || 12) + (m.actualBoundingBoxDescent || 4)) + 4;
  off.width = w; off.height = h;
  octx.font = font;
  octx.textBaseline = 'alphabetic';
  const base = Math.ceil(m.actualBoundingBoxAscent || 12) + 2;
  octx.fillStyle = '#fff';
  octx.fillText(str, 2, base);
  const d = octx.getImageData(0, 0, w, h);
  const px = d.data;
  const [r, g, b] = hex(color);
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < px.length; i += 4) {
    const on = px[i + 3] > 110;
    mask[i >> 2] = on;
    px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = on ? 255 : 0;
  }
  if (outline) {
    const [orr, og, ob] = hex(outline);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (mask[i]) continue;
      if ((x > 0 && mask[i - 1]) || (x < w - 1 && mask[i + 1]) || (y > 0 && mask[i - w]) || (y < h - 1 && mask[i + w])) {
        px[i * 4] = orr; px[i * 4 + 1] = og; px[i * 4 + 2] = ob; px[i * 4 + 3] = 255;
      }
    }
  }
  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  out.getContext('2d').putImageData(d, 0, 0);
  if (tcache.size > 400) tcache.clear();
  tcache.set(key, out);
  return out;
}
export function drawText(str, x, y, opt = {}) {
  const c = text1bit(str, opt.font, opt.color, opt.outline);
  const dx = opt.align === 'center' ? x - c.width / 2 : opt.align === 'right' ? x - c.width : x;
  ctx.drawImage(c, Math.round(dx), Math.round(y));
  return c.width;
}
function hex(c) {
  if (c[0] === '#') {
    const n = parseInt(c.length === 4 ? c.slice(1).split('').map((ch) => ch + ch).join('') : c.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  return [255, 255, 255];
}

// ---------- palette-safe fills (WP1: ingen rgba/gradienter — dither og bånd, så en frame holder ≤256 farver) ----------
const stipples = new Map();
/** 2×2-dither af én fast farve: k = 1, 2 eller 3 af 4 pixels (≈ 25/50/75 % dækning). Erstatter rgba-overlays. */
export function stipple(color, k = 2) {
  const key = color + k;
  if (stipples.has(key)) return stipples.get(key);
  const c = document.createElement('canvas'); c.width = c.height = 2; const g = c.getContext('2d');
  g.fillStyle = color; const px = [[0, 0], [1, 1], [1, 0]];
  for (let i = 0; i < k; i++) g.fillRect(px[i][0], px[i][1], 1, 1);
  const pat = ctx.createPattern(c, 'repeat'); stipples.set(key, pat); return pat;
}
/** Lodret farveforløb som n hårde bånd mellem faste hex-stop (erstatter createLinearGradient). */
export function bands(g, x, y, w, h, stops, n = 8) {
  const rgb = (c) => hex(c), cols = stops.map(rgb);
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * (cols.length - 1), j = Math.min(cols.length - 2, Math.floor(t)), f = t - j;
    const c = cols[j].map((v, k) => Math.round(v + (cols[j + 1][k] - v) * f));
    g.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
    const y0 = y + Math.floor((h * i) / n), y1 = y + Math.floor((h * (i + 1)) / n);
    g.fillRect(x, y0, w, y1 - y0);
  }
}

// ---------- palette tricks ----------
/** Snapshot of the stage as ImageData (for palette-flash / glitch). */
export const snap = () => ctx.getImageData(0, 0, W, H);
/** Director "palette flash": remap channels through a wrong LUT for a few frames. */
export function paletteFlash(frames = 2, mode = 'rot') {
  const d = snap();
  const px = d.data;
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i], g = px[i + 1], b = px[i + 2];
    if (mode === 'rot') { px[i] = g; px[i + 1] = b; px[i + 2] = r; }
    else if (mode === 'inv') { px[i] = 255 - r; px[i + 1] = 255 - g; px[i + 2] = 255 - b; }
    else if (mode === 'crush') { px[i] = r & 0xc0; px[i + 1] = g & 0xc0; px[i + 2] = b & 0xc0; }
    else if (mode === 'magenta') { px[i] = Math.min(255, r + 90); px[i + 1] = g >> 1; px[i + 2] = Math.min(255, b + 60); }
  }
  return new Promise((res) => {
    let n = 0;
    const tick = () => {
      ctx.putImageData(d, 0, 0);
      if (++n < frames) requestAnimationFrame(tick); else res();
    };
    requestAnimationFrame(tick);
  });
}

// ---------- procedural placeholder renders (until Higgsfield PNG8s land) ----------
const procCache = new Map();
export function proc(name, fn) {
  if (procCache.has(name)) return procCache.get(name);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  fn(c.getContext('2d'), c);
  procCache.set(name, c);
  return c;
}
/** Deterministic PRNG for placeholder art. */
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
