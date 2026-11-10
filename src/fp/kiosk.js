// Mission B — Munchies-natløbet (akt 3): saml snacks i Kiosk-Kurts kiosk, så summen rammer budgettet præcis.
import { MAPS, parse } from './map.js';
import { hex, shader, paint, text, anim, SEQ } from './tex.js';
import { rng } from '../core/stage.js';

const SNACKS = [['chips', 'Månechips'], ['kiks', 'Kraterkiks'], ['lakrids', 'Lakridsmeteorer'], ['ostepops', 'Ostekometer'],
  ['sodavand', 'Månevand'], ['vingummi', 'Gummi-ufoer'], ['chokolade', 'Kometbar'], ['poelse', 'Rumpølse']];
export const NAMES = ['v_kiosk', 'v_vindue', 'v_reol', 'v_disk', 'kurt', 'snack_tom', 'fnug', ...SNACKS.map((s) => 'snack_' + s[0])];
/** Øre → "7" eller "7,50". Priser regnes i hele øre, så summen altid er præcis. */
export const kr = (n) => Math.floor(n / 100) + (n % 100 ? ',' + String(n % 100).padStart(2, '0') : '');

/** Priser + budget efter klassetrin. Budgettet er summen af 3–4 tilfældigt valgte varer, så opgaven altid kan løses. */
export function deal(grade, seed) {
  const r = rng(seed), pick = (a, b) => a + Math.floor(r() * (b - a + 1)), prices = [];
  while (prices.length < SNACKS.length) {
    const p = grade <= 2 ? pick(2, 12) * 100 : grade <= 4 ? pick(4, 24) * 100 : pick(7, 48) * 50;
    if (!prices.includes(p)) prices.push(p);
  }
  const idx = SNACKS.map((_, i) => i); for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  const solution = idx.slice(0, grade <= 2 ? 2 : grade <= 4 ? 3 : 4).sort((a, b) => a - b);
  return { prices, solution, budget: solution.reduce((s, i) => s + prices[i], 0) };
}

export function build({ T, grade, stat, seed }) {
  const fog = hex('#0c1024'), S = shader(fog), { map, marks } = parse(MAPS.kiosk), d = deal(grade, seed);
  const tag = (src, p) => S(paint(src, (g) => { g.fillStyle = '#6b4a2a'; g.fillRect(12, 48, 40, 16); g.fillStyle = '#f2e6b8'; g.fillRect(13, 49, 38, 14); text(g, kr(p) + (p % 100 ? '' : ',-'), 32, 56, 12); }));
  const snacks = SNACKS.map(([id, name], i) => {
    const p = marks.s[i], s = { kind: 'snack', solid: true, keep: 0.8, name, price: d.prices[i], taken: false, x: p.x, y: p.y, scale: 0.7, full: tag(T['snack_' + id][0], d.prices[i]), tom: tag(T.snack_tom[0], d.prices[i]) };
    s.tex = s.full; return s;
  });
  const kurt = { kind: 'kurt', solid: true, keep: 0.95, x: marks.k[0].x, y: marks.k[0].y, scale: 1, ...anim(S, T.kurt, SEQ.kurt) };
  const fnug = marks.f.map((p) => ({ kind: 'fnug', solid: true, x: p.x, y: p.y, scale: 0.7, ...anim(S, T.fnug, SEQ.blink), line: 'Fnuggen står på hylden. Den er ikke til salg.' }));
  const world = {
    id: 'kiosk', map, fog, fogK: 0.5, cols: 320, floor: hex('#3a3f5a'), ceil: hex('#1c2038'),
    walls: { '#': S(T.v_kiosk[0]), K: S(T.v_kiosk[0]), V: S(T.v_vindue[0]), R: S(T.v_reol[0]), C: S(T.v_disk[0]) },
    sprites: [...snacks, kurt, ...fnug], snacks, kurt, solution: d.solution,
  };
  Object.assign(stat, { budget: d.budget, sum: 0, cart: 0 });
  const B = kr(d.budget);
  return {
    id: 'kiosk', name: 'Munchies-natløbet (ÆGTE 3D)', world,
    start: { ...marks.p[0], a: -Math.PI / 2 },
    intro: 'Kurt: "Budgettet er ' + B + ' Krater-kroner. Ram det præcis."', introSecs: 6,
    hud: () => 'Kurv: ' + kr(stat.sum) + ' af ' + B + ' Krater-kroner',
    look: () => null,
    prompt: (s) => (s.kind === 'snack' ? (s.taken ? 'BRUG: læg ' + s.name + ' tilbage' : 'BRUG: tag ' + s.name + ' (' + kr(s.price) + ' Kk)') : s.kind === 'kurt' ? 'BRUG: aflevér kurven til Kurt' : null),
    use(s, api) {
      if (s.kind === 'snack') {
        s.taken = !s.taken; s.tex = s.taken ? s.tom : s.full;
        stat.sum += s.taken ? s.price : -s.price; stat.cart += s.taken ? 1 : -1;
        api.say(s.name + (s.taken ? ': ' + kr(s.price) + '. ' : ' er lagt tilbage. ') + 'Kurven er nu ' + kr(stat.sum) + '.', 3);
        return;
      }
      if (s.kind !== 'kurt') return;
      if (stat.sum === d.budget) { api.win('Kurt: "' + B + '. Præcis. Det sker næsten aldrig."'); return; }
      api.wrong();
      if (!stat.cart) api.say('Kurt: "Kurven er tom. Det giver 0. Budgettet er ' + B + '."', 4);
      else { const diff = stat.sum - d.budget; api.say('Kurt: "Det bliver ' + kr(stat.sum) + '. Budgettet er ' + B + '. Det er ' + kr(Math.abs(diff)) + (diff > 0 ? ' for meget."' : ' for lidt."'), 5); }
    },
  };
}
