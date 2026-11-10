// Lampen: vinkler. Drivhuslampen hænger i en skinne over planten. 0° er skinnen mod venstre, 90° er lige ned,
// 180° er skinnen mod højre. Drej lampen med knapperne (eller klik/træk direkte på vinkelmåleren), og tryk Tænd.
// Tre opgaver; planten vokser ét trin pr. rigtigt svar. Sværhedsgrad: 1–2 rene vinkler i spring på 15°,
// 3–4 også vinkler i ord (ret vinkel, halvdelen af …), 5–6 spring på 5° og små regnestykker.
import { seeded } from '../../opg.js';
import { sprite } from '../../art/placeholder.js';

const FONT = '"Comic Neue","Comic Sans MS","Chalkboard SE",cursive';
const wrongLines = [
  'Lampen lyser et andet sted hen. Planten venter. Den har ikke andet for.',
  'Ikke helt den vinkel. Kig på stregerne på vinkelmåleren.',
  'Det var en vinkel. Det var bare ikke den rigtige.',
];

export default {
  id: 'light',
  lines: {
    light_intro: 'Lampen. Nul grader er skinnen til venstre, og halvfems grader er lige ned. Drej lampen til den rigtige vinkel, og tryk Tænd.',
    light_ok: 'Tre gange lys i den rigtige vinkel. Planten er vokset. Den siger ikke tak, men det er heller ikke dens opgave.',
    light_wrong: () => wrongLines[Math.floor(Math.random() * wrongLines.length)],
  },
  setup(a) {
    const r = seeded(a.opts.seed ?? Date.now());
    const grade = Math.max(1, Math.min(6, a.opts.grade ?? 3));
    const ri = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
    const pick = (arr) => arr[ri(0, arr.length - 1)];
    const STEP = grade >= 5 ? 5 : 15;

    // ---- tre opgaver: { q, a }
    const direct = (v) => ({ q: `Drej lampen til ${v}°.`, a: v });
    const pool = () => {
      if (grade <= 1) return [45, 90, 135].map(direct);
      if (grade === 2) return [30, 45, 60, 90, 120, 135, 150].map(direct);
      if (grade <= 4) return [
        ...[30, 60, 75, 105, 120, 150, 165].map(direct),
        { q: 'Lampen skal stå i en ret vinkel.', a: 90 },
        { q: 'Lampen skal stå i halvdelen af en ret vinkel.', a: 45 },
        { q: 'Lampen skal stå i en tredjedel af en ret vinkel.', a: 30 },
        { q: 'Lampen skal stå i en ret vinkel plus 30°.', a: 120 },
        { q: 'Lampen skal stå i 180° minus 45°.', a: 135 },
        { q: 'Lampen skal stå i en tredjedel af 180°.', a: 60 },
      ];
      const x = pick([25, 35, 40, 55, 65, 70]), p = pick([35, 40, 55, 65]), q = pick([25, 50, 70, 85]), h = pick([50, 70, 110, 130, 170]);
      return [
        ...[35, 55, 80, 100, 125, 145, 165].map(direct),
        { q: `Lampen skal stå i 180° minus ${x}°.`, a: 180 - x },
        { q: `Lampen skal stå i ${p}° plus ${q}°.`, a: p + q },
        { q: `Lampen skal stå i halvdelen af ${h}°.`, a: h / 2 },
        { q: `Lampen skal stå ${x}° forbi en ret vinkel.`, a: 90 + x },
      ];
    };
    const tasks = []; let guard = 0, angle = 90;
    const all = pool();
    while (tasks.length < 3 && guard++ < 200) {
      const t = pick(all), prev = tasks.length ? tasks[tasks.length - 1].a : angle; // aldrig samme svar som lampens stilling lige nu
      if (t.a !== prev && !tasks.includes(t)) tasks.push(t);
    }
    while (tasks.length < 3) tasks.push(direct([60, 120, 45][tasks.length]));

    // ---- arbejdsfelt: renderet drivhus (440×330, potten står under ophænget) og en opgavetavle til højre
    const PX0 = 16, PY0 = 96, PWID = 440, PHGT = 330;
    const PVX = 238, PVY = 126, LEN = 136, R0 = LEN + 6;     // lampens ophæng og strålens længde
    a.spr(PX0 + PWID / 2 + 3, PY0 + PHGT / 2 + 3, PWID + 6, PHGT + 6, (g) => {
      const img = sprite('mg_light_panel');
      if (!img) { g.fillStyle = '#20343c'; g.fillRect(0, 0, PWID, PHGT); return; }
      const sk = document.createElement('canvas'); sk.width = PWID; sk.height = PHGT; const sg = sk.getContext('2d');
      sg.drawImage(img, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = '#1a1410'; sg.fillRect(0, 0, PWID, PHGT);
      g.drawImage(sk, 6, 6); g.drawImage(img, 0, 0);
    });
    // opgavetavle: lys plade i træramme med hård skygge
    a.spr(540, 261, 182, 336, (g) => {
      g.fillStyle = '#1a1410'; g.fillRect(6, 6, 176, 330);
      g.fillStyle = '#7a5a34'; g.fillRect(0, 0, 176, 330); g.fillStyle = '#b98a4e'; g.fillRect(0, 0, 176, 3); g.fillRect(0, 0, 3, 330);
      g.fillStyle = '#efe8d4'; g.fillRect(8, 8, 160, 314);
    });
    // vinkelmåler: renderet trævinkelmåler vendt på hovedet (den flade kant under ophænget), streger for hver 15° (5° på de høje trin)
    a.spr(PVX, PVY - 16 + 100, 360, 200, (g) => {
      const cx = 180, cy = 16, img = sprite('mg_light_2');
      if (img) { g.save(); g.translate(cx, cy); g.scale(1, -1); g.drawImage(img, -img.width / 2, -img.height); g.restore(); }
      g.strokeStyle = '#3a2410';
      for (let d = 0; d <= 180; d += 5) {
        if (d % 15 && STEP !== 5) continue;
        const rad = d * Math.PI / 180, big = d % 45 === 0, mid = d % 15 === 0, t = big ? 12 : mid ? 8 : 4;
        g.lineWidth = mid ? 2 : 1;
        g.beginPath(); g.moveTo(cx - Math.cos(rad) * R0, cy + Math.sin(rad) * R0); g.lineTo(cx - Math.cos(rad) * (R0 + t), cy + Math.sin(rad) * (R0 + t)); g.stroke();
      }
      for (let d = 0; d <= 180; d += (grade <= 1 ? 45 : 30)) {
        const rad = d * Math.PI / 180, L = R0 + 26;
        a.draw(g, d + '°', cx - Math.cos(rad) * L, cy + Math.sin(rad) * L + (d % 180 === 0 ? 8 : 0), { size: 12, fontFamily: FONT, color: '#fff3c4', outline: '#1a1410', align: 'center', valign: 'middle' });
      }
    });

    // ---- planten (0–3 trin) i en potte på bordet
    let grown = 0;
    // planten vokser op af den renderede potte (pottens kant ligger ved y 334)
    const plant = a.spr(PVX, 280, 90, 110, (g) => {
      g.fillStyle = '#2f6b2a';
      const h = 14 + grown * 22;
      g.fillRect(43, 106 - h, 4, h);                                                    // stængel
      for (let i = 0; i <= grown; i++) {                                                // bladpar pr. trin
        const y = 100 - i * 22, w = 12 + i * 5;
        g.fillStyle = '#2f6b2a'; g.fillRect(45 - w, y - 4, w, 6); g.fillRect(45, y - 8, w, 6);
        g.fillStyle = '#58a84a'; g.fillRect(45 - w, y - 4, w, 2); g.fillRect(45, y - 8, w, 2);
      }
    });

    // ---- lampe og stråle (gentegnes pr. vinkel). mode 0 = slukket (sigtestreg), 1 = tændt, 2 = tændt forkert sted
    const BW = 2 * (LEN + 8), BH = LEN + 56, CY = 48;
    const beam = a.spr(PVX, PVY - CY + BH / 2, BW, BH, (g, mode) => {
      const cx = BW / 2, cy = CY, rad = angle * Math.PI / 180;
      const ux = -Math.cos(rad), uy = Math.sin(rad), nx = -uy, ny = ux;   // retning og tværretning
      const P = (l, s) => [cx + ux * l + nx * s, cy + uy * l + ny * s];
      const poly = (pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); };
      if (mode) poly([P(54, 18), P(LEN, 34), P(LEN, -34), P(54, -18)], mode === 1 ? '#ffe27a' : '#d8cfa0');
      else { g.fillStyle = '#2a2824'; for (let l = 64; l < LEN; l += 10) { const [x, y] = P(l, 0); g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3); } }
      // renderet lampe (mg_light_1 tændt, mg_light_0 slukket), drejet om ophænget; skærmens top sidder i ophænget
      const img = sprite(mode === 1 ? 'mg_light_1' : 'mg_light_0');
      if (img) { g.save(); g.translate(cx, cy); g.rotate((90 - angle) * Math.PI / 180); g.drawImage(img, -36, -6); g.restore(); }
      else poly([P(12, 7), P(28, 14), P(28, -14), P(12, -7)], '#8a3324');
      g.fillStyle = '#2a2824'; g.fillRect(cx - 4, cy - 4, 8, 8);
    });

    // ---- opgavetavle
    const TX = 466;
    const qText = a.text('', TX, 94, { fontSize: '16px', width: '140px', whiteSpace: 'normal', lineHeight: '1.2', fontFamily: FONT, color: '#111111', textShadow: 'none' });
    const now = a.text('', TX, 216, { fontSize: '13px', width: '140px', whiteSpace: 'normal', fontFamily: FONT, color: '#111111', textShadow: 'none' });
    const prog = a.text('', TX, 398, { fontSize: '12px', fontFamily: FONT, color: '#5e5a52', textShadow: 'none' });
    let ti = 0, busy = false;
    const T = window.MB_TASK = { game: 'light', answer: tasks[0].a, answers: tasks.map((t) => t.a), index: 0, step: STEP, pivot: { x: PVX, y: PVY }, radius: LEN, angle };
    const show = (mode = 0) => {
      qText.textContent = tasks[ti].q; now.textContent = `Lampen: ${angle}°`; prog.textContent = `Opgave ${ti + 1} af 3`;
      T.answer = tasks[ti].a; T.index = ti; T.angle = angle;
      beam.redraw(mode);
    };
    const setAngle = (v) => {
      if (busy) return;
      v = Math.max(0, Math.min(180, v));
      if (v === angle) return;
      angle = v; a.play('lys_drej', { gain: 0.7, pan: a.pan(PVX) });
      show();
    };
    a.btn(`− ${STEP}°`, TX, 250, () => setAngle(angle - STEP), { width: '66px', silent: true });
    a.btn(`+ ${STEP}°`, TX + 74, 250, () => setAngle(angle + STEP), { width: '66px', silent: true });
    if (STEP === 5) {
      a.btn('− 15°', TX, 282, () => setAngle(angle - 15), { width: '66px', silent: true });
      a.btn('+ 15°', TX + 74, 282, () => setAngle(angle + 15), { width: '66px', silent: true });
    }
    a.text('Du kan også klikke på vinkelmåleren.', TX, STEP === 5 ? 314 : 284, { fontSize: '11px', width: '140px', whiteSpace: 'normal', lineHeight: '1.2', fontFamily: FONT, color: '#5e5a52', textShadow: 'none' });
    a.btn('Tænd', TX, 364, () => {
      if (busy) return;
      busy = true;
      if (angle === tasks[ti].a) {
        beam.redraw(1); a.sfx.ok();
        a.after(300, () => { grown++; plant.redraw(); a.sfx.pop(); });
        a.after(900, () => {
          ti++;
          if (ti >= 3) { a.done({ ok: true }); return; }
          busy = false; show();
        });
      } else {
        beam.redraw(2); a.sfx.bad();
        a.opts.onWrong && a.opts.onWrong();
        a.after(500, () => { busy = false; beam.redraw(0); });
      }
    }, { width: '140px' });

    // ---- klik eller træk direkte på vinkelmåleren (mus og touch)
    const aim = (p) => {
      const dx = PVX - p.x, dy = p.y - PVY, d = Math.hypot(dx, dy);
      if (p.x > 440 || dy < -6 || d < 30 || d > R0 + 40) return;
      setAngle(Math.round((Math.atan2(Math.max(0, dy), dx) * 180 / Math.PI) / STEP) * STEP);
    };
    a.tap((e, p) => aim(p));
    a.move((e, p) => aim(p));
    show();
  },
};
