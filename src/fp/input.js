// First person input: WASD/arrows held = continuous; on-screen arrows (scene hotspots) queue stepped moves.
const keys = new Set();
let on = false;
const down = (e) => { if (!on) return; const k = e.key.toLowerCase(); if (MAP[k] || k === 'e' || k === ' ') { keys.add(k); e.preventDefault(); } };
const up = (e) => keys.delete(e.key.toLowerCase());
const MAP = { w: 'f', arrowup: 'f', s: 'b', arrowdown: 'b', a: 'l', arrowleft: 'l', d: 'r', arrowright: 'r' };
addEventListener('keydown', down); addEventListener('keyup', up); addEventListener('blur', () => keys.clear());

const queue = []; // stepped moves from click arrows: {kind:'f'|'b'|'l'|'r', left: seconds}
export const STEP = 0.22; // seconds per click step
export function enable(v) { on = v; keys.clear(); queue.length = 0; used = false; held = null; }
let held = null; // pil holdt nede (pointerdown → pointerup)
export function hold(kind) { if (on) held = kind; }
export function release() { held = null; }
export function push(kind) { if (queue.length < 2) queue.push({ kind, left: STEP }); }
let used = false;
export function use() { used = true; }
/** → { fwd:-1..1, turn:-1..1, use:boolean } for this frame. */
export function read(dt) {
  let fwd = 0, turn = 0;
  for (const k of keys) { const m = MAP[k]; if (m === 'f') fwd += 1; else if (m === 'b') fwd -= 1; else if (m === 'l') turn -= 1; else if (m === 'r') turn += 1; }
  if (held && !fwd && !turn) { if (held === 'f') fwd = 1; else if (held === 'b') fwd = -1; else if (held === 'l') turn = -1; else if (held === 'r') turn = 1; queue.length = 0; }
  const q = queue[0];
  if (q && !fwd && !turn) {
    const t = Math.min(dt, q.left) / dt; q.left -= dt;
    if (q.kind === 'f') fwd = t; else if (q.kind === 'b') fwd = -t; else if (q.kind === 'l') turn = -t; else turn = t;
    if (q.left <= 0) queue.shift();
  }
  const u = used || keys.has('e') || keys.has(' '); used = false; keys.delete('e'); keys.delete(' ');
  return { fwd, turn, use: u };
}
