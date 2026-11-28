import type { Trip } from './types'

/** Portada incluida en la app según el destino (si el viaje no tiene foto propia). */
export function builtinCover(t: Pick<Trip, 'destination' | 'country'>): string | null {
  const s = `${t.destination} ${t.country ?? ''}`
  if (/edimburgo|edinburgh/i.test(s)) return `${import.meta.env.BASE_URL}covers/edinburgh.jpg`
  return null
}
