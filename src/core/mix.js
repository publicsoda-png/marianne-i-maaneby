// Ét fast mix for hele "Marianne i Måneby". Dette er det ENESTE sted, bus-niveauer og ducking-tal står.
// Tallene er dB RELATIVT til filernes eget niveau: musikken er masteret til −18 LUFS (tools/music/render.py), stemmen til
// −16 LUFS (tools/voice), så 0 betyder "som masteret". Læg aldrig et indholdsniveau oveni her — det er dobbelt-dæmpning,
// og tools/test/audio.mjs fejler, hvis fil-niveau + bus-niveau ender mere end 6 dB under målet.
// Scener sætter ikke selv niveauer. Der er ingen faser (ingen nat, ingen telefon, ingen stilhed): spillet lyder ens hele vejen.
import { setBus, audioCtx } from './audio.js';

/** dB → lineær gain */
export const dB = (x) => Math.pow(10, x / 20);

export const MIX = Object.freeze({
  music: 0,          // som masteret (−18 LUFS)
  voice: 0,          // som masteret (−16 LUFS)
  sfx: -2,           // samplede og syntetiske effekter
  amb: -14,          // baggrundsloops (amb_*, *_loop sendt til 'amb') — skal ligge under alt andet
  duck: -6,          // musikken dykker så meget, mens en stemme taler (udføres i audio.js duckNow — kun dér)
  duckAttack: 0.08,  // tidskonstanter i sekunder
  duckRelease: 0.4,
  target: Object.freeze({ music: -18, voice: -16 }),   // LUFS-mål for filerne; bruges af testen
});
const BUSES = ['music', 'voice', 'sfx', 'amb'];

/** Sæt bus-niveauerne fra MIX. Idempotent og billig; audio.js starter allerede på de samme tal, så kaldet er kun
 *  nødvendigt, hvis noget har pillet ved busserne. Argumenter ignoreres (arv fra forgængerens fase-mix). */
export function applyMix() {
  for (const n of BUSES) setBus(n, dB(MIX[n]));
  return PHASES[0];
}

// --- Arv: fase-API fra forgængeren, beholdt som no-ops så gammel kode ikke knækker. Der er kun én fase. ---
export const PHASES = Object.freeze([Object.freeze({ id: 'fast', music: MIX.music, voice: MIX.voice, sfx: MIX.sfx, amb: [], duck: true })]);
export const currentPhase = () => 'fast';
export const resolvePhase = () => PHASES[0];
export async function stilleMorgen() {}
export async function enterNight() {}

// Fanen i baggrunden: alt lydløst med det samme; tilbage igen når fanen vises.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!audioCtx()) return;
    setBus('master', document.hidden ? 0 : 1, document.hidden ? 0.1 : 0.3);
  });
}
