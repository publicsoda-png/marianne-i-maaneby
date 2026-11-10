// Plantebedet: koordinater. Gitter 0–7 × 0–5 (klasse 5–6: også negative tal). Sæt fire frø, ét ad gangen, i (x, y).
// Et rigtigt klik giver en spire; et forkert klik tæller som fejl. Ingen dyrkningsråd: det er kun et koordinatsystem med jord.
// Arbejdsfeltet (højbedet) er et opakt panel, så spillet ser rigtigt ud oven på en hvilken som helst baggrund.
import { opg, seeded } from '../../opg.js';
import { sprite } from '../../art/placeholder.js';

let wrongIdx = 0;
const WRONG = [
  'Ikke dér. Første tal er hen ad bedet, andet tal er op.',
  'Frøet ligger forkert og bliver flovt. Prøv igen.',
  'Næsten. Find først x, så y.',
];

export default {
  id: 'scope',
  portrait: true, // baggrunden er set oppefra; en stående figur ville ligne legetøj (QC #9)
  lines: {
    scope_intro: 'Dette er Plantebedet. Hvert frø har sin faste plads. Første tal er hen ad bedet, andet tal er op. Klik der, hvor frøet skal ligge.',
    scope_ok: 'Fire frø på fire pladser. Nu sker der ikke mere i lang tid.',
    scope_wrong: () => WRONG[wrongIdx++ % WRONG.length],
  },
  setup(a) {
    const r = seeded(a.opts.seed ?? 1);
    const grade = a.opts.grade ?? 3;
    const neg = grade > 4;
    const minX = neg ? -5 : 0, maxX = 7, minY = neg ? -5 : 0, maxY = 5;
    const nx = maxX - minX + 1, ny = maxY - minY + 1;
    const cw = Math.floor(320 / (nx - 1)), ch = Math.floor(200 / (ny - 1)); // gitteret ligger inde i den renderede jord
    const GW = cw * (nx - 1), GH = ch * (ny - 1);
    const gx0 = Math.round(328 - GW / 2), gy0 = 156;              // feltkoordinat for (minX, maxY) — y vokser opad
    const px = (x) => gx0 + (x - minX) * cw, py = (y) => gy0 + (maxY - y) * ch;

    // fire forskellige pladser
    const targets = [];
    let guard = 0;
    while (targets.length < 4 && guard++ < 200) { const t = opg('coord', grade, r).a; if (!targets.some((p) => p[0] === t[0] && p[1] === t[1])) targets.push(t); }
    const found = [];
    let locked = false;
    const isFound = (x, y) => found.some((p) => p[0] === x && p[1] === y);
    const publish = () => {
      const t = targets[found.length];
      if (!t) { window.MB_TASK = { game: 'scope', answer: null, found: found.length, total: targets.length }; return; }
      // en forkert naboplads til testen: ved siden af målet og ikke allerede plantet
      const wx = [t[0] + 1, t[0] - 1, t[0] + 2, t[0] - 2].find((x) => x >= minX && x <= maxX && !isFound(x, t[1]));
      window.MB_TASK = { game: 'scope', answer: t, xy: [px(t[0]), py(t[1])], wrongXy: [px(wx), py(t[1])], found: found.length, total: targets.length };
    };

    // ---------- opakt arbejdsfelt: højbed set fra oven ----------
    const PX = 60, PY = 82, PW = 520, PH = 360;
    a.spr(PX + PW / 2 + 3, PY + PH / 2 + 3, PW + 6, PH + 6, (g) => {
      const img = sprite('mg_scope_panel'); // renderet højbed med jord i træramme, hård skygge
      if (!img) { g.fillStyle = '#5a3d22'; g.fillRect(0, 0, PW, PH); return; }
      const sk = document.createElement('canvas'); sk.width = PW; sk.height = PH; const sg = sk.getContext('2d');
      sg.drawImage(img, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = '#1a1410'; sg.fillRect(0, 0, PW, PH);
      g.drawImage(sk, 6, 6); g.drawImage(img, 0, 0);
    });
    const col = { grid: '#9a7a52', axis: '#ffe9a8', label: '#fff4d0', hole: '#1a1008' };

    // jord + gitter + spirer på ét lærred; redraw()
    const PAD = 26;
    const grid = a.spr(gx0 + GW / 2, gy0 + GH / 2, GW + PAD * 2, GH + PAD * 2, (g) => {
      const lx = (x) => PAD + (x - minX) * cw, ly = (y) => PAD + (maxY - y) * ch;
      // jorden er renderet i panelet; her kun snorene, akserne, tallene og hullerne
      g.fillStyle = col.grid;
      for (let x = minX; x <= maxX; x++) g.fillRect(lx(x), PAD, 1, GH);
      for (let y = minY; y <= maxY; y++) g.fillRect(PAD, ly(y), GW, 1);
      g.fillStyle = col.axis; g.fillRect(lx(0) - 1, PAD - 6, 2, GH + 12); g.fillRect(PAD - 6, ly(0) - 1, GW + 12, 2);
      // tal: under bedet og til venstre (ved negative tal står de stadig i kanten, så de er lette at læse)
      for (let x = minX; x <= maxX; x++) a.draw(g, String(x).replace('-', '−'), lx(x), PAD + GH + 7, { size: 12, color: col.label, outline: '#1a1008', align: 'center' });
      for (let y = minY; y <= maxY; y++) a.draw(g, String(y).replace('-', '−'), PAD - 9, ly(y), { size: 12, color: col.label, outline: '#1a1008', align: 'right', valign: 'middle' });
      // et lille hul i hver plads
      g.fillStyle = col.hole;
      for (let x = minX; x <= maxX; x++) for (let y = minY; y <= maxY; y++) g.fillRect(lx(x) - 2, ly(y) - 2, 5, 5);
      // spirer
      found.forEach((p) => {
        const x = lx(p[0]), y = ly(p[1]);
        const sp = sprite('mg_scope_1'); // renderet spire i en lille jordbunke
        if (sp) { g.drawImage(sp, x - 17, y - 20); return; }
        g.fillStyle = '#2f6e2a'; g.fillRect(x - 1, y - 9, 3, 11); g.fillStyle = '#58b043'; g.fillRect(x - 8, y - 12, 7, 5); g.fillRect(x + 2, y - 12, 7, 5);
      });
    });

    // plantepinden: en firkantet markør, der flytter sig i tre hårde trin
    const ret = a.spr(gx0 + GW / 2, gy0 + GH / 2, 36, 36, (g) => {
      g.fillStyle = '#000'; g.fillRect(2, 2, 34, 34);
      g.fillStyle = '#ffd34a'; g.fillRect(0, 0, 34, 34);
      g.clearRect(4, 4, 28, 28);                                              // ramme, 4 px tyk, sort skygge ned/højre
      g.clearRect(10, 0, 14, 36); g.clearRect(0, 10, 36, 14);                 // kun hjørnerne står tilbage
    });
    ret.style.pointerEvents = 'none'; ret.style.visibility = 'hidden';
    let rx = gx0 + GW / 2, ry = gy0 + GH / 2;
    const moveRet = (x, y) => {
      const x0 = rx, y0 = ry; rx = x; ry = y;
      ret.style.visibility = 'visible';
      a.steps(3, (k, f) => ret.at(Math.round(x0 + (x - x0) * f), Math.round(y0 + (y - y0) * f)));
    };

    const ask = (t) => `Sæt et frø i (${String(t[0]).replace('-', '−')}, ${String(t[1]).replace('-', '−')})`;
    const q = a.text(targets[0] ? ask(targets[0]) : '', PX, 92, { width: PW + 'px', textAlign: 'center', fontSize: '18px', color: '#fff3c4', outline: '#2a1608' });
    const prog = a.text('Frø 1 af 4', 478, 412, { fontSize: '14px', color: col.label, outline: '#1a1008' });
    publish();

    a.on(grid, (e, p) => {
      if (locked || found.length >= 4) return;
      // nærmeste plads
      const gx = Math.round((p.x - gx0) / cw) + minX, gy = maxY - Math.round((p.y - gy0) / ch);
      if (gx < minX || gx > maxX || gy < minY || gy > maxY) return;
      const nxp = px(gx), nyp = py(gy);
      if (Math.hypot(p.x - nxp, p.y - nyp) > Math.min(cw, ch) * 0.45 || isFound(gx, gy)) { a.sfx.tick(); return; }
      moveRet(nxp, nyp);
      const t = targets[found.length];
      if (gx === t[0] && gy === t[1]) {
        locked = true;
        a.after(300, () => {
          found.push(t); grid.redraw(); publish();
          a.play('skovl', { gain: 0.8, pan: a.pan(nxp) });
          if (found.length === 4) {
            q.textContent = 'Fire frø i jorden.';
            prog.textContent = '';
            ret.style.visibility = 'hidden';
            a.after(1400, () => a.done({ ok: true, answer: targets }));
          } else {
            q.textContent = ask(targets[found.length]);
            prog.textContent = `Frø ${found.length + 1} af 4`;
            locked = false;
          }
        });
      } else {
        a.sfx.bad(); a.opts.onWrong && a.opts.onWrong();
      }
    });
  },
};
