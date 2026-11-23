import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeft, Camera, Download, Trash2, LogOut, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { uploadToBucket } from '@/lib/storage'
import { compressImage } from '@/lib/images'
import { Avatar, Field, Spinner, errMsg, toast } from '@/components/ui'
import { fmtDate } from '@/lib/format'
import { useQueryClient } from '@tanstack/react-query'

export default function SettingsPage() {
  const { user, profile, refreshProfile, signOut } = useAuth()
  const qc = useQueryClient()
  const nav = useNavigate()
  const [name, setName] = useState(profile?.display_name ?? '')
  const [busy, setBusy] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const saveName = async () => {
    setBusy('name')
    const { error } = await supabase.from('profiles').update({ display_name: name.trim(), updated_at: new Date().toISOString() }).eq('id', user!.id)
    setBusy(null)
    if (error) toast.err(error.message); else { refreshProfile(); toast.ok('Nombre actualizado') }
  }

  const changeAvatar = async (file: File | null) => {
    if (!file) return
    setBusy('avatar')
    try {
      const path = `${user!.id}/avatar.jpg`
      await uploadToBucket('avatars', path, await compressImage(file, 512, 0.8), 'image/jpeg', true)
      const { error } = await supabase.from('profiles').update({ avatar_path: path, updated_at: new Date().toISOString() }).eq('id', user!.id)
      if (error) throw error
      qc.removeQueries({ queryKey: ['signed', 'avatars', path] })
      refreshProfile(); toast.ok('Foto actualizada')
    } catch (e) { toast.err(errMsg(e)) } finally { setBusy(null) }
  }

  const exportData = async () => {
    setBusy('export')
    const { data, error } = await supabase.rpc('export_my_data')
    setBusy(null)
    if (error) return toast.err(error.message)
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `radiopatio-mis-datos-${new Date().toISOString().slice(0, 10)}.json`; a.click()
    URL.revokeObjectURL(a.href)
  }

  const deleteAccount = async () => {
    if (!confirm('¿Borrar tu cuenta? Se eliminarán tu perfil, tu foto, lo que hayas subido y tus valoraciones. Los viajes donde seas el único miembro se borrarán por completo. Esta acción no se puede deshacer.')) return
    if (prompt('Escribe BORRAR para confirmar') !== 'BORRAR') return
    setBusy('delete')
    try {
      // 1) Archivos (Supabase no permite borrarlos desde SQL): avatar, lo que subí y los viajes donde estoy solo
      const { data: files, error: e1 } = await supabase.rpc('my_storage_paths')
      if (e1) throw e1
      for (const bucket of ['avatars', 'media'] as const) {
        const paths = (files as { bucket: string; path: string }[]).filter((f) => f.bucket === bucket).map((f) => f.path)
        for (let i = 0; i < paths.length; i += 100) {
          const { error } = await supabase.storage.from(bucket).remove(paths.slice(i, i + 100))
          if (error) throw error
        }
      }
      // 2) Datos y cuenta
      const { error } = await supabase.rpc('delete_my_account')
      if (error) throw error
      await signOut(); nav('/login')
    } catch (e) { toast.err(errMsg(e)) } finally { setBusy(null) }
  }

  return (
    <div className="safe-top safe-bottom mx-auto max-w-lg px-4 pb-10">
      <header className="flex items-center gap-2 py-4">
        <Link to="/" className="rounded-full p-1.5 text-ink-2 hover:bg-card" aria-label="Volver"><ChevronLeft size={22} /></Link>
        <h1 className="text-2xl font-bold">Mi cuenta</h1>
      </header>

      <section className="card mb-4 p-5">
        <div className="flex items-center gap-4">
          <button onClick={() => fileRef.current?.click()} className="relative" aria-label="Cambiar foto">
            <Avatar name={profile?.display_name ?? '?'} path={profile?.avatar_path} size={72} />
            <span className="absolute -bottom-1 -right-1 rounded-full bg-gold p-1.5 text-bg">{busy === 'avatar' ? <Spinner className="h-3 w-3" /> : <Camera size={14} />}</span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => changeAvatar(e.target.files?.[0] ?? null)} />
          <div className="min-w-0 flex-1">
            <Field label="Nombre visible"><div className="flex gap-2"><input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} /><button onClick={saveName} disabled={busy === 'name' || name.trim() === profile?.display_name} className="btn-ghost px-3">OK</button></div></Field>
          </div>
        </div>
        <p className="mt-3 text-xs text-ink-3">Email: {user?.email} · Consentimiento v{profile?.consent_version} aceptado el {profile ? fmtDate(profile.consent_at) : ''}</p>
      </section>

      <section className="card mb-4 divide-y divide-line">
        <div className="flex items-center gap-3 p-4"><ShieldCheck className="text-moss" /><div className="flex-1 text-sm"><p className="font-semibold">Tus derechos (RGPD)</p><p className="text-xs text-ink-3">Acceso, portabilidad y supresión, sin pedir permiso a nadie.</p></div></div>
        <button onClick={exportData} disabled={!!busy} className="flex w-full items-center gap-3 p-4 text-left text-sm hover:bg-card-2"><Download size={18} className="text-sky" /><span className="flex-1">Descargar todos mis datos (JSON)</span>{busy === 'export' && <Spinner />}</button>
        <Link to="/privacidad" className="flex items-center gap-3 p-4 text-sm hover:bg-card-2"><ShieldCheck size={18} className="text-ink-2" /><span className="flex-1">Leer la política de privacidad</span></Link>
        <button onClick={deleteAccount} disabled={!!busy} className="flex w-full items-center gap-3 p-4 text-left text-sm text-rose hover:bg-card-2"><Trash2 size={18} /><span className="flex-1">Borrar mi cuenta y mis datos</span>{busy === 'delete' && <Spinner />}</button>
      </section>

      <button onClick={async () => { await signOut(); nav('/login') }} className="btn-ghost w-full"><LogOut size={16} /> Cerrar sesión</button>
    </div>
  )
}
