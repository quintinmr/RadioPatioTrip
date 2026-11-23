import { Navigation } from 'lucide-react'
import { directionsUrl, openExternal, type Place, type TravelMode } from '@/lib/maps'

/** Botón "Cómo llegar": abre Google Maps con la ruta desde donde estás. */
export function GoButton({ place, mode = 'walking', small = false, label = 'Cómo llegar' }: { place: Place; mode?: TravelMode; small?: boolean; label?: string }) {
  const disabled = !place.name && place.lat == null
  return (
    <button type="button" disabled={disabled} onClick={(e) => { e.stopPropagation(); openExternal(directionsUrl(place, mode)) }}
      className={`inline-flex items-center gap-1.5 rounded-full bg-sky/15 font-semibold text-sky hover:bg-sky/25 disabled:opacity-40 ${small ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-2 text-sm'}`}>
      <Navigation size={small ? 12 : 16} /> {label}
    </button>
  )
}
