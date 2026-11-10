// Gem (fremdrift) i localStorage, spejlet til IndexedDB; meta (antal starter, hjælpeklik) kun i IndexedDB.
// Alt er best effort: spillet skal kunne køre helt uden lager (privat vindue, artifact-iframe).
const LS_KEY = 'marianne.save.v1';
const DB = 'marianne', STORE = 'kv';
export const SAVE_VERSION = 2;

const saveDefaults = () => ({
  name: '', grade: 3, lang: 'da',
  buildings: {},      // id → 0..3 (0 = not built)
  stickers: [],
  playMs: 0,          // samlet spilletid
  flags: {},          // forløbsflag: akt1..akt4 (aktens intro set), regn1..regn4 (regnskab læst), fp_<mission>, slut
  act: 1,             // 1 Frø · 2 Vækst · 3 Blomst · 4 Høst — styrer hvad der er åbent
  done: {},           // plot-id → true når opgaven er løst
  log: [],            // Dagens regnskab: {id, name, wrong, act} pr. løst opgave (kontrakt i docs/RETNING.md)
  wrongCount: 0,      // forkerte svar i alt
  version: SAVE_VERSION,
});
export const save = saveDefaults();
const metaDefaults = () => ({
  starts: 0, lastSeen: 0, resets: 0, helpClicks: 0, version: SAVE_VERSION,
});
export const meta = metaDefaults();
let dirty = false;
export const flag = (k, v) => { if (v === undefined) return save.flags[k]; save.flags[k] = v; dirty = true; };

function idb() {
  return new Promise((res) => {
    try {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => res(r.result);
      r.onerror = () => res(null);
    } catch { res(null); }
  });
}
async function idbGet(k) {
  const db = await idb(); if (!db) return null;
  return new Promise((res) => { try { const q = db.transaction(STORE).objectStore(STORE).get(k); q.onsuccess = () => res(q.result ?? null); q.onerror = () => res(null); } catch { res(null); } });
}
export async function idbSet(k, v) {
  const db = await idb(); if (!db) return;
  try { db.transaction(STORE, 'readwrite').objectStore(STORE).put(JSON.parse(JSON.stringify(v)), k); } catch {}
}

export async function loadState() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch {}
  if (!s) s = await idbGet('save');
  if (s && typeof s === 'object') {
    if ((s.version | 0) >= SAVE_VERSION) Object.assign(save, s);
    if (save.version >= SAVE_VERSION) for (const r of save.log) if (!r.act) r.act = 1; // log fra den lodrette skive havde ingen akt
    else { // ældre gemmeformat: intet tages med
      try { localStorage.removeItem(LS_KEY); } catch {}
      idbSet('save', null);
    }
  }
  const m = await idbGet('meta');
  if (m && typeof m === 'object') {
    Object.assign(meta, m);
    if ((m.version | 0) < SAVE_VERSION) { // ældre meta: smid felter, den nye udgave ikke kender
      const keep = metaDefaults();
      for (const k of Object.keys(meta)) if (!(k in keep)) delete meta[k];
      meta.version = SAVE_VERSION;
    }
  }
  meta.starts++;
  meta.lastSeen = Date.now();
  await idbSet('meta', meta);
  return { save, meta };
}
export function persist(force = false) {
  if (!dirty && !force) return;
  dirty = false;
  try { localStorage.setItem(LS_KEY, JSON.stringify(save)); } catch {}
  idbSet('save', save);
}
export function persistMeta() { idbSet('meta', meta); }
export function touch() { dirty = true; }
/** "Start" på titlen: nulstiller gemmet (meta tæller bare, at det skete). */
export function resetSave() {
  meta.resets++; persistMeta();
  try { localStorage.removeItem(LS_KEY); } catch {}
  idbSet('save', null);
  for (const k of Object.keys(save)) delete save[k];
  Object.assign(save, saveDefaults());
  dirty = true; persist(true);
}
// spilleur
let last = performance.now();
export function tickClock() {
  const now = performance.now();
  if (document.visibilityState === 'visible') save.playMs += now - last;
  last = now;
}
export const playMin = () => save.playMs / 60000;
setInterval(() => { tickClock(); persist(); }, 5000);
addEventListener('beforeunload', () => persist(true));
