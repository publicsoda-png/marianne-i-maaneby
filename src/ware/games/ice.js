// Vandingen (Drivhus 7): brøker med ventiler. Tanken rummer W liter; tre ventiler med hver sin brøk. Drej den ventil,
// der lader præcis X liter løbe ned i plantekarret (opg 'frac'). Vandet løber i trin på step-uret.
// Mængderne er opdigtede regnetal, ikke vandingsråd. Arbejdsfeltet er et opakt panel (drivhusvæg med rør).
import { opg, seeded, dk } from '../../opg.js';
import { sprite } from '../../art/placeholder.js';

let wrongIdx = 0;
const WRONG = [
  'Det blev ikke den rigtige mængde. Vandet løber tilbage. Prøv en anden ventil.',
  'Planten ser skuffet ud. Det gør den altid. Kig på brøkerne en gang til.',
  'Næsten. Hvor stor en del af tanken skal der løbe ned?',
];

export default {
  id: 'ice',
  lines: {
    ice_intro: 'Dette er Vandingen i Drivhus 7. Tanken er fuld, men planten skal kun have en del af vandet. Drej på den ventil, der giver præcis den rigtige mængde.',
    ice_ok: 'Lige præcis. Ventilen siger ikke tak. Det gør den aldrig.',
    ice_wrong: () => WRONG[wrongIdx++ % WRONG.length],
  },
  setup(a) {
    const r = seeded(a.opts.seed ?? 1);
    const grade = a.opts.grade ?? 3;
    const task = opg('frac', grade, r);
    const [k, d, whole] = task.parts;
    const X = task.a;

    // ventilernes brøker: den rigtige + to forkerte (samme nævner; halve får fjerdedele med)
    const fr = [[k, d]];
    const pool = [];
    for (let kk = 1; kk < d; kk++) if (kk !== k) pool.push([kk, d]);
    if (d === 2) pool.push([1, 4], [3, 4]);
    while (fr.length < 3 && pool.length) fr.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
    fr.sort(() => r() - 0.5);
    const xs = [200, 320, 440];
    const liters = (f) => (whole * f[0]) / f[1];
    const right = fr.findIndex((f) => liters(f) === X);

    // ---------- geometri (feltkoordinater) ----------
    const TANK = { x: 320, y: 146, w: 200, h: 54 };
    const MAN_Y = 212, VALVE_Y = 262, VAT_TOP = 338; // VAT_TOP = vandfladen i det renderede plantekar (panelet)
    const col = { pipe: '#8e97a8', pipeD: '#4f5664', water: '#49a6e8', waterL: '#9fd9ff', tank: '#b7c2d1', tankD: '#5f6a7a' };
    window.MB_TASK = {
      game: 'ice', answer: right, liters: X, fractions: fr.map((f) => f.join('/')),
      xy: [xs[right], VALVE_Y], wrongXy: [xs[(right + 1) % 3], VALVE_Y],
    };

    // ---------- opakt arbejdsfelt: drivhusvæg ----------
    const PX = 60, PY = 84, PW = 520, PH = 356;
    a.spr(PX + PW / 2 + 3, PY + PH / 2 + 3, PW + 6, PH + 6, (g) => {
      const img = sprite('mg_ice_panel'); // renderet drivhusvæg i nittet metalramme, hård skygge
      if (!img) { g.fillStyle = '#d5e8cf'; g.fillRect(0, 0, PW, PH); return; }
      const sk = document.createElement('canvas'); sk.width = PW; sk.height = PH; const sg = sk.getContext('2d');
      sg.drawImage(img, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = '#1a1410'; sg.fillRect(0, 0, PW, PH);
      g.drawImage(sk, 6, 6); g.drawImage(img, 0, 0);
    });
    a.text(`Planten skal have præcis ${dk(X)} liter. Hvilken ventil?`, PX, 92, { width: PW + 'px', textAlign: 'center', fontSize: '17px', color: '#fff3c4', outline: '#1c2a1c' });

    // tank
    // tank: renderet glastank (mg_ice_0) med literantallet på fronten; ligger over rørene (z-index)
    a.spr(TANK.x, TANK.y + 4, 100, 84, (g) => {
      const img = sprite('mg_ice_0');
      if (img) g.drawImage(img, 14, 0); else { g.fillStyle = col.tank; g.fillRect(10, 10, 80, 70); }
      a.draw(g, `${whole} liter`, 50, 50, { size: 15, color: '#fff', outline: '#123a5a', align: 'center', valign: 'middle' });
    }, { zIndex: 3 });

    // rør: ét lærred over hele rørområdet; redraw(trin, ventil)
    const PY0 = TANK.y + TANK.h / 2 - 6, PIPE_H = VAT_TOP - PY0 + 4;
    const RW = 12;
    const pipes = a.spr(320, PY0 + PIPE_H / 2, 640, PIPE_H, (g, stage = 0, idx = -1) => {
      const L = (y) => y - PY0;
      const seg = (x, y, w, h) => { g.fillStyle = col.pipeD; g.fillRect(x + 3, y + 3, w, h); g.fillStyle = col.pipe; g.fillRect(x, y, w, h); };
      seg(320 - RW / 2, L(TANK.y + 20), RW, MAN_Y - TANK.y - 20);
      seg(xs[0] - RW / 2, L(MAN_Y) - RW / 2, xs[2] - xs[0] + RW, RW);
      xs.forEach((x) => { seg(x - RW / 2, L(MAN_Y), RW, VALVE_Y - MAN_Y); seg(x - RW / 2, L(VALVE_Y), RW, VAT_TOP - VALVE_Y); });
      if (idx < 0 || stage <= 0) return;
      const x = xs[idx], iw = RW - 4;
      const w = (x0, y0, ww, hh) => { g.fillStyle = col.water; g.fillRect(x0, y0, ww, hh); g.fillStyle = col.waterL; g.fillRect(x0, y0, 2, hh); };
      // trin 1..8: tank→fordelerrør, hen ad fordelerrøret, ned til ventilen, ventil→kar
      const a0 = Math.min(320, x), a1 = Math.max(320, x);
      const parts = [
        () => w(320 - iw / 2, L(TANK.y + 20), iw, MAN_Y - TANK.y - 20),
        () => w(a0 - iw / 2, L(MAN_Y) - iw / 2, a1 - a0 + iw, iw),
        () => w(x - iw / 2, L(MAN_Y), iw, VALVE_Y - MAN_Y),
        () => w(x - iw / 2, L(VALVE_Y), iw, VAT_TOP - VALVE_Y),
      ];
      for (let s = 0; s < 4 && s * 2 < stage; s++) parts[s]();
    });

    // plantekar: redraw(niveau 0..1, liter)
    // plantekarret er renderet i panelet (x 161–480, y 329–369); her tegnes kun vandet i karret og literskiltet under det
    const vat = a.spr(320, 365, 320, 72, (g, lvl = 0, l = 0) => {
      const wh = Math.round(13 * lvl);
      if (wh > 0) { g.fillStyle = col.water; g.fillRect(16, 16 - wh, 288, wh); g.fillStyle = col.waterL; g.fillRect(16, 16 - wh, 288, 2); }
      g.fillStyle = '#2a2118'; g.fillRect(93, 45, 140, 26);
      g.fillStyle = '#fffbe8'; g.fillRect(90, 42, 140, 26);
      a.draw(g, 'PLANTEKAR', 98, 55, { size: 11, color: '#111', valign: 'middle' });
      a.draw(g, `${dk(l)} liter`, 224, 55, { size: 15, color: '#111', align: 'right', valign: 'middle' });
    });

    // ventiler
    let busy = false, over = false;
    const valves = xs.map((x, i) => {
      const v = a.spr(x, VALVE_Y, 60, 60, (g, turn = 0) => {
        // renderet ventil (mg_ice_1 lukket, mg_ice_2 åben); drejningen skifter mellem de to i hårde trin og ender åben
        const img = sprite(turn >= 4 || turn % 2 ? 'mg_ice_2' : 'mg_ice_1');
        if (img) g.drawImage(img, 30 - img.width / 2, 30 - img.height / 2);
        else { g.fillStyle = '#c0392b'; g.fillRect(8, 8, 40, 40); }
      });
      // brøkskilt ved siden af ventilen: tæller over nævner
      a.spr(x + 46, VALVE_Y, 30, 46, (g) => {
        g.fillStyle = '#5e5a52'; g.fillRect(2, 2, 28, 44);
        g.fillStyle = '#fffbe8'; g.fillRect(0, 0, 28, 44);
        a.draw(g, String(fr[i][0]), 14, 11, { size: 17, color: '#111', align: 'center', valign: 'middle' });
        g.fillStyle = '#111'; g.fillRect(5, 21, 18, 2);
        a.draw(g, String(fr[i][1]), 14, 33, { size: 17, color: '#111', align: 'center', valign: 'middle' });
      });
      a.on(v, () => {
        if (busy || over) return;
        busy = true;
        a.play('ventil_hvaes', { gain: 0.8, pan: a.pan(x) });
        a.steps(4, (t) => v.redraw(t), () => flow(i)); // drejer 4 trin på step-uret
      });
      return v;
    });
    function flow(i) {
      const l = liters(fr[i]), lvl = Math.min(1, l / whole);
      a.steps(8, (s) => { pipes.redraw(s, i); if (s % 2 === 1) a.play('roer_klik', { gain: 0.6, pan: a.pan(xs[i]) }); }, () => {
        a.play('vand_gurgle', { gain: 0.8, pan: a.pan(xs[i]) });
        a.steps(6, (f) => vat.redraw((lvl * f) / 6, Math.round(((l * f) / 6) * 10) / 10), () => { vat.redraw(lvl, l); a.after(500, () => check(l, i)); });
      });
    }
    function check(l, i) {
      if (l === X) { over = true; a.sfx.good(); a.after(600, () => a.done({ ok: true, answer: l })); return; }
      a.sfx.bad(); a.opts.onWrong && a.opts.onWrong();
      // karret tømmes i trin, ventilen stilles tilbage
      const lvl = Math.min(1, l / whole);
      a.after(500, () => a.steps(6, (f) => vat.redraw((lvl * (6 - f)) / 6, Math.round(((l * (6 - f)) / 6) * 10) / 10), () => { pipes.redraw(0); valves[i].redraw(0); busy = false; }));
    }
  },
};
