// Frk. Decimals time: quiz med stentastatur (0–9, brøkstreg, Slet, Svar). Kan klikkes, og ægte taster virker også.
// Frk. Decimal accepterer kun brøker: svaret skrives som tæller / nævner. Uforkortede brøker med samme værdi godtages.
// Fem spørgsmål, sværhedsgrad efter klassetrin. Arbejdsfeltet (tavle + tastatur) er et opakt panel.
import { seeded } from '../../opg.js';
import { sprite } from '../../art/placeholder.js';

const FONT = '"Comic Neue","Comic Sans MS","Chalkboard SE",cursive';
const gcd = (x, y) => (y ? gcd(y, x % y) : x);
let wrongIdx = 0, noSlash = false;
const WRONG = [
  'Frøken Decimal ser på dig hen over brillerne. Prøv igen.',
  'Det var ikke den brøk. Regn den en gang til.',
  'Husk brøkstregen. Frøken Decimal accepterer kun brøker.',
];

/** Fem deadpan brøkopgaver → [{ q, n, d }] med forkortet facit n/d (altid en ægte brøk mellem 0 og 1). */
function questions(grade, r) {
  const pick = (list) => list[Math.floor(r() * list.length)];
  const low = grade < 3;
  const out = [];
  const push = (q, n, d) => { const k = gcd(n, d); out.push({ q, n: n / k, d: d / k }); };
  // 1. forskellige nævnere (titelopgaven)
  { const [a, b, c, d] = pick(low ? [[1, 2, 1, 4]] : grade < 5 ? [[1, 2, 1, 4], [1, 4, 1, 8], [1, 2, 1, 8], [1, 2, 1, 6]] : [[1, 3, 1, 6], [1, 5, 3, 10], [1, 2, 3, 8], [1, 4, 3, 8], [1, 2, 1, 6]]);
    push(`${a}/${b} joint + ${c}/${d} joint = ?`, a * d + c * b, b * d); }
  // 2. samme nævner
  { const d = pick(low ? [4] : [4, 5, 6, 8]), a = 1 + Math.floor(r() * (d - 2)), b = 1 + Math.floor(r() * (d - 1 - a));
    push(`${a}/${d} brownie + ${b}/${d} brownie = ?`, a + b, d); }
  // 3. en hel minus en del
  { const d = pick(low ? [2, 4] : [3, 4, 5, 6, 8]), k = low ? 1 : 1 + Math.floor(r() * 2);
    push(`En hel pizza minus ${k}/${d} pizza = ?`, d - k, d); }
  // 4. halvdelen af en brøk
  { const d = pick(low ? [2] : [2, 3, 4, 5]);
    push(`Halvdelen af 1/${d} pose chips = ?`, 1, d * 2); }
  // 5. hun siger et decimaltal og mener en brøk
  { const [txt, n, d] = pick(low ? [['0,5', 1, 2]] : [['0,5', 1, 2], ['0,25', 1, 4], ['0,75', 3, 4], ['0,1', 1, 10], ['0,2', 1, 5]]);
    push(`Frk. Decimal siger ${txt}. Hvad mener hun?`, n, d); }
  return out;
}

export default {
  id: 'school',
  lines: {
    school_intro: 'Velkommen til Frøken Decimals time. Frøken Decimal accepterer kun brøker. Skriv tælleren, så brøkstregen, så nævneren, og tryk på Svar.',
    school_ok: 'Fem svar, og alle var brøker. Frøken Decimal er næsten tilfreds.',
    school_wrong: () => (noSlash ? WRONG[2] : WRONG[wrongIdx++ % 2]), // "Husk brøkstregen" kun når brøkstregen faktisk manglede
  },
  setup(a) {
    const r = seeded(a.opts.seed ?? Date.now());
    const grade = a.opts.grade ?? 3;
    const qs = questions(grade, r);
    const N = qs.length;
    let qi = 0, typed = '', correct = 0, wrongs = 0, locked = false, ended = false;
    const publish = () => { const t = qs[qi]; window.MB_TASK = { game: 'school', answer: t ? `${t.n}/${t.d}` : null, question: t ? t.q : null, index: qi, total: N }; };

    // ---------- opakt arbejdsfelt: tavle øverst, stenbord med tastatur nederst ----------
    const PX = 80, PY = 84, PW = 480, PH = 356, BH = 210; // BH = tavlens højde
    // renderet tavle i rød ramme (mg_school_panel) med hård skygge; tavlens indre er x 81–398, y 67–213 i panelet
    a.spr(PX + PW / 2 + 3, PY + PH / 2 + 3, PW + 6, PH + 6, (g) => {
      const img = sprite('mg_school_panel'); if (!img) { g.fillStyle = '#0c3a14'; g.fillRect(0, 0, PW, BH); return; }
      const sk = document.createElement('canvas'); sk.width = PW; sk.height = PH; const sg = sk.getContext('2d');
      sg.drawImage(img, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = '#1a1410'; sg.fillRect(0, 0, PW, PH);
      g.drawImage(sk, 6, 6); g.drawImage(img, 0, 0);
      g.fillStyle = '#e9e4d6'; g.fillRect(110, 216, 22, 4); g.fillRect(330, 216, 12, 4); // kridt i renden
    });
    const ink = '#f3f0e0', gold = '#ffe9a8';
    const qText = a.text('', PX + 92, PY + 74, { fontSize: '18px', color: ink, textShadow: 'none', width: 300 + 'px', whiteSpace: 'normal', lineHeight: '1.2', fontFamily: FONT });
    const ansText = a.text('', PX + 92, PY + 124, { fontSize: '26px', color: gold, textShadow: 'none', fontFamily: FONT });
    const progress = a.text('', PX + 92, PY + 160, { fontSize: '14px', color: ink, textShadow: 'none', fontFamily: FONT });
    a.text('Svar som brøk, for eksempel 3/4.', PX + 92, PY + 180, { fontSize: '14px', color: '#9fc8a4', textShadow: 'none', fontFamily: FONT });

    // ---------- stentastatur: "1 2 3 4 5" / "6 7 8 9 0", høj brøkstreg-tast til højre, derefter Slet og Svar ----------
    const KX = 110, KY = PY + BH + 20, KS = 44, GAP = 8;
    const drawKey = (g, pressed, label, h) => {
      const w = KS;
      g.fillStyle = '#3c3a36'; g.fillRect(0, 0, w, h);                        // hård skygge (bund/højre)
      g.fillStyle = pressed ? '#b9b3a4' : '#f4f1ea'; g.fillRect(0, 0, w - 3, h - 3);
      g.fillStyle = pressed ? '#cfc9ba' : '#d9d3c4'; g.fillRect(3, 3, w - 6, h - 6); // sten
      g.fillStyle = pressed ? '#bdb7a8' : '#e9e4d6'; g.fillRect(6, 6, 10, 4);
      g.fillStyle = '#8c877c'; g.fillRect(w - 12, h - 10, 6, 3);
      a.draw(g, label, (w - 3) / 2 + (pressed ? 1 : 0), (h - 3) / 2 + (pressed ? 1 : 0), { size: 22, fontFamily: FONT, color: '#111', align: 'center', valign: 'middle' });
    };
    const keys = {};
    let root = null;
    const mkKey = (d, cx, cy, h = KS) => {
      const k = a.spr(cx, cy, KS, h, (g, p) => drawKey(g, p === 1, d, h));
      k.dataset.key = d;
      if (!root) root = k;
      keys[d] = k;
      a.on(k, () => press(d));
    };
    [['1', '2', '3', '4', '5'], ['6', '7', '8', '9', '0']].forEach((row, ri) => row.forEach((d, ci) => mkKey(d, KX + ci * (KS + GAP) + KS / 2, KY + ri * (KS + GAP) + KS / 2)));
    mkKey('/', KX + 5 * (KS + GAP) + KS / 2, KY + KS + GAP / 2, KS * 2 + GAP);
    const bx = KX + 6 * (KS + GAP) + 8;
    a.btn('Slet', bx, KY + 10, () => press('Backspace'), { width: '84px', silent: true });
    a.btn('Svar', bx, KY + KS + GAP + 10, () => press('Enter'), { width: '84px', silent: true });

    // ---------- tilstand ----------
    const show = () => {
      qText.textContent = qs[qi].q;
      ansText.textContent = typed.length ? '= ' + typed : '= _';
      progress.textContent = `Spørgsmål ${qi + 1} af ${N} · Rigtige: ${correct}`;
    };
    const flash = (k) => { if (!k) return; k.redraw(1); a.after(110, () => k.redraw(0)); };
    const end = (res) => { if (ended) return; ended = true; removeEventListener('keydown', onKey); a.done(res); };
    /** Rigtigt, hvis det skrevne er en brøk med samme værdi som facit (2/4 godtages for 1/2). Et tal uden brøkstreg er aldrig nok. */
    const isRight = (s, t) => { const m = /^(\d+)\/(\d+)$/.exec(s); return !!m && +m[2] > 0 && +m[1] * t.d === t.n * +m[2]; };

    function press(d) {
      if (locked || ended) return;
      if (/^[0-9]$/.test(d) || d === '/') {
        if (typed.length >= 5 || (d === '/' && (!typed.length || typed.includes('/')))) return; // brøkstregen kommer efter tælleren, og kun én gang
        typed += d;
        flash(keys[d]);
        a.play('tast_klik', { gain: 0.9 }); a.play('kridt', { gain: 0.5, pan: 0.3 });
        show();
        return;
      }
      if (d === 'Backspace') { typed = typed.slice(0, -1); a.play('tast_klik', { gain: 0.9 }); show(); return; }
      if (d === 'Enter') {
        if (!typed.length) { a.play('tast_klik', { gain: 0.9 }); return; }
        if (isRight(typed, qs[qi])) {
          correct++; a.sfx.ok(); locked = true;
          ansText.textContent = '= ' + typed + '  ✓';
          a.after(650, () => {
            locked = false; typed = ''; qi++; publish();
            if (qi >= N) { a.play('skoleklokke', { gain: 0.8 }); end({ ok: true, correct, wrongs }); return; }
            show();
          });
        } else {
          wrongs++; a.sfx.bad(); noSlash = !typed.includes('/'); typed = ''; show();
          a.opts.onWrong && a.opts.onWrong();
        }
      }
    }
    const onKey = (e) => {
      if (!root || !root.isConnected) { removeEventListener('keydown', onKey); return; } // motoren har ryddet feltet
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;
      if (/^[0-9]$/.test(k) || k === '/' || k === 'Backspace' || k === 'Enter') { e.preventDefault(); press(k); }
    };
    addEventListener('keydown', onKey);
    publish();
    show();
  },
};
