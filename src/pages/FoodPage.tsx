import { useRef, useState, type FormEvent } from 'react'
import { Plus, Star, Camera, Pencil } from 'lucide-react'
import { useTrip } from '@/hooks/useTrip'
import { useAuth } from '@/hooks/useAuth'
import { useDishes, useUpsert, useRemove } from '@/hooks/useTripData'
import { useQueryClient } from '@tanstack/react-query'
import { useSignedUrl } from '@/hooks/useSignedUrl'
import { supabase } from '@/lib/supabase'
import { uploadToBucket } from '@/lib/storage'
import { compressImage } from '@/lib/images'
import { DISH_LABELS, DISH_ORDER } from '@/lib/labels'
import { money } from '@/lib/format'
import { EmptyState, Field, PageLoader, Segmented, Sheet, Spinner, Avatar, errMsg, toast } from '@/components/ui'
import { PlacePicker, type PlaceValue } from '@/components/PlacePicker'
import { GoButton } from '@/components/GoButton'
import type { Dish, DishCategory } from '@/lib/types'

const STARTER_DISHES: Array<Pick<Dish, 'name' | 'category' | 'description'>> = [
  { name: 'Haggis, neeps & tatties', category: 'main', description: 'El plato nacional: haggis con puré de nabo y patata. Pídelo con salsa de whisky.' },
  { name: 'Full Scottish breakfast', category: 'breakfast', description: 'Huevos, bacon, salchicha, black pudding, tattie scone, judías y tomate.' },
  { name: 'Cullen skink', category: 'starter', description: 'Sopa cremosa de eglefino ahumado, patata y cebolla. Un clásico de la costa.' },
  { name: 'Fish & chips', category: 'main', description: 'Con "salt and sauce", como se pide en Edimburgo.' },
  { name: 'Cranachan', category: 'dessert', description: 'Nata, avena tostada, frambuesas, miel y whisky.' },
  { name: 'Sticky toffee pudding', category: 'dessert', description: 'Bizcocho de dátiles bañado en toffee caliente.' },
  { name: 'Scotch pie', category: 'snack', description: 'Empanada individual de carne. Perfecta para el camino.' },
  { name: 'Whisky de malta', category: 'drink', description: 'Pide una cata de tres regiones: Speyside, Highlands e Islay.' },
  { name: 'Irn-Bru', category: 'drink', description: 'El refresco naranja "más escocés que el whisky".' },
]

export default function FoodPage() {
  const { trip } = useTrip()
  const dishes = useDishes(trip.id)
  const [form, setForm] = useState<Dish | 'new' | null>(null)
  const [rate, setRate] = useState<Dish | null>(null)
  const upsert = useUpsert<Dish>('dishes', trip.id)

  const seed = async () => {
    try {
      await Promise.all(STARTER_DISHES.map((d) => upsert.mutateAsync({ ...d, currency: trip.currency })))
      toast.ok('Carta escocesa cargada')
    } catch (e) { toast.err(errMsg(e)) }
  }

  if (dishes.isLoading) return <PageLoader />
  const list = dishes.data ?? []

  return (
    <div className="px-4 pb-6 pt-4">
      <div className="mb-4 rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 to-transparent p-4 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-gold">La carta de</p>
        <h2 className="text-2xl font-extrabold">{trip.destination}</h2>
        <p className="mt-1 text-xs text-ink-2">Lo típico que hay que probar · puntúa cada plato cuando lo pruebes</p>
      </div>

      {list.length === 0 ? (
        <EmptyState emoji="🍽️" title="La carta está vacía" text="Añade platos típicos o carga una carta escocesa de ejemplo." action={<div className="flex gap-2"><button onClick={seed} className="btn-ghost" disabled={upsert.isPending}>Cargar carta escocesa</button><button onClick={() => setForm('new')} className="btn-primary"><Plus size={16} /> Plato</button></div>} />
      ) : DISH_ORDER.filter((c) => list.some((d) => d.category === c)).map((c) => (
        <section key={c} className="mb-6">
          <h3 className="mb-2 flex items-center gap-2 border-b border-line pb-1 text-lg font-bold"><span>{DISH_LABELS[c].emoji}</span> {DISH_LABELS[c].label}</h3>
          <ul className="space-y-3">
            {list.filter((d) => d.category === c).map((d) => <DishCard key={d.id} d={d} onEdit={() => setForm(d)} onRate={() => setRate(d)} />)}
          </ul>
        </section>
      ))}

      {list.length > 0 && <button onClick={() => setForm('new')} aria-label="Añadir plato" className="fixed bottom-[calc(76px+env(safe-area-inset-bottom))] right-4 z-30 rounded-full bg-gold p-4 text-bg shadow-lg shadow-gold/30 active:scale-95"><Plus size={24} /></button>}
      {form && <DishForm open onClose={() => setForm(null)} initial={form === 'new' ? null : form} />}
      {rate && <RateSheet d={rate} onClose={() => setRate(null)} />}
    </div>
  )
}

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return <span className="inline-flex gap-0.5">{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={size} className={i <= Math.round(value) ? 'fill-gold text-gold' : 'text-line'} />)}</span>
}

function DishCard({ d, onEdit, onRate }: { d: Dish; onEdit: () => void; onRate: () => void }) {
  const { trip, memberById } = useTrip()
  const { user } = useAuth()
  const url = useSignedUrl('media', d.photo_path)
  const ratings = d.dish_ratings ?? []
  const avg = ratings.length ? ratings.reduce((a, r) => a + r.rating, 0) / ratings.length : 0
  const mine = ratings.find((r) => r.user_id === user?.id)
  return (
    <li className="card fade-in overflow-hidden">
      <div className="flex">
        <button onClick={onEdit} className="relative h-28 w-28 shrink-0 bg-card-2">
          {url ? <img src={url} alt={d.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-4xl opacity-60">{DISH_LABELS[d.category].emoji}</div>}
        </button>
        <div className="min-w-0 flex-1 p-3">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-bold leading-tight">{d.name}</h4>
            {d.typical_price != null && <span className="shrink-0 text-sm font-semibold text-gold">{money(d.typical_price, d.currency ?? trip.currency)}</span>}
          </div>
          {d.description && <p className="mt-0.5 line-clamp-2 text-xs text-ink-2">{d.description}</p>}
          {d.where_to_try && <p className="mt-1 truncate text-xs text-ink-3">📍 {d.where_to_try}</p>}
          <div className="mt-2 flex items-center justify-between gap-2">
            <button onClick={onRate} className="flex items-center gap-1.5 text-xs"><Stars value={avg} /><span className="text-ink-3">{ratings.length ? `${avg.toFixed(1)} · ${ratings.length}` : 'sin probar'}</span></button>
            <div className="flex items-center gap-1">
              {d.where_to_try && <GoButton place={{ name: d.where_to_try, lat: d.lat, lng: d.lng, context: trip.destination }} small label="Ir" />}
              <button onClick={onRate} className={`chip ${mine ? 'bg-moss/15 text-moss' : 'bg-gold/15 text-gold'}`}>{mine ? '✓ Probado' : 'Lo probé'}</button>
            </div>
          </div>
        </div>
      </div>
      {ratings.length > 0 && (
        <div className="flex items-center gap-1 border-t border-line px-3 py-1.5">
          {ratings.map((r) => { const p = memberById(r.user_id); return <Avatar key={r.user_id} name={p?.display_name ?? '?'} path={p?.avatar_path} size={20} /> })}
          <span className="ml-1 text-[11px] text-ink-3">{ratings.map((r) => r.comment).filter(Boolean).slice(0, 1).map((c) => `"${c}"`)}</span>
        </div>
      )}
    </li>
  )
}

function DishForm({ open, onClose, initial }: { open: boolean; onClose: () => void; initial: Dish | null }) {
  const { trip } = useTrip()
  const upsert = useUpsert<Dish>('dishes', trip.id)
  const remove = useRemove('dishes', trip.id)
  const near = trip.lat != null && trip.lng != null ? { lat: trip.lat, lng: trip.lng } : null
  const [name, setName] = useState(initial?.name ?? '')
  const [category, setCategory] = useState<DishCategory>(initial?.category ?? 'main')
  const [desc, setDesc] = useState(initial?.description ?? '')
  const [price, setPrice] = useState(initial?.typical_price?.toString() ?? '')
  const [place, setPlace] = useState<PlaceValue>({ name: initial?.where_to_try ?? '', lat: initial?.lat ?? null, lng: initial?.lng ?? null })
  const [photo, setPhoto] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true)
    try {
      let photo_path = initial?.photo_path ?? null
      if (photo) {
        photo_path = `${trip.id}/dish-${crypto.randomUUID()}.jpg`
        await uploadToBucket('media', photo_path, await compressImage(photo, 1200), 'image/jpeg')
      }
      await upsert.mutateAsync({ ...(initial ? { id: initial.id } : {}), name, category, description: desc || null, typical_price: price ? Number(price) : null, currency: trip.currency, where_to_try: place.name || null, lat: place.lat, lng: place.lng, photo_path })
      toast.ok('Plato guardado'); onClose()
    } catch (err) { toast.err(errMsg(err)) } finally { setBusy(false) }
  }
  const del = async () => { if (initial && confirm('¿Quitar este plato de la carta?')) { await remove.mutateAsync(initial.id); onClose() } }

  return (
    <Sheet open={open} onClose={onClose} title={initial ? 'Editar plato' : 'Nuevo plato típico'}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nombre"><input className="input" value={name} onChange={(e) => setName(e.target.value)} required /></Field>
        <Segmented value={category} onChange={setCategory} options={DISH_ORDER.map((k) => ({ value: k, label: `${DISH_LABELS[k].emoji} ${DISH_LABELS[k].label}` }))} />
        <Field label="Descripción"><textarea className="input" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
        <Field label={`Precio orientativo (${trip.currency})`}><input className="input" type="number" step="0.01" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
        <Field label="Dónde probarlo"><PlacePicker value={place} onChange={setPlace} near={near} placeholder="Restaurante, pub…" /></Field>
        <div>
          <span className="label">Foto</span>
          <button type="button" onClick={() => fileRef.current?.click()} className="btn-ghost w-full"><Camera size={16} /> {photo ? photo.name : initial?.photo_path ? 'Cambiar foto' : 'Añadir foto'}</button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
        </div>
        <div className="flex gap-2">
          {initial && <button type="button" onClick={del} className="btn-danger">Quitar</button>}
          <button className="btn-primary flex-1" disabled={busy}>{busy ? <Spinner /> : 'Guardar'}</button>
        </div>
      </form>
    </Sheet>
  )
}

function RateSheet({ d, onClose }: { d: Dish; onClose: () => void }) {
  const { trip } = useTrip()
  const { user } = useAuth()
  const qc = useQueryClient()
  const mine = d.dish_ratings?.find((r) => r.user_id === user?.id)
  const [rating, setRating] = useState(mine?.rating ?? 0)
  const [comment, setComment] = useState(mine?.comment ?? '')
  const [busy, setBusy] = useState(false)
  const save = async () => {
    if (!rating) return toast.err('Pon una puntuación')
    setBusy(true)
    const { error } = await supabase.from('dish_ratings').upsert({ dish_id: d.id, user_id: user!.id, rating, comment: comment || null, tried_at: new Date().toISOString() })
    setBusy(false)
    if (error) return toast.err(error.message)
    qc.invalidateQueries({ queryKey: ['dishes', trip.id] }); toast.ok('¡Puntuado!'); onClose()
  }
  const del = async () => {
    await supabase.from('dish_ratings').delete().eq('dish_id', d.id).eq('user_id', user!.id)
    qc.invalidateQueries({ queryKey: ['dishes', trip.id] }); onClose()
  }
  return (
    <Sheet open onClose={onClose} title={`¿Qué tal ${d.name}?`}>
      <div className="space-y-4">
        <div className="flex justify-center gap-2 py-2">
          {[1, 2, 3, 4, 5].map((i) => <button key={i} onClick={() => setRating(i)} aria-label={`${i} estrellas`}><Star size={36} className={i <= rating ? 'fill-gold text-gold' : 'text-line'} /></button>)}
        </div>
        <Field label="Comentario"><input className="input" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Brutal el de The Albanach…" maxLength={140} /></Field>
        <div className="flex gap-2">
          {mine && <button onClick={del} className="btn-danger">Quitar</button>}
          <button onClick={save} className="btn-primary flex-1" disabled={busy}>{busy ? <Spinner /> : <><Pencil size={14} /> Guardar</>}</button>
        </div>
      </div>
    </Sheet>
  )
}
