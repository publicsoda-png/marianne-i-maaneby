// Blandeforholdet: forhold og procent. Opdigtede sorter har et THC:CBD-forhold; spilleren lægger grønne (THC) og
// lilla (CBD) klodser i et glas, så forholdet passer, eller aflæser en procentdel. Ren forholdsregning med klodser —
// ingen mængder, ingen enheder ud over "klodser".
// Tre runder efter klassetrin:
//   1–2: bland a:b (alle størrelser gælder) · fyld op (THC ligger fast) · bland a:b med et bestemt antal i alt
//   3–4: bland a:b med antal i alt · fyld op · hvor mange procent er THC
//   5–6: bland a:b med antal i alt · hvor mange procent er CBD · bland ud fra en procent
import { seeded } from '../../opg.js';
import { sprite } from '../../art/placeholder.js';

const FONT = '"Comic Neue","Comic Sans MS","Chalkboard SE",cursive';
const SORTER = ['Krater-Kaj', 'Måneskær', 'Støvet Svend', 'Onkel Komet', 'Sløv Søndag', 'Kvart i Fem'];
const GREEN = ['#2f6b2a', '#58a84a', '#9ef0a0'], LILLA = ['#4a2f80', '#7a4fc0', '#c9a4ff'];
const wrongLines = [
  'Det forhold findes også. Det hører bare til en anden sort.',
  'Ikke helt. Tæl klodserne i hver farve en gang til.',
  'Blandingen passer ikke. Glasset siger ingenting, men det ser skuffet ud.',
];

export default {
  id: 'ratio',
  lines: {
    ratio_intro: 'Blandeforholdet. Hver sort har et forhold mellem grønne og lilla klodser. Læg klodser i glasset, så forholdet passer, og tryk Bland.',
    ratio_ok: 'Forholdet passer. Marianne nikker. Planten nikker ikke. Den er en plante.',
    ratio_wrong: () => wrongLines[Math.floor(Math.random() * wrongLines.length)],
  },
  setup(a) {
    const r = seeded(a.opts.seed ?? Date.now());
    const grade = Math.max(1, Math.min(6, a.opts.grade ?? 3));
    const ri = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
    const pick = (arr) => arr[ri(0, arr.length - 1)];
    const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
    const CAP = 12;                                                    // højst 12 klodser pr. farve
    const sorter = shuffle(SORTER.slice());

    // ---- rundernes opgaver
    const RATIOS = grade <= 2 ? [[1, 1], [1, 2], [2, 1], [1, 3], [3, 1]] : grade <= 4 ? [[1, 2], [2, 1], [1, 3], [3, 1], [2, 3], [3, 2], [1, 4]] : [[2, 3], [3, 2], [3, 4], [4, 3], [1, 5], [5, 1], [2, 5], [3, 5]];
    const PCTS = [[1, 1], [1, 3], [3, 1], [1, 4], [4, 1], [2, 3], [3, 2], [3, 7], [7, 3], [1, 9]]; // forhold med pæne procenter
    const mult = (ab, lo = 1) => { const max = Math.floor(CAP / Math.max(ab[0], ab[1])); return ri(Math.min(lo, max), max); };
    const mix = (name, exact) => {
      const ab = pick(RATIOS), k = exact ? mult(ab, 2) : 1;
      return { kind: 'mix', exact, ab, answer: { thc: ab[0] * k, cbd: ab[1] * k },
        q: `Sorten ${name} har THC:CBD-forholdet ${ab[0]}:${ab[1]}. ` + (exact ? `Bland ${(ab[0] + ab[1]) * k} klodser i alt.` : 'Bland det forhold.') };
    };
    const fill = (name) => {
      const ab = pick(RATIOS), k = mult(ab, 2);
      return { kind: 'mix', exact: true, lockThc: true, ab, answer: { thc: ab[0] * k, cbd: ab[1] * k }, preset: { thc: ab[0] * k, cbd: 0 },
        q: `Sorten ${name} har THC:CBD-forholdet ${ab[0]}:${ab[1]}. Der ligger ${ab[0] * k} THC-klodser. Læg de CBD-klodser i, der mangler.` };
    };
    const pct = (name, of) => {
      const ab = pick(PCTS), k = Math.max(1, Math.min(mult(ab), Math.floor(20 / (ab[0] + ab[1]))));
      const t = ab[0] * k, c = ab[1] * k;
      return { kind: 'pct', preset: { thc: t, cbd: c }, answer: Math.round(100 * (of === 'THC' ? t : c) / (t + c)),
        q: `Her er en blanding af ${name}. Hvor mange procent af klodserne er ${of}?` };
    };
    const fromPct = (name) => {
      const [p, tot] = pick([[20, 10], [25, 12], [40, 10], [60, 10], [75, 12], [30, 10], [80, 15], [25, 16]]);
      return { kind: 'mix', exact: true, ab: [p, 100 - p], answer: { thc: tot * p / 100, cbd: tot - tot * p / 100 },
        q: `Sorten ${name} er ${p} % THC-klodser. Resten er CBD. Bland ${tot} klodser i alt.` };
    };
    const rounds = grade <= 2 ? [mix(sorter[0], false), fill(sorter[1]), mix(sorter[2], true)]
      : grade <= 4 ? [mix(sorter[0], true), fill(sorter[1]), pct(sorter[2], 'THC')]
        : [mix(sorter[0], true), pct(sorter[1], 'CBD'), fromPct(sorter[2])];

    // ---- arbejdsfelt: opakt panel (laboratoriebord) med to beholdere og et glas
    const PX0 = 60, PY0 = 80, PWID = 520, PHGT = 364;
    const TANK = { thc: 130, cbd: 510 }, GX = 320, GTOP = 172, GBOT = 356;   // beholdernes x, glassets midte og højde
    a.spr(PX0 + PWID / 2 + 3, PY0 + PHGT / 2 + 3, PWID + 6, PHGT + 6, (g) => {
      const img = sprite('mg_ratio_panel'); // renderet flisevæg med hylde og bord i stålramme, hård skygge
      if (!img) { g.fillStyle = '#d9d4c4'; g.fillRect(0, 0, PWID, PHGT); return; }
      const sk = document.createElement('canvas'); sk.width = PWID; sk.height = PHGT; const sg = sk.getContext('2d');
      sg.drawImage(img, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = '#1a1410'; sg.fillRect(0, 0, PWID, PHGT);
      g.drawImage(sk, 6, 6); g.drawImage(img, 0, 0);
    });
    const tank = (cx, col, label) => {
      const s = a.spr(cx, 262, 92, 164, (g) => {
        // en bunke renderede klodser (mg_ratiob_1 grøn, mg_ratiob_2 lilla) under et navneskilt
        const cube = sprite(col === GREEN ? 'mg_ratiob_1' : 'mg_ratiob_2');
        if (cube) {
          [[8, 122], [46, 122], [8, 82], [46, 82], [27, 42]].forEach(([x, y]) => g.drawImage(cube, x, y));
        } else { g.fillStyle = col[1]; g.fillRect(6, 40, 80, 120); }
        g.fillStyle = '#1a1410'; g.fillRect(12, 6, 72, 26); g.fillStyle = '#3a3450'; g.fillRect(10, 4, 72, 26);
        a.draw(g, label, 46, 17, { size: 15, fontFamily: FONT, color: '#ffffff', align: 'center', valign: 'middle' });
      });
      return s;
    };
    const tThc = tank(TANK.thc, GREEN, 'THC'), tCbd = tank(TANK.cbd, LILLA, 'CBD');
    let thc = 0, cbd = 0;
    // glasset: renderet glaskrukke (mg_ratio_0) med renderede klodser i to søjler pr. farve
    const glass = a.spr(GX, (GTOP + GBOT) / 2 + 4, 180, GBOT - GTOP + 24, (g) => {
      const H = GBOT - GTOP + 24, jar = sprite('mg_ratio_0');
      if (jar) g.drawImage(jar, 30, H - jar.height); else { g.fillStyle = '#eef4f6'; g.fillRect(40, 0, 100, H); }
      const stack = (n, x0, name, col) => {
        const c = sprite(name);
        for (let i = 0; i < n; i++) {
          const x = x0 + (i % 2) * 21, y = H - 34 - Math.floor(i / 2) * 20;
          if (c) g.drawImage(c, x, y); else { g.fillStyle = col[1]; g.fillRect(x, y, 20, 19); }
        }
      };
      stack(thc, 44, 'mg_ratio_1', GREEN); stack(cbd, 92, 'mg_ratio_2', LILLA);
    });
    const qText = a.text('', 104, 124, { fontSize: '14px', width: '432px', whiteSpace: 'normal', lineHeight: '1.2', fontFamily: FONT });
    const count = a.text('', GX - 100, 376, { fontSize: '14px', width: '200px', textAlign: 'center', fontFamily: FONT });
    const prog = a.text('', 452, 168, { fontSize: '12px', width: '88px', textAlign: 'right', fontFamily: FONT, color: '#3a3450', textShadow: 'none' });

    // ---- runder
    const T = window.MB_TASK = { game: 'ratio', kind: '', answer: null, round: 0, exact: false, state: { thc: 0, cbd: 0 } };
    let ri_ = 0, ui = [], busy = false, cur = null;
    const btn = (...args) => { const b = a.btn(...args); ui.push(b); return b; };
    const refresh = () => {
      glass.redraw(); T.state.thc = thc; T.state.cbd = cbd;
      count.textContent = `THC ${thc} : CBD ${cbd}   (i alt ${thc + cbd})`;
    };
    const add = (which, d) => {
      if (busy || !cur || cur.kind !== 'mix' || (which === 'thc' && cur.lockThc)) return;
      const v = (which === 'thc' ? thc : cbd) + d;
      if (v < 0 || v > CAP) { a.sfx.bzzt(); return; }
      if (which === 'thc') thc = v; else cbd = v;
      a.play('taelle_bip', { gain: 0.6, pan: a.pan(TANK[which]) });
      refresh();
    };
    a.on(tThc, () => add('thc', 1)); a.on(tCbd, () => add('cbd', 1));   // klik på en beholder lægger også en klods i
    const wrong = () => { a.sfx.bad(); a.opts.onWrong && a.opts.onWrong(); };
    const next = () => {
      a.sfx.ok(); busy = true;
      a.after(700, () => { busy = false; ri_++; if (ri_ >= rounds.length) a.done({ ok: true }); else start(); });
    };
    function start() {
      ui.forEach((n) => n.remove()); ui = [];
      cur = rounds[ri_];
      thc = cur.preset ? cur.preset.thc : 0; cbd = cur.preset ? cur.preset.cbd : 0;
      qText.textContent = cur.q; prog.textContent = `Runde ${ri_ + 1} af ${rounds.length}`;
      T.kind = cur.kind; T.answer = cur.answer; T.round = ri_; T.exact = !!cur.exact; T.lockThc = !!cur.lockThc;
      refresh();
      if (cur.kind === 'mix') {
        if (!cur.lockThc) {
          btn('− THC', TANK.thc - 46, 352, () => add('thc', -1), { width: '44px', silent: true });
          btn('+ THC', TANK.thc + 2, 352, () => add('thc', 1), { width: '44px', silent: true });
        }
        btn('− CBD', TANK.cbd - 46, 352, () => add('cbd', -1), { width: '44px', silent: true });
        btn('+ CBD', TANK.cbd + 2, 352, () => add('cbd', 1), { width: '44px', silent: true });
        btn('Bland', GX - 50, 400, () => {
          if (busy) return;
          const { ab, answer } = cur;
          const right = cur.exact ? (thc === answer.thc && cbd === answer.cbd) : (thc + cbd > 0 && thc * ab[1] === cbd * ab[0]);
          if (right) next(); else wrong();
        }, { width: '100px' });
      } else {
        // procent: fire svarknapper
        const set = new Set([cur.answer]); let guard = 0;
        const cand = [100 - cur.answer, cur.preset.thc, cur.preset.cbd, cur.answer + 10, cur.answer - 10, cur.answer + 5, cur.answer - 5, 50];
        while (set.size < 4 && guard < cand.length) { const v = cand[guard++]; if (v > 0 && v < 100) set.add(v); }
        for (let v = 15; set.size < 4; v += 20) set.add(v);
        shuffle([...set]).forEach((v, i) => {
          const b = btn(`${v} %`, GX - 138 + i * 70, 400, () => {
            if (busy) return;
            if (v === cur.answer) next(); else { b.disable(); wrong(); }
          }, { width: '62px' });
          b.dataset.value = String(v);
        });
      }
    }
    start();
  },
};
