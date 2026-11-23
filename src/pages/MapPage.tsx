import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet'
import L from 'leaflet'
import { Search, LocateFixed, X, Plus, Navigation, Footprints, Bus, Car } from 'lucide-react'
import { useTrip } from '@/hooks/useTrip'
import { useTransports, useVisits, useDishes } from '@/hooks/useTripData'
import { useGeolocation } from '@/hooks/useGeolocation'
import { geocode, directionsUrl, openExternal, haversineKm, type GeoResult, type TravelMode } from '@/lib/maps'
import { TRANSPORT_LABELS, VISIT_LABELS } from '@/lib/labels'
import { fmtDateTime } from '@/lib/format'
import { Spinner } from '@/components/ui'
import { VisitForm } from '@/components/VisitForm'
import type { Visit } from '@/lib/types'

const EDINBURGH = { lat: 55.9533, lng: -3.1883 }

interface Pin { id: string; lat: number; lng: number; emoji: string; color: string; title: string; sub?: string; kind: 'visit' | 'transport' | 'dish' }

function pinIcon(emoji: string, color: string) {
  return L.divIcon({ className: '', html: `<div class="marker-pin" style="background:${color}"><span style="font-size:16px">${emoji}</span></div>`, iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -30] })
}

function FlyTo({ target }: { target: { lat: number; lng: number; zoom?: number } | null }) {
  const map = useMap()
  useEffect(() => { if (target) map.flyTo([target.lat, target.lng], target.zoom ?? 16, { duration: 0.8 }) }, [target, map])
  return null
}

export default function MapPage() {
  const { trip } = useTrip()
  const transports = useTransports(trip.id)
  const visits = useVisits(trip.id)
  const dishes = useDishes(trip.id)
  const geo = useGeolocation()
  const center = trip.lat != null && trip.lng != null ? { lat: trip.lat, lng: trip.lng } : EDINBURGH

  const [q, setQ] = useState('')
  const [results, setResults] = useState<GeoResult[]>([])
  const [busy, setBusy] = useState(false)
  const [picked, setPicked] = useState<GeoResult | null>(null)
  const [fly, setFly] = useState<{ lat: number; lng: number; zoom?: number } | null>(null)
  const [mode, setMode] = useState<TravelMode>('walking')
  const [filter, setFilter] = useState<'all' | 'visit' | 'transport' | 'dish'>('all')
  const [newVisit, setNewVisit] = useState<Partial<Visit> | null>(null)
  const abort = useRef<AbortController | null>(null)

  useEffect(() => {
    if (q.trim().length < 3) { setResults([]); return }
    abort.current?.abort()
    const ctrl = new AbortController(); abort.current = ctrl
    const t = setTimeout(async () => {
      setBusy(true)
      try { setResults(await geocode(q, center, ctrl.signal)) } catch { /* abort */ } finally { setBusy(false) }
    }, 450)
    return () => clearTimeout(t)
  }, [q]) // eslint-disable-line react-hooks/exhaustive-deps

  const pins = useMemo<Pin[]>(() => {
    const out: Pin[] = []
    for (const v of visits.data ?? []) if (v.lat != null && v.lng != null) out.push({ id: v.id, lat: v.lat, lng: v.lng, emoji: VISIT_LABELS[v.category].emoji, color: VISIT_LABELS[v.category].color, title: v.title, sub: fmtDateTime(v.start_at), kind: 'visit' })
    for (const t of transports.data ?? []) {
      const k = TRANSPORT_LABELS[t.kind]
      if (t.from_lat != null && t.from_lng != null) out.push({ id: t.id + 'f', lat: t.from_lat, lng: t.from_lng, emoji: k.emoji, color: k.color, title: `Salida: ${t.from_name}`, sub: fmtDateTime(t.depart_at), kind: 'transport' })
      if (t.to_lat != null && t.to_lng != null) out.push({ id: t.id + 't', lat: t.to_lat, lng: t.to_lng, emoji: k.emoji, color: k.color, title: `Llegada: ${t.to_name}`, sub: t.arrive_at ? fmtDateTime(t.arrive_at) : undefined, kind: 'transport' })
    }
    for (const d of dishes.data ?? []) if (d.lat != null && d.lng != null) out.push({ id: d.id, lat: d.lat, lng: d.lng, emoji: '🍽️', color: 'var(--color-rose)', title: d.name, sub: d.where_to_try ?? undefined, kind: 'dish' })
    return out.filter((p) => filter === 'all' || p.kind === filter)
  }, [visits.data, transports.data, dishes.data, filter])

  const go = (p: { name: string; lat: number; lng: number }) => openExternal(directionsUrl({ name: p.name, lat: p.lat, lng: p.lng }, mode))

  const pick = (r: GeoResult) => { setPicked(r); setResults([]); setQ(r.name); setFly({ lat: r.lat, lng: r.lng, zoom: 16 }) }

  return (
    <div className="relative h-[calc(100dvh-57px-72px-env(safe-area-inset-top)-env(safe-area-inset-bottom))]">
      <MapContainer center={[center.lat, center.lng]} zoom={13} className="h-full w-full" zoomControl={false}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>' url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        <FlyTo target={fly} />
        {pins.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={pinIcon(p.emoji, p.color)}>
            <Popup>
              <p className="font-semibold">{p.title}</p>
              {p.sub && <p className="text-xs text-ink-2">{p.sub}</p>}
              {geo.pos && <p className="text-xs text-ink-3">a {haversineKm(geo.pos, p).toFixed(1)} km</p>}
              <button onClick={() => go({ name: p.title, lat: p.lat, lng: p.lng })} className="mt-2 inline-flex items-center gap-1 rounded-full bg-sky px-3 py-1.5 text-xs font-semibold text-bg"><Navigation size={12} /> Ruta en Google Maps</button>
            </Popup>
          </Marker>
        ))}
        {picked && <Marker position={[picked.lat, picked.lng]} icon={pinIcon('⭐', 'var(--color-gold)')} />}
        {geo.pos && <CircleMarker center={[geo.pos.lat, geo.pos.lng]} radius={8} pathOptions={{ color: '#fff', weight: 2, fillColor: '#5aa9ff', fillOpacity: 1 }} />}
      </MapContainer>

      {/* Buscador */}
      <div className="absolute inset-x-3 top-3 z-[1000]">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <input className="input border-line/80 bg-bg/95 pl-9 pr-9 shadow-xl" placeholder="¿A dónde vamos? (p. ej. Arthur's Seat)" value={q} onChange={(e) => { setQ(e.target.value); setPicked(null) }} />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3">{busy ? <Spinner className="h-4 w-4" /> : q && <button onClick={() => { setQ(''); setPicked(null); setResults([]) }}><X size={16} /></button>}</div>
        </div>
        {results.length > 0 && (
          <ul className="mt-1 max-h-64 overflow-auto rounded-xl border border-line bg-bg/95 shadow-xl backdrop-blur">
            {results.map((r, i) => (
              <li key={i}><button onClick={() => pick(r)} className="flex w-full flex-col px-3 py-2 text-left hover:bg-card"><span className="text-sm font-medium">{r.name}</span><span className="truncate text-xs text-ink-3">{r.display}</span></button></li>
            ))}
          </ul>
        )}
        <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto">
          {([['all', 'Todo'], ['visit', '🏰 Visitas'], ['transport', '✈️ Transportes'], ['dish', '🍽️ Comida']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} className={`chip shrink-0 shadow ${filter === k ? 'bg-gold text-bg' : 'bg-bg/90 text-ink-2'}`}>{l}</button>
          ))}
        </div>
      </div>

      <button onClick={() => { geo.locate(); if (geo.pos) setFly({ ...geo.pos, zoom: 15 }) }} aria-label="Mi ubicación"
        className="absolute right-3 top-[108px] z-[1000] rounded-full bg-bg/95 p-3 text-sky shadow-xl">{geo.busy ? <Spinner className="h-5 w-5" /> : <LocateFixed size={20} />}</button>

      {/* Tarjeta del lugar elegido: ruta directa en Google Maps */}
      {picked && (
        <div className="fade-in absolute inset-x-3 bottom-3 z-[1000] rounded-2xl border border-line bg-bg/95 p-4 shadow-2xl backdrop-blur">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0"><p className="truncate font-bold">{picked.name}</p><p className="truncate text-xs text-ink-3">{picked.display}</p>{geo.pos && <p className="text-xs text-ink-2">a {haversineKm(geo.pos, picked).toFixed(1)} km de ti</p>}</div>
            <button onClick={() => setPicked(null)} className="text-ink-3"><X size={18} /></button>
          </div>
          <div className="mt-3 flex gap-1 rounded-xl bg-card p-1">
            {([['walking', Footprints, 'A pie'], ['transit', Bus, 'Transporte'], ['driving', Car, 'Coche']] as const).map(([m, Icon, l]) => (
              <button key={m} onClick={() => setMode(m)} className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold ${mode === m ? 'bg-gold text-bg' : 'text-ink-2'}`}><Icon size={14} /> {l}</button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => go(picked)} className="btn-primary flex-1"><Navigation size={16} /> Ir ahora con Google Maps</button>
            <button onClick={() => setNewVisit({ title: picked.name, place_name: picked.name, lat: picked.lat, lng: picked.lng })} className="btn-ghost" aria-label="Guardar como visita"><Plus size={18} /></button>
          </div>
        </div>
      )}
      {newVisit && <VisitForm open onClose={() => setNewVisit(null)} preset={newVisit} />}
    </div>
  )
}
