// Opgavegenerator: opg(type, grade 1..6, rnd) → { q, a, parts?, unit?, step? }. Deterministisk med seed.
// `a` er altid et tal (heltal eller decimaltal med punktum); `q` og al visning bruger dansk komma via dk().
// `step` er den naturlige afstand mellem svarmuligheder (1, 0,5 eller 0,1) og kan gives videre til choices().
export function seeded(seed) { let s = seed >>> 0 || 7; return () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296); }
const ri = (r, a, b) => a + Math.floor(r() * (b - a + 1));
const pick = (r, list) => list[ri(r, 0, list.length - 1)];
const r2 = (v) => Math.round(v * 100) / 100; // fjerner flydende-komma-støj (0,1 + 0,2)

/** Dansk talvisning: 3.5 → "3,5". dec = fast antal decimaler (fx 2 til priser); uden dec vises kun de nødvendige. */
export const dk = (v, dec) => (dec == null ? String(r2(v)) : r2(v).toFixed(dec)).replace('.', ',').replace('-', '−');

export const TYPES = ['count', 'add', 'sub_hidden', 'mul', 'div', 'frac', 'area', 'angle', 'chart', 'coord', 'gram', 'pct', 'ratio', 'money'];

// Opdigtede sorter (ingen ægte navne) og kioskvarer til tekstopgaverne.
export const SORTER = ['Krater-Kusine', 'Månestøv Nummer 7', 'Sløv Skipper', 'Grøn Komet', 'Støvsky Deluxe', 'Bedstemors Have'];
const VARER = [['en pose flødeboller', 'poser'], ['en kande te', 'kander'], ['en bakke brownies', 'bakker'], ['en pose chips', 'poser'], ['en lun pizza', 'pizzaer']];

export function opg(type, grade, r = Math.random) {
  grade = Math.max(1, Math.min(6, grade | 0));
  switch (type) {
    case 'count': { const n = ri(r, grade < 3 ? 3 : 6, grade < 3 ? 9 : 10 + grade * 3); return { q: `Hvor mange poser ligger der på vægten?`, a: n, n }; }
    case 'add': {
      const max = [10, 20, 100, 1000, 1000, 10000][grade - 1];
      const a = ri(r, 1, max / 2), b = ri(r, 1, max / 2);
      return { q: `${a} + ${b} = ?`, a: a + b, parts: [a, b] };
    }
    case 'sub_hidden': {
      const a = ri(r, 5, 12 + grade * 3), b = ri(r, 1, a - 1);
      return { q: `${a} − ${b} = ?`, a: a - b, parts: [a, b] };
    }
    case 'mul': {
      const t = grade < 3 ? [2, 5, 10] : grade < 5 ? [2, 3, 4, 5, 6, 10] : [3, 4, 6, 7, 8, 9, 12];
      const a = t[ri(r, 0, t.length - 1)], b = ri(r, 2, grade < 3 ? 5 : 10);
      return { q: `${a} · ${b} = ?`, a: a * b, parts: [a, b] };
    }
    case 'div': {
      const b = ri(r, 2, grade < 4 ? 5 : 9), q = ri(r, 2, grade < 4 ? 6 : 12);
      return { q: `${b * q} : ${b} = ?`, a: q, parts: [b * q, b] };
    }
    case 'frac': {
      const d = [2, 2, 4, 4, 5, 10][grade - 1], k = ri(r, 1, d - 1), whole = d * ri(r, 1, grade < 4 ? 3 : 8);
      return { q: `${k}/${d} af ${whole} = ?`, a: (whole / d) * k, parts: [k, d, whole] };
    }
    case 'area': { const w = ri(r, 2, 4 + grade), h = ri(r, 2, 3 + grade); return { q: `Et bed er ${w} m bredt og ${h} m langt. Hvor mange m² er det?`, a: w * h, unit: 'm²', parts: [w, h] }; }
    case 'angle': { const a = [30, 45, 60, 90, 120, 135, 150][ri(r, 0, 6)]; return { q: `Drej lyset ${a}°`, a }; }
    case 'chart': { const v = [ri(r, 1, 9), ri(r, 1, 9), ri(r, 1, 9)]; const i = ri(r, 0, 2); return { q: `Hvor mange poser popcorn blev der spist ${['mandag', 'tirsdag', 'onsdag'][i]}?`, a: v[i], values: v }; }
    case 'coord': { const x = ri(r, grade > 4 ? -5 : 0, 7), y = ri(r, grade > 4 ? -5 : 0, 5); return { q: `Sæt et frø i (${x}, ${y})`, a: [x, y] }; }

    // --- gram: læg vægte sammen. Klasse 1–2 hele gram, 3–4 halve gram, 5–6 tiendedele (og tre led).
    case 'gram': {
      const step = grade < 3 ? 1 : grade < 5 ? 0.5 : 0.1;
      const n = grade < 5 ? 2 : 3;
      const tenths = () => (grade < 3 ? ri(r, 1, 5) * 10 : grade < 5 ? ri(r, 1, 9) * 5 : ri(r, 5, 45)); // regnes i tiendedele gram
      let parts = [];
      for (let i = 0; i < n; i++) parts.push(tenths());
      if (grade >= 3 && parts.every((p) => p % 10 === 0)) parts[0] += 5; // mindst ét komma fra 3. klasse
      const sum = parts.reduce((s, p) => s + p, 0);
      parts = parts.map((p) => p / 10);
      return { q: parts.map((p) => `${dk(p)} g`).join(' + ') + ' = ?', a: sum / 10, parts, unit: 'g', step };
    }
    // --- pct: procent af en mængde gram. Lave klasser 50 % / 10 % af runde tal; højere giver decimalsvar.
    case 'pct': {
      const p = pick(r, grade < 3 ? [50] : grade < 5 ? [10, 25, 50, 75] : [5, 10, 20, 25, 40, 75]);
      const base = p === 50 ? 2 : p === 25 || p === 75 ? 4 : p === 20 || p === 40 ? 5 : p === 10 ? 10 : 20; // mindste hele tal der går op
      const whole = grade < 5 ? base * ri(r, 1, grade < 3 ? 5 : 10) : (base / 2) * ri(r, 2, 20);
      const a = r2((whole * p) / 100);
      return { q: `${p} % af ${dk(whole)} g = ?`, a, parts: [p, whole], unit: 'g', step: Number.isInteger(a) ? 1 : 0.5 };
    }
    // --- ratio: forhold a:b i en opdigtet sort. Kendt antal dele af den ene, find den anden.
    case 'ratio': {
      const pairs = grade < 3 ? [[1, 1], [2, 1], [1, 2]] : grade < 5 ? [[2, 1], [1, 2], [3, 1], [1, 3], [3, 2]] : [[3, 2], [2, 3], [4, 1], [5, 2], [3, 4], [5, 3]];
      const [x, y] = pick(r, pairs), k = ri(r, 2, grade < 3 ? 5 : 9), sort = pick(r, SORTER);
      return { q: `Sorten ${sort} har forholdet THC:CBD = ${x}:${y}. En prøve har ${x * k} dele THC. Hvor mange dele CBD har den?`, a: y * k, parts: [x, y, k], sort, unit: 'dele' };
    }
    // --- money: Krater-kroner. Lave klasser: stykpris gange antal. Fra 3. klasse: procent rabat.
    case 'money': {
      const [vare, flertal] = pick(r, VARER);
      if (grade < 3) {
        const pris = ri(r, 2, 10), n = ri(r, 2, 5);
        return { q: `${vare[0].toUpperCase() + vare.slice(1)} koster ${pris} Krater-kroner. Hvad koster ${n} ${flertal}?`, a: pris * n, parts: [pris, n], unit: 'Krater-kroner' };
      }
      const p = pick(r, grade < 5 ? [10, 25, 50] : [10, 20, 25, 30, 75]);
      const pris = (grade < 5 ? (p === 25 ? 4 : 10) : (p === 25 || p === 75 ? 2 : 5)) * ri(r, 2, 12);
      const a = r2(pris * (1 - p / 100));
      return { q: `${vare[0].toUpperCase() + vare.slice(1)} koster ${pris} Krater-kroner. I dag er der ${p} % rabat. Hvad koster den nu?`, a, parts: [pris, p], unit: 'Krater-kroner', step: Number.isInteger(a) ? 1 : 0.5 };
    }
  }
  throw new Error('opg type ' + type);
}

/** Flervalg: det rigtige svar + n−1 forkerte naboer. step = afstand mellem naboerne (udledes af svaret, hvis den mangler),
 *  så decimalsvar får decimal-naboer (3,5 → 3 / 4 / 4,5). Returnerer tal; vis dem med dk(). */
export function choices(answer, r = Math.random, n = 4, step) {
  step = step || (Number.isInteger(answer) ? 1 : Number.isInteger(r2(answer * 2)) ? 0.5 : 0.1);
  const set = new Set([r2(answer)]);
  let guard = 0;
  while (set.size < n && guard++ < 80) { const d = ri(r, -5, 5), v = r2(answer + d * step); if (d && v >= 0) set.add(v); }
  return [...set].sort(() => r() - 0.5);
}
