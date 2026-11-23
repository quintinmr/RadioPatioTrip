import { useEffect, useRef, useState } from 'react'
import { MapPin, Search, X } from 'lucide-react'
import { geocode, type GeoResult } from '@/lib/maps'
import { Spinner } from './ui'

export interface PlaceValue { name: string; lat: number | null; lng: number | null }

/**
 * Buscador de lugares (Nominatim/OSM). Devuelve nombre + coordenadas para que
 * luego "Cómo llegar" abra Google Maps con la ruta ya puesta.
 */
export function PlacePicker({ value, onChange, near, placeholder = 'Buscar lugar…' }: {
  value: PlaceValue; onChange: (v: PlaceValue) => void; near?: { lat: number; lng: number } | null; placeholder?: string
}) {
  const [q, setQ] = useState(value.name)
  const [results, setResults] = useState<GeoResult[]>([])
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)
  const abort = useRef<AbortController | null>(null)

  useEffect(() => { setQ(value.name) }, [value.name])

  useEffect(() => {
    if (!open || q.trim().length < 3 || q === value.name) { setResults([]); return }
    abort.current?.abort()
    const ctrl = new AbortController()
    abort.current = ctrl
    const t = setTimeout(async () => {
      setBusy(true)
      try { setResults(await geocode(q, near ?? undefined, ctrl.signal)) } catch { /* abortado */ } finally { setBusy(false) }
    }, 450)
    return () => clearTimeout(t)
  }, [q, open, near, value.name])

  return (
    <div className="relative">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
        <input className="input pl-9 pr-9" placeholder={placeholder} value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); onChange({ name: e.target.value, lat: null, lng: null }) }}
          onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3">
          {busy ? <Spinner className="h-4 w-4" /> : value.lat != null ? <MapPin size={16} className="text-moss" /> : q ? <button type="button" onClick={() => { setQ(''); onChange({ name: '', lat: null, lng: null }) }}><X size={16} /></button> : null}
        </div>
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-line bg-card shadow-xl">
          {results.map((r, i) => (
            <li key={i}>
              <button type="button" className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-line"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onChange({ name: r.name, lat: r.lat, lng: r.lng }); setQ(r.name); setOpen(false); setResults([]) }}>
                <MapPin size={16} className="mt-0.5 shrink-0 text-gold" />
                <span className="min-w-0"><span className="block truncate text-sm font-medium">{r.name}</span><span className="block truncate text-xs text-ink-3">{r.display}</span></span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {value.lat == null && q.length > 0 && !busy && (
        <p className="mt-1 text-xs text-ink-3">Elige una sugerencia para guardar coordenadas (así la ruta en Google Maps será exacta).</p>
      )}
    </div>
  )
}
