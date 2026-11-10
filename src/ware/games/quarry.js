// Popcorn-fabrikken: et lille breakout. Bakken følger musen (eller fingeren), en majskerne slår popcorn ned fra væggen.
// Opgave: ram kun de popcorn, hvis tal går op i N. Forkert popcorn → brænder på, onWrong, kernen flyver videre.
// Der står ét popcorn i hver kolonne (skiftevis to rækker), så alle kan nås lige nedefra: klik sender kernen lodret op,
// og bakkens kant giver vinkel som i et rigtigt breakout. Tabt kerne lægger sig på bakken igen og venter på et klik.
// Intet bevæger sig før første klik. Fabrikken lukker efter 75 sekunder; så popper resten af de rigtige af sig selv.
import { seeded } from '../../opg.js';
import { sprite } from '../../art/placeholder.js';

const FONT = '"Comic Neue","Comic Sans MS","Chalkboard SE",cursive';
const wrongLines = [
  'Det tal gik ikke op. Det popcorn er brændt på nu.',
  'Forkert popcorn. Fabrikken har noteret det i en mappe.',
  'Den hørte ikke til. Kernen flyver videre, som om intet var sket.',
];

export default {
  id: 'quarry',
  lines: {
    quarry_intro: 'Popcorn-fabrikken. Flyt bakken med musen, og klik for at sende majskernen af sted. Ram kun de popcorn, hvis tal går op i tallet på skiltet.',
    quarry_ok: 'De rigtige popcorn er nede. Resten bliver hængende. Det gør de altid.',
    quarry_wrong: () => wrongLines[Math.floor(Math.random() * wrongLines.length)],
  },
  setup(a) {
    const r = seeded(a.opts.seed ?? Date.now());
    const grade = Math.max(1, Math.min(6, a.opts.grade ?? 3));
    const ri = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
    const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };

    // ---- tallet N og 12 popcorn: op til 6 divisorer, resten tal der ikke går op
    const N = [[6, 8, 10], [10, 12, 20], [12, 18, 24], [24, 30, 36], [36, 48, 60], [48, 72, 84]][grade - 1][ri(0, 2)];
    const divs = []; for (let d = 1; d <= N; d++) if (N % d === 0) divs.push(d);
    const good = shuffle(divs.slice()).slice(0, 6);
    const bad = []; const cap = Math.max(13, N + 3);
    let guard = 0;
    while (bad.length < 12 - good.length && guard++ < 600) { const n = ri(2, cap); if (N % n !== 0 && !bad.includes(n)) bad.push(n); }
    while (bad.length < 12 - good.length) bad.push(N + 1 + bad.length);
    const numbers = shuffle([...good.map((n) => ({ n, ok: true })), ...bad.map((n) => ({ n, ok: false }))]);

    // ---- arbejdsfelt: opakt panel (fabriksvæg) med bane indeni
    // renderet fabriksvæg i stribet rørramme; banen er rammens inderside (rammen er 34 px tyk)
    const PX0 = 40, PY0 = 70, PWID = 560, PHGT = 384;
    const X0 = 76, X1 = 564, Y0 = 110, Y1 = 436;
    a.spr(PX0 + PWID / 2 + 3, PY0 + PHGT / 2 + 3, PWID + 6, PHGT + 6, (g) => {
      const img = sprite('mg_quarry_panel');
      if (!img) { g.fillStyle = '#8a3324'; g.fillRect(0, 0, PWID, PHGT); return; }
      const sk = document.createElement('canvas'); sk.width = PWID; sk.height = PHGT; const sg = sk.getContext('2d');
      sg.drawImage(img, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = '#1a1410'; sg.fillRect(0, 0, PWID, PHGT);
      g.drawImage(sk, 6, 6); g.drawImage(img, 0, 0);
    });
    a.text(`Ram kun de popcorn, der går op i ${N}`, 0, 108, { width: '640px', textAlign: 'center', fontSize: '16px', fontFamily: FONT, color: '#fff3c4', outline: '#3a0c08' });
    const left = a.text('', 84, 110, { fontSize: '12px', fontFamily: FONT, outline: '#3a0c08' });
    const clock = a.text('', 466, 110, { fontSize: '12px', fontFamily: FONT, width: '90px', textAlign: 'right', outline: '#3a0c08' });

    // ---- popcorn: 12 kolonner, skiftevis øverste og nederste række
    const KW = 36, KH = 30, COL = 39, CX0 = X0 + 30, ROWY = [154, 196];
    const drawCorn = (g, c) => {
      const burnt = c.burnt, img = sprite(burnt ? 'mg_quarry_1' : 'mg_quarry_0'); // renderet popcorn / brændt popcorn
      if (img) g.drawImage(img, 20 - img.width / 2, 20 - img.height / 2);
      else { g.fillStyle = burnt ? '#3a2a1c' : '#fff3c4'; g.beginPath(); g.arc(20, 20, 16, 0, 7); g.fill(); }
      a.draw(g, String(c.n), 20, 20, { size: 16, fontFamily: FONT, color: burnt ? '#e8dcc8' : '#2a1a08', outline: burnt ? '#000' : '#fff8e0', align: 'center', valign: 'middle' });
    };
    const corns = numbers.map((c, i) => {
      const o = { ...c, x: CX0 + i * COL, y: ROWY[i % 2], w: KW, h: KH, alive: true, burnt: false };
      o.node = a.spr(o.x, o.y, 40, 40, (g) => drawCorn(g, o));
      return o;
    });
    const targetsLeft = () => corns.filter((c) => c.alive && c.ok).length;
    const updateLeft = () => { left.textContent = `${targetsLeft()} tilbage`; };
    updateLeft();

    // ---- bakke og majskerne
    const PW = 60, PH = 12, PY = 418, R = 5, SPEED = 240, MAXDEG = 55;
    const clampPx = (x) => Math.max(X0 + PW / 2 + 2, Math.min(X1 - PW / 2 - 2, x));
    let px = (X0 + X1) / 2;
    // bakken: renderet stribet popcornbæger, oversiden flugter med bakkens kant (PY − PH/2)
    const paddle = a.spr(px, PY, 64, 36, (g) => {
      const img = sprite('mg_quarry_2');
      if (img) g.drawImage(img, 0, 12); else { g.fillStyle = '#c9352b'; g.fillRect(2, 12, PW, PH); }
    });
    const ball = a.spr(px, PY - PH / 2 - R, 12, 16, (g) => {
      const img = sprite('mg_quarry_3'); // renderet majskerne
      if (img) g.drawImage(img, 0, 0); else { g.fillStyle = '#f2b632'; g.beginPath(); g.arc(6, 8, R, 0, 7); g.fill(); }
    });
    const REST_Y = PY - PH / 2 - R;
    let bx = px, by = REST_Y, vx = 0, vy = 0, live = false, started = false, restAt = 0, over = false;
    const hint = a.text('Klik for at sende majskernen af sted', 0, 300, { width: '640px', textAlign: 'center', fontSize: '15px', fontFamily: FONT });

    // ---- til testen: det rigtige svar og banens tilstand
    const T = window.MB_TASK = {
      game: 'quarry', N, answer: good.slice().sort((p, q) => p - q), corns,
      ball: { x: bx, y: by, live }, paddle: { x: px, y: PY, w: PW },
      geo: { X0, X1, Y0, Y1, R },
    };

    a.move((e, p) => { px = clampPx(p.x); }, true);
    // klik (eller tryk) i banen: bakken hopper hen under fingeren, og en hvilende kerne sendes lodret op
    a.tap((e, p) => {
      if (over || p.x < X0 || p.x > X1 || p.y < Y0 || p.y > Y1) return;
      px = clampPx(p.x);
      if (live || performance.now() < restAt) return;
      started = true; hint.style.visibility = 'hidden';
      bx = px; by = REST_Y; vx = 0; vy = -SPEED; live = true;
      a.play('bold_boing', { gain: 0.6, pan: a.pan(bx) });
    });

    // ---- fabrikkens ur
    let tLeft = 75;
    const showClock = () => { clock.textContent = `${Math.max(0, tLeft)} sek.`; };
    showClock();
    const finish = () => { if (over) return; over = true; live = false; a.after(600, () => a.done({ ok: true })); };
    a.every(1000, () => {
      if (over || !started) return;
      tLeft--; showClock();
      if (tLeft <= 0) {
        // fyraften: de rigtige popcorn, der er tilbage, popper af sig selv, så runden altid slutter
        corns.forEach((c) => { if (c.alive && c.ok) { c.alive = false; c.node.style.visibility = 'hidden'; } });
        updateLeft(); a.sfx.pop(); finish();
      }
    });

    const hit = (c) => {
      c.alive = false;
      if (c.ok) { c.node.style.visibility = 'hidden'; a.sfx.pop(); }
      else { c.burnt = true; c.node.redraw(); a.sfx.bad(); a.opts.onWrong && a.opts.onWrong(); } // brændt popcorn bliver hængende, men kan ikke rammes igen
      updateLeft();
      if (targetsLeft() === 0) { a.sfx.good(); finish(); }
    };

    // ---- hovedløkke
    a.frame((dt) => {
      paddle.at(px, PY);
      T.paddle.x = px; T.ball.x = bx; T.ball.y = by; T.ball.live = live;
      if (over) return;
      if (!live) { bx = px; by = REST_Y; ball.at(Math.round(bx), Math.round(by)); return; } // kernen hviler på bakken
      bx += vx * dt; by += vy * dt;
      // vægge
      if (bx - R < X0) { bx = X0 + R; vx = Math.abs(vx); a.play('blok_dunk', { gain: 0.35, pan: -0.5 }); }
      if (bx + R > X1) { bx = X1 - R; vx = -Math.abs(vx); a.play('blok_dunk', { gain: 0.35, pan: 0.5 }); }
      if (by - R < Y0) { by = Y0 + R; vy = Math.abs(vy); a.play('blok_dunk', { gain: 0.35, pan: a.pan(bx) }); }
      // bakken: midten sender lige op, kanterne giver vinkel
      if (vy > 0 && by + R >= PY - PH / 2 && by - R <= PY + PH / 2 && Math.abs(bx - px) <= PW / 2 + R) {
        by = REST_Y;
        const off = Math.max(-1, Math.min(1, (bx - px) / (PW / 2)));
        const ang = (-90 + off * MAXDEG) * Math.PI / 180;
        vx = Math.cos(ang) * SPEED; vy = Math.sin(ang) * SPEED;
        a.play('bold_boing', { gain: 0.8, pan: a.pan(bx) });
      }
      // popcorn
      for (const c of corns) {
        if (!c.alive) continue;
        const dx = bx - c.x, dy = by - c.y;
        const ox = c.w / 2 + R - Math.abs(dx), oy = c.h / 2 + R - Math.abs(dy);
        if (ox > 0 && oy > 0) {
          if (ox < oy) { vx = dx < 0 ? -Math.abs(vx) : Math.abs(vx); bx += dx < 0 ? -ox : ox; }
          else { vy = dy < 0 ? -Math.abs(vy) : Math.abs(vy); by += dy < 0 ? -oy : oy; }
          hit(c);
          break;
        }
      }
      // tabt: kernen lægger sig på bakken igen og venter på et klik
      if (by - R > Y1) {
        live = false; restAt = performance.now() + 500;
        a.sfx.thud(); hint.style.visibility = 'visible';
      }
      ball.at(Math.round(bx), Math.round(by));
    });
  },
};
