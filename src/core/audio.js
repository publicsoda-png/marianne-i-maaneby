// Web Audio: busser, loop-musik, stemme med munddata, synth-SFX og samplede SFX.
// Signalkæde:  music → duck ─┐
//              amb ──────────┤
//              voice → 8-bit-crush → lavpas 6,8 kHz ─┤→ master → blød clipper → ud
//              sfx → mild crush ─────────────────────┘
// ALLE niveauer og ducking-tal står i mix.js (MIX). Her er kun mekanikken. Filerne er masteret til deres målniveau
// (musik −18 LUFS, stemme −16 LUFS), så der skal ikke dæmpes "en gang til" nogen steder.
// Manglende filer er altid tavse no-ops: music()/play()/voice()/preload() kaster aldrig og afviser aldrig.
import { MIX, dB } from './mix.js';

let ctx = null;
const bus = {};
let current = null; // nuværende musik {src, node, gain}
const buffers = new Map();
const missing = new Map(); // src → tidspunkt for sidste mislykkede hentning (så en manglende fil ikke hentes igen hver frame)
const MISS_MS = 15000;
const PAD = 1; // sekunders polstring i hver ende af musikfiler og loops (tools/music/render.py, tools/sfx/make.py)
const chain = {};

export function audioCtx() { return ctx; }
export function ensureAudio() {
  if (ctx) { ctx.state !== 'running' && ctx.resume(); return ctx; }
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state !== 'running') ctx.resume(); // Safari/iOS opretter den suspenderet, selv inde i en gestus
  bus.master = ctx.createGain();
  chain.clipper = ctx.createWaveShaper(); chain.clipper.curve = tanhCurve(1.6); chain.clipper.oversample = 'none'; // æra: "lidt for højt"
  bus.master.connect(chain.clipper).connect(ctx.destination);
  for (const n of ['music', 'voice', 'sfx', 'amb']) { bus[n] = ctx.createGain(); bus[n].gain.value = dB(MIX[n]); }
  bus.duck = ctx.createGain(); bus.duck.gain.value = 1;           // musik dykker under stemme — styres KUN af duckNow()
  bus.music.connect(bus.duck).connect(bus.master);
  bus.amb.connect(bus.master);
  chain.voiceCrush = ctx.createWaveShaper(); chain.voiceCrush.curve = crushCurve(8);
  chain.voiceLP = ctx.createBiquadFilter(); chain.voiceLP.type = 'lowpass'; chain.voiceLP.frequency.value = 6800;
  bus.voice.connect(chain.voiceCrush).connect(chain.voiceLP).connect(bus.master);
  chain.sfxCrush = ctx.createWaveShaper(); chain.sfxCrush.curve = crushCurve(10);
  bus.sfx.connect(chain.sfxCrush).connect(bus.master);
  return ctx;
}
export const buses = () => bus;
export function setBus(name, v, t = 0.2) { if (ctx && bus[name]) bus[name].gain.setTargetAtTime(v, ctx.currentTime, t); }

function tanhCurve(g, n = 2048) {
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(x * g) / Math.tanh(g); }
  return c;
}
function crushCurve(bits, n = 4096) {
  const c = new Float32Array(n), steps = Math.pow(2, bits) / 2;
  for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.round(x * steps) / steps; }
  return c;
}

function load(src) {
  if (!ctx) return Promise.resolve(null);
  if (buffers.has(src)) return buffers.get(src);
  if (performance.now() - (missing.get(src) ?? -Infinity) < MISS_MS) return Promise.resolve(null);
  const alt = src.replace(/\.ogg$/, '.m4a');
  const get = (u) => fetch(u).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(u))).then((ab) => ctx.decodeAudioData(ab));
  const p = get(src)
    .catch(() => (alt !== src ? get(alt) : Promise.reject(src)))
    .catch(() => { buffers.delete(src); missing.set(src, performance.now()); return null; }); // fejl caches kun kort: en 404 ved boot kan være et kapløb med serveren
  buffers.set(src, p);
  return p;
}
let musicGen = 0, ambGen = 0, activeVoices = 0;
export const preload = (srcs) => (ctx ? Promise.all(srcs.map(load)) : Promise.resolve([]));

/** Loop-musik: music('assets/music/byen.ogg'). opts: {fade, rate, detune, startDelay, gain, restart}. music(null) stopper.
 *  Filerne har PAD sekunders polstring i hver ende; der loopes mellem PAD og varighed − PAD, så sømmen er ren. */
export async function music(src, opts = {}) {
  try {
    if (!ctx) return;
    if (current && current.src === src && !opts.restart) return;
    stopMusic(opts.fade ?? 0.4);
    if (!src) return;
    const my = ++musicGen;
    const buf = await load(src);
    if (!buf || my !== musicGen) return; // filen mangler, eller et nyere music()-kald vandt mens vi hentede
    const node = ctx.createBufferSource();
    node.buffer = buf; node.loop = true;
    const pad = buf.duration > 2 * PAD + 0.5 ? PAD : 0;
    node.loopStart = pad; node.loopEnd = buf.duration - pad;
    node.playbackRate.value = opts.rate ?? 1;
    if (opts.detune) node.detune.value = opts.detune;
    const g = ctx.createGain();
    g.gain.value = 0;
    node.connect(g).connect(bus.music);
    const t0 = ctx.currentTime + (opts.startDelay ?? 0);
    node.start(t0, pad);
    g.gain.setTargetAtTime(opts.gain ?? 1, t0, opts.fade ?? 0.5);
    current = { src, node, gain: g };
  } catch { /* lyd må aldrig vælte spillet */ }
}
export function stopMusic(fade = 0.4) {
  musicGen++; // also cancels a music() still loading
  if (!current) return;
  const { node, gain } = current;
  gain.gain.setTargetAtTime(0, ctx.currentTime, fade);
  setTimeout(() => { try { node.stop(); } catch {} }, fade * 1000 * 4 + 50);
  current = null;
}
export const musicPlaying = () => !!current;
// ---------- ambience ----------
let ambLayers = []; // [{src, node, gain}]
/** Replace all ambience layers with the given list [{src, gain}], crossfading over `fade` seconds. */
export async function ambientLayers(list, fade = 2) {
  if (!ctx) return;
  const gen = ++ambGen;
  const old = ambLayers; ambLayers = [];
  const tau = Math.max(0.05, fade / 3);
  for (const l of old) { l.gain.gain.setTargetAtTime(0, ctx.currentTime, tau); setTimeout(() => { try { l.node.stop(); } catch {} }, tau * 1000 * 6 + 100); } // ≥6τ so the stop is inaudible
  const bufs = await Promise.all(list.map((l) => load(l.src)));
  if (gen !== ambGen) return; // a newer ambientLayers() call owns the bus now
  list.forEach(({ src, gain }, i) => {
    const buf = bufs[i]; if (!buf) return;
    const node = ctx.createBufferSource(); node.buffer = buf; node.loop = true;
    if (isPadded(src)) { node.loopStart = PAD; node.loopEnd = buf.duration - PAD; } // make.py wrap-polstrer loops med 1 s; codec-kanter ligger uden for loopet
    const g = ctx.createGain(); g.gain.value = 0;
    node.connect(g).connect(bus.amb); node.start(0, isPadded(src) ? PAD : 0);
    g.gain.setTargetAtTime(gain, ctx.currentTime, tau);
    ambLayers.push({ src, node, gain: g });
  });
}
const isPadded = (s) => /(^|\/)amb_|_loop(\.|$)/.test(s);
/** Ét ambience-loop: ambient('assets/sfx/fx_taage_vind_loop.ogg'), ambient(null) stopper. */
export const ambient = (src, gain = 1) => ambientLayers(src ? [{ src, gain }] : [], 1);

// ---------- ducking (det ENESTE sted musikken dæmpes under stemme; tallene står i mix.js) ----------
function duckNow(on) { if (ctx) bus.duck.gain.setTargetAtTime(on ? dB(MIX.duck) : 1, ctx.currentTime, on ? MIX.duckAttack : MIX.duckRelease); }

/** Spil et stemmeklip; returnerer {done: Promise, mouth()→0..3, dur, stop()}. Munddata = JSON-array med 0..3 pr. 80 ms.
 *  opts.silent: munden bevæger sig, men uden lyd. Mangler filen, fås et tomt klip (done er allerede opfyldt). */
export async function voice(src, mouthJson, opts = {}) {
  const none = { done: Promise.resolve(), mouth: () => 0, dur: 0, stop: () => {} };
  try {
    if (!ctx) return none;
    const [buf, mouth] = await Promise.all([load(src), mouthJson ? fetch(mouthJson).then((r) => (r.ok ? r.json() : null)).catch(() => null) : null]);
    if (!buf) return none;
    const node = ctx.createBufferSource(); node.buffer = buf;
    const g = ctx.createGain(); g.gain.value = opts.silent ? 0 : 1;
    node.connect(g).connect(bus.voice);
    const t0 = ctx.currentTime;
    node.start(t0);
    if (!opts.silent) { activeVoices++; duckNow(true); }
    let ended = false;
    const end = () => { if (ended) return; ended = true; if (!opts.silent && --activeVoices <= 0) { activeVoices = 0; duckNow(false); } };
    const done = new Promise((r) => (node.onended = () => { end(); r(); }));
    return { done, dur: buf.duration, stop: () => { end(); try { node.stop(); } catch {} }, mouth: () => {
      const t = ctx.currentTime - t0;
      if (mouth) return mouth[Math.floor(t / 0.08)] ?? 0;
      return t < buf.duration ? 1 + Math.floor((Math.sin(t * 19) + 1) * 1.49) : 0;
    } };
  } catch { return none; }
}

// ---------- samplede SFX (assets/sfx/<navn>.ogg, m4a som reserve) ----------
/** play('fx_stempel') · play('mg_bold_boing', {gain, detune, rate, pan, delay, loop, to: 'sfx'|'amb'|'master'})
 *  → Promise<AudioBufferSourceNode | null>. Mangler filen (eller er lyden ikke startet endnu), fås null — aldrig en fejl.
 *  Loops (navne der ender på _loop, samt amb_*): const s = await play('fx_snork_loop', { loop: true }); … s?.stop(); */
export async function play(name, opts = {}) {
  try {
    if (!ready()) return null;
    const buf = await load(`assets/sfx/${name}.ogg`);
    if (!buf) return null;
    const s = ctx.createBufferSource(); s.buffer = buf;
    if (opts.detune) s.detune.value = opts.detune;
    if (opts.rate) s.playbackRate.value = opts.rate;
    const g = ctx.createGain(); g.gain.value = opts.gain ?? 1;
    let last = s.connect(g);
    if (opts.pan !== undefined && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = opts.pan; last = last.connect(p); }
    last.connect(bus[opts.to] || bus.sfx);
    const t0 = ctx.currentTime + (opts.delay || 0), pad = isPadded(name) && buf.duration > 2 * PAD + 0.1 ? PAD : 0;
    if (opts.loop) { s.loop = true; s.loopStart = pad; s.loopEnd = buf.duration - pad; s.start(t0, pad); }
    else if (pad) s.start(t0, pad, buf.duration - 2 * pad);
    else s.start(t0);
    return s;
  } catch { return null; }
}

// ---------- synth SFX ----------
function ready() { return ctx && ctx.state === 'running'; }
export function blip(f, dur = 0.05, gain = 0.06, type = 'square', f1 = f, to = 'sfx', pan) {
  if (!ready()) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (f1 !== f) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let last = o.connect(g);
  if (pan !== undefined && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; last = last.connect(p); }
  last.connect(bus[to] || bus.sfx);
  o.start(t); o.stop(t + dur + 0.02);
}
/** Brown-ish noise burst through a sweeping bandpass — CD-ROM spin-up. */
export function cdSpin(dur = 2.2) {
  if (!ready()) return;
  const t = ctx.currentTime;
  const n = noiseBuf(dur + 0.5);
  const s = ctx.createBufferSource(); s.buffer = n;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2.5;
  f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(1800, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.3); g.gain.setValueAtTime(0.25, t + dur - 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(bus.sfx); s.start(t); s.stop(t + dur + 0.1);
  for (let i = 0; i < 6; i++) setTimeout(() => blip(90 + Math.random() * 60, 0.012, 0.18, 'square'), 350 + i * (180 + Math.random() * 240));
}
export function crtHum(on = true) {
  if (!ready()) return;
  if (crtHum.node) { try { crtHum.node.stop(); } catch {} crtHum.node = null; }
  if (!on) return;
  const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sawtooth'; o.frequency.value = 50; o2.type = 'sine'; o2.frequency.value = 15625 / 2;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
  g.gain.value = 0.0001; g.gain.setTargetAtTime(0.035, ctx.currentTime, 1.5);
  const g2 = ctx.createGain(); g2.gain.value = 0.006;
  o.connect(f).connect(g).connect(bus.amb); o2.connect(g2).connect(bus.amb);
  o.start(); o2.start();
  crtHum.node = { stop: () => { o.stop(); o2.stop(); } };
}
export function crtOff() {
  if (!ready()) return;
  blip(3200, 0.18, 0.12, 'sine', 40);
  setTimeout(() => blip(60, 0.4, 0.08, 'triangle', 20), 120);
}
function noiseBuf(sec) {
  const b = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * sec), ctx.sampleRate);
  const d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; d[i] = last = (last + 0.02 * w) / 1.02; d[i] *= 3.5; }
  return b;
}
export const sfx = {
  tick: () => blip(1900, 0.012, 0.035, 'square'),
  click: () => { blip(1200, 0.02, 0.12, 'square', 600); },
  ok: () => { blip(660, 0.08, 0.1, 'triangle'); setTimeout(() => blip(990, 0.12, 0.1, 'triangle'), 90); },
  good: () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, 0.14, 0.11, 'triangle'), i * 90)); },
  bad: () => { blip(659, 0.1, 0.1, 'triangle'); setTimeout(() => blip(523, 0.16, 0.1, 'triangle'), 100); }, // dur-terts nedad, aldrig farlig
  pop: () => blip(500, 0.05, 0.1, 'sine', 900),
  thud: () => blip(110, 0.15, 0.16, 'triangle', 50),
  sticker: () => { blip(1300, 0.05, 0.08, 'square'); setTimeout(() => blip(1800, 0.09, 0.08, 'square'), 60); },
  bzzt: () => { blip(70, 0.1, 0.25, 'square', 55); },
  cdSpin, crtHum, crtOff, blip, play,
};
