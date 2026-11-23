import { useState, type FormEvent } from 'react'
import { useTrip } from '@/hooks/useTrip'
import { useUpsert, useRemove } from '@/hooks/useTripData'
import { Field, Segmented, Sheet, Spinner, errMsg, toast } from './ui'
import { PlacePicker, type PlaceValue } from './PlacePicker'
import { TRANSPORT_LABELS } from '@/lib/labels'
import { toLocalInput, fromLocalInput } from '@/lib/format'
import type { Transport, TransportKind } from '@/lib/types'

export function TransportForm({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: Transport | null }) {
  const { trip } = useTrip()
  const upsert = useUpsert<Transport>('transports', trip.id)
  const remove = useRemove('transports', trip.id)
  const near = trip.lat != null && trip.lng != null ? { lat: trip.lat, lng: trip.lng } : null

  const [kind, setKind] = useState<TransportKind>(initial?.kind ?? 'flight')
  const [carrier, setCarrier] = useState(initial?.carrier ?? '')
  const [code, setCode] = useState(initial?.code ?? '')
  const [from, setFrom] = useState<PlaceValue>({ name: initial?.from_name ?? '', lat: initial?.from_lat ?? null, lng: initial?.from_lng ?? null })
  const [to, setTo] = useState<PlaceValue>({ name: initial?.to_name ?? '', lat: initial?.to_lat ?? null, lng: initial?.to_lng ?? null })
  const [depart, setDepart] = useState(toLocalInput(initial?.depart_at) || `${trip.start_date}T10:00`)
  const [arrive, setArrive] = useState(toLocalInput(initial?.arrive_at))
  const [ref, setRef] = useState(initial?.booking_ref ?? '')
  const [seats, setSeats] = useState(initial?.seats ?? '')
  const [price, setPrice] = useState(initial?.price?.toString() ?? '')
  const [currency, setCurrency] = useState(initial?.currency ?? 'EUR')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await upsert.mutateAsync({
        ...(initial ? { id: initial.id } : {}),
        kind, carrier: carrier || null, code: code || null,
        from_name: from.name, from_lat: from.lat, from_lng: from.lng,
        to_name: to.name, to_lat: to.lat, to_lng: to.lng,
        depart_at: fromLocalInput(depart)!, arrive_at: fromLocalInput(arrive),
        booking_ref: ref || null, seats: seats || null, price: price ? Number(price) : null, currency, notes: notes || null,
      })
      toast.ok(initial ? 'Transporte actualizado' : 'Transporte añadido'); onClose()
    } catch (err) { toast.err(errMsg(err)) }
  }

  const del = async () => {
    if (!initial || !confirm('¿Eliminar este transporte?')) return
    await remove.mutateAsync(initial.id); onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={initial ? 'Editar transporte' : 'Nuevo transporte'}>
      <form onSubmit={submit} className="space-y-4">
        <Segmented value={kind} onChange={setKind} options={(Object.keys(TRANSPORT_LABELS) as TransportKind[]).map((k) => ({ value: k, label: `${TRANSPORT_LABELS[k].emoji} ${TRANSPORT_LABELS[k].label}` }))} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Compañía"><input className="input" value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="Ryanair, LNER…" /></Field>
          <Field label="Nº vuelo / tren"><input className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="FR1234" /></Field>
        </div>
        <Field label="Origen"><PlacePicker value={from} onChange={setFrom} placeholder="Aeropuerto, estación…" /></Field>
        <Field label="Destino"><PlacePicker value={to} onChange={setTo} near={near} placeholder="Aeropuerto, estación…" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Salida"><input className="input" type="datetime-local" value={depart} onChange={(e) => setDepart(e.target.value)} required /></Field>
          <Field label="Llegada"><input className="input" type="datetime-local" value={arrive} onChange={(e) => setArrive(e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Localizador"><input className="input font-mono uppercase" value={ref} onChange={(e) => setRef(e.target.value)} /></Field>
          <Field label="Asientos"><input className="input" value={seats} onChange={(e) => setSeats(e.target.value)} placeholder="12A, 12B" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Precio (por persona)"><input className="input" type="number" step="0.01" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
          <Field label="Moneda"><select className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>{['EUR', 'GBP', 'USD'].map((c) => <option key={c}>{c}</option>)}</select></Field>
        </div>
        <Field label="Notas"><textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Terminal, puerta, equipaje facturado…" /></Field>
        <div className="flex gap-2">
          {initial && <button type="button" onClick={del} className="btn-danger">Eliminar</button>}
          <button className="btn-primary flex-1" disabled={upsert.isPending}>{upsert.isPending ? <Spinner /> : 'Guardar'}</button>
        </div>
      </form>
    </Sheet>
  )
}
