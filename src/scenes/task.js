// Et sted i byen: figurens replik før → minispillets intro → minispil → resultat → figurens replik efter
// → bygningstrin + linje i Dagens regnskab (save.log, med akt) → tilbage til hubben.
import { register, goto, lock, button, current } from '../core/scene.js';
import { bg, contactShadow } from '../art/placeholder.js';
import { say, hideDialog, sleep } from '../core/dialog.js';
import { save, touch, persist } from '../core/state.js';
import { sfx } from '../core/audio.js';
import { tell } from '../script.js';
import { playGame, stopGame } from '../ware/engine.js';
import { stand, setMood } from '../art/figs.js';
import { spil } from './hub.js';

const GAMES = {};
export const GAME_IDS = ['landing', 'bakery', 'school', 'ice', 'scope', 'ratio', 'quarry', 'light', 'kiosk', 'hall'];
/** Henter de minispil, der findes. En manglende fil (ratio/kiosk bygges af et andet spor) giver ingen fejl. */
export async function loadGames() {
  for (const id of GAME_IDS) {
    try {
      const url = new URL(`../ware/games/${id}.js`, import.meta.url);
      const head = await fetch(url, { method: 'HEAD' }).catch(() => null); // spørg først: en fejlet import() larmer i konsollen
      if (!head || !head.ok) continue;
      const m = await import(url.href); if (m && m.default) GAMES[id] = m.default;
    } catch { /* ikke bygget endnu */ }
  }
  return Object.keys(GAMES);
}
export const hasGame = (id) => !!GAMES[id];
// Minispillet ejer sine egne replikker: lines['<spil-id>_intro' | '_ok' | '_wrong'].
const line = (G, id, k, fallback) => { const l = G && G.lines && G.lines[id + '_' + k]; return l ? (typeof l === 'function' ? l() : l) : fallback; };
const PLADS_MUSIK = ['plads_a', 'plads_b', 'plads_c', 'plads_a']; // pr. akt

register({
  id: 'task',
  async enter(p) {
    this.p = p; this.figOn = true;
    const tok = this.token = {}; // Tilbage under introen må ikke starte spillet oven på hubben
    const gone = () => this.token !== tok || current !== this;
    this.bgc = bg(p.game);
    spil(PLADS_MUSIK[(p.act || 1) - 1]);
    const back = button('Tilbage', 8, 448, () => { stopGame(); hideDialog(); sfx.click(); goto('hub', { back: true }); }, { w: 90 });
    const G = GAMES[p.game];
    this.figX = G && G.figX;
    this.portrait = G && G.portrait; // oppefra-baggrund: figuren vises i et portrætvindue i stedet for at stå på gulvet
    if (!G) { await tell('ikke_bygget', { auto: 1800 }); if (!gone()) goto('hub', { back: true }); return; }
    const again = !!save.done[p.id];
    await tell(p.id + (again ? '_igen' : '_foer'));
    if (gone()) return;
    this.figOn = false; // figuren træder til side, mens der regnes
    await say(line(G, p.game, 'intro', 'Løs opgaven.'));
    if (gone()) return;
    let wrong = 0, wrongSay = Promise.resolve();
    const res = await playGame(G, { grade: save.grade, seed: Date.now(), save, say, onWrong: () => { wrong++; save.wrongCount = (save.wrongCount || 0) + 1; touch(); wrongSay = say(line(G, p.game, 'wrong', 'Prøv igen.'), { auto: 1000 }); } });
    await wrongSay; // ok-replikken må ikke lande oven i en uafsluttet wrong-replik
    if (res.aborted || gone()) return;
    back.remove();
    const stage = Math.max(1, 3 - Math.min(2, wrong));
    const prev = save.buildings[p.id] || 0;
    if (stage > prev) { save.buildings[p.id] = stage; save.flags.justBuilt = { id: p.id, stage }; }
    if (!again) save.log.push({ id: p.id, name: p.name, wrong, act: p.act }); // regnskabet tæller første gennemførsel
    save.done[p.id] = true;
    touch(); persist(true);
    lock(true);
    sfx.good();
    await say(line(G, p.game, 'ok', 'Godt klaret!'));
    if (gone()) return;
    this.figOn = true;
    if (p.fig) setMood(p.fig, 'griner', 1200); // figuren kommer tilbage og griner over den løste opgave
    if (!again) { await sleep(700); if (gone()) return; await tell(p.id + '_efter'); }
    if (gone()) return;
    if (stage === 3 && !save.stickers.includes(p.id)) { save.stickers.push(p.id); sfx.sticker(); await tell('sticker'); if (gone()) return; }
    lock(false);
    goto('hub', { back: true });
  },
  bg(g, dt, tm) {
    g.drawImage(this.bgc, 0, 0);
    const fx = this.figOn ? 556 : this.figX; // figX: spillet har gjort plads til figuren ved siden af feltet
    if (fx && this.p.fig && this.portrait && this.figOn) {
      const X = 478, Y = 236, Wd = 150, Hd = 200; // portrætvindue: hård skygge, træramme, mørk baggrund, figuren fra livet og op
      g.fillStyle = '#1a1410'; g.fillRect(X + 5, Y + 5, Wd, Hd);
      g.fillStyle = '#7a5a34'; g.fillRect(X, Y, Wd, Hd); g.fillStyle = '#b98a4e'; g.fillRect(X, Y, Wd, 3); g.fillRect(X, Y, 3, Hd);
      g.fillStyle = '#20243a'; g.fillRect(X + 8, Y + 8, Wd - 16, Hd - 16);
      g.save(); g.beginPath(); g.rect(X + 8, Y + 8, Wd - 16, Hd - 16); g.clip();
      stand(g, this.p.fig, X + Wd / 2 + 4, Y + Hd + 150, 330, tm); g.restore();
    } else if (fx && this.p.fig) { contactShadow(g, fx - 16, 468, 50); stand(g, this.p.fig, fx, 468, 190, tm); }
  },
});
