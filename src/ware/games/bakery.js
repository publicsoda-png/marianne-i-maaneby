// Munchies-bageriet (hos Bager Krumme): gange. "Hvert medlem af festkomitéen skal have A brownies, der er B medlemmer"
// → læg brownies i bradepanden (klik på dejen = 1, knappen "+5" = 5, højreklik på dejen = 5 som genvej) og tryk "Bag".
// Arbejdsfeltet (bagebordet) er et opakt panel, så spillet ser rigtigt ud oven på en hvilken som helst baggrund.
import { opg, seeded } from '../../opg.js';
import { sprite } from '../../art/placeholder.js';

let wrongIdx = 0;
const WRONG = [
  'Det passer ikke helt. Bager Krumme tæller efter og bliver ked af det. Prøv igen.',
  'Næsten. Brownies pr. medlem gange antal medlemmer.',
  'Komitéen kan ikke dele det antal. Hvor mange skal der være i alt?',
];

export default {
  id: 'bakery',
  lines: {
    bakery_intro: 'Velkommen i Munchies-bageriet. Bager Krumme bager brownies til festkomitéen. Klik på dejen for én brownie. Knappen plus fem giver fem ad gangen. Tryk på Bag, når antallet passer.',
    bakery_ok: 'Præcis nok brownies til hele komitéen. Mødet kan fortsætte. Ingen ved, hvad det handler om.',
    bakery_wrong: () => WRONG[wrongIdx++ % WRONG.length],
  },
  setup(a) {
    const r = seeded(a.opts.seed ?? 1);
    const grade = a.opts.grade ?? 3;
    const task = opg('mul', grade, r);
    const [per, n] = task.parts;
    const target = per * n;
    let count = 0, pending = 0, locked = false;
    window.MB_TASK = { game: 'bakery', answer: target, per, n, bowlXy: [150, 272] }; // bowlXy = klikpunkt på dejen (feltkoordinater)

    // ---------- arbejdsfelt: renderet bagebord i træramme (mg_bakery_panel) med hård skygge ----------
    const PX = 60, PY = 84, PW = 520, PH = 356;
    a.spr(PX + PW / 2 + 3, PY + PH / 2 + 3, PW + 6, PH + 6, (g) => {
      const img = sprite('mg_bakery_panel'); if (!img) { g.fillStyle = '#f1e7d2'; g.fillRect(0, 0, PW, PH); return; }
      const sk = document.createElement('canvas'); sk.width = PW; sk.height = PH; const sg = sk.getContext('2d');
      sg.drawImage(img, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = '#1a1410'; sg.fillRect(0, 0, PW, PH);
      g.drawImage(sk, 6, 6); g.drawImage(img, 0, 0);
    });
    const T = { width: PW + 'px', textAlign: 'center', fontSize: '17px', color: '#fff3c4', outline: '#2a1608' };
    a.text(`Komitéen har ${n} medlemmer. Hver skal have ${per} brownies.`, PX, 92, T);
    a.text('Hvor mange brownies skal der bages i alt?', PX, 114, T);

    // medlemmernes tallerkener på række (tællehjælp)
    a.spr(320, 160, 400, 28, (g) => {
      const step = 36, x0 = 200 - (n * step) / 2 + 4;
      for (let i = 0; i < n; i++) {
        const x = Math.round(x0 + i * step);
        g.fillStyle = '#8a6a3a'; g.fillRect(x + 2, 14, 28, 6);               // skygge
        g.fillStyle = '#ffffff'; g.fillRect(x, 10, 28, 6);                   // tallerken
        g.fillStyle = '#c9ccd4'; g.fillRect(x + 4, 16, 20, 2);
        g.fillStyle = '#9aa0ac'; g.fillRect(x + 6, 12, 16, 1);
      }
    });

    // ---------- bradepande med brownies ----------
    const brownie = (g, x, y, baked) => { // renderet brownie (mg_bakery_2); rå dej = samme med lys dejfarve hen over
      const img = sprite('mg_bakery_2'); if (!img) { g.fillStyle = baked ? '#4a2410' : '#7a4a22'; g.fillRect(x, y, 12, 10); return; }
      g.drawImage(img, x - 1, y - 1);
      if (!baked) { g.save(); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.45; g.fillStyle = '#c08850'; g.fillRect(x - 1, y - 1, 14, 13); g.restore(); }
    };
    const TW = 300, TH = 150, PITCH = 16, COLS = Math.floor((TW - 18) / PITCH), ROWS = Math.floor((TH - 18) / PITCH);
    const tray = a.spr(410, 268, TW, TH, (g, baked) => {
      // bradepanden lige oppefra i renderens sølvfarver (hårde bånd): skygge, kant med højlys op/venstre, bund
      g.fillStyle = '#3a2c1c'; g.fillRect(6, 6, TW - 6, TH - 6);
      g.fillStyle = '#6f737c'; g.fillRect(0, 0, TW - 6, TH - 6);
      g.fillStyle = '#e8ecf2'; g.fillRect(2, 2, TW - 10, 3); g.fillRect(2, 2, 3, TH - 10);
      g.fillStyle = '#a9aeb8'; g.fillRect(6, 6, TW - 18, TH - 18);
      g.fillStyle = '#bfc4cd'; g.fillRect(6, 6, TW - 18, 4);
      g.fillStyle = '#8c919b'; g.fillRect(6, TH - 16, TW - 18, 4); g.fillRect(TW - 16, 6, 4, TH - 18);
      const shown = Math.min(count, COLS * ROWS);
      for (let i = 0; i < shown; i++) brownie(g, 12 + (i % COLS) * PITCH, 12 + Math.floor(i / COLS) * PITCH, baked === true);
    });
    const counter = a.text('', 262, 350, { fontSize: '17px', color: '#2b2418', textShadow: 'none' });
    const setCount = (c) => { count = Math.max(0, Math.min(COLS * ROWS, c)); counter.textContent = `Brownies i bradepanden: ${count}`; tray.redraw(false); };
    setCount(0);

    // ---------- dejskålen ----------
    const BX = 150, BY = 262;
    const bowl = a.spr(BX, BY, 120, 100, (g, squish) => {
      const img = sprite('mg_bakery_0'), dy = squish === true ? 4 : 0; // renderet dejklump på blå bakke; klask = trykkes 4 px ned
      if (img) g.drawImage(img, 0, 0, 110, 79, 5, 14 + dy, 110, 79 - dy);
      a.draw(g, 'DEJ', 60, 84, { size: 13, color: '#fff', outline: '#123a5a', align: 'center', valign: 'middle' });
    });
    a.text('Klik på dejen: 1', BX - 62, 318, { fontSize: '13px', color: '#2b2418', textShadow: 'none' });
    const klask = () => { a.play('dej_klask', { gain: 0.8, pan: a.pan(BX) }); bowl.redraw(true); a.after(a.STEP, () => bowl.redraw(false)); };
    // k brownies, én pr. trin på step-uret
    const add = (k) => {
      if (locked) return;
      for (let i = 0; i < k; i++) { pending++; a.after(i * a.STEP, () => { pending--; klask(); setCount(count + 1); }); }
    };
    a.on(bowl, (e, p, button) => add(button === 2 ? 5 : 1)); // højreklik er kun en genvej til "+5"

    a.btn('+5', BX - 62, 404, () => add(5), { width: '44px', silent: true });
    a.btn('Tøm', BX + 6, 404, () => { if (locked || pending) return; setCount(0); }, { width: '44px' });
    a.btn('Bag', 470, 404, () => {
      if (locked || pending) return;
      locked = true;
      if (count === target) {
        a.play('ovn_ding', { gain: 0.9, pan: a.pan(470) });
        tray.redraw(true);
        a.after(900, () => a.done({ ok: true, answer: count }));
      } else {
        a.sfx.bad(); a.opts.onWrong && a.opts.onWrong();
        a.after(700, () => { locked = false; }); // brownies bliver liggende, så man kan rette til
      }
    }, { width: '70px' });
  },
};
