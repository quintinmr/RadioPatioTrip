import { useSignedUrl } from '@/hooks/useSignedUrl'
import { builtinCover } from '@/lib/covers'
import type { Trip } from '@/lib/types'

/** Imagen de portada del viaje: la subida por el grupo, la incluida por destino, o un degradado. */
export function TripCover({ trip, className = '' }: { trip: Trip; className?: string }) {
  const signed = useSignedUrl('media', trip.cover_path)
  const url = trip.cover_path ? signed : builtinCover(trip)
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-sky/40 via-plum/30 to-bg-2 ${className}`}>
      {url ? <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 grid place-items-center text-6xl opacity-50">🏰</div>}
      <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
    </div>
  )
}
