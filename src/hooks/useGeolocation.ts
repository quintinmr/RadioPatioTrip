import { useCallback, useState } from 'react'

/**
 * Ubicación del dispositivo SOLO en memoria del cliente: nunca se envía a
 * Supabase. Se usa para centrar el mapa y calcular distancias.
 */
export function useGeolocation() {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const locate = useCallback(() => {
    if (!navigator.geolocation) { setError('Geolocalización no disponible'); return }
    setBusy(true)
    navigator.geolocation.getCurrentPosition(
      (p) => { setPos({ lat: p.coords.latitude, lng: p.coords.longitude }); setBusy(false); setError(null) },
      (e) => { setError(e.message); setBusy(false) },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }, [])
  return { pos, error, busy, locate }
}
