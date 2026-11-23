import { useState, type FormEvent } from 'react'
import { useTrip } from '@/hooks/useTrip'
import { useUpsert, useRemove } from '@/hooks/useTripData'
import { Field, Segmented, Sheet, Spinner, errMsg, toast } from './ui'
import { PlacePicker, type PlaceValue } from './PlacePicker'
import { VISIT_LABELS } from '@/lib/labels'
import { toLocalInput, fromLocalInput } from '@/lib/format'
import type { Visit, VisitCategory } from '@/lib/types'

export function VisitForm({ open, onClose, initial, preset }: { open: boolean; onClose: () => void; initial?: Visit | null; preset?: Partial<Visit> }) {
  const { trip } = useTrip()
  const upsert = useUpsert<Visit>('visits', trip.id)
  const remove = useRemove('visits', trip.id)
  const near = trip.lat != null && trip.lng != null ? { lat: trip.lat, lng: trip.lng } : null
  const base = initial ?? preset

  const [title, setTitle] = useState(base?.title ?? '')
  const [category, setCategory] = useState<VisitCategory>(base?.category ?? 'monument')
  const [place, setPlace] = useState<PlaceValue>({ name: base?.place_name ?? '', lat: base?.lat ?? null, lng: base?.lng ?? null })
  const [start, setStart] = useState(toLocalInput(base?.start_at) || `${trip.start_date}T10:00`)
  const [end, setEnd] = useState(toLocalInput(base?.end_at))
  const [ticket, setTicket] = useState(base?.ticket_ref ?? '')
  const [price, setPrice] = useState(base?.price?.toString() ?? '')
  const [currency, setCurrency] = useState(base?.currency ?? trip.currency)
  const [url, setUrl] = useState(base?.url ?? '')
  const [notes, setNotes] = useState(base?.notes ?? '')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await upsert.mutateAsync({
        ...(initial ? { id: initial.id } : {}),
        title, category, place_name: place.name || null, lat: place.lat, lng: place.lng,
        start_at: fromLocalInput(start)!, end_at: fromLocalInput(end),
        ticket_ref: ticket || null, price: price ? Number(price) : null, currency, url: url || null, notes: notes || null,
      })
      toast.ok(initial ? 'Visita actualizada' : 'Visita añadida'); onClose()
    } catch (err) { toast.err(errMsg(err)) }
  }
  const del = async () => {
    if (!initial || !confirm('¿Eliminar esta visita?')) return
    await remove.mutateAsync(initial.id); onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={initial ? 'Editar visita' : 'Nueva visita'}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Título"><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Castillo de Edimburgo" /></Field>
        <Segmented value={category} onChange={setCategory} options={(Object.keys(VISIT_LABELS) as VisitCategory[]).map((k) => ({ value: k, label: `${VISIT_LABELS[k].emoji} ${VISIT_LABELS[k].label}` }))} />
        <Field label="Lugar"><PlacePicker value={place} onChange={setPlace} near={near} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Inicio"><input className="input" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required /></Field>
          <Field label="Fin"><input className="input" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nº entrada / reserva"><input className="input font-mono" value={ticket} onChange={(e) => setTicket(e.target.value)} /></Field>
          <Field label="Precio (por persona)"><div className="flex gap-1"><input className="input" type="number" step="0.01" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} /><select className="input w-24" value={currency} onChange={(e) => setCurrency(e.target.value)}>{['GBP', 'EUR', 'USD'].map((c) => <option key={c}>{c}</option>)}</select></div></Field>
        </div>
        <Field label="Web / enlace de la entrada"><input className="input" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" /></Field>
        <Field label="Notas"><textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Punto de encuentro, qué llevar…" /></Field>
        <div className="flex gap-2">
          {initial && <button type="button" onClick={del} className="btn-danger">Eliminar</button>}
          <button className="btn-primary flex-1" disabled={upsert.isPending}>{upsert.isPending ? <Spinner /> : 'Guardar'}</button>
        </div>
      </form>
    </Sheet>
  )
}
