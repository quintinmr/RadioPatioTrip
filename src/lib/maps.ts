import { Capacitor } from '@capacitor/core'

/**
 * Enlaces profundos a Google Maps (sin API key).
 * En móvil abren la app de Google Maps directamente con la ruta puesta.
 * Doc: https://developers.google.com/maps/documentation/urls/get-started
 */
export type TravelMode = 'walking' | 'transit' | 'driving' | 'bicycling'

export interface Place {
  name?: string | null
  lat?: number | null
  lng?: number | null
  /** Texto de contexto si no hay coordenadas (p.ej. "Edimburgo") */
  context?: string | null
}

function destinationParam(p: Place): string {
  if (p.lat != null && p.lng != null) return `${p.lat},${p.lng}`
  const q = [p.name, p.context].filter(Boolean).join(', ')
  return q
}

/** Ruta desde la ubicación actual del móvil hasta el destino. */
export function directionsUrl(to: Place, mode: TravelMode = 'walking', from?: Place): string {
  const params = new URLSearchParams({ api: '1', destination: destinationParam(to), travelmode: mode })
  if (from) params.set('origin', destinationParam(from))
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

/** Buscar / mostrar un lugar en Google Maps. */
export function searchUrl(p: Place): string {
  const params = new URLSearchParams({ api: '1', query: destinationParam(p) })
  return `https://www.google.com/maps/search/?${params.toString()}`
}

export function openExternal(url: string) {
  // En la app Android (Capacitor) una navegación externa se convierte en un
  // Intent ACTION_VIEW: Android abre directamente la app de Google Maps.
  if (Capacitor.isNativePlatform()) { window.location.href = url; return }
  window.open(url, '_blank', 'noopener')
}

/** Geocodificación gratuita con Nominatim (OpenStreetMap). Uso ligero, con debounce en UI. */
export interface GeoResult { name: string; display: string; lat: number; lng: number; type: string }

export async function geocode(query: string, near?: { lat: number; lng: number }, signal?: AbortSignal): Promise<GeoResult[]> {
  const q = query.trim()
  if (q.length < 3) return []
  const params = new URLSearchParams({ q, format: 'jsonv2', limit: '6', addressdetails: '0', 'accept-language': 'es' })
  if (near) {
    const d = 0.35
    params.set('viewbox', `${near.lng - d},${near.lat + d},${near.lng + d},${near.lat - d}`)
    params.set('bounded', '0')
  }
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, { signal })
  if (!res.ok) return []
  const json = (await res.json()) as Array<{ display_name: string; name?: string; lat: string; lon: string; type: string }>
  return json.map((r) => ({
    name: r.name || r.display_name.split(',')[0],
    display: r.display_name,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
    type: r.type,
  }))
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}
