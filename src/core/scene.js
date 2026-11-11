// Scene manager: scenes are objects {id, bg(ctx, state), hotspots:[{x,y,w,h | poly, cursor, label, on}], enter(g), exit(), tick(dt)}.
import { ctx, W, H, drawText, text1bit, toStage } from './stage.js';
import { cur, setCursor, tickCursor } from './cursor.js';
import { save, tickClock } from './state.js';
import { sfx } from './audio.js';

const ui = document.getElementById('ui');
export const scenes = new Map();
export let current = null;
let hover = null;
const buttons = new Set();

const gotoHooks = [];
/** Kaldes ved hvert sceneskift, før den nye scene starter (fx: luk en åben replik). */
export function onGoto(fn) { gotoHooks.push(fn); }

export function register(s) { scenes.set(s.id, s); return s; }

// Era rule (measured on the original, see docs/DECISIONS.md): every scene change cuts through solid black, 0.2–0.5 s.
let black = 0; // 0 = none, 1 = fully black
export function cutBlack(ms = 300) { black = 1; return new Promise((r) => setTimeout(() => { black = 0; r(); }, ms)); }
export async function goto(id, arg, opts = {}) {
  const next = scenes.get(id);
  if (!next) throw new Error('no scene ' + id);
  if (current && current.exit) await current.exit();
  for (const fn of gotoHooks) { try { fn(id); } catch { /* krogen må aldrig stoppe et sceneskift */ } }
  clearButtons();
  hover = null;
  const hold = opts.black ?? (current ? 280 : 0);
  if (hold) { black = 1; await new Promise((r) => setTimeout(r, hold)); }
  current = next;
  save.scene = id;
  black = 0;
  if (next.enter) await next.enter(arg);
}

function hit(p) {
  if (!current || !current.hotspots) return null;
  const list = typeof current.hotspots === 'function' ? current.hotspots() : current.hotspots;
  for (let i = list.length - 1; i >= 0; i--) {
    const h = list[i];
    if (h.hidden && h.hidden()) continue;
    if (h.poly) { if (inPoly(p, h.poly)) return h; }
    else if (p.x >= h.x && p.y >= h.y && p.x < h.x + h.w && p.y < h.y + h.h) return h;
  }
  return null;
}
function sameHot(a, b) {
  if (a === b) return true;
  if (a.id != null || b.id != null) return a.id === b.id;
  if (a.label !== b.label) return false;
  if (a.poly || b.poly) return JSON.stringify(a.poly) === JSON.stringify(b.poly);
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}
function inPoly(p, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
/** Id på hotspottet under musen (null, når intet eller låst). */
export const hoverId = () => (hover && !locked ? hover.id ?? null : null);
export let locked = false;
export function lock(v) { locked = v; }
const app = document.getElementById('app');
// Bible (QUALITY-PLAN §2): press on pointerdown, ACTION on pointerup — and only if the pointer is still on the same hotspot.
let pressHot = null, pressFree = false; // hotspot armed on down / "free click" armed (no hotspot under the pointer)
app.addEventListener('pointerdown', (e) => {
  pressHot = null; pressFree = false;
  if (locked) return;
  if (e.target.closest('#dialog, .btn, .input, .chip, #field .o, .win')) return;
  const h = hit(toStage(e)); // the event's own position, not last frame's cursor (fast clicks/touch landed beside the target)
  if (h && h.on) { e.preventDefault(); pressHot = h; }
  else if (current && current.click) pressFree = true;
});
app.addEventListener('pointerup', (e) => {
  const h = pressHot, free = pressFree; pressHot = null; pressFree = false;
  if (locked) return;
  if (e.target.closest('#dialog, .btn, .input, .chip, #field .o, .win')) return;
  const p = toStage(e), now = hit(p);
  // hotspots() may build fresh objects per call → compare by identity OR by key (id/label + geometry), not identity alone
  if (h) { if (now && sameHot(now, h) && h.on) { e.preventDefault(); h.on(e.button, p); } }
  else if (free && !now && current && current.click) current.click(p, e.button);
});
app.addEventListener('pointercancel', () => { pressHot = null; pressFree = false; });
app.addEventListener('pointerleave', () => { pressHot = null; pressFree = false; });
app.addEventListener('contextmenu', (e) => e.preventDefault());

let domHover = null; // DOM element (button) under the pointer → cursor = hand (hover is ONLY a cursor change)
/** Make any DOM element a Director-style pressable: `down(e)` on pointerdown (click sound), `up(e)` on pointerup — but only
 *  while the pointer is still on the element; pointerleave/pointercancel cancel the press. Class `down` while pressed
 *  (CSS: inverted bevel + 1 px text shift; no transition). `enabled()` gates both (default: not locked).
 *  Reusable by src/ware/engine.js api.btn: pressable(b, { down: sfx.click, up: on, enabled: () => !me.done }). */
export function pressable(el, { down, up, enabled = () => !locked } = {}) {
  let pressed = false;
  const release = () => { if (!pressed) return; pressed = false; el.classList.remove('down'); };
  el.addEventListener('pointerdown', (e) => { e.stopPropagation(); if (!enabled()) return; pressed = true; el.classList.add('down'); down && down(e); });
  el.addEventListener('pointerup', (e) => { e.stopPropagation(); if (!pressed) return; release(); if (enabled()) up && up(e); });
  el.addEventListener('pointerleave', release);
  el.addEventListener('pointercancel', release);
  el.addEventListener('pointerenter', () => { domHover = el; });
  el.addEventListener('pointerleave', () => { if (domHover === el) domHover = null; });
  return el;
}
/** DOM button on the stage (stone slab). Returns element; auto-removed on scene change unless keep.
 *  3 states: rest / hover = cursor hand only / pressed = inverted bevel + 1 px. Click sound on down (opts.sound, default sfx.click;
 *  false = none), `on` runs on pointerup. */
export function button(label, x, y, on, opts = {}) {
  const b = document.createElement('div');
  b.className = 'btn' + (opts.cls ? ' ' + opts.cls : '');
  b.appendChild(text1bit(label.toUpperCase(), opts.font || '700 12px "Comic Neue","Comic Sans MS",sans-serif', '#111'));
  b.dataset.label = label;
  b.style.left = x + 'px'; b.style.top = y + 'px';
  if (opts.w) b.style.width = opts.w + 'px';
  if (opts.h) b.style.height = opts.h + 'px'; // større knapper på titlen (kolonne C r3)
  const snd = opts.sound === false ? null : opts.sound || sfx.click;
  pressable(b, { down: () => snd && snd(), up: (e) => on(e) });
  ui.appendChild(b);
  buttons.add(b);
  return b;
}
export function clearButtons() { buttons.forEach((b) => b.remove()); buttons.clear(); domHover = null; ui.querySelectorAll('.input,.chip').forEach((x) => x.remove()); }

// ---------- main loop ----------
let last = performance.now();
export const fx = []; // {draw(ctx,t), until}
function frame(t) {
  const dt = Math.min(0.05, (t - last) / 1000); last = t;
  tickClock();
  if (current) {
    if (current.bg) current.bg(ctx, dt, t);
    if (current.tick) current.tick(dt, t);
    if (current.draw) current.draw(ctx, dt, t);
    const h = locked ? null : hit({ x: cur.x, y: cur.y });
    if (h !== hover) { hover = h; }
    setCursor(locked ? 'wait' : h && h.on ? h.cursor || 'hand' : domHover ? 'hand' : 'arrow');
    const pd = pressHot ? 1 : 0; // pressed look on hotspots: label 1 px down/right while the pointer is held (bible: press on down, action on up)
    if (hover && hover.label && !locked) drawText(hover.label, Math.min(W - 10, cur.x + 14 + pd), Math.min(H - 20, cur.y + 18 + pd), { font: '700 12px "Comic Neue","Comic Sans MS",sans-serif', color: '#fff', outline: '#000' });
  }
  for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.draw(ctx, t); if (f.until && t > f.until) fx.splice(i, 1); }
  if (black) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
  ui.style.visibility = black ? 'hidden' : 'visible';
  tickCursor();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
