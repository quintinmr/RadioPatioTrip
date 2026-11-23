/**
 * Melodía de bienvenida al abrir el viaje: unos compases de "The Skye Boat Song",
 * canción tradicional escocesa (dominio público) que Outlander usa como cabecera.
 * Se sintetiza con Web Audio: no hay archivos de audio ni grabaciones con derechos.
 */
const KEY = 'rp:chime' // 'off' para silenciar

export const chimeEnabled = () => { try { return localStorage.getItem(KEY) !== 'off' } catch { return true } }
export const setChimeEnabled = (on: boolean) => { try { localStorage.setItem(KEY, on ? 'on' : 'off') } catch { /* sin storage */ } }

/** ¿Este viaje lleva melodía? (Escocia / Edimburgo) */
export const tripHasChime = (t: { destination: string; country?: string | null }) =>
  /edimburgo|edinburgh|escocia|scotland|skye|highlands|glasgow/i.test(`${t.destination} ${t.country ?? ''}`)

// Notas (Hz) y duración en corcheas, compás 6/8 en Sol mayor.
const N = { D4: 293.66, E4: 329.63, G4: 392.0, A4: 440.0, B4: 493.88, D5: 587.33 }
// "Speed, bonnie boat, like a bird on the wing, onward the sailors cry"
const MELODY: Array<[number, number]> = [
  [N.D4, 1],
  [N.G4, 2], [N.G4, 1], [N.E4, 2], [N.D4, 1],
  [N.G4, 3], [N.G4, 2], [N.B4, 1],
  [N.A4, 2], [N.A4, 1], [N.G4, 2], [N.A4, 1],
  [N.B4, 5],
]
const EIGHTH = 0.3 // segundos por corchea (~ tempo de la serie)

let ctx: AudioContext | null = null

/** Debe llamarse desde un gesto del usuario (clic) por la política de autoplay. */
export function playTripChime(volume = 0.5) {
  if (!chimeEnabled()) return
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    ctx ??= new AC()
    if (ctx.state === 'suspended') void ctx.resume()
    const t0 = ctx.currentTime + 0.05
    const master = ctx.createGain()
    master.gain.value = volume
    master.connect(ctx.destination)

    // Bordón grave (quinta), como una gaita suave
    const total = MELODY.reduce((a, [, d]) => a + d, 0) * EIGHTH
    for (const f of [N.G4 / 2, N.D4]) {
      const o = ctx.createOscillator(); const g = ctx.createGain()
      o.type = 'triangle'; o.frequency.value = f
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.06, t0 + 0.6)
      g.gain.setValueAtTime(0.06, t0 + total - 0.8); g.gain.linearRampToValueAtTime(0, t0 + total + 0.6)
      o.connect(g).connect(master); o.start(t0); o.stop(t0 + total + 0.7)
    }

    // Melodía, timbre tipo flauta/whistle (seno + un poco de 2º armónico)
    let t = t0
    for (const [freq, dur] of MELODY) {
      const d = dur * EIGHTH
      for (const [mult, amp, type] of [[1, 0.5, 'sine'], [2, 0.08, 'sine']] as Array<[number, number, OscillatorType]>) {
        const o = ctx.createOscillator(); const g = ctx.createGain()
        o.type = type; o.frequency.value = freq * mult
        g.gain.setValueAtTime(0, t)
        g.gain.linearRampToValueAtTime(amp, t + 0.04)
        g.gain.setValueAtTime(amp, t + d - 0.08)
        g.gain.linearRampToValueAtTime(0, t + d)
        o.connect(g).connect(master); o.start(t); o.stop(t + d + 0.02)
      }
      t += d
    }
  } catch { /* audio no disponible */ }
}
