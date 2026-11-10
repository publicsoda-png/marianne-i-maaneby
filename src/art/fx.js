// Reward animations on the 10 fps step clock (QUALITY-PLAN §2, "Bygning trin n→n+1"). No easing, no alpha, no filters:
// every colour below already exists in placeholder.js' building palette, so A3 (≤256 colours per frame) is untouched.
//
// SIGNATUR
//   buildSwap(slot, fromStep, toStep, opts = {}) → Promise<void>
//     slot      PLOTS-objekt fra hub.js: { id, x, y, kind }
//     fromStep  trin der vises de første 600 ms (0 = tom plads)
//     toStep    trin der vises efter støvskyen (1..3) — lyden ui_bygning_op<toStep> spilles på SAMME frame
//     opts.night   true/false (default save.night-agtig: false)
//     opts.bg      baggrundscanvas/-billede (hub'ens this.bgc). Bruges KUN når hub.js ikke tegner via drawPlot():
//                  pladsen dækkes så med et patch af baggrunden, før den gamle/nye sprite tegnes ovenpå.
//     opts.onShow  kaldes én gang på pop-framen (fx: save.buildings[id] = toStep; touch()).
//     opts.lock    default true: lock(true) + wait-cursor fra start til stjernerne slutter (1,4 s). Promise'et resolver 400 ms senere.
//
// FORLØB (step = floor(t/100), 10 fps):
//   step 0–5   gammel sprite (600 ms)
//   step 6–7   støvsky, 2 frames (hårde 2×2/4×4-klumper, ingen alfa)
//   step 8     ny sprite 1 px oppe ("pop") + ui_bygning_opN på samme frame  → opts.onShow()
//   step 9     ny sprite normal
//   step 8–13  stjerner 600 ms (5 små 1-bit-stjerner, 2 frames à 300 ms)
//   step 14    lock(false) (wait-cursor væk)
//   step 18    promise resolver (+400 ms) → kalderen lader hjælperen tale
//
// BRUG I hub.js (erstatter linje 47 `if (save.flags.justBuilt) {...play(ui_bygning_opN)}`):
//   import { buildSwap, drawPlot } from '../art/fx.js';
//   if (save.flags.justBuilt) {
//     const jb = save.flags.justBuilt; delete save.flags.justBuilt; touch();
//     const p = PLOTS.find((x) => x.id === jb.id);
//     if (p) { await buildSwap(p, jb.stage - 1, jb.stage, { night: save.night, bg: this.bgc }); await say(t('hub_built'), { auto: 1600 }); }
//   }
//   og i bg(): drawBuilding(g, p.x, p.y, save.buildings[p.id] || 0, p.kind, save.night)
//          →   drawPlot(g, p, save.buildings[p.id] || 0, save.night)
//   (drawPlot er valgfri: med den tegnes bygningen i hub'ens egen lagorden — Fnugger foran bygningen — uden bg-patch.)
//
// Dev: ?dev&scene=hub&built=bakery:2 (main.js) kører sekvensen ved enter; window.MB.devSwap() kører den igen.
import { fx, lock } from '../core/scene.js';
import { rng } from '../core/stage.js';
import { drawBuilding } from './placeholder.js';
import { play, preload as sfxPreload } from '../core/audio.js';

// Colours = placeholder.js' building palette (dark/base day+night, accent, white).
const PAL = {
  day: { dust: ['#8d93a8', '#dfe1ea'], star: ['#ffbf2f', '#fff'] },
  night: { dust: ['#15171f', '#2c2f3a'], star: ['#5a4610', '#ffd58a'] },
};
const STEP = (t) => Math.floor(t / 100);

const active = new Map(); // plot id → { shown(): {step, dy} }
let hooked = false; // true once hub.js draws buildings through drawPlot() → no background patch needed

/** Drop-in for drawBuilding(g, p.x, p.y, step, p.kind, night) that honours a running buildSwap on this plot. */
export function drawPlot(g, p, actualStep, night = false, s = 1) {
  hooked = true;
  const a = active.get(p.id);
  if (!a) return drawBuilding(g, p.x, p.y, actualStep, p.kind, night, s, p.id);
  const { step, dy } = a.shown();
  drawBuilding(g, p.x, p.y + dy, step, p.kind, night, s, p.id);
}
/** True while a swap runs on the plot (hub may e.g. ignore clicks on it). */
export const swapping = (id) => active.has(id);

export function buildSwap(slot, fromStep, toStep, opts = {}) {
  const night = !!opts.night, pal = night ? PAL.night : PAL.day;
  const snd = `ui_bygning_op${Math.min(3, Math.max(1, toStep | 0))}`;
  sfxPreload([`assets/sfx/${snd}.ogg`]).catch(() => {}); // decode now so step 8 fires within ±1 frame
  const r = rng((slot.x * 31 + slot.y * 17 + toStep) | 0);
  const dust = [0, 1].map((f) => Array.from({ length: 12 + f * 4 }, () => ({
    x: Math.round((r() - 0.5) * (56 + f * 24)), y: -Math.round(r() * (26 + f * 26)) - f * 6, s: r() < 0.3 ? 4 : 2, c: pal.dust[r() < 0.5 ? 0 : 1],
  })));
  const stars = Array.from({ length: 5 }, (_, i) => ({ x: Math.round(-34 + i * 17 + (r() - 0.5) * 8), y: -60 - Math.round(r() * 36), c: pal.star[i % 2] }));
  const t0 = performance.now(), s0 = STEP(t0);
  let shownStep = fromStep, shownDy = 0, played = false;
  const state = { shown: () => ({ step: shownStep, dy: shownDy }) };
  active.set(slot.id, state);
  if (opts.lock !== false) lock(true);
  const log = (ev) => { if (window.MB) (window.MB.fxLog = window.MB.fxLog || []).push({ t: Math.round(performance.now()), plot: slot.id, ev }); };
  log('start');

  return new Promise((resolve) => {
    let done = false;
    const item = {
      draw(g, t) {
        const s = STEP(t) - s0;
        if (s >= 8) { shownStep = toStep; shownDy = s === 8 ? -1 : 0; } else { shownStep = fromStep; shownDy = 0; }
        if (s >= 8 && !played) { played = true; play(snd); log('show+' + snd); opts.onShow && opts.onShow(); }
        if (!hooked) {
          // hub draws the plot itself from save-state; cover it with the clean background and draw the step we want.
          const rx = slot.x - 44, ry = slot.y - 100, rw = 88, rh = 112;
          if (opts.bg) g.drawImage(opts.bg, rx, ry, rw, rh, rx, ry, rw, rh);
          drawBuilding(g, slot.x, slot.y + shownDy, shownStep, slot.kind, night);
        }
        if (s >= 6 && s < 8) { for (const d of dust[s - 6]) { g.fillStyle = d.c; g.fillRect(slot.x + d.x, slot.y + d.y, d.s, d.s); } }
        if (s >= 8 && s < 14) {
          const big = ((s - 8) / 3 | 0) === 0; // frame A (300 ms) = plus 5 px, frame B = 1 px dot + diagonals
          for (const st of stars) {
            const x = slot.x + st.x, y = slot.y + st.y; g.fillStyle = st.c;
            if (big) { g.fillRect(x - 2, y, 5, 1); g.fillRect(x, y - 2, 1, 5); }
            else { g.fillRect(x, y, 1, 1); g.fillRect(x - 1, y - 1, 1, 1); g.fillRect(x + 1, y + 1, 1, 1); g.fillRect(x - 1, y + 1, 1, 1); g.fillRect(x + 1, y - 1, 1, 1); }
          }
        }
        if (s >= 14 && !done) { done = true; active.delete(slot.id); if (opts.lock !== false) lock(false); log('end'); setTimeout(resolve, 400); }
      },
      until: t0 + 1500, // the loop drops the item itself a frame after step 14
    };
    fx.push(item);
  });
}
