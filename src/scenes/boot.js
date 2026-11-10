// Krom: sort → Krater Multimedie-ident → loader "Henter Måneby…" → "Klik for at begynde" (= ensureAudio) → title → setup.
// Titlen: Start (nyt spil) og Fortsæt (det rigtige sted i den aktuelle akt).
import { register, goto, button, lock, scenes } from '../core/scene.js';
import * as SCENE from '../core/scene.js';
import { W, H, drawText } from '../core/stage.js';
import { showOS, osEl, progressBox, fakeProgress, sleep } from '../core/os.js';
import { ensureAudio, audioCtx, sfx, music, stopMusic, preload as preloadAudio } from '../core/audio.js';
import { save, meta, persist, persistMeta, resetSave } from '../core/state.js';
import { bg, hasBg, drawFnug, drawBuilding } from '../art/placeholder.js';
import { stipple } from '../core/stage.js';
import { helper, showHelper } from '../core/dialog.js';
import { helperShadow, resumeTarget, spil, himmel } from './hub.js';
import { showCursor } from '../core/cursor.js';

const IDENT_MUSIC = 'assets/music/ident.ogg';
const KROM_FONT = '700 12px Tahoma, "DejaVu Sans", Verdana, sans-serif';
const app = document.getElementById('app');

/** Studie-chime: ident.ogg hvis den findes, ellers krom-støj. Kræver en kørende AudioContext. */
async function chime() {
  if (!audioCtx()) return false;
  try {
    const [buf] = await preloadAudio([IDENT_MUSIC]);
    if (buf) { music(IDENT_MUSIC, { restart: true, fade: 0.05 }); setTimeout(() => { if (SCENE.current && SCENE.current.id === 'ident') stopMusic(0.2); }, 3200); } // 3 s chime, ikke loop
    else sfx.cdSpin(2.4);
  } catch { sfx.cdSpin(2.4); }
  return true;
}

register({
  id: 'ident',
  async enter() {
    lock(true);
    showCursor(false);
    showOS(false);
    app.style.visibility = 'visible';
    this.phase = 'ident'; this.going = false; // ident | black | loader | click
    this.t0 = performance.now();
    this.chimed = false;
    // Et tidligt klik (fx dev) tænder lyden, så chimen kan høres under identen. Ellers tændes den ved "Klik for at begynde".
    const early = () => { ensureAudio(); };
    addEventListener('pointerdown', early, { once: true });
    this.chimed = await chime();
    await sleep(3000); // identen: sort → 2 hårde trin → hold (tegnes i bg())
    // hårdt cut gennem sort til loader-boksen
    this.phase = 'black';
    await sleep(300);
    this.phase = 'loader';
    osEl.innerHTML = ''; osEl.style.background = '#000';
    showOS(true); app.style.visibility = 'hidden';
    const box = progressBox({ title: 'Marianne i Måneby', text: 'Henter Måneby…' });
    await fakeProgress(box, { ms: 2600 }); // beholder det koreograferede ryk
    await sleep(300);
    box.close();
    showOS(false); app.style.visibility = 'visible';
    removeEventListener('pointerdown', early);
    this.phase = 'click';
    this.t1 = performance.now();
    showCursor(true);
    lock(false);
  },
  async click() {
    if (this.phase !== 'click' || this.going) return;
    this.going = true;
    ensureAudio(); // første pointerdown: her tændes lyden (ellers tavshed hele vejen)
    lock(true);
    if (!this.chimed) { this.phase = 'ident'; this.t0 = performance.now() - 1400; this.chimed = await chime(); await sleep(1400); } // ingen lyd under identen → chimen høres nu, kort
    goto('title');
  },
  bg(g, dt, t) {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    if (this.phase === 'ident') {
      const step = Math.floor((t - this.t0) / 700); // 0 = sort, 1 = navn, 2+ = navn + undertekst (hårde trin, ingen tween)
      if (step >= 1) {
        const f1 = '700 44px Tahoma, "DejaVu Sans", Verdana, sans-serif';
        drawText('KRATER MULTIMEDIE', 323, 203, { align: 'center', font: f1, color: '#4a4a4a' }); // hård skygge
        drawText('KRATER MULTIMEDIE', 320, 200, { align: 'center', font: f1, color: '#fff' });
      }
      if (step >= 2) {
        g.fillStyle = '#4a4a4a'; g.fillRect(222, 263, 200, 2);
        g.fillStyle = '#fff'; g.fillRect(220, 261, 200, 2);
        drawText('Valby · 2005', 320, 274, { align: 'center', font: KROM_FONT, color: '#bbb' });
      }
    } else if (this.phase === 'click') {
      const on = Math.floor((t - this.t1) / 500) % 2 === 0; // 500/500 ms blink som ▼
      if (on) {
        const f = '700 22px Tahoma, "DejaVu Sans", Verdana, sans-serif';
        drawText('Klik for at begynde', 322, 232, { align: 'center', font: f, color: '#4a4a4a' });
        drawText('Klik for at begynde', 320, 230, { align: 'center', font: f, color: '#fff' });
      }
      drawText('Krater Multimedie ApS, Valby · 2005', 320, 456, { align: 'center', font: '11px Tahoma, sans-serif', color: '#666' });
    }
  },
});

register({
  id: 'title',
  async enter() {
    lock(false);
    const b = bg(hasBg('title') ? 'title' : 'hub');
    this.t0 = performance.now();
    spil('titel');
    const BF = { w: 124, h: 30, font: '700 16px "Comic Neue","Comic Sans MS",sans-serif' };
    button('Start', 258, 392, () => { sfx.click(); goto('setup'); }, BF);
    if (save.name && save.flags.akt1 && !save.flags.slut) button('Fortsæt', 258, 430, () => { sfx.click(); goto(...resumeTarget()); }, BF);
    this.bgc = b;
  },
  bg(g, dt, t) {
    g.drawImage(this.bgc, 0, 0);
    himmel(g, t); // stjerner der blinker i trin + satellit (samme som bykortet)
    // title logo: big kid-font with hard shadow (placeholder for the real logo render)
    const bob = 0; // era rule: no continuous motion on the title
    // logoet står til højre for Jorden i baggrunden
    drawText('MARIANNE I', 400, 56 + bob, { align: 'center', font: '700 34px "Comic Neue","Comic Sans MS",sans-serif', color: '#ffd21f', outline: '#5a3a00' });
    drawText('MÅNEBY', 400, 92 + bob, { align: 'center', font: '700 58px "Comic Neue","Comic Sans MS",sans-serif', color: '#ffd21f', outline: '#5a3a00' });
    // forgrund: én Fnug ved Start-knappen med skygge. (Mords by-silhuet, kuppel og bænke-Fnug er væk: den nye baggrund har sin egen by.)
    drawFnug(g, 398, 452, 1.15, { id: 3 });
    drawText('Krater Multimedie ApS, Valby · 2005', 320, 468, { align: 'center', font: '11px Tahoma, sans-serif', color: '#ccc' });
    drawText('Ver. 4.20', 8, 464, { font: '11px Tahoma, sans-serif', color: '#aaa' });
    // cover-praleri: hård stjerne-etiket + voksen-advarsel
    g.fillStyle = '#d6201f'; g.fillRect(36, 40, 150, 44); g.fillStyle = '#7a0f0f'; g.fillRect(36, 82, 150, 2); g.fillRect(184, 40, 2, 44);
    drawText('NU MED', 111, 44, { align: 'center', font: '700 13px "Comic Neue","Comic Sans MS",sans-serif', color: '#fff' });
    drawText('ÆGTE 3D', 111, 58, { align: 'center', font: '700 20px "Comic Neue","Comic Sans MS",sans-serif', color: '#ffd21f' });
    drawText('Til voksne. Indeholder brøker.', 400, 164, { align: 'center', font: '700 13px "Comic Neue","Comic Sans MS",sans-serif', color: '#fff', outline: '#000' });
  },
});

register({
  id: 'setup',
  async enter() {
    const ui = document.getElementById('ui');
    const inp = document.createElement('input');
    inp.className = 'input'; inp.maxLength = 14; inp.style.left = '212px'; inp.style.top = '150px'; inp.style.width = '200px';
    inp.value = save.flags.slut ? '' : save.name || '';
    ui.appendChild(inp);
    setTimeout(() => { inp.focus(); inp.select(); }, 50);
    const chips = [];
    let grade = save.grade || 3;
    for (let i = 1; i <= 6; i++) {
      const c = document.createElement('div'); c.className = 'chip' + (grade === i ? ' on' : ''); c.textContent = String(i); c.title = 'Niveau ' + i;
      c.style.left = 192 + (i - 1) * 38 + 'px'; c.style.top = '240px';
      c.addEventListener('pointerdown', (e) => { e.stopPropagation(); sfx.pop(); grade = i; chips.forEach((x) => x.classList.remove('on')); c.classList.add('on'); });
      ui.appendChild(c); chips.push(c);
    }
    helper.present = true; showHelper(true);
    button('OK', 290, 318, () => {
      const name = inp.value.trim() || 'Praktikant';
      resetSave();
      save.name = name; save.grade = grade;
      persistMeta(); persist(true);
      sfx.ok();
      goto('drivhus');
    }, { w: 60 });
    this.bgc = bg('hub');
  },
  exit() { showHelper(false); },
  bg(g) {
    g.drawImage(this.bgc, 0, 0);
    helperShadow(g);
    const px = 180, py = 100, pw = 280, ph = 264, fr = 8;
    g.fillStyle = '#2a2824'; g.fillRect(px + 2, py + 2, pw, ph);
    g.fillStyle = '#c9c3b3'; g.fillRect(px, py, pw, ph);
    g.fillStyle = '#f4f1ea'; g.fillRect(px, py, pw, 2); g.fillRect(px, py, 2, ph);
    g.fillStyle = '#5e5a52'; g.fillRect(px, py + ph - 2, pw, 2); g.fillRect(px + pw - 2, py, 2, ph);
    g.fillStyle = '#5e5a52'; g.fillRect(px + fr - 2, py + fr - 2, pw - 2 * fr + 4, 2); g.fillRect(px + fr - 2, py + fr - 2, 2, ph - 2 * fr + 4);
    g.fillStyle = '#f4f1ea'; g.fillRect(px + fr - 2, py + ph - fr, pw - 2 * fr + 4, 2); g.fillRect(px + pw - fr, py + fr - 2, 2, ph - 2 * fr + 4);
    g.fillStyle = '#1a1230'; g.fillRect(px + fr, py + fr, pw - 2 * fr, ph - 2 * fr);
    drawText('Skriv dit navn:', 212, 124, { font: '700 16px "Comic Neue","Comic Sans MS",sans-serif', color: '#fff' });
    drawText('Hvor svær skal matematikken være?', 196, 212, { font: '700 14px "Comic Neue","Comic Sans MS",sans-serif', color: '#fff' });
  },
});
