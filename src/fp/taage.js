// Mission C — Tågen over Krateret (akt 4, skærbar): følg vinkelskiltene gennem tågen og find Skipper Sløv i hængekøjen.
// Roligt og lidt sært, aldrig uhyggeligt. Skiltene bruger kun drejninger, gitteret kan udtrykke entydigt (90°, 270°).
import { MAPS, parse } from './map.js';
import { hex, shader, paint, text, anim, SEQ } from './tex.js';

export const NAMES = ['v_klippe', 'v_vejskilt', 'sloev', 'fnug', 'fnug_syv', 'busstop', 'lygte'];
// Rigtig vej pr. T-kryds (man ankommer med ansigtet mod skiltet). Fra 4. klasse skrives to af dem som 270° den anden vej.
const TURNS = { A: 'h', B: 'v', C: 'v', D: 'h', E: 'h' }, OMVEJ = { C: true, E: true };
const WORD = { h: 'højre', v: 'venstre' };
function sign(ch, grade) {
  const way = TURNS[ch], omvej = grade >= 4 && OMVEJ[ch], deg = omvej ? 270 : 90, to = omvej ? (way === 'h' ? 'v' : 'h') : way;
  return { deg, to, full: 'Drej ' + deg + '° til ' + WORD[to] + '.' };
}

export function build({ T, grade, stat }) {
  const fog = hex('#c4c6d2'), S = shader(fog), { map, marks } = parse(MAPS.taage);
  const signs = {}, walls = { '#': S(T.v_klippe[0]) };
  for (const ch of Object.keys(TURNS)) {
    const s = signs[ch] = sign(ch, grade);
    walls[ch] = S(paint(T.v_vejskilt[0], (g) => { text(g, 'DREJ', 32, 15, 10); text(g, s.deg + '°', 32, 27, 14); text(g, WORD[s.to].toUpperCase(), 32, 40, 10); }));
  }
  walls.X = S(paint(T.v_vejskilt[0], (g) => { text(g, 'IKKE', 32, 21, 12); text(g, 'HER.', 32, 35, 12); }));
  const gyder = Object.keys(marks).filter((k) => /\d/.test(k)).map((k) => ({ id: k, x: Math.floor(marks[k][0].x), y: Math.floor(marks[k][0].y), seen: false }));
  const sloev = { kind: 'sloev', solid: true, keep: 0.95, x: marks.s[0].x, y: marks.s[0].y, scale: 1, ...anim(S, T.sloev, SEQ.sov) };
  const pynt = [
    ...marks.v.map((p) => ({ kind: 'fnug', solid: true, x: p.x, y: p.y, scale: 0.7, ...anim(S, T.fnug_syv, SEQ.vink), line: 'Syv vinker.' })),
    ...marks.f.map((p) => ({ kind: 'fnug', solid: true, x: p.x, y: p.y, scale: 0.7, ...anim(S, T.fnug, SEQ.blink), line: 'Fnuggen kigger ud i tågen. Der er ikke noget at se.' })),
    ...marks.b.map((p) => ({ kind: 'fnug', solid: true, x: p.x, y: p.y, scale: 1, tex: S(paint(T.busstop[0], (g) => { text(g, '7 MIN', 32, 16, 11); })), line: 'Der er 7 minutter til bussen. Det har der altid været.' })),
    ...marks.l.map((p) => ({ kind: 'lygte', solid: true, x: p.x, y: p.y, scale: 1, ...anim(S, T.lygte, SEQ.lygte) })),
  ];
  const world = {
    id: 'taage', map, fog, fogK: 2.1, cols: 320, floor: hex('#8f8a80'), ceil: hex('#d0d2dc'),
    walls, sprites: [sloev, ...pynt], sloev, gyder, signs,
  };
  Object.assign(stat, { gyder: 0, snork: 0 });
  const total = Math.hypot(marks.p[0].x - sloev.x, marks.p[0].y - sloev.y);
  return {
    id: 'taage', name: 'Tågen over Krateret (ÆGTE 3D)', world,
    start: { ...marks.p[0], a: -Math.PI / 2 },
    intro: 'Skipper Sløv snorker et sted i tågen. Følg skiltene.', introSecs: 5,
    hud: () => 'Snorken: ' + ['næsten ingenting', 'meget svag', 'svag', 'tydelig', 'høj', 'lige her'][stat.snork],
    look: (ch) => (signs[ch] ? 'Skiltet siger: ' + signs[ch].full : ch === 'X' ? 'Skiltet siger: Ikke her.' : null),
    prompt: (s) => (s.kind === 'sloev' ? 'BRUG: se til Skipper Sløv' : null),
    tick(cam, api) {
      stat.snork = Math.max(0, Math.min(5, Math.round(5 * (1 - (Math.hypot(cam.x - sloev.x, cam.y - sloev.y) - 1) / total))));
      const g = gyder.find((q) => q.x === Math.floor(cam.x) && q.y === Math.floor(cam.y));
      if (g && !g.seen) { g.seen = true; stat.gyder++; api.wrong(); api.say('Ikke her. Gå tilbage til skiltet og drej den anden vej.', 4); } // højst ét fejlforsøg pr. gyde
    },
    use(s, api) { if (s.kind === 'sloev') api.win('Skipper Sløv sover. Klokken er 16:20. Du lader ham sove.'); },
  };
}
