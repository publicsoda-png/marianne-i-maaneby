// Afstemningen: søjlediagram. Festkomitéen har stemt om, hvilken snack der skal serveres til Høstfesten.
// Tre trin på samme diagram:
//   1) sæt  – én søjle mangler; sæt den (klik i kolonnen eller brug ▲▼) og tryk Tæl op
//   2) klik – klik på den søjle, der fik flest (eller færrest) stemmer
//   3) tal  – aflæs/regn: ét stemmetal (trin 1–2), forskel (3–4) eller median (5–6); fire svarknapper
// Fra trin 4 tæller aksen i spring på 2.
import { seeded } from '../../opg.js';
import { sprite } from '../../art/placeholder.js';

const FONT = '"Comic Neue","Comic Sans MS","Chalkboard SE",cursive';
const SNACKS = ['Tørre kiks', 'Kold pizza', 'Agurker', 'Rosiner', 'Toast', 'Chips', 'Lun cola', 'Is'];
const COLORS = [['#c9352b', '#e86a5a'], ['#c98a3c', '#ffd27a'], ['#3f9a4a', '#9ef0a0'], ['#7a4fc0', '#c9a4ff'], ['#2f8fc9', '#7fd0ff']];
const wrongLines = [
  'Det passer ikke med stemmesedlerne. Komitéen tæller igen. Langsomt.',
  'Ikke helt. Kig på søjlerne en gang til.',
  'Det tal er der ingen, der har stemt på.',
];

export default {
  id: 'hall',
  lines: {
    hall_intro: 'Afstemningen. Festkomitéen har stemt om, hvilken snack der skal serveres. Gør diagrammet færdigt, og svar på spørgsmålene.',
    hall_ok: 'Afstemningen er talt op. Komitéen kan stadig ikke huske, hvad der skal fejres, men nu er der et diagram.',
    hall_wrong: () => wrongLines[Math.floor(Math.random() * wrongLines.length)],
  },
  setup(a) {
    const r = seeded(a.opts.seed ?? Date.now());
    const grade = Math.max(1, Math.min(6, a.opts.grade ?? 3));
    const ri = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
    const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };

    // ---- stemmetal: forskellige tal, så der altid er én vinder og én taber
    const NB = grade <= 2 ? 4 : 5, SC = grade >= 4 ? 2 : 1, MAXU = 12;   // SC = stemmer pr. akse-enhed
    const names = shuffle(SNACKS.slice()).slice(0, NB);
    const values = shuffle(Array.from({ length: MAXU }, (_, i) => (i + 1) * SC)).slice(0, NB);
    const hole = ri(0, NB - 1);                                          // søjlen, spilleren skal sætte
    const iMax = values.indexOf(Math.max(...values)), iMin = values.indexOf(Math.min(...values));
    const other = (not) => { let j; do j = ri(0, NB - 1); while (not.includes(j)); return j; };

    // ---- arbejdsfelt: renderet opslagstavle med millimeterpapir (x 142–497, y 137–354) og en træhylde forneden til knapperne
    const PX0 = 60, PY0 = 80, PWID = 520, PHGT = 364;
    const AX = 170, BASE = 328, UNIT = 13, TOP = BASE - MAXU * UNIT, CW = 58, BW = 36; // akse-x, bundlinje, px pr. enhed
    const colX = Array.from({ length: NB }, (_, i) => AX + 36 + i * CW);
    const shown = values.slice(); shown[hole] = 0;
    let holeSet = false, flash = -1;
    const chart = a.spr(PX0 + PWID / 2 + 3, PY0 + PHGT / 2 + 3, PWID + 6, PHGT + 6, (g) => {
      const X = (x) => x - PX0, Y = (y) => y - PY0;
      const img = sprite('mg_hall_panel');
      if (img) {
        const sk = document.createElement('canvas'); sk.width = PWID; sk.height = PHGT; const sg = sk.getContext('2d');
        sg.drawImage(img, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = '#1a1410'; sg.fillRect(0, 0, PWID, PHGT);
        g.drawImage(sk, 6, 6); g.drawImage(img, 0, 0);
      } else { g.fillStyle = '#9a7a4a'; g.fillRect(0, 0, PWID, PHGT); g.fillStyle = '#f4f1ea'; g.fillRect(82, 57, 356, 218); }
      g.fillStyle = '#a9c4b0';
      for (let u = 0; u <= MAXU; u++) g.fillRect(X(AX), Y(BASE - u * UNIT), NB * CW + 8, 1); // gitter
      g.fillStyle = '#111111'; g.fillRect(X(AX), Y(TOP - 8), 2, BASE - TOP + 10); g.fillRect(X(AX), Y(BASE), NB * CW + 8, 2);
      for (let u = 0; u <= MAXU; u += 2) {
        g.fillRect(X(AX) - 4, Y(BASE - u * UNIT), 4, 1);
        a.draw(g, String(u * SC), X(AX) - 8, Y(BASE - u * UNIT), { size: 12, fontFamily: FONT, color: '#111111', align: 'right', valign: 'middle' });
      }
      shown.forEach((v, i) => {
        const h = Math.round((v / SC) * UNIT), x = X(colX[i] - BW / 2), y = Y(BASE - h);
        const [face, light] = COLORS[i];
        if (i === hole && !holeSet) {                                                   // stiplet ramme: her mangler en søjle
          g.fillStyle = '#8c877c';
          for (let yy = Y(TOP); yy < Y(BASE); yy += 8) { g.fillRect(x, yy, 2, 4); g.fillRect(x + BW - 2, yy, 2, 4); }
          for (let xx = 0; xx < BW; xx += 8) g.fillRect(x + xx, Y(TOP), 4, 2);
        }
        g.fillStyle = '#2a2824'; g.fillRect(x + 3, y + 3, BW, Math.max(0, h - 3));
        g.fillStyle = face; g.fillRect(x, y, BW, h);
        g.fillStyle = light; g.fillRect(x, y, 8, h);
        if (flash === i) { g.fillStyle = '#111111'; g.fillRect(x - 3, y - 3, BW + 6, 2); g.fillRect(x - 3, y - 3, 2, h + 3); g.fillRect(x + BW + 1, y - 3, 2, h + 3); }
        if (i === hole && !holeSet) a.draw(g, v ? String(v) : '?', X(colX[i]), y - 12, { size: 14, fontFamily: FONT, color: '#111111', align: 'center', valign: 'middle' });
        // navn under søjlen, højst to linjer
        names[i].split(' ').forEach((w, k) => a.draw(g, w, X(colX[i]), Y(BASE + 4 + k * 11), { size: 10, fontFamily: FONT, color: '#111111', align: 'center' }));
      });
      a.draw(g, 'Stemmer', X(AX) - 22, Y(TOP - 20), { size: 11, fontFamily: FONT, color: '#5e5a52' });
    });
    const qText = a.text('', 84, 94, { fontSize: '15px', width: '472px', whiteSpace: 'normal', lineHeight: '1.2', fontFamily: FONT });
    const note = a.text('', 100, 384, { fontSize: '12px', width: '200px', outline: '#2a1608', whiteSpace: 'normal', lineHeight: '1.2', fontFamily: FONT });

    // ---- trinene
    const T = window.MB_TASK = { game: 'hall', step: '', answer: null, values, names, bar: hole, geo: { colX, base: BASE, unitPx: UNIT / SC, scale: SC } };
    let ui = [], busy = false, step = '';
    const clear = () => { ui.forEach((n) => n.remove()); ui = []; };
    const btn = (...args) => { const b = a.btn(...args); ui.push(b); return b; };
    const wrong = () => { a.sfx.bad(); a.opts.onWrong && a.opts.onWrong(); };
    const colAt = (p) => (p.y < TOP - 12 || p.y > BASE + 34 ? -1 : colX.findIndex((x) => Math.abs(p.x - x) <= CW / 2 - 2));

    // 1) sæt den manglende søjle
    const stepSet = () => {
      step = T.step = 'set'; T.answer = values[hole];
      const nm = names[hole], v = values[hole];
      if (grade <= 2) qText.textContent = `${nm} fik ${v} stemmer. Sæt søjlen, og tryk Tæl op.`;
      else if (grade <= 4) {
        const j = other([hole]), d = v - values[j];
        qText.textContent = `${nm} fik ${Math.abs(d)} ${d > 0 ? 'flere' : 'færre'} stemmer end ${names[j]}. Sæt søjlen, og tryk Tæl op.`;
      } else qText.textContent = `Der blev afgivet ${values.reduce((s, x) => s + x, 0)} stemmer i alt. Resten gik til ${nm}. Sæt søjlen, og tryk Tæl op.`;
      note.textContent = 'Klik i den tomme kolonne, eller brug pilene.';
      const set = (u) => { if (busy) return; u = Math.max(0, Math.min(MAXU, u)); if (u * SC === shown[hole]) return; shown[hole] = u * SC; chart.redraw(); a.play('slider_rasle', { gain: 0.5, pan: a.pan(colX[hole]) }); };
      btn('▲', 320, 378, () => set(shown[hole] / SC + 1), { width: '52px', silent: true });
      btn('▼', 378, 378, () => set(shown[hole] / SC - 1), { width: '52px', silent: true });
      btn('Tæl op', 436, 378, () => {
        if (busy) return;
        if (shown[hole] === values[hole]) { busy = true; holeSet = true; chart.redraw(); a.sfx.ok(); a.after(600, () => { busy = false; clear(); stepPick(); }); }
        else wrong();
      }, { width: '112px' });
      stepSet.set = set;
    };

    // 2) klik på vinderen (eller taberen)
    let want = iMax;
    const stepPick = () => {
      step = T.step = 'pick';
      const least = grade >= 3 && r() < 0.5;
      want = T.answer = least ? iMin : iMax;
      qText.textContent = least ? 'Hvilken snack fik færrest stemmer? Klik på søjlen.' : 'Hvilken snack vandt afstemningen? Klik på søjlen.';
      note.textContent = 'Sofus stemte ikke. Han sov.';
    };

    // 3) et tal
    const stepNum = () => {
      step = T.step = 'num';
      let ans;
      if (grade <= 2) { const j = other([]); ans = values[j]; qText.textContent = `Hvor mange stemmer fik ${names[j]}?`; }
      else if (grade <= 4) { const j = other([iMax]); ans = values[iMax] - values[j]; qText.textContent = `Hvor mange flere stemmer fik ${names[iMax]} end ${names[j]}?`; }
      else { ans = values.slice().sort((p, q) => p - q)[2]; qText.textContent = 'Hvad er medianen af de fem stemmetal? Det er det midterste, når de står i rækkefølge.'; }
      T.answer = ans;
      note.textContent = 'Vælg et svar.';
      const set = new Set([ans]); let guard = 0;
      while (set.size < 4 && guard++ < 200) { const v = ans + ri(-3, 3) * SC; if (v >= 0) set.add(v); }
      for (let v = ans + SC; set.size < 4; v += SC) set.add(v);
      shuffle([...set]).forEach((v, i) => {
        const b = btn(String(v), 320 + i * 58, 378, () => {
          if (busy) return;
          if (v === ans) { busy = true; a.sfx.ok(); a.after(500, () => a.done({ ok: true })); }
          else { b.disable(); wrong(); }
        }, { width: '52px' });
      });
    };

    // klik i diagrammet: sæt søjlen (trin 1) eller vælg en søjle (trin 2)
    const point = (p, down) => {
      if (busy) return;
      const i = colAt(p);
      if (step === 'set' && i === hole) stepSet.set(Math.round((BASE - p.y) / UNIT));
      else if (step === 'pick' && down && i >= 0) {
        flash = i; chart.redraw();
        if (i === want) { busy = true; a.sfx.ok(); a.after(700, () => { flash = -1; chart.redraw(); busy = false; stepNum(); }); }
        else { wrong(); busy = true; a.after(400, () => { flash = -1; chart.redraw(); busy = false; }); }
      }
    };
    a.tap((e, p) => point(p, true));
    a.move((e, p) => point(p, false));
    stepSet();
  },
};
