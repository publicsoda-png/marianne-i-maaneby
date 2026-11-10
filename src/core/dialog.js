// Tekstboksen: skrivemaskine + tik, klik for at springe/gå videre, hjælperen (Skipper Sløv) stor nederst til venstre med mundsynk, valgfri tale.
// opts.who = figur-id (src/art/figs.js): navnet vises i boksen, og DEN figur animerer mund i stedet for hjælperen.
// Teksten rasteriseres 1-bit på 640-gitteret (canvas), aldrig DOM-tekst.
import { sfx, voice as playVoice } from './audio.js';
import { onGoto } from './scene.js';
import { drawPortrait } from '../art/portrait.js';
import { sprite } from '../art/placeholder.js';
import { meta, persistMeta } from './state.js';
import { text1bit } from './stage.js';
import { voiceFor } from '../voicemap.js';
import { talk, figName, hasFig, hasPose, drawFig } from '../art/figs.js';

const box = document.getElementById('dialog');
const more = document.getElementById('dmore');
const tc = document.getElementById('dtextc').getContext('2d');
const plate = document.getElementById('dname'), plc = plate.getContext('2d');
const hc = document.getElementById('helper');
const pc = hc.getContext('2d');
pc.imageSmoothingEnabled = false; tc.imageSmoothingEnabled = false;
const FONT = '700 15px "Comic Neue","Comic Sans MS",sans-serif';

export const helper = { present: true, mood: 'calm', mouth: 0, silentMouth: false, visible: false };
let waiting = null;
let skipping = false;
let sayGen = 0; // an older auto-say must never hide a newer one (QC: hourglass forever when answering during "Prøv igen")

box.addEventListener('pointerdown', (e) => { e.stopPropagation(); advance(); });
box.addEventListener('contextmenu', (e) => e.preventDefault());
document.getElementById('app').addEventListener('pointerdown', () => { if (!box.hidden) advance(); });
function advance() { if (waiting) { const w = waiting; waiting = null; w(); } else skipping = true; }

/** Word-wrap and rasterise text 1-bit onto the dialog canvas. */
let wrapW = 596;
/** Ombryd til linjer; første linje er kortere, når der står et navn foran (nameW px). */
export function wrapLines(str, nameW = 0, width = wrapW) {
  const words = str.split(' '); const lines = []; let line = '';
  for (const w of words) { const test = line ? line + ' ' + w : w; if (text1bit(test, FONT).width > width - (lines.length ? 0 : nameW) && line) { lines.push(line); line = w; } else line = test; }
  if (line) lines.push(line);
  return lines;
}
const nameTag = (who) => (who ? text1bit(figName(who) + ':', FONT, '#ffd21f', '#000') : null);
/** Antal linjer en replik fylder i boksen (testen kræver ≤ 3). */
export const lineCount = (str, who) => wrapLines(str, who ? nameTag(who).width + 4 : 0, 596).length;
function renderText(str) {
  tc.clearRect(0, 0, 600, 60);
  wrapLines(str).slice(0, 3).forEach((l, i) => tc.drawImage(text1bit(l, FONT, '#fff', '#000'), 0, i * 20));
}
/** Navneskiltet hænger under boksens kant: gul plade med hård kant, navnet 1-bit i sort. name = null skjuler det. */
function showPlate(name, left) {
  plate.hidden = !name; if (!name) return;
  const t = text1bit(name.toUpperCase(), '700 12px "Comic Neue","Comic Sans MS",sans-serif', '#1b1b1b');
  const w = t.width + 16, h = 20;
  plate.width = w; plate.height = h; plate.style.width = w + 'px'; plate.style.height = h + 'px'; plate.style.left = left + 'px';
  plc.fillStyle = '#5a3a00'; plc.fillRect(0, 0, w, h);
  plc.fillStyle = '#ffd21f'; plc.fillRect(2, 0, w - 4, h - 2);
  plc.fillStyle = '#fff3a8'; plc.fillRect(2, 0, 2, h - 2);
  plc.fillStyle = '#c99a00'; plc.fillRect(w - 4, 0, 2, h - 2); plc.fillRect(2, h - 4, w - 4, 2);
  plc.drawImage(t, 8, Math.round((h - 2 - t.height) / 2));
}

let raf = null;
function animateHelper(mouthFn) {
  cancelAnimationFrame(raf);
  const loop = () => { helper.mouth = mouthFn ? mouthFn() : 0; drawHelper(); raf = requestAnimationFrame(loop); };
  loop();
}
export function drawHelper() {
  pc.clearRect(0, 0, 130, 250);
  hc.classList.toggle('hidden', !helper.visible);
  if (!helper.visible) return;
  const im = sprite('helper');
  if (!helper.present) return;
  if (hasFig('sloev')) { // figurarket: tale efter mundsynk, ellers blink, og efter lang ro et gab og en lur
    const now = performance.now(), step = Math.floor(now / 100), quiet = box.hidden ? now - idleSince : 0;
    let pose = 'idle', f = Math.floor(step / 6) % 2;
    if (helper.mouth) { pose = 'talk'; f = helper.mouth; }
    else if (quiet > 45000 && hasPose('sloev', 'sove')) { pose = 'sove'; f = 0; }
    else if (quiet > 30000 && quiet < 31600 && hasPose('sloev', 'gabe')) { pose = 'gabe'; f = 0; }
    else if (step % 41 < 2) { pose = 'blink'; f = 0; }
    drawFig(pc, 'sloev', pose, f, 65, 250, 1);
    return;
  }
  if (im) {
    // helper.png: mundframes side om side (frames ca. 1:2), passet ind i 130×250, bundstillet
    const src = im;
    const n = Math.max(1, Math.round(im.width / (im.height / 2))), fw = im.width / n, f = Math.min(n - 1, helper.mouth || 0);
    const k = Math.min(130 / fw, 250 / im.height), w = Math.round(fw * k), h = Math.round(im.height * k);
    pc.imageSmoothingEnabled = false; pc.drawImage(src, f * fw, 0, fw, im.height, Math.round((130 - w) / 2), 250 - h, w, h);
    return;
  }
  // intet ark: kodetegnet pladsholder (portrait.js tegner 96×112; skaleres ×1,35 og stilles i bunden af 130×250)
  pc.save(); pc.translate(0, 98); pc.scale(1.354, 1.354); drawPortrait(pc, helper, true); pc.restore();
}
export function showHelper(v) { helper.visible = v; idleSince = performance.now(); drawHelper(); }
let idleSince = performance.now();
setInterval(() => { if (helper.visible && box.hidden) drawHelper(); }, 100); // hjælperen lever også uden dialog
export function hideDialog() { box.hidden = true; idleSince = performance.now(); cancelAnimationFrame(raf); talk.who = null; talk.mouth = 0; helper.mouth = 0; drawHelper(); }

/** say(text, opts): who (figur-id), voice, mouth, cps, hold, auto, noPortrait, pauseAt, keep */
export async function say(text, opts = {}) {
  if (!opts.voice) { const v = voiceFor(text); if (v) opts = { ...opts, ...v }; }
  const who = opts.who && opts.who !== 'sloev' ? opts.who : null; // Skipper Sløv ER hjælperen
  talk.who = null; talk.mouth = 0;
  const gen = ++sayGen;
  if (waiting) { const w = waiting; waiting = null; w(); } // release an older say() that is waiting for a click
  box.hidden = false;
  // keep the text clear of DOM buttons sitting in the box's zone (hub's Gem/Luk top-left) — QC: lines were clipped under them
  const inBox = [...document.querySelectorAll('#ui .btn')].filter((b) => parseFloat(b.style.top) < 76);
  const inset = inBox.length ? Math.max(...inBox.map((b) => parseFloat(b.style.left) + b.offsetWidth)) + 12 : 12;
  box.style.paddingLeft = inset + 'px'; wrapW = 620 - inset;
  renderText('');
  showPlate(who ? figName(who) : (!opts.noPortrait && helper.present && helper.visible ? figName('sloev') : null), inset);
  more.style.visibility = 'hidden';
  skipping = false;
  let v = null, vAt = 0;
  // the typewriter starts at once; the voice joins when its buffer is ready (QC: text used to wait seconds for the load on live)
  const vp = opts.voice ? playVoice(opts.voice, opts.mouth, { silent: !!opts.silent }).then((r) => { v = r; vAt = performance.now(); return r; }) : null; // silent = real mouth data, no sound (min 60)
  const msPerChar = 1000 / (opts.cps ?? 28);
  const pace = () => { // once the voice is in: spread the remaining characters over the remaining voice time
    if (!v || !v.dur) return msPerChar;
    const left = v.dur * 1000 - (performance.now() - vAt), chars = Math.max(1, text.length - shown);
    return Math.max(msPerChar, left / chars);
  };
  const talking = !who && !opts.noPortrait && helper.present;
  let shown = 0;
  const mouthNow = () => (v ? v.mouth() : helper.silentMouth || (shown < text.length ? 1 + ((shown >> 1) % 3) : 0));
  animateHelper(() => { if (who && gen === sayGen) { talk.who = who; talk.mouth = mouthNow(); } return talking ? mouthNow() : 0; });
  let lastTick = 0;
  while (shown < text.length) {
    if (gen !== sayGen) { if (v && v.stop) v.stop(); return; } // a newer say() took over the box
    if (skipping) { shown = text.length; renderText(text); break; }
    shown++;
    renderText(text.slice(0, shown));
    const ch = text[shown - 1];
    if (!v && !opts.silent && ch !== ' ' && performance.now() - lastTick > 38) { sfx.tick(); lastTick = performance.now(); }
    let d = pace();
    if (opts.pauseAt && opts.pauseAt[shown]) d = opts.pauseAt[shown];
    else if (ch === '…') d = 420; else if (/[.!?]/.test(ch)) d = 260; else if (ch === ',') d = 120;
    await sleep(d);
  }
  if (vp) { await vp; if (gen !== sayGen) { if (v && v.stop) v.stop(); return; } }
  if (v) { if (skipping && v.stop) v.stop(); else await v.done; }
  if (gen !== sayGen) return; // en nyere say() har overtaget
  animateHelper(null); talk.who = null; talk.mouth = 0;
  if (opts.hold) await sleep(opts.hold);
  if (opts.auto) { await sleep(opts.auto); if (gen === sayGen && opts.keep !== true) hideDialog(); return; }
  if (gen !== sayGen) return;
  more.style.visibility = 'visible';
  skipping = false;
  await new Promise((r) => (waiting = r));
  if (gen !== sayGen) return;
  more.style.visibility = 'hidden';
  if (opts.keep !== true) hideDialog();
}
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Sceneskift lukker en åben replik. Den ventende say() slippes IKKE (den gamle scenes kode må ikke køre videre); den glemmes.
onGoto(() => { if (box.hidden) return; sayGen++; waiting = null; skipping = false; more.style.visibility = 'hidden'; hideDialog(); });
export function countHelpClick() { meta.helpClicks++; persistMeta(); return meta.helpClicks; }
drawHelper();
