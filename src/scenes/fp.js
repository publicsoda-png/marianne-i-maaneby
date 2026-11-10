// 3D first person-scenen = missionsmotor. goto('fp', { mission: 'drivhus'|'kiosk'|'taage', ret }).
// Løst mission: save.flags['fp_' + mission] = true, save.log får { id, name, wrong, act }, og der klippes til ret (eller hub).
// Banerne og deres regler ligger i src/fp/<mission>.js; her ligger kun styring, HUD og afslutning.
import { register, goto } from '../core/scene.js';
import { W, H, drawText, stipple, toStage } from '../core/stage.js';
import { save, touch, persist } from '../core/state.js';
import { makeRenderer, move, limitWorld } from '../fp/ray.js';
import * as input from '../fp/input.js';
import { loadTex } from '../fp/tex.js';
import { play, ambient } from '../core/audio.js';
import * as drivhus from '../fp/drivhus.js';
import * as kiosk from '../fp/kiosk.js';
import * as taage from '../fp/taage.js';

const MISSIONS = { drivhus, kiosk, taage };
const SPEED = 2.6, TURN = 2.4; // celler/s, rad/s
const F = '700 12px "Comic Neue","Comic Sans MS",sans-serif';
const R = makeRenderer();
const stat = { ms: 0, fps: 0, frames: 0, done: false, wrong: 0, msg: '', mission: '' };
const ARROWS = [
  { id: 'fp_l', label: 'Drej til venstre', x: 236, y: 428, w: 48, h: 44, glyph: '◄', kind: 'l' },
  { id: 'fp_f', label: 'Frem', x: 292, y: 384, w: 56, h: 40, glyph: '▲', kind: 'f' },
  { id: 'fp_b', label: 'Tilbage', x: 292, y: 428, w: 56, h: 44, glyph: '▼', kind: 'b' },
  { id: 'fp_r', label: 'Drej til højre', x: 356, y: 428, w: 48, h: 44, glyph: '►', kind: 'r' },
  { id: 'fp_use', label: 'Brug', x: 556, y: 428, w: 76, h: 44, glyph: 'BRUG', kind: 'use' },
  { id: 'fp_quit', label: 'Opgiv og gå tilbage', x: 8, y: 8, w: 64, h: 24, glyph: 'OPGIV', kind: 'quit' },
];
const q = () => new URLSearchParams(location.search);
// Hold en pil nede (mus eller finger): efter 250 ms går/drejer man, så længe man holder. Et kort tryk er stadig ét skridt (hotspot-klikket).
let holdT = 0;
const arrowAt = (e) => { const p = toStage(e); return ARROWS.find((a) => 'flbr'.includes(a.kind) && p.x >= a.x && p.y >= a.y && p.x < a.x + a.w && p.y < a.y + a.h); };
addEventListener('pointerdown', (e) => { const a = arrowAt(e); if (!a) return; clearTimeout(holdT); holdT = setTimeout(() => input.hold(a.kind), 250); });
const stopHold = () => { clearTimeout(holdT); input.release(); };
addEventListener('pointerup', stopHold); addEventListener('pointercancel', stopHold); addEventListener('blur', stopHold);

register({
  id: 'fp',
  async enter(arg = {}) {
    const run = (this.run = (this.run || 0) + 1); // nyt løb: gamle timere og indlæsninger hører ikke til os længere
    this.m = null; this.msgT = 0; this.t = 0;
    const id = MISSIONS[arg.mission] ? arg.mission : MISSIONS[q().get('mission')] ? q().get('mission') : 'drivhus'; // main.js' dev-start sender ikke mission med → læs den fra URL'en
    this.ret = arg.ret || 'hub';
    for (const k of Object.keys(stat)) delete stat[k];
    Object.assign(stat, { ms: 0, fps: 0, frames: 0, done: false, wrong: 0, msg: '', mission: id });
    let T = {}; const png = [];
    try { T = await loadTex(MISSIONS[id].NAMES, png); } catch { /* loadTex kaster ikke; bæltet og selerne */ }
    if (run !== this.run) return;
    const m = MISSIONS[id].build({ T, grade: save.grade || 3, stat, seed: +q().get('seed') || ((Date.now() & 0xffff) + 1) });
    stat.colors = limitWorld(m.world); stat.png = png.length;
    if (q().get('cols') === '160') m.world.cols = 160;
    this.m = m; this.w = m.world; this.cam = { ...m.start };
    this.say(m.intro, m.introSecs || 4);
    input.enable(true);
    const mi = arg.mission || new URLSearchParams(location.search).get('mission');
    if (mi === 'taage') ambient('assets/sfx/fx_taage_vind_loop.ogg'); else if (mi === 'kiosk') play('fx_doerklokke');
    window.MB && (window.MB.fp = { stat, cam: this.cam, world: this.w });
  },
  exit() { ambient(null); input.enable(false); this.run++; this.m = null; },
  say(text, secs = 2.5) { stat.msg = text; this.msgT = secs; },
  hotspots() { return this.m ? ARROWS.map((a) => ({ ...a, on: () => (a.kind === 'quit' ? this.quit() : a.kind === 'use' ? input.use() : input.push(a.kind)) })) : []; },
  /** Opgiv: tilbage til ret uden flag og uden indslag i regnskabet. */
  quit() { if (stat.done || !this.m) return; stat.done = true; goto(this.ret, { back: true, opgivet: true }).catch(() => {}); },
  wrong() { stat.wrong++; },
  win(msg) {
    if (stat.done) return;
    const m = this.m, run = this.run, id = 'fp_' + m.id, row = { id, name: m.name, wrong: stat.wrong, act: save.act };
    stat.done = true;
    save.flags[id] = true;
    const i = save.log.findIndex((r) => r.id === id); if (i >= 0) save.log[i] = row; else save.log.push(row); // spilles missionen igen, erstattes linjen
    touch(); persist(true);
    this.say(msg + ' Gemt.', 4);
    setTimeout(() => { if (run === this.run) goto(this.ret, { back: true }).catch(() => {}); }, 3000);
  },
  near() { // nærmeste ting foran spilleren inden for rækkevidde
    let best = null, bd = 1.2;
    for (const s of this.w.sprites) {
      if (s.hidden) continue;
      const dx = s.x - this.cam.x, dy = s.y - this.cam.y, d = Math.hypot(dx, dy);
      if (d < bd && Math.cos(this.cam.a) * dx + Math.sin(this.cam.a) * dy > 0) { best = s; bd = d; }
    }
    return best;
  },
  ahead() { // vægtegnet lige foran spilleren (højst 2 felter væk) — så skilte kan læses i klar tekst
    const c = this.cam, dx = Math.cos(c.a), dy = Math.sin(c.a);
    for (let d = 0.25; d <= 2; d += 0.25) { const ch = (this.w.map[Math.floor(c.y + dy * d)] || '')[Math.floor(c.x + dx * d)] || '#'; if (ch !== '.') return ch; }
    return null;
  },
  use() {
    const s = this.near();
    if (!s) return;
    if (s.line) this.say(s.line, 3.5); else this.m.use(s, this);
  },
  walk(mx, my) { // vægge via move(); figurer og varer med solid: true kan man ikke gå igennem
    const c = this.cam, ox = c.x, oy = c.y;
    move(c, this.w.map, mx, my);
    const hit = () => this.w.sprites.some((s) => s.solid && !s.hidden && Math.hypot(s.x - c.x, s.y - c.y) < (s.keep || 0.55)); // keep: figurer i fuld højde holder afstand, så de ikke dækker pilene
    if (!hit()) return;
    const nx = c.x, ny = c.y;
    c.y = oy; if (!hit()) return;
    c.x = ox; c.y = ny; if (!hit()) return;
    c.y = oy;
  },
  bg(g, dt) {
    if (!this.m) { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); return; } // teksturerne hentes: sort klip
    dt = dt || 0.016;
    const c = this.cam, m = this.m, i = input.read(dt);
    this.t += dt; this.w.tick = Math.floor(this.t * 10); // 10 fps step-ur til billboard-frames
    if (!stat.done) {
      c.a += i.turn * TURN * dt;
      if (i.fwd) this.walk(Math.cos(c.a) * i.fwd * SPEED * dt, Math.sin(c.a) * i.fwd * SPEED * dt);
      if (i.use) this.use();
      if (m.tick && !stat.done) m.tick(c, this, dt);
    }
    const t0 = performance.now();
    const cv = R.render(c, this.w);
    stat.ms += (performance.now() - t0 - stat.ms) * 0.05; stat.fps += (1 / Math.max(dt, 0.001) - stat.fps) * 0.05; stat.frames++;
    g.imageSmoothingEnabled = false;
    g.drawImage(cv, 0, 0, W, H);
    // HUD: klik-pile (mobil + ægte museklik-test), status og besked
    for (const a of ARROWS) {
      g.fillStyle = '#d8d0b0'; g.fillRect(a.x, a.y, a.w, a.h); g.fillStyle = '#6b6348'; g.fillRect(a.x, a.y + a.h - 2, a.w, 2); g.fillRect(a.x + a.w - 2, a.y, 2, a.h);
      drawText(a.glyph, a.x + a.w / 2, a.y + a.h / 2 - 9, { font: F, color: '#111', align: 'center' });
    }
    drawText(m.hud(), 82, 12, { font: F, color: '#fff', outline: '#000' });
    drawText('Kl. 16:20   Fejl: ' + stat.wrong, 632, 12, { font: F, color: '#fff', outline: '#000', align: 'right' });
    if (!stat.done) {
      const n = this.near(), hint = (n && m.prompt(n)) || (n && n.line ? 'BRUG: kig nærmere' : null) || m.look(this.ahead());
      if (hint) drawText(hint, W / 2, 358, { font: F, color: '#fff', outline: '#000', align: 'center' });
    }
    if (this.msgT > 0) { this.msgT -= dt; g.fillStyle = stipple('#000', 3); g.fillRect(40, 40, 560, 28); drawText(stat.msg, W / 2, 46, { font: F, color: '#fff', align: 'center' }); }
    if (q().has('fps')) drawText(stat.fps.toFixed(0) + ' fps  ' + stat.ms.toFixed(2) + ' ms', 632, 30, { font: F, color: '#ff0', outline: '#000', align: 'right' });
  },
});
