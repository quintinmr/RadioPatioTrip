import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Plane, Landmark, Radio } from 'lucide-react'
import { isSameDay, isWithinInterval, parseISO, differenceInMinutes, format } from 'date-fns'
import { useTrip } from '@/hooks/useTrip'
import { useTimeline } from '@/hooks/useTripData'
import { useNow } from '@/hooks/useNow'
import { EmptyState, PageLoader, Sheet } from '@/components/ui'
import { GoButton } from '@/components/GoButton'
import { TransportForm } from '@/components/TransportForm'
import { VisitForm } from '@/components/VisitForm'
import { EventDetail } from '@/components/EventDetail'
import { TRANSPORT_LABELS, VISIT_LABELS } from '@/lib/labels'
import { fmtDay, fmtDayShort, fmtTime, tripDays, daysUntil, money } from '@/lib/format'
import { fetchWeather, weatherEmoji } from '@/lib/external'
import type { TimelineEvent } from '@/lib/types'

export default function TimelinePage() {
  const { trip } = useTrip()
  const { events, loading } = useTimeline(trip.id)
  const now = useNow(15_000)
  const days = useMemo(() => tripDays(trip.start_date, trip.end_date), [trip.start_date, trip.end_date])
  const inTrip = isWithinInterval(now, { start: parseISO(trip.start_date), end: new Date(parseISO(trip.end_date).getTime() + 86400000 - 1) })
  const [selected, setSelected] = useState<Date>(() => (inTrip ? now : days[0]))
  const [add, setAdd] = useState(false)
  const [form, setForm] = useState<'transport' | 'visit' | null>(null)
  const [detail, setDetail] = useState<TimelineEvent | null>(null)

  // Al entrar en el viaje, sigue el día actual automáticamente
  useEffect(() => { if (inTrip) setSelected(now) }, [inTrip, format(now, 'yyyy-MM-dd')]) // eslint-disable-line react-hooks/exhaustive-deps

  const weather = useQuery({
    queryKey: ['weather', trip.id],
    enabled: trip.lat != null && trip.lng != null,
    staleTime: 3 * 60 * 60 * 1000,
    queryFn: () => fetchWeather(trip.lat!, trip.lng!, trip.start_date, trip.end_date),
  })
  const wx = (d: Date) => weather.data?.find((w) => w.date === format(d, 'yyyy-MM-dd'))

  const dayEvents = events.filter((e) => isSameDay(e.start, selected))
  const current = events.find((e) => e.end && e.start <= now && now <= e.end) ?? null
  const next = events.find((e) => e.start > now) ?? null
  const isToday = isSameDay(selected, now)
  const nowLineIndex = isToday ? dayEvents.findIndex((e) => e.start > now) : -1

  if (loading) return <PageLoader />

  return (
    <div className="pb-6">
      <LiveBanner inTrip={inTrip} current={current} next={next} now={now} startDate={trip.start_date} endDate={trip.end_date} onOpen={setDetail} />

      {/* Selector de días */}
      <div className="no-scrollbar sticky top-[57px] z-10 flex gap-2 overflow-x-auto bg-bg/90 px-4 py-3 backdrop-blur">
        {days.map((d, i) => {
          const active = isSameDay(d, selected)
          const today = isSameDay(d, now)
          const w = wx(d)
          const count = events.filter((e) => isSameDay(e.start, d)).length
          return (
            <button key={i} onClick={() => setSelected(d)}
              className={`relative flex w-[64px] shrink-0 flex-col items-center rounded-2xl border px-2 py-2 transition ${active ? 'border-gold bg-gold text-bg' : 'border-line bg-card text-ink-2'}`}>
              <span className="text-[10px] font-semibold uppercase">{fmtDayShort(d).split(' ')[0]}</span>
              <span className="text-xl font-bold leading-tight">{d.getDate()}</span>
              <span className="text-[10px]">{w ? `${weatherEmoji(w.code)} ${Math.round(w.tmax)}°` : `Día ${i + 1}`}</span>
              {count > 0 && <span className={`absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-bold ${active ? 'bg-bg text-gold' : 'bg-gold text-bg'}`}>{count}</span>}
              {today && !active && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-rose" />}
            </button>
          )
        })}
      </div>

      <div className="px-4">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-xl font-bold capitalize">{fmtDay(selected)}</h2>
          {wx(selected) && <span className="text-xs text-ink-2">{weatherEmoji(wx(selected)!.code)} {Math.round(wx(selected)!.tmin)}°–{Math.round(wx(selected)!.tmax)}° · 🌧 {wx(selected)!.rain}%</span>}
        </div>

        {dayEvents.length === 0 ? (
          <EmptyState emoji="🗓️" title="Día libre (de momento)" text="Añade un transporte o una visita para ir llenando el plan." action={<button onClick={() => setAdd(true)} className="btn-primary"><Plus size={16} /> Añadir</button>} />
        ) : (
          <ol className="relative ml-[52px] border-l border-line">
            {dayEvents.map((e, i) => (
              <li key={e.id} className="relative">
                {nowLineIndex === i && <NowLine now={now} />}
                <EventCard e={e} now={now} isCurrent={current?.id === e.id} onClick={() => setDetail(e)} />
              </li>
            ))}
            {nowLineIndex === -1 && isToday && dayEvents.length > 0 && dayEvents[dayEvents.length - 1].start < now && <li className="relative"><NowLine now={now} /></li>}
          </ol>
        )}
      </div>

      <button onClick={() => setAdd(true)} aria-label="Añadir" className="fixed bottom-[calc(76px+env(safe-area-inset-bottom))] right-4 z-30 rounded-full bg-gold p-4 text-bg shadow-lg shadow-gold/30 transition active:scale-95"><Plus size={24} /></button>

      <Sheet open={add} onClose={() => setAdd(false)} title="¿Qué añadimos?">
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => { setAdd(false); setForm('transport') }} className="card flex flex-col items-center gap-2 p-5 hover:border-gold/60"><Plane size={28} className="text-sky" /><span className="font-semibold">Transporte</span><span className="text-xs text-ink-3">Vuelo, tren, bus…</span></button>
          <button onClick={() => { setAdd(false); setForm('visit') }} className="card flex flex-col items-center gap-2 p-5 hover:border-gold/60"><Landmark size={28} className="text-gold" /><span className="font-semibold">Visita</span><span className="text-xs text-ink-3">Monumento, excursión, cena…</span></button>
        </div>
      </Sheet>
      {form === 'transport' && <TransportForm open onClose={() => setForm(null)} />}
      {form === 'visit' && <VisitForm open onClose={() => setForm(null)} preset={{ start_at: (() => { const d = new Date(selected); d.setHours(10, 0, 0, 0); return d.toISOString() })() }} />}
      <EventDetail event={detail} onClose={() => setDetail(null)} />
    </div>
  )
}

function NowLine({ now }: { now: Date }) {
  return (
    <div className="relative my-1 flex items-center">
      <span className="absolute -left-[5px] h-2.5 w-2.5 rounded-full bg-rose pulse-dot" />
      <span className="absolute -left-[52px] w-[44px] text-right text-[11px] font-bold text-rose">{fmtTime(now)}</span>
      <div className="ml-2 h-px flex-1 bg-rose/70" />
      <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-rose">ahora</span>
    </div>
  )
}

function EventCard({ e, now, isCurrent, onClick }: { e: TimelineEvent; now: Date; isCurrent: boolean; onClick: () => void }) {
  const past = (e.end ?? e.start) < now
  const meta = e.type === 'transport' ? TRANSPORT_LABELS[e.data.kind] : VISIT_LABELS[e.data.category]
  const title = e.type === 'transport' ? `${e.data.from_name.split(',')[0]} → ${e.data.to_name.split(',')[0]}` : e.data.title
  const sub = e.type === 'transport' ? [e.data.carrier, e.data.code].filter(Boolean).join(' ') : e.data.place_name
  const place = e.type === 'transport'
    ? { name: e.data.from_name, lat: e.data.from_lat, lng: e.data.from_lng }
    : { name: e.data.place_name ?? e.data.title, lat: e.data.lat, lng: e.data.lng }
  const progress = isCurrent && e.end ? Math.min(100, Math.round(((now.getTime() - e.start.getTime()) / (e.end.getTime() - e.start.getTime())) * 100)) : null
  const price = e.data.price

  return (
    <div className={`fade-in mb-3 ${past && !isCurrent ? 'opacity-55' : ''}`}>
      <span className="absolute -left-[52px] top-3 w-[44px] text-right text-sm font-bold">{fmtTime(e.start)}</span>
      <span className="absolute -left-[9px] top-3.5 grid h-[18px] w-[18px] place-items-center rounded-full border-2 border-bg text-[10px]" style={{ background: meta.color }} />
      <button onClick={onClick} className={`card ml-4 w-[calc(100%-16px)] p-3 text-left transition hover:border-gold/50 ${isCurrent ? 'border-rose/70 shadow-lg shadow-rose/10' : ''}`}>
        <div className="flex items-start gap-3">
          <span className="text-2xl leading-none">{meta.emoji}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{title}</p>
            {sub && <p className="truncate text-xs text-ink-2">{sub}</p>}
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-3">
              <span>{fmtTime(e.start)}{e.end ? ` – ${fmtTime(e.end)}` : ''}</span>
              {price != null && <span className="chip bg-card-2 py-0.5">{money(price, e.data.currency ?? 'GBP')}</span>}
              {isCurrent && <span className="chip bg-rose/15 py-0.5 text-rose"><Radio size={10} /> en curso</span>}
            </div>
          </div>
          {!past && <GoButton place={place} small />}
        </div>
        {progress != null && <div className="mt-2 h-1 overflow-hidden rounded-full bg-line"><div className="h-full bg-rose transition-all" style={{ width: `${progress}%` }} /></div>}
      </button>
    </div>
  )
}

function LiveBanner({ inTrip, current, next, now, startDate, endDate, onOpen }: { inTrip: boolean; current: TimelineEvent | null; next: TimelineEvent | null; now: Date; startDate: string; endDate: string; onOpen: (e: TimelineEvent) => void }) {
  const d = daysUntil(startDate)
  if (!inTrip) {
    if (d > 0) return (
      <div className="mx-4 mt-4 rounded-2xl bg-gradient-to-r from-sky/30 to-plum/20 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-2">Cuenta atrás</p>
        <p className="text-3xl font-extrabold">{d} día{d === 1 ? '' : 's'} <span className="text-base font-medium text-ink-2">para el viaje</span></p>
      </div>
    )
    if (daysUntil(endDate) < 0) return (
      <div className="mx-4 mt-4 rounded-2xl bg-gradient-to-r from-gold/25 to-rose/15 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-2">Viaje terminado</p>
        <p className="text-lg font-bold">Revive los recuerdos en Fotos y Diario 📸</p>
      </div>
    )
    return null
  }
  const label = (e: TimelineEvent) => (e.type === 'transport' ? `${TRANSPORT_LABELS[e.data.kind].emoji} ${e.data.from_name.split(',')[0]} → ${e.data.to_name.split(',')[0]}` : `${VISIT_LABELS[e.data.category].emoji} ${e.data.title}`)
  const mins = next ? differenceInMinutes(next.start, now) : null
  const countdown = mins == null ? '' : mins < 60 ? `en ${mins} min` : mins < 60 * 24 ? `en ${Math.floor(mins / 60)} h ${mins % 60} min` : `en ${Math.round(mins / 60 / 24)} días`
  return (
    <div className="mx-4 mt-4 rounded-2xl border border-rose/40 bg-gradient-to-r from-rose/15 to-bg-2 p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-rose"><span className="h-2 w-2 rounded-full bg-rose pulse-dot" /> En directo · {fmtTime(now)}</p>
      {current ? (
        <button onClick={() => onOpen(current)} className="mt-1 block text-left"><span className="text-xs text-ink-2">Ahora mismo</span><p className="text-lg font-bold leading-tight">{label(current)}</p></button>
      ) : <p className="mt-1 text-sm text-ink-2">Sin nada programado ahora mismo. ¡A improvisar!</p>}
      {next && (
        <button onClick={() => onOpen(next)} className="mt-2 flex w-full items-center justify-between rounded-xl bg-bg/60 px-3 py-2 text-left">
          <span className="min-w-0"><span className="block text-[10px] uppercase text-ink-3">Siguiente</span><span className="block truncate text-sm font-semibold">{label(next)}</span></span>
          <span className="shrink-0 text-sm font-bold text-gold">{countdown}</span>
        </button>
      )}
    </div>
  )
}
