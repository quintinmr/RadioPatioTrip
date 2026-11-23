import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, Share2, LogOut, Crown, UserMinus, Trash2 } from 'lucide-react'
import { useTrip } from '@/hooks/useTrip'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Avatar, errMsg, toast } from '@/components/ui'
import { fmtDate } from '@/lib/format'

export default function MembersPage() {
  const { trip, members, refresh } = useTrip()
  const { user } = useAuth()
  const nav = useNavigate()
  const [busy, setBusy] = useState(false)
  const me = members.find((m) => m.user_id === user?.id)
  const isOwner = me?.role === 'owner'
  const inviteText = `¡Únete a "${trip.name}" en RadioPatio Trip! Abre la app, pulsa "Tengo un código" y escribe: ${trip.invite_code}\n${window.location.origin}`

  const copy = async () => { await navigator.clipboard.writeText(trip.invite_code); toast.ok('Código copiado') }
  const share = async () => { if (navigator.share) await navigator.share({ title: trip.name, text: inviteText }).catch(() => {}); else copy() }

  const leave = async () => {
    if (!confirm('¿Salir del viaje? Dejarás de ver sus datos.')) return
    setBusy(true)
    const { error } = await supabase.from('trip_members').delete().eq('trip_id', trip.id).eq('user_id', user!.id)
    setBusy(false)
    if (error) return toast.err(error.message)
    nav('/')
  }
  const kick = async (id: string, name: string) => {
    if (!confirm(`¿Quitar a ${name} del viaje?`)) return
    const { error } = await supabase.from('trip_members').delete().eq('trip_id', trip.id).eq('user_id', id)
    if (error) toast.err(error.message); else refresh()
  }
  const deleteTrip = async () => {
    if (!confirm('¿Eliminar el viaje para TODOS? Se borrarán fotos, planes y gastos. No se puede deshacer.')) return
    setBusy(true)
    try {
      const { data: files } = await supabase.storage.from('media').list(trip.id, { limit: 1000 })
      if (files?.length) await supabase.storage.from('media').remove(files.map((f) => `${trip.id}/${f.name}`))
      const { error } = await supabase.from('trips').delete().eq('id', trip.id)
      if (error) throw error
      nav('/')
    } catch (e) { toast.err(errMsg(e)) } finally { setBusy(false) }
  }

  return (
    <div className="px-4 pb-6 pt-4">
      <div className="card mb-4 p-4 text-center">
        <p className="text-xs uppercase tracking-wide text-ink-3">Código de invitación</p>
        <p className="my-2 font-mono text-3xl font-bold tracking-[0.3em] text-gold">{trip.invite_code}</p>
        <div className="flex justify-center gap-2">
          <button onClick={copy} className="btn-ghost"><Copy size={16} /> Copiar</button>
          <button onClick={share} className="btn-primary"><Share2 size={16} /> Invitar</button>
        </div>
      </div>

      <h3 className="mb-2 text-sm font-semibold text-ink-2">Viajeros ({members.length})</h3>
      <ul className="card divide-y divide-line">
        {members.map((m) => (
          <li key={m.user_id} className="flex items-center gap-3 px-4 py-3">
            <Avatar name={m.profile?.display_name ?? '?'} path={m.profile?.avatar_path} size={44} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 font-semibold">{m.profile?.display_name}{m.role === 'owner' && <Crown size={14} className="text-gold" />}{m.user_id === user?.id && <span className="text-xs text-ink-3">(tú)</span>}</p>
              <p className="text-xs text-ink-3">Desde {fmtDate(m.joined_at)}</p>
            </div>
            {isOwner && m.user_id !== user?.id && <button onClick={() => kick(m.user_id, m.profile?.display_name ?? '')} className="p-2 text-ink-3 hover:text-rose" aria-label="Quitar"><UserMinus size={18} /></button>}
          </li>
        ))}
      </ul>

      <div className="mt-6 space-y-2">
        {!isOwner && <button onClick={leave} disabled={busy} className="btn-danger w-full"><LogOut size={16} /> Salir del viaje</button>}
        {isOwner && <button onClick={deleteTrip} disabled={busy} className="btn-danger w-full"><Trash2 size={16} /> Eliminar el viaje</button>}
      </div>
    </div>
  )
}
