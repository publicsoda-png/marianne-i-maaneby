// Mission A — Drivhuslabyrinten (akt 2): find Mariannes vandkande, vand bedene i talfølgens rækkefølge.
import { MAPS, parse } from './map.js';
import { hex, shader, paint, text, anim, SEQ } from './tex.js';

export const NAMES = ['v_glas', 'v_haek', 'v_skilt', 'bed_toert', 'bed_vandet', 'vandkande', 'fnug'];
/** Talfølgen følger klassetrinnet. `snyd` er et bed, der ikke hører til følgen. */
const rule = (grade) => grade <= 2 ? { t: '+2', op: '+ 2', seq: [2, 4, 6, 8, 10], snyd: 7 }
  : grade <= 4 ? { t: '+3', op: '+ 3', seq: [3, 6, 9, 12, 15], snyd: 10 }
  : { t: '×2', op: '× 2', seq: [2, 4, 8, 16, 32], snyd: 12 };
const ORDER = [4, 1, 2, 5, 0], SNYD = 3; // hvilket b-mærke (række for række) der får hvilket led i følgen

export function build({ T, grade, stat }) {
  const fog = hex('#b9d8c8'), S = shader(fog), { map, marks } = parse(MAPS.drivhus), r = rule(grade);
  const mkBed = (p, n) => {
    const lab = (src) => S(paint(src, (g) => text(g, String(n), 33, 9, 12)));
    const b = { kind: 'bed', n, x: p.x, y: p.y, dry: lab(T.bed_toert[0]), wet: lab(T.bed_vandet[0]), scale: 0.8 };
    b.tex = b.dry; return b;
  };
  const beds = ORDER.map((m, i) => mkBed(marks.b[m], r.seq[i])), decoy = mkBed(marks.b[SNYD], r.snyd);
  const kande = { kind: 'can', solid: true, keep: 0.8, x: marks.c[0].x, y: marks.c[0].y, tex: S(T.vandkande[0]), scale: 0.6 };
  const fnug = marks.f.map((p) => ({ kind: 'fnug', solid: true, x: p.x, y: p.y, scale: 0.7, ...anim(S, T.fnug, SEQ.blink), line: 'Fnuggen kigger venligt på dig. Den siger ikke noget.' }));
  const world = {
    id: 'drivhus', map, fog, fogK: 0.9, cols: 320, floor: hex('#8a7a5a'), ceil: hex('#cfe8dc'),
    walls: { '#': S(T.v_glas[0]), G: S(T.v_glas[0]), H: S(T.v_haek[0]), S: S(paint(T.v_skilt[0], (g) => text(g, r.t, 32, 28, 16))) },
    sprites: [...beds, decoy, kande, ...fnug], beds, decoy, kande, rule: r,
  };
  Object.assign(stat, { hasCan: false, watered: 0 });
  return {
    id: 'drivhus', name: 'Drivhuslabyrinten (ÆGTE 3D)', world,
    start: { ...marks.p[0], a: -Math.PI / 2 },
    intro: 'Find Mariannes vandkande.',
    hud: () => (stat.hasCan ? 'Vandet: ' + stat.watered + ' af ' + beds.length : 'Vandkande: mangler'),
    look: (ch) => (ch === 'S' ? 'Skiltet siger: ' + r.t : null),
    prompt: (s) => (s.kind === 'can' ? 'BRUG: tag vandkanden' : s.kind === 'bed' ? (s.tex === s.wet ? null : 'BRUG: vand bed ' + s.n) : null),
    use(s, api) {
      if (s.kind === 'can') { s.hidden = true; stat.hasCan = true; api.say('Vandkande. Skiltet siger ' + r.t + '. Start ved ' + r.seq[0] + '.', 4); return; }
      if (s.kind !== 'bed' || s.tex === s.wet) return;
      if (!stat.hasCan) { api.say('Du har ingen vandkande.'); return; }
      if (s === decoy) { api.wrong(); api.say(s.n + ' er ikke med i talfølgen. Reglen er ' + r.t + '.', 3.5); return; }
      if (s !== beds[stat.watered]) { api.wrong(); api.say('Ikke ' + s.n + ' endnu. Reglen er ' + r.t + '.', 3.5); return; }
      s.tex = s.wet; stat.watered++;
      if (stat.watered === beds.length) api.win(r.seq.join(', ') + '. Planterne siger tak.');
      else api.say(s.n + '. Godt. Næste er ' + s.n + ' ' + r.op + '.', 3.5);
    },
  };
}
