// Kioskregningen hos Kiosk-Kurt: procent og rabat i Krater-kroner (Kk). To varer; for hver vare
//   1) pris – regn prisen ud efter rabat (fire svarknapper)
//   2) bytte – kunden betaler med en seddel; læg de rigtige byttepenge i bakken med mønterne og tryk Giv byttepenge
// Running gag: Kurts priser er steget med en ny brøk siden sidst — hver gang. På trin 1–4 er brøken allerede regnet
// ind i skiltets pris (ren pynt); på trin 5–6 skal spilleren selv lægge brøken til, før rabatten trækkes fra.
import { seeded } from '../../opg.js';
import { hasFig, stand } from '../../art/figs.js';
import { sprite } from '../../art/placeholder.js';

const FONT = '"Comic Neue","Comic Sans MS","Chalkboard SE",cursive';
const VARER = ['Tørre kiks', 'Lun cola', 'Kold pizza', 'En pose rosiner', 'Saltstænger', 'En halv agurk', 'Toastbrød', 'Måneis'];
const PYNT = [[1, 7], [3, 8], [2, 9], [5, 11], [4, 13], [1, 6], [7, 16], [2, 15]];   // brøker, der kun er til pynt
const MONTER = [1, 2, 5, 10, 20, 50];
const wrongLines = [
  'Kurt ryster på hovedet. Det gør han også, når det er rigtigt, men ikke på den måde.',
  'Det stemmer ikke med kassen. Prøv at regne rabatten ud først.',
  'Ikke helt. Kurt har god tid. Kiosken lukker aldrig.',
];

export default {
  id: 'kiosk',
  lines: {
    kiosk_intro: 'Kioskregningen. Kiosk-Kurt har rabat i dag. Regn prisen ud i Krater-kroner, og giv de rigtige byttepenge. Priserne er steget med en brøk siden sidst. Det er de altid.',
    kiosk_ok: 'Kassen stemmer. Kurt er skeptisk, men det er han også, når den ikke stemmer.',
    kiosk_wrong: () => wrongLines[Math.floor(Math.random() * wrongLines.length)],
  },
  setup(a) {
    const r = seeded(a.opts.seed ?? Date.now());
    const grade = Math.max(1, Math.min(6, a.opts.grade ?? 3));
    const ri = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
    const pick = (arr) => arr[ri(0, arr.length - 1)];
    const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };

    // ---- to varer med pris, brøk og rabat (alle mellemregninger går op i hele Krater-kroner)
    const varer = shuffle(VARER.slice()), pynt = shuffle(PYNT.slice());
    const makeItem = (i) => {
      const pcts = grade <= 1 ? [50] : grade === 2 ? [50, 10] : grade === 3 ? [10, 20, 50] : grade === 4 ? [10, 20, 25, 75] : [5, 15, 30, 40, 60];
      for (let guard = 0; guard < 500; guard++) {
        const pct = pick(pcts);
        let skilt, pris, frac = pynt[i];
        if (grade >= 5) {
          frac = pick([[1, 2], [1, 3], [1, 4], [1, 5], [1, 10], [3, 4], [2, 5]]);
          skilt = frac[1] * ri(1, 12) * (frac[1] <= 3 ? 5 : 1);                        // skiltets gamle pris; brøken går op
          pris = skilt + skilt * frac[0] / frac[1];                                    // prisen efter Kurts stigning
        } else pris = skilt = grade <= 2 ? ri(1, 9) * 10 : ri(2, 30) * 4;
        const ny = pris * (100 - pct) / 100;
        if (!Number.isInteger(ny) || ny < 2 || pris > 190) continue;
        const seddel = [20, 50, 100, 200].find((s) => s > ny);
        return { navn: varer[i], skilt, pris, frac, pct, ny, seddel, bytte: seddel - ny };
      }
      return { navn: varer[i], skilt: 40, pris: 40, frac: pynt[i], pct: 50, ny: 20, seddel: 50, bytte: 30 };
    };
    const items = [makeItem(0), makeItem(1)];

    // ---- arbejdsfelt: opakt panel (kiosken) med skilt, Kurt og disk
    const PX0 = 60, PY0 = 80, PWID = 520, PHGT = 364;
    let it = items[0];
    a.spr(PX0 + PWID / 2 + 3, PY0 + PHGT / 2 + 3, PWID + 6, PHGT + 6, (g) => {
      const img = sprite('mg_kiosk_panel'); // renderet kioskvindue: hylder med dåser, disk forrest, turkis ramme
      if (img) {
        const sk = document.createElement('canvas'); sk.width = PWID; sk.height = PHGT; const sg = sk.getContext('2d');
        sg.drawImage(img, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = '#1a1410'; sg.fillRect(0, 0, PWID, PHGT);
        g.drawImage(sk, 6, 6); g.drawImage(img, 0, 0);
        if (hasFig('kurt')) stand(g, 'kurt', 92, 330, 200, 0);
        g.drawImage(img, 0, 262, PWID, PHGT - 262, 0, 262, PWID, PHGT - 262); // disken tegnes igen oven på Kurt, så han står bag den
        const reg = sprite('mg_kiosk_0'); if (reg) g.drawImage(reg, 142, 286 - reg.height); // kasseapparatet på disken
        return;
      }
      g.fillStyle = '#2a2824'; g.fillRect(0, 0, PWID, PHGT);
      g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, PWID - 2, 2); g.fillRect(0, 0, 2, PHGT - 2);
      g.fillStyle = '#d9c9a3'; g.fillRect(4, 4, PWID - 8, PHGT - 8);                  // bagvæg
      g.fillStyle = '#2a2824'; g.fillRect(4, 4, PWID - 8, 56);                        // tavle til opgaven
      g.fillStyle = '#8a6a3c'; g.fillRect(4, 92, 150, 6); g.fillRect(4, 132, 150, 6);  // hylder
      const dims = [['#c9352b', 12], ['#3f9a4a', 40], ['#2f8fc9', 66], ['#c98a3c', 96], ['#7a4fc0', 124]];
      dims.forEach(([c, x], k) => { g.fillStyle = c; g.fillRect(x, 68 + (k % 2) * 4, 20, 24 - (k % 2) * 4); g.fillRect(x + 4, 108 + ((k + 1) % 2) * 6, 18, 24 - ((k + 1) % 2) * 6); });
      // Kiosk-Kurt bag disken: hans rigtige figur (fig_kurt), skåret af ved diskens kant. Klodsen er kun nødløsning.
      if (hasFig('kurt')) stand(g, 'kurt', 92, 330, 200, 0);
      else {
        g.fillStyle = '#31424a'; g.fillRect(52, 196, 76, 60);
        g.fillStyle = '#e8b890'; g.fillRect(70, 158, 40, 40);
        g.fillStyle = '#8a3324'; g.fillRect(66, 150, 48, 12); g.fillRect(104, 158, 18, 5);
      }
      g.fillStyle = '#6b4a1e'; g.fillRect(4, 232, PWID - 8, PHGT - 236);              // disk
      g.fillStyle = '#8a6a3c'; g.fillRect(4, 232, PWID - 8, 6);
    });
    // prisskiltet gentegnes pr. vare
    const sign = a.spr(430, 216, 250, 138, (g) => {
      g.fillStyle = '#2a2824'; g.fillRect(4, 4, 246, 134);
      g.fillStyle = '#ffe27a'; g.fillRect(0, 0, 246, 134);
      g.fillStyle = '#c9352b'; g.fillRect(0, 0, 246, 22);
      a.draw(g, 'TILBUD', 123, 11, { size: 14, fontFamily: FONT, color: '#ffffff', align: 'center', valign: 'middle' });
      a.draw(g, it.navn, 123, 28, { size: 16, fontFamily: FONT, color: '#111111', align: 'center' });
      a.draw(g, `${it.skilt} Kk`, 123, 50, { size: 24, fontFamily: FONT, color: '#111111', align: 'center' });
      const f = `${it.frac[0]}/${it.frac[1]}`;
      a.draw(g, grade >= 5 ? `Kurt har lige lagt ${f} oven i prisen.` : `Steget ${f} siden sidst. Regnet med.`, 123, 86, { size: 11, fontFamily: FONT, color: '#5e5a52', align: 'center' });
      a.draw(g, `I dag: ${it.pct} % rabat`, 123, 106, { size: 15, fontFamily: FONT, color: '#c9352b', align: 'center' });
    });
    const qText = a.text('', 84, 92, { fontSize: '14px', width: '472px', whiteSpace: 'normal', lineHeight: '1.2', fontFamily: FONT });
    const prog = a.text('', 470, 292, { fontSize: '12px', fontFamily: FONT, color: '#fff3c4', outline: '#2a1608' });

    // ---- trin
    const T = window.MB_TASK = { game: 'kiosk', kind: '', answer: null, item: 0, sum: 0 };
    let ii = 0, ui = [], busy = false;
    const keep = (n) => { ui.push(n); return n; };
    const btn = (...args) => keep(a.btn(...args));
    const wrong = () => { a.sfx.bad(); a.opts.onWrong && a.opts.onWrong(); };
    const clear = () => { ui.forEach((n) => n.remove()); ui = []; };

    function price() {
      clear(); it = items[ii]; sign.redraw();
      T.kind = 'price'; T.answer = it.ny; T.item = ii;
      prog.textContent = `Vare ${ii + 1} af ${items.length}`;
      qText.textContent = grade >= 5
        ? `${it.navn}: skiltet siger ${it.skilt} Kk. Kurt lægger ${it.frac[0]}/${it.frac[1]} oven i og giver så ${it.pct} % rabat. Hvad skal kunden betale?`
        : `${it.navn} koster ${it.pris} Kk. I dag er der ${it.pct} % rabat. Hvad skal kunden betale?`;
      // lokkende forkerte svar: rabatten selv, procenten trukket fra som kroner, skiltets pris med rabat
      const set = new Set([it.ny]);
      [it.pris - it.ny, it.pris - it.pct, Math.round(it.skilt * (100 - it.pct) / 100), it.ny + 5, it.ny - 5, it.ny + 10, it.ny + 2].forEach((v) => { if (set.size < 4 && v > 0) set.add(v); });
      for (let v = it.ny + 1; set.size < 4; v++) set.add(v);
      shuffle([...set]).forEach((v, i) => {
        const b = btn(`${v} Kk`, 176 + i * 100, 348, () => {
          if (busy) return;
          if (v === it.ny) { busy = true; a.sfx.ok(); a.after(600, () => { busy = false; change(); }); }
          else { b.disable(); wrong(); }
        }, { width: '88px' });
        b.dataset.value = String(v);
      });
    }

    function change() {
      clear();
      T.kind = 'change'; T.answer = it.bytte; T.sum = 0;
      qText.textContent = `Rigtigt: ${it.ny} Kk. Kunden betaler med en seddel på ${it.seddel} Kk. Læg byttepengene i bakken, og tryk Giv byttepenge.`;
      const tray = []; // mønter i bakken
      const sum = () => tray.reduce((s, v) => s + v, 0);
      // sedlen på disken
      keep(a.spr(120, 352, 84, 40, (g) => {
        g.fillStyle = '#2a2824'; g.fillRect(3, 3, 81, 37);
        g.fillStyle = '#9ed0a0'; g.fillRect(0, 0, 81, 37);
        g.fillStyle = '#3f9a4a'; g.fillRect(3, 3, 75, 2); g.fillRect(3, 32, 75, 2); g.fillRect(3, 3, 2, 31); g.fillRect(76, 3, 2, 31);
        a.draw(g, `${it.seddel} Kk`, 40, 18, { size: 15, fontFamily: FONT, color: '#111111', align: 'center', valign: 'middle' });
      }));
      const coin = (g, v, c, s) => {
        const gold = v >= 10, img = sprite(s >= 15 ? (gold ? 'mg_kiosk_2' : 'mg_kiosk_3') : (gold ? 'mg_kioskc_2' : 'mg_kioskc_3')); // renderede guld- og sølvmønter
        if (img) { g.drawImage(img, c - img.width / 2, c - img.height / 2); return; }
        g.fillStyle = gold ? '#c98a3c' : '#8c877c'; g.beginPath(); g.arc(c, c, s, 0, 7); g.fill();
      };
      const trayText = keep(a.text('', 176, 416, { fontSize: '13px', fontFamily: FONT }));
      const trayBox = keep(a.spr(376, 392, 400, 34, (g) => {
        g.fillStyle = '#2a2824'; g.fillRect(0, 0, 400, 34);
        g.fillStyle = '#31424a'; g.fillRect(2, 2, 396, 30);
        tray.forEach((v, k) => { g.save(); g.translate(6 + k * 26, 4); coin(g, v, 12, 11); g.restore(); a.draw(g, String(v), 6 + k * 26 + 12, 16, { size: 11, fontFamily: FONT, color: '#111111', align: 'center', valign: 'middle' }); });
      }));
      const refresh = () => { trayBox.redraw(); T.sum = sum(); trayText.textContent = `I bakken: ${sum()} Kk`; };
      MONTER.forEach((v, i) => {
        const c = keep(a.spr(196 + i * 46, 346, 44, 44, (g) => {
          coin(g, v, 20, 19);
          a.draw(g, String(v), 20, 20, { size: 15, fontFamily: FONT, color: '#111111', align: 'center', valign: 'middle' });
        }));
        c.dataset.coin = String(v);
        a.on(c, () => {
          if (busy) return;
          if (tray.length >= 15) { a.sfx.bzzt(); return; }
          tray.push(v); a.play('taelle_bip', { gain: 0.6, pan: a.pan(196 + i * 46) }); refresh();
        });
      });
      btn('Tøm', 482, 334, () => { if (busy) return; tray.length = 0; refresh(); }, { width: '88px', silent: true });
      btn('Giv byttepenge', 420, 414, () => {
        if (busy) return;
        if (sum() === it.bytte) {
          busy = true; a.sfx.ok();
          a.after(700, () => { busy = false; ii++; if (ii >= items.length) a.done({ ok: true }); else price(); });
        } else wrong();
      }, { width: '150px' });
      refresh();
    }
    price();
  },
};
