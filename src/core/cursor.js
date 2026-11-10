// Own sprite cursor: lets the game hijack it later (drift, lag, pull). Draws placeholder sprites if PNGs are missing.
import { toStage } from './stage.js';
const el = document.getElementById('cursor');
const app = document.getElementById('app');
let px = 320, py = 240, tx = 320, ty = 240;
export const cur = { lag: 0, drift: { x: 0, y: 0 }, pull: null, pullK: 0, mode: 'arrow', visible: true, x: 320, y: 240 };

addEventListener('pointermove', (e) => { const p = toStage(e); tx = p.x; ty = p.y; });
addEventListener('pointerdown', (e) => { const p = toStage(e); tx = p.x; ty = p.y; });
addEventListener('pointerup', (e) => { const p = toStage(e); tx = p.x; ty = p.y; });

export function setCursor(mode) { if (cur.mode !== mode) { cur.mode = mode; el.className = mode === 'arrow' ? '' : mode; } }
export function showCursor(v) { cur.visible = v; el.classList.toggle('hidden', !v); }

export function tickCursor() {
  let gx = tx + cur.drift.x, gy = ty + cur.drift.y;
  if (cur.pull) { gx += (cur.pull.x - gx) * cur.pullK; gy += (cur.pull.y - gy) * cur.pullK; }
  if (cur.lag > 0) { px += (gx - px) * (1 - cur.lag); py += (gy - py) * (1 - cur.lag); } else { px = gx; py = gy; }
  cur.x = px; cur.y = py;
  el.style.transform = `translate(${Math.round(px)}px,${Math.round(py)}px)`;
  const inside = px >= 0 && py >= 0 && px < 640 && py < 480;
  el.style.visibility = inside && cur.visible ? 'visible' : 'hidden';
}
// Cursors are PNG8 sprites (assets/cursor-arrow.png / -hand.png / -wait.png, set in style.css). Procedural 1-bit fallbacks
// (white-outlined black arrow / glove hand / hourglass) are injected as data URLs ONLY for a PNG that fails to load.
function mk(draw) {
  const c = document.createElement('canvas'); c.width = 32; c.height = 32;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false; draw(g); return c.toDataURL();
}
const FALLBACK = {
  arrow: () => mk((g) => {
    g.fillStyle = '#fff';
    g.beginPath(); g.moveTo(1, 1); g.lineTo(1, 22); g.lineTo(6, 17); g.lineTo(10, 25); g.lineTo(14, 23); g.lineTo(10, 15); g.lineTo(17, 15); g.closePath(); g.fill();
    g.fillStyle = '#000';
    g.beginPath(); g.moveTo(3, 4); g.lineTo(3, 18); g.lineTo(6.5, 15); g.lineTo(10, 22); g.lineTo(12, 21); g.lineTo(8.8, 14); g.lineTo(13.5, 14); g.closePath(); g.fill();
  }),
  hand: () => mk((g) => {
    g.fillStyle = '#000';
    g.fillRect(9, 2, 6, 18); g.fillRect(14, 7, 5, 13); g.fillRect(18, 9, 5, 11); g.fillRect(3, 12, 8, 8); g.fillRect(6, 18, 17, 10);
    g.fillStyle = '#fff';
    g.fillRect(10, 3, 4, 16); g.fillRect(15, 8, 3, 11); g.fillRect(19, 10, 3, 9); g.fillRect(5, 13, 6, 6); g.fillRect(7, 19, 15, 8);
  }),
  wait: () => mk((g) => {
    g.fillStyle = '#000'; g.fillRect(8, 2, 16, 3); g.fillRect(8, 27, 16, 3);
    g.beginPath(); g.moveTo(9, 5); g.lineTo(23, 5); g.lineTo(16, 16); g.lineTo(23, 27); g.lineTo(9, 27); g.lineTo(16, 16); g.closePath(); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(11, 6); g.lineTo(21, 6); g.lineTo(16, 14); g.closePath(); g.fill(); g.beginPath(); g.moveTo(11, 26); g.lineTo(21, 26); g.lineTo(16, 18); g.closePath(); g.fill();
    g.fillStyle = '#000'; g.beginPath(); g.moveTo(13, 7); g.lineTo(19, 7); g.lineTo(16, 12); g.closePath(); g.fill(); g.fillRect(14, 23, 5, 3);
  }),
};
const sheet = document.createElement('style');
document.head.appendChild(sheet);
for (const [mode, file] of [['arrow', 'cursor-arrow'], ['hand', 'cursor-hand'], ['wait', 'cursor-wait']]) {
  const i = new Image();
  i.onerror = () => { sheet.textContent += `#cursor${mode === 'arrow' ? '' : '.' + mode}{background-image:url(${FALLBACK[mode]()})!important}`; };
  i.src = `assets/${file}.png`;
}
app.addEventListener('pointerleave', () => (el.style.visibility = 'hidden'));
