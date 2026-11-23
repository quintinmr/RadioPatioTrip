import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Settings, Ticket, CalendarDays, MapPin } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Avatar, EmptyState, Field, PageLoader, Sheet, Spinner, errMsg, toast } from '@/components/ui'
import { PlacePicker, type PlaceValue } from '@/components/PlacePicker'
import { fmtDate, daysUntil } from '@/lib/format'
import type { Trip } from '@/lib/types'

export default function TripsPage() {
  const { user, profile } = useAuth()
  const qc = useQueryClient()
  const [create, setCreate] = useState(false)
  const [join, setJoin] = useState(false)

  const trips = useQuery({
    queryKey: ['trips', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('trips').select('*').order('start_date', { ascending: false })
      if (error) throw error
      return data as Trip[]
    },
  })

  const refresh = () => qc.invalidateQueries({ queryKey: ['trips'] })

  return (
    <div className="safe-top safe-bottom mx-auto max-w-lg px-4 pb-10">
      <header className="flex items-center justify-between py-5">
        <div>
          <p className="text-sm text-ink-2">Hola, {profile?.display_name ?? '…'} 👋</p>
          <h1 className="text-3xl font-extrabold">Vuestros viajes</h1>
        </div>
        <Link to="/ajustes" className="flex items-center gap-2 rounded-full p-1 pr-1 hover:bg-card">
          <Avatar name={profile?.display_name ?? '?'} path={profile?.avatar_path} size={40} />
          <Settings size={18} className="text-ink-2" />
        </Link>
      </header>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <button onClick={() => setCreate(true)} className="btn-primary"><Plus size={18} /> Nuevo viaje</button>
        <button onClick={() => setJoin(true)} className="btn-ghost"><Ticket size={18} /> Tengo un código</button>
      </div>

      {trips.isLoading ? <PageLoader /> : trips.error ? (
        <p className="text-rose">{errMsg(trips.error)}</p>
      ) : trips.data!.length === 0 ? (
        <EmptyState emoji="🧳" title="Todavía no hay viajes" text="Crea el viaje a Edimburgo o únete con el código que te pase un amigo." />
      ) : (
        <ul className="space-y-3">
          {trips.data!.map((t) => <TripCard key={t.id} trip={t} />)}
        </ul>
      )}

      <CreateTripSheet open={create} onClose={() => setCreate(false)} onDone={refresh} />
      <JoinSheet open={join} onClose={() => setJoin(false)} onDone={refresh} />
    </div>
  )
}

function TripCard({ trip }: { trip: Trip }) {
  const d = daysUntil(trip.start_date)
  const ended = daysUntil(trip.end_date) < 0
  const status = ended ? 'Terminado · recuerdos' : d > 0 ? `Faltan ${d} día${d === 1 ? '' : 's'}` : '¡En marcha!'
  return (
    <li>
      <Link to={`/viaje/${trip.id}`} className="card fade-in block overflow-hidden transition hover:border-gold/50">
        <div className="relative h-28 bg-gradient-to-br from-sky/40 via-plum/30 to-bg-2">
          <div className="absolute inset-0 grid place-items-center text-6xl opacity-50">🏰</div>
          <span className={`chip absolute left-3 top-3 ${ended ? 'bg-bg/70 text-ink-2' : d > 0 ? 'bg-gold text-bg' : 'bg-rose text-bg'}`}>{status}</span>
        </div>
        <div className="p-4">
          <h2 className="text-xl font-bold">{trip.name}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-2"><MapPin size={14} /> {trip.destination}{trip.country ? `, ${trip.country}` : ''}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-2"><CalendarDays size={14} /> {fmtDate(trip.start_date)} → {fmtDate(trip.end_date)}</p>
        </div>
      </Link>
    </li>
  )
}

function CreateTripSheet({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState('Edimburgo 2026')
  const [place, setPlace] = useState<PlaceValue>({ name: 'Edimburgo', lat: 55.9533, lng: -3.1883 })
  const [country, setCountry] = useState('Escocia')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [currency, setCurrency] = useState('GBP')
  const [desc, setDesc] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true)
    try {
      const { error } = await supabase.from('trips').insert({
        name, destination: place.name, country, lat: place.lat, lng: place.lng,
        start_date: start, end_date: end, currency, description: desc || null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
      if (error) throw error
      toast.ok('¡Viaje creado!'); onDone(); onClose()
    } catch (err) { toast.err(errMsg(err)) } finally { setBusy(false) }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Nuevo viaje">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nombre del viaje"><input className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} /></Field>
        <Field label="Destino"><PlacePicker value={place} onChange={setPlace} placeholder="Ciudad" /></Field>
        <Field label="País"><input className="input" value={country} onChange={(e) => setCountry(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Inicio"><input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} required /></Field>
          <Field label="Fin"><input className="input" type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} required /></Field>
        </div>
        <Field label="Moneda del destino" hint="Para gastos y precios (GBP para Escocia)">
          <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {['GBP', 'EUR', 'USD', 'CHF', 'DKK', 'SEK', 'NOK', 'CZK', 'PLN', 'JPY'].map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Descripción (opcional)"><textarea className="input" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
        <button className="btn-primary w-full" disabled={busy}>{busy ? <Spinner /> : 'Crear viaje'}</button>
      </form>
    </Sheet>
  )
}

function JoinSheet({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true)
    try {
      const { error } = await supabase.rpc('join_trip_by_code', { code })
      if (error) throw error
      toast.ok('¡Te has unido al viaje!'); onDone(); onClose()
    } catch (err) { toast.err(errMsg(err)) } finally { setBusy(false) }
  }
  return (
    <Sheet open={open} onClose={onClose} title="Unirse a un viaje">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Código de invitación" hint="Lo encontrará quien creó el viaje en la pestaña Grupo">
          <input className="input text-center font-mono text-xl uppercase tracking-[0.3em]" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={8} required autoCapitalize="characters" />
        </Field>
        <button className="btn-primary w-full" disabled={busy}>{busy ? <Spinner /> : 'Unirme'}</button>
      </form>
    </Sheet>
  )
}
