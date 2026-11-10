// Minigame runner, ported from sophie-game/src/ware/engine.js: a game is {setup(api)} building DOM sprites in #field;
// ends via api.done(result). No fuse/metronome here — Måneby tasks are untimed unless a game adds its own clock.
// Polish (QUALITY-PLAN §2): all text is 1-bit canvas on the 640 grid (never DOM text), buttons play on pointerdown and
// act on pointerup, animation runs on the 10 fps step clock (api.steps) — no Web Animations, no CSS tweens.
import { sfx, play } from '../core/audio.js';
import { cur } from '../core/cursor.js';
import { text1bit, toStage } from '../core/stage.js';

const field = document.getElementById('field');
const KID = '"Comic Neue","Comic Sans MS",sans-serif';
const STEP = 100; // ms per step (10 fps)
let curG = null;

const mcv = document.createElement('canvas');
const mctx = mcv.getContext('2d');
const measure = (str, font) => { mctx.font = font; return mctx.measureText(str).width; };
/** Copy of a cached text1bit canvas (the cache owns its element; DOM needs its own). */
function snapAlpha(g, w, h) {
  const im = g.getImageData(0, 0, w, h), d = im.data;
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] < 128 ? 0 : 255;
  g.putImageData(im, 0, 0);
}
const clone = (c) => { const o = document.createElement('canvas'); o.width = c.width; o.height = c.height; o.getContext('2d').drawImage(c, 0, 0); return o; };
function wrap(str, font, width) {
  const out = [];
  for (const para of String(str).split('\n')) {
    let line = '';
    for (const w of para.split(' ')) {
      const t = line ? line + ' ' + w : w;
      if (line && measure(t, font) > width) { out.push(line); line = w; } else line = t;
    }
    out.push(line);
  }
  return out;
}

function finish(me, result) {
  if (me.done) return;
  me.done = true;
  me.iv.forEach(clearInterval); me.to.forEach(clearTimeout);
  me.raf = false;
  field.innerHTML = ''; field.style.pointerEvents = 'none';
  me.resolve(result);
}
const local = (e) => (e ? toStage(e) : { x: cur.x, y: cur.y }); // QC a0: cur er forrige rAF-frame – et klik uden forudgående mousemove ramte den gamle position (scope 1. klik)
field.addEventListener('pointerdown', (e) => { if (!curG || curG.done) return; e.preventDefault(); e.stopPropagation(); curG.down = local(e); curG.tap && curG.tap(e, curG.down); });
field.addEventListener('pointermove', (e) => { if (!curG || curG.done || !curG.move) return; if (e.pointerType === 'mouse' && !e.buttons && !curG.hover) return; curG.move(e, local(e)); });
const up = (e) => { if (!curG || curG.done) return; curG.up && curG.up(e, local(e)); curG.down = null; };
field.addEventListener('pointerup', up); field.addEventListener('pointercancel', up);
field.addEventListener('contextmenu', (e) => e.preventDefault());

export function stopGame() { if (curG && !curG.done) finish(curG, { ok: false, aborted: true }); curG = null; }

/** Run a game; resolves with whatever the game passes to api.done(). */
export function playGame(G, opts = {}) {
  return new Promise((resolve) => {
    const me = (curG = { done: false, resolve, iv: [], to: [], tap: null, move: null, up: null, down: null, hover: false, raf: true });
    field.innerHTML = ''; field.style.pointerEvents = 'auto';
    const api = {
      W: 640, H: 480, field, sfx, opts, STEP,
      /** Sampled minigame sfx: api.play('bold_boing', {gain, pan}) → assets/sfx/mg_bold_boing.ogg (LYDPLAN §C). */
      play(name, o = {}) { try { const p = play('mg_' + name, o); p && p.catch && p.catch(() => {}); } catch {} },
      /** Stereo position of a field x (-0.6 … 0.6). */
      pan: (x) => Math.max(-0.6, Math.min(0.6, (x - 320) / 320 * 0.6)),
      add(cls, html = '', css = {}) { const d = document.createElement('div'); d.className = 'o ' + cls; d.innerHTML = html; Object.assign(d.style, css); field.appendChild(d); return d; },
      /** Sprite box centred at (cx,cy) with a canvas you draw into. */
      spr(cx, cy, w, h, draw, css = {}) {
        const d = api.add('', '', { width: w + 'px', height: h + 'px', left: cx - w / 2 + 'px', top: cy - h / 2 + 'px', ...css });
        const c = document.createElement('canvas'); c.width = w; c.height = h; c.style.cssText = 'width:100%;height:100%;image-rendering:pixelated';
        d.appendChild(c); d.g = c.getContext('2d'); d.g.imageSmoothingEnabled = false;
        // A3: kanter uden antialias – efter hver tegning snappes alpha til 0/255, så skrå polygoner, buer og streger bliver hårde pixels (ingen halvgennemsigtige blandingsfarver)
        d.redraw = (...a) => { d.g.clearRect(0, 0, w, h); draw(d.g, ...a); snapAlpha(d.g, w, h); };
        d.at = (x, y) => { d.style.left = Math.round(x - w / 2) + 'px'; d.style.top = Math.round(y - h / 2) + 'px'; };
        d.redraw(0); return d;
      },
      /** 1-bit text label at (x,y). css: fontSize, fontFamily, font, color, textShadow:'none' (= no outline), outline,
       *  width + textAlign (center/right), whiteSpace:'normal' (wrap inside width), lineHeight, background, padding.
       *  Returns a div; set .textContent to change the text. */
      text(str, x, y, css = {}) {
        const size = parseInt(css.fontSize) || 15;
        const font = css.font || `700 ${size}px ${css.fontFamily || KID}`;
        const color = css.color || '#fff';
        const outline = css.textShadow === 'none' ? null : (css.outline || '#000');
        const width = parseInt(css.width) || 0;
        const align = css.textAlign || 'left';
        const lh = Math.round(size * (parseFloat(css.lineHeight) || 1.15));
        const d = api.add('t', '', { left: x + 'px', top: y + 'px', ...(width ? { width: width + 'px' } : {}), ...(css.background ? { background: css.background } : {}), ...(css.padding ? { padding: css.padding } : {}) });
        const c = document.createElement('canvas'); c.style.cssText = 'display:block;image-rendering:pixelated'; d.appendChild(c);
        let txt = '';
        const render = () => {
          const lines = (css.whiteSpace === 'normal' && width ? wrap(txt, font, width - 4) : String(txt).split('\n')).filter((l, i, a) => l.length || a.length > 1);
          const cvs = lines.map((l) => text1bit(l, font, color, outline));
          const w = width || Math.max(1, ...cvs.map((k) => k.width)), h = Math.max(1, lines.length * lh + 4);
          c.width = w; c.height = h;
          const g = c.getContext('2d');
          cvs.forEach((k, i) => { const dx = align === 'center' ? (w - k.width) / 2 : align === 'right' ? w - k.width : 0; g.drawImage(k, Math.round(dx), i * lh); });
          c.style.visibility = lines.length ? 'visible' : 'hidden';
        };
        Object.defineProperty(d, 'textContent', { get: () => txt, set: (v) => { txt = String(v ?? ''); render(); } });
        d.textContent = str;
        return d;
      },
      /** Draw 1-bit text into a sprite canvas g. opt: size, font, color, outline, align ('left'|'center'|'right'), valign ('top'|'middle'). */
      draw(g, str, x, y, opt = {}) {
        const c = text1bit(String(str), opt.font || `700 ${opt.size || 14}px ${opt.fontFamily || KID}`, opt.color || '#fff', opt.outline || null);
        const dx = opt.align === 'center' ? x - c.width / 2 : opt.align === 'right' ? x - c.width : x;
        const dy = opt.valign === 'middle' ? y - c.height / 2 : y;
        g.drawImage(c, Math.round(dx), Math.round(dy));
        return c.width;
      },
      /** Stone-slab button: click sound on pointerdown, action on pointerup (cancelled by leave/cancel). css: width, silent. */
      btn(label, x, y, on, css = {}) {
        const b = api.add('btn', '', { left: x + 'px', top: y + 'px', ...(css.width ? { width: css.width } : {}) });
        b.style.pointerEvents = 'auto';
        b.dataset.label = label;
        const setLabel = (color) => { b.innerHTML = ''; b.appendChild(clone(text1bit(String(label).toUpperCase(), '700 12px ' + KID, color))); };
        setLabel('#111');
        let armed = false;
        b.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); if (me.done || curG !== me || b.disabled) return; armed = true; if (!css.silent) sfx.click(); });
        b.addEventListener('pointerup', (e) => { e.stopPropagation(); if (!armed) return; armed = false; if (!me.done && curG === me && !b.disabled) on(e); });
        const cancel = () => { armed = false; };
        b.addEventListener('pointerleave', cancel); b.addEventListener('pointercancel', cancel);
        b.disable = () => { b.disabled = true; b.style.pointerEvents = 'none'; b.style.background = '#a9a39a'; b.style.borderColor = '#8c877c'; setLabel('#5e5a52'); };
        return b;
      },
      on(node, fn) { node.style.pointerEvents = 'auto'; node.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (curG === me && !me.done) fn(e, local(e), e.button); }); },
      every(t, fn) { me.iv.push(setInterval(() => !me.done && fn(), t)); },
      after(t, fn) { me.to.push(setTimeout(() => !me.done && fn(), t)); },
      /** Step animation on the 10 fps clock: fn(i) for i = 1..n every STEP ms, then end(). */
      steps(n, fn, end) { let i = 0; const iv = setInterval(() => { if (me.done) { clearInterval(iv); return; } i++; fn(i, i / n); if (i >= n) { clearInterval(iv); end && end(); } }, STEP); me.iv.push(iv); },
      frame(fn) { let last = performance.now(); const t0 = last; const loop = (t) => { if (me.done || curG !== me) return; fn(Math.min(0.05, (t - last) / 1000), (t - t0) / 1000); last = t; requestAnimationFrame(loop); }; requestAnimationFrame(loop); },
      tap(fn) { me.tap = fn; }, move(fn, hover = false) { me.move = fn; me.hover = hover; }, up(fn) { me.up = fn; },
      pos: local,
      done: (result) => finish(me, result),
      sleep: (ms) => new Promise((r) => me.to.push(setTimeout(r, ms))),
    };
    G.setup(api);
  });
}
