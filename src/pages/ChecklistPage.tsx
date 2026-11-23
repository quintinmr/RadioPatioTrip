import { useState, type FormEvent } from 'react'
import { Plus, Trash2, Check } from 'lucide-react'
import { useTrip } from '@/hooks/useTrip'
import { useChecklist, useUpsert, useRemove } from '@/hooks/useTripData'
import { Avatar, EmptyState, PageLoader, errMsg, toast } from '@/components/ui'
import type { ChecklistItem } from '@/lib/types'

const SUGGESTIONS = ['Pasaporte / DNI', 'Adaptador de enchufe UK (tipo G)', 'Chubasquero 🌧️', 'Libras en efectivo', 'Tarjeta sin comisiones', 'Cargador y batería externa', 'Calzado cómodo', 'Entradas impresas / PDF', 'Seguro de viaje', 'Paraguas (que aguante el viento)']

export default function ChecklistPage() {
  const { trip, members, memberById } = useTrip()
  const items = useChecklist(trip.id)
  const upsert = useUpsert<ChecklistItem>('checklist_items', trip.id)
  const remove = useRemove('checklist_items', trip.id)
  const [text, setText] = useState('')
  const [assign, setAssign] = useState<string>('')

  const add = async (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    try { await upsert.mutateAsync({ text: text.trim(), assigned_to: assign || null }); setText('') } catch (err) { toast.err(errMsg(err)) }
  }
  const seed = async () => { for (const t of SUGGESTIONS) await upsert.mutateAsync({ text: t }) }

  if (items.isLoading) return <PageLoader />
  const list = items.data ?? []
  const done = list.filter((i) => i.done).length

  return (
    <div className="px-4 pb-6 pt-4">
      <div className="mb-3 flex items-end justify-between">
        <h2 className="text-xl font-bold">Maleta y tareas</h2>
        <span className="text-sm text-ink-2">{done}/{list.length}</span>
      </div>
      {list.length > 0 && <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full bg-moss transition-all" style={{ width: `${(done / list.length) * 100}%` }} /></div>}

      <form onSubmit={add} className="mb-4 flex gap-2">
        <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Añadir cosa / tarea…" />
        <select className="input w-28" value={assign} onChange={(e) => setAssign(e.target.value)}><option value="">Todos</option>{members.map((m) => <option key={m.user_id} value={m.user_id}>{m.profile?.display_name}</option>)}</select>
        <button className="btn-primary px-3" aria-label="Añadir"><Plus size={18} /></button>
      </form>

      {list.length === 0 ? <EmptyState emoji="🧳" title="Lista vacía" text="Añade cosas que no pueden faltar o tareas pendientes (reservar, imprimir…)." action={<button onClick={seed} className="btn-ghost">Cargar sugerencias para Escocia</button>} /> : (
        <ul className="space-y-1.5">
          {[...list].sort((a, b) => Number(a.done) - Number(b.done)).map((i) => { const p = memberById(i.assigned_to); return (
            <li key={i.id} className={`card flex items-center gap-3 px-3 py-2.5 ${i.done ? 'opacity-60' : ''}`}>
              <button onClick={() => upsert.mutate({ id: i.id, done: !i.done })} className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${i.done ? 'border-moss bg-moss text-bg' : 'border-line'}`} aria-label="Hecho">{i.done && <Check size={14} />}</button>
              <span className={`flex-1 text-sm ${i.done ? 'line-through' : ''}`}>{i.text}</span>
              {p && <Avatar name={p.display_name} path={p.avatar_path} size={22} />}
              <button onClick={() => remove.mutate(i.id)} className="p-1 text-ink-3 hover:text-rose" aria-label="Eliminar"><Trash2 size={15} /></button>
            </li>) })}
        </ul>
      )}
    </div>
  )
}
