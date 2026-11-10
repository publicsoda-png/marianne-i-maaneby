// Banedata til de tre 3D-missioner. Ren data (ingen imports), så banerne også kan tjekkes fra node.
// Tegn: '.' = gulv · STORE bogstaver og '#' = vægge (tekstur pr. tegn, se missionen) · små bogstaver og tal = mærker på gulv
// (startfelt, ting, figurer, blinde gyder), som parse() trækker ud og gør til gulv. Maks 24×24.
export const MAPS = {
  // Drivhuslabyrinten: G glas, H plantevæg, S skilt med talfølgens regel · p start, c vandkande, b bede (læses række for række), f Fnug
  drivhus: [
    'GGGGGGGGGGGGGGGGGGGGG',
    'G...H.....H.....H...G',
    'G.H.H.HHH.H.HHH.H.H.G',
    'G.H...H.b...H.b...H.G',
    'G.HHHHH.HHHHH.HHHHH.G',
    'G.....H..HfH..H.....G',
    'GHHHH.H.HH.HH.H.HHHHG',
    'G.b...H.H.c.H.H...b.G',
    'G.HHHHH.H...H.HHHHH.G',
    'G.......HH.HH.......G',
    'G.HHH.HHH...HHH.HHH.G',
    'G.HfH.H...H...H.HfH.G',
    'G.H.HHH.HHSHH.HHH.H.G',
    'G.H...............H.G',
    'G.HHHHHHH.p.HHHHHHH.G',
    'G.b.......H.......b.G',
    'GGGGGGGGGGGGGGGGGGGGG',
  ],
  // Kiosken om natten: K væg, V vindue, R reol, C væg bag kassen · p start, k Kurt, s snacks (i reolernes huller), f Fnug
  kiosk: [
    'KKKKKKKKKKKKKKKKKKK',
    'KKKVKCCkCCKKKKKVKKK',
    'K.................K',
    'K.RRsRR.RRRRR.RsR.K',
    'K.................K',
    'K.RsRRR.RRsRR.RRR.K',
    'K.................K',
    'K.RRRsR.RsRRR.RsR.K',
    'K.................K',
    'K.RRR.R.RRRsR.RfR.K',
    'K.................K',
    'KKKKKKKpKKKKKKKKKKK',
    'KKKKKKKKKKKKKKKKKKK',
  ],
  // Tågen over Krateret: # klippe, A–E vejskilte i T-kryds, X "Ikke her." · p start, 1–5 blinde gyder, s Skipper Sløv,
  // v Syv der vinker, b busstoppested, l lygter, f Fnug. Rigtig vej: A højre, B venstre, C venstre, D højre, E højre.
  taage: [
    '########################',
    '###########E##f##...####',
    '#######X5.........s.####',
    '###########.#####...####',
    '##########l.############',
    '###########.############',
    '###########.#l###C######',
    '##########D........3X###',
    '###########.#####.######',
    '###########4####b.######',
    '###########X#####.######',
    '############A#v##.######',
    '########X1........B#####',
    '############.####.######',
    '############.####2######',
    '############p####X######',
    '########################',
  ],
};

/** rows → { map (mærker erstattet af gulv), marks: { tegn: [{ x, y } feltmidte …] } } */
export function parse(rows) {
  const marks = {};
  const map = rows.map((row, y) => row.replace(/[a-z0-9]/g, (ch, x) => { (marks[ch] = marks[ch] || []).push({ x: x + 0.5, y: y + 0.5 }); return '.'; }));
  return { map, marks };
}
