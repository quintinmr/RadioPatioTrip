import { useState } from 'react'
import { Pencil, ExternalLink, Ticket, Armchair, Clock } from 'lucide-react'
import { useTrip } from '@/hooks/useTrip'
import { Sheet } from './ui'
import { GoButton } from './GoButton'
import { Attachments } from './Attachments'
import { TransportForm } from './TransportForm'
import { VisitForm } from './VisitForm'
import { TRANSPORT_LABELS, VISIT_LABELS } from '@/lib/labels'
import { fmtDateTime, fmtTime, money } from '@/lib/format'
import type { TimelineEvent } from '@/lib/types'

export function EventDetail({ event, onClose }: { event: TimelineEvent | null; onClose: () => void }) {
  const { trip, memberById } = useTrip()
  const [edit, setEdit] = useState(false)
  if (!event) return null

  if (edit) {
    return event.type === 'transport'
      ? <TransportForm open onClose={() => { setEdit(false); onClose() }} initial={event.data} />
      : <VisitForm open onClose={() => { setEdit(false); onClose() }} initial={event.data} />
  }

  const author = memberById(event.data.created_by)?.display_name

  if (event.type === 'transport') {
    const t = event.data
    const k = TRANSPORT_LABELS[t.kind]
    return (
      <Sheet open onClose={onClose} title={`${k.emoji} ${k.label}${t.code ? ` ${t.code}` : ''}`}>
        <div className="space-y-5">
          <div className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-2xl font-bold">{fmtTime(t.depart_at)}</p>
                <p className="font-medium">{t.from_name}</p>
                <p className="text-xs text-ink-3">{fmtDateTime(t.depart_at)}</p>
              </div>
              <div className="pt-2 text-2xl text-ink-3">→</div>
              <div className="text-right">
                <p className="text-2xl font-bold">{t.arrive_at ? fmtTime(t.arrive_at) : '—'}</p>
                <p className="font-medium">{t.to_name}</p>
                {t.arrive_at && <p className="text-xs text-ink-3">{fmtDateTime(t.arrive_at)}</p>}
              </div>
            </div>
            {t.carrier && <p className="mt-3 text-sm text-ink-2">{t.carrier}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {t.booking_ref && <span className="chip bg-gold/15 text-gold"><Ticket size={12} /> {t.booking_ref}</span>}
              {t.seats && <span className="chip bg-card-2 text-ink-2"><Armchair size={12} /> {t.seats}</span>}
              {t.price != null && <span className="chip bg-card-2 text-ink-2">{money(t.price, t.currency ?? 'EUR')} / persona</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <GoButton place={{ name: t.from_name, lat: t.from_lat, lng: t.from_lng }} mode="transit" label={`Ir a ${t.from_name.split(',')[0]}`} />
            <GoButton place={{ name: t.to_name, lat: t.to_lat, lng: t.to_lng, context: trip.destination }} mode="transit" label={`Ir a ${t.to_name.split(',')[0]}`} />
          </div>
          {t.notes && <p className="whitespace-pre-wrap text-sm text-ink-2">{t.notes}</p>}
          <Attachments tripId={trip.id} refType="transport" refId={t.id} />
          <div className="flex items-center justify-between border-t border-line pt-3 text-xs text-ink-3">
            <span>{author ? `Añadido por ${author}` : ''}</span>
            <button onClick={() => setEdit(true)} className="chip bg-card-2 text-ink"><Pencil size={12} /> Editar</button>
          </div>
        </div>
      </Sheet>
    )
  }

  const v = event.data
  const c = VISIT_LABELS[v.category]
  return (
    <Sheet open onClose={onClose} title={`${c.emoji} ${v.title}`}>
      <div className="space-y-5">
        <div className="card p-4">
          <p className="flex items-center gap-2 text-lg font-bold"><Clock size={18} className="text-gold" /> {fmtTime(v.start_at)}{v.end_at ? ` – ${fmtTime(v.end_at)}` : ''}</p>
          <p className="text-xs text-ink-3">{fmtDateTime(v.start_at)}</p>
          {v.place_name && <p className="mt-2 font-medium">📍 {v.place_name}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="chip bg-card-2 text-ink-2">{c.label}</span>
            {v.ticket_ref && <span className="chip bg-gold/15 text-gold"><Ticket size={12} /> {v.ticket_ref}</span>}
            {v.price != null && <span className="chip bg-card-2 text-ink-2">{money(v.price, v.currency ?? trip.currency)} / persona</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <GoButton place={{ name: v.place_name ?? v.title, lat: v.lat, lng: v.lng, context: trip.destination }} />
          {v.url && <a href={v.url} target="_blank" rel="noopener" className="chip bg-card-2 px-3.5 py-2 text-sm text-ink"><ExternalLink size={14} /> Abrir enlace</a>}
        </div>
        {v.notes && <p className="whitespace-pre-wrap text-sm text-ink-2">{v.notes}</p>}
        <Attachments tripId={trip.id} refType="visit" refId={v.id} />
        <div className="flex items-center justify-between border-t border-line pt-3 text-xs text-ink-3">
          <span>{author ? `Añadido por ${author}` : ''}</span>
          <button onClick={() => setEdit(true)} className="chip bg-card-2 text-ink"><Pencil size={12} /> Editar</button>
        </div>
      </div>
    </Sheet>
  )
}
