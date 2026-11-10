// Retro first person: grid raycaster, 320×240 internal, flat floor/ceiling, frontal billboards.
// One render path. Light = 8 hard steps through precomputed lookup textures (no blending at draw time).
export const RW = 320, RH = 240, TEX = 64, LEVELS = 8;
const FOV = 0.66;

const rgb = (c) => [c & 255, (c >> 8) & 255, (c >> 16) & 255];
const pack = (r, g, b) => (255 << 24) | (b << 16) | (g << 8) | r;
/** One colour faded towards fog in LEVELS hard steps. */
export function ramp(color, fog) {
  const [r, g, b] = rgb(color), [fr, fg, fb] = rgb(fog), out = new Uint32Array(LEVELS);
  for (let l = 0; l < LEVELS; l++) { const f = l / (LEVELS - 1); out[l] = pack(Math.round(r + (fr - r) * f), Math.round(g + (fg - g) * f), Math.round(b + (fb - b) * f)); }
  return out;
}
/** Texture (Uint32Array TEX×TEX, alpha 0 = transparent) → LEVELS shaded copies. */
export function shade(tex, fog) {
  const cache = new Map(), out = [];
  for (let l = 0; l < LEVELS; l++) out.push(new Uint32Array(tex.length));
  for (let i = 0; i < tex.length; i++) {
    const c = tex[i];
    if (!(c >>> 24)) continue;
    let r = cache.get(c); if (!r) { r = ramp(c, fog); cache.set(c, r); }
    for (let l = 0; l < LEVELS; l++) out[l][i] = r[l];
  }
  return out;
}
/** Canvas (TEX×TEX) → Uint32Array with hard alpha. */
export function texFrom(canvas) {
  const d = canvas.getContext('2d').getImageData(0, 0, TEX, TEX), px = new Uint32Array(d.data.buffer.slice(0));
  for (let i = 0; i < px.length; i++) px[i] = (px[i] >>> 24) > 127 ? (px[i] | 0xff000000) : 0;
  return px;
}

/** Hold højst `max` forskellige farver i en stak pixels (liste af Uint32Array, ændres på stedet). → antal farver.
 *  Farverne samles i spande (4 bit pr. kanal); de mest brugte spande beholder deres hyppigste farve, resten flyttes til nærmeste. */
export function limitColors(list, max) {
  const cnt = new Map();
  for (const px of list) for (let i = 0; i < px.length; i++) if (px[i]) cnt.set(px[i], (cnt.get(px[i]) || 0) + 1);
  if (cnt.size <= max) return cnt.size;
  const buckets = new Map(); // spand → [antal i alt, hyppigste farve, dens antal]
  for (const [c, n] of cnt) { const k = c & 0xf0f0f0, b = buckets.get(k); if (!b) buckets.set(k, [n, c, n]); else { b[0] += n; if (n > b[2]) { b[1] = c; b[2] = n; } } }
  const keep = [...buckets.values()].sort((a, b) => b[0] - a[0]).slice(0, max).map((b) => rgb(b[1])), m = new Map();
  for (const c of cnt.keys()) {
    const [r, g, b] = rgb(c); let best = 0, bd = Infinity;
    for (let k = 0; k < keep.length; k++) { const d = (keep[k][0] - r) ** 2 + (keep[k][1] - g) ** 2 + (keep[k][2] - b) ** 2; if (d < bd) { bd = d; best = k; } }
    m.set(c, pack(keep[best][0], keep[best][1], keep[best][2]));
  }
  for (const px of list) for (let i = 0; i < px.length; i++) if (px[i]) px[i] = m.get(px[i]);
  return Math.min(max, buckets.size);
}
/** Palette-gate for en hel bane: alle skyggede teksturer tilsammen holdes under `max` farver (resten af de 256 er gulv, loft og HUD). */
export function limitWorld(w, max = 180) {
  const seen = new Set(), list = [];
  const add = (sh) => { if (sh && !seen.has(sh)) { seen.add(sh); for (const l of sh) list.push(l); } };
  for (const k in w.walls) add(w.walls[k]);
  for (const s of w.sprites) { add(s.tex); for (const k in s) if (Array.isArray(s[k]) && s[k][0] instanceof Uint32Array) add(s[k]); if (s.frames) s.frames.forEach(add); }
  return limitColors(list, max);
}

/** world = { map:[rows of strings], walls:{char: shaded}, sprites:[{x,y,tex:shaded | frames:[shaded…],seq:[frame pr. tick],scale,hidden}], floor, ceil, fog, fogK, cols, tick }
 *  tick = 10 fps step-ur (heltal); en sprite med frames viser frames[seq[tick % seq.length]] — ingen tweens. */
export function makeRenderer() {
  const cv = document.createElement('canvas'); cv.width = RW; cv.height = RH;
  const g = cv.getContext('2d'), id = g.createImageData(RW, RH), buf = new Uint32Array(id.data.buffer), zbuf = new Float32Array(RW);
  let rows = null, rowsKey = '';
  function rowLevels(w) { // floor/ceiling colour per row, cached per world
    const key = w.floor + '|' + w.ceil + '|' + w.fog + '|' + w.fogK;
    if (key === rowsKey) return rows;
    const fl = ramp(w.floor, w.fog), ce = ramp(w.ceil, w.fog); rows = new Uint32Array(RH);
    for (let y = 0; y < RH; y++) {
      const p = Math.abs(y - RH / 2) || 1, dist = (RH / 2) / p, l = Math.min(LEVELS - 1, Math.floor(dist * w.fogK));
      rows[y] = y < RH / 2 ? ce[l] : fl[l];
    }
    rowsKey = key; return rows;
  }
  function render(cam, w) {
    const map = w.map, mh = map.length, mw = map[0].length, step = w.cols === 160 ? 2 : 1;
    const dx = Math.cos(cam.a), dy = Math.sin(cam.a), px = -dy * FOV, py = dx * FOV, rl = rowLevels(w);
    for (let y = 0; y < RH; y++) buf.fill(rl[y], y * RW, y * RW + RW);
    for (let x = 0; x < RW; x += step) {
      const cx = (2 * x) / RW - 1, rx = dx + px * cx, ry = dy + py * cx;
      let mx = Math.floor(cam.x), my = Math.floor(cam.y);
      const ddx = Math.abs(1 / (rx || 1e-9)), ddy = Math.abs(1 / (ry || 1e-9));
      const sx = rx < 0 ? -1 : 1, sy = ry < 0 ? -1 : 1;
      let sdx = (rx < 0 ? cam.x - mx : mx + 1 - cam.x) * ddx, sdy = (ry < 0 ? cam.y - my : my + 1 - cam.y) * ddy, side = 0, ch = '.';
      for (let n = 0; n < 64; n++) {
        if (sdx < sdy) { sdx += ddx; mx += sx; side = 0; } else { sdy += ddy; my += sy; side = 1; }
        if (mx < 0 || my < 0 || mx >= mw || my >= mh) { ch = '#'; break; }
        ch = map[my][mx]; if (ch !== '.') break;
      }
      const dist = Math.max(0.05, side ? sdy - ddy : sdx - ddx);
      zbuf[x] = dist; if (step === 2) zbuf[x + 1] = dist;
      const tex = (w.walls[ch] || w.walls['#'])[Math.min(LEVELS - 1, Math.floor(dist * w.fogK) + side)];
      let wx = side ? cam.x + dist * rx : cam.y + dist * ry; wx -= Math.floor(wx);
      let tx = Math.floor(wx * TEX); if ((side === 0 && rx < 0) || (side === 1 && ry > 0)) tx = TEX - 1 - tx;
      const lh = RH / dist, y0 = Math.max(0, Math.floor(RH / 2 - lh / 2)), y1 = Math.min(RH, Math.floor(RH / 2 + lh / 2)), ts = TEX / lh;
      let tp = (y0 - RH / 2 + lh / 2) * ts;
      for (let y = y0; y < y1; y++) {
        const c = tex[(Math.min(TEX - 1, tp | 0)) * TEX + tx]; tp += ts;
        const i = y * RW + x; buf[i] = c; if (step === 2) buf[i + 1] = c;
      }
    }
    // billboards, far → near
    const inv = 1 / (px * dy - dx * py), list = [], tick = w.tick | 0;
    for (const s of w.sprites) {
      if (s.hidden) continue;
      const ox = s.x - cam.x, oy = s.y - cam.y, tz = inv * (-py * ox + px * oy);
      if (tz > 0.15) list.push([tz, inv * (dy * ox - dx * oy), s]);
    }
    list.sort((a, b) => b[0] - a[0]);
    for (const [tz, txs, s] of list) {
      const sh = s.frames ? s.frames[(s.seq ? s.seq[tick % s.seq.length] : tick) % s.frames.length] : s.tex;
      const tex = sh[Math.min(LEVELS - 1, Math.floor(tz * w.fogK))], sc = s.scale || 1;
      const full = RH / tz, h = full * sc, scr = (RW / 2) * (1 + txs / tz), bottom = RH / 2 + full / 2, top = bottom - h;
      const x0 = Math.max(0, Math.floor(scr - h / 2)), x1 = Math.min(RW, Math.floor(scr + h / 2)), y0 = Math.max(0, Math.floor(top)), y1 = Math.min(RH, Math.floor(bottom));
      for (let x = x0; x < x1; x++) {
        if (tz >= zbuf[x]) continue;
        const tx = Math.min(TEX - 1, Math.floor(((x - (scr - h / 2)) / h) * TEX));
        for (let y = y0; y < y1; y++) {
          const c = tex[Math.min(TEX - 1, Math.floor(((y - top) / h) * TEX)) * TEX + tx];
          if (c) buf[y * RW + x] = c;
        }
      }
    }
    g.putImageData(id, 0, 0);
    return cv;
  }
  return { canvas: cv, render, buf };
}

/** Move with wall sliding. r = body radius in cells. */
export function move(cam, map, mx, my, r = 0.22) {
  const solid = (x, y) => { const row = map[Math.floor(y)]; return !row || (row[Math.floor(x)] || '#') !== '.'; };
  const nx = cam.x + mx, ny = cam.y + my;
  if (!solid(nx + Math.sign(mx) * r, cam.y - r) && !solid(nx + Math.sign(mx) * r, cam.y + r)) cam.x = nx;
  if (!solid(cam.x - r, ny + Math.sign(my) * r) && !solid(cam.x + r, ny + Math.sign(my) * r)) cam.y = ny;
}
