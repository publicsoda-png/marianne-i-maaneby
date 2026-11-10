// Vægten (hos Vægtmester Gram): poser lander én efter én på en køkkenvægt. Hver pose har sin vægt på mærkaten.
// Læg dem sammen og vælg, hvad vægten viser. Klasse 1–2: poser à 1 g (tælling). Fra 3. klasse: decimaler med komma.
// Poserne falder på 10 fps step-uret (4 trin, ingen tween). Arbejdsfeltet (bord + vægt) er et opakt panel, så
// spillet ser rigtigt ud oven på en hvilken som helst baggrund.
import { opg, choices, seeded, dk } from '../../opg.js';
import { sprite } from '../../art/placeholder.js';

let wrongIdx = 0;
const WRONG = [
  'Det viser vægten ikke. Læg poserne sammen en gang til.',
  'Næsten. Husk kommaet.',
  'Vægtmester Gram ryster på hovedet. Langsomt. Prøv igen.',
];

export default {
  id: 'landing',
  figX: 590, // Vægtmester Gram bliver stående til højre for feltet, mens der vejes (task.js)
  lines: {
    landing_intro: 'Dette er Vægten. Vægtmester Gram vejer alt, også sig selv. Poserne lander på vægten. Læg dem sammen, og klik på det tal, vægten bør vise.',
    landing_ok: 'Korrekt. Vægten og Vægtmester Gram er enige. Det sker sjældent.',
    landing_wrong: () => WRONG[wrongIdx++ % WRONG.length],
  },
  setup(a) {
    const r = seeded(a.opts.seed ?? Date.now());
    const grade = a.opts.grade ?? 3;
    // lavt niveau: n poser à 1 g. Ellers 2–3 poser med hver sin vægt.
    let weights, answer, step = 1;
    if (grade < 3) { const t = opg('count', grade, r); weights = Array(t.n).fill(1); answer = t.n; }
    else { const t = opg('gram', grade, r); weights = t.parts; answer = t.a; step = t.step; }
    const n = weights.length;
    const opts = choices(answer, r, 4, step);
    window.MB_TASK = { game: 'landing', answer, label: dk(answer), choices: opts.map((v) => dk(v)), weights };

    // ---------- arbejdsfelt: renderet disk i træramme (mg_vaegt_panel) med hård skygge ----------
    const PX = 16, PY = 84, PW = 500, PH = 356;
    a.spr(PX + PW / 2 + 3, PY + PH / 2 + 3, PW + 6, PH + 6, (g) => {
      const img = sprite('mg_vaegt_panel'); if (!img) { g.fillStyle = '#e3cfa4'; g.fillRect(0, 0, PW, PH); return; }
      const sk = document.createElement('canvas'); sk.width = PW; sk.height = PH; const sg = sk.getContext('2d');
      sg.drawImage(img, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = '#1a1410'; sg.fillRect(0, 0, PW, PH);
      g.drawImage(sk, 6, 6); g.drawImage(img, 0, 0);
    });
    a.text(n > 3 ? 'Hver pose vejer 1 g. Hvor mange gram viser vægten?' : 'Hvor mange gram viser vægten i alt?', PX, 98, { width: PW + 'px', textAlign: 'center', fontSize: '17px', color: '#fff3c4', outline: '#2a1608' });

    // ---------- køkkenvægten (mg_vaegt): redraw(tekst i displayet) ----------
    const SW = 240, SH = 189, SX = PX + PW / 2, SY = 289.5; // vejepladen ligger ca. 28 px under spritens overkant
    const scale = a.spr(SX, SY, SW, SH, (g, txt) => {
      const img = sprite('mg_vaegt'); if (img) g.drawImage(img, 0, 0);
      a.draw(g, txt || '? g', 121, 122, { size: 24, color: '#16301a', align: 'center', valign: 'middle' });
    });

    // ---------- poserne (mg_pose: almindelig + markeret) ----------
    const BW = 58, BH = 75;
    const drawBag = (g, lit, w) => {
      const img = sprite('mg_pose'); if (img) g.drawImage(img, lit ? BW : 0, 0, BW, BH, 0, 0, BW, BH);
      a.draw(g, dk(w) + ' g', 32, 45, { size: 11, color: '#111', align: 'center', valign: 'middle' });
    };
    // pladser på vejepladen: op til 5 pr. række, rækkerne stables opad
    const top = Math.round(SY - SH / 2) + 28;
    const slots = weights.map((w, i) => {
      const row = Math.floor(i / 5), inRow = Math.min(5, n - row * 5), col = i % 5;
      return { x: Math.round(SX - ((inRow - 1) * 48) / 2 + col * 48), y: top - 31 - row * 40 };
    });
    let landed = 0;
    const land = (i) => {
      const s = slots[i], y0 = PY + 40;
      const b = a.spr(s.x, y0, BW, BH, (g, lit) => drawBag(g, !!lit, weights[i]));
      b.style.visibility = 'hidden';
      a.steps(4, (k, f) => { b.style.visibility = 'visible'; b.at(s.x, Math.round(y0 + (s.y - y0) * f)); }, () => {
        a.play('kasse_dump', { gain: 0.8, pan: a.pan(s.x) }); landed++;
        if (landed === n) ask();
      });
      // klik på en pose markerer den (tællehjælp)
      a.on(b, () => { b.lit = !b.lit; b.redraw(b.lit); a.play('taelle_bip', { gain: 0.7, pan: a.pan(s.x) }); });
    };
    for (let i = 0; i < n; i++) a.after(200 + Math.floor(i / 2) * 200, () => land(i)); // to ad gangen

    function ask() {
      let over = false;
      opts.forEach((v, i) => {
        const b = a.btn(dk(v), PX + 82 + i * 88, 404, () => {
          if (over) return;
          if (v === answer) { over = true; a.sfx.good(); scale.redraw(dk(answer) + ' g'); a.after(700, () => a.done({ ok: true, answer })); }
          else { a.sfx.bad(); b.disable(); a.opts.onWrong && a.opts.onWrong(); }
        }, { width: '72px' });
      });
    }
  },
};
