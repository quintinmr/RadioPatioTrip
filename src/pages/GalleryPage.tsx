import { useMemo, useRef, useState } from 'react'
import { Camera, Trash2, Share2 } from 'lucide-react'
import { format } from 'date-fns'
import { useTrip } from '@/hooks/useTrip'
import { useAuth } from '@/hooks/useAuth'
import { useMedia, useRemove } from '@/hooks/useTripData'
import { useUploadMedia } from '@/hooks/useUploadMedia'
import { supabase } from '@/lib/supabase'
import { signedUrl } from '@/lib/storage'
import { fmtDay } from '@/lib/format'
import { EmptyState, PageLoader, Spinner, Avatar, errMsg, toast } from '@/components/ui'
import { MediaThumb, MediaViewer } from '@/components/MediaThumb'
import type { Media } from '@/lib/types'

export default function GalleryPage() {
  const { trip, memberById } = useTrip()
  const { user } = useAuth()
  const media = useMedia(trip.id)
  const upload = useUploadMedia(trip.id)
  const remove = useRemove('media', trip.id)
  const input = useRef<HTMLInputElement>(null)
  const [filter, setFilter] = useState<'all' | 'image' | 'video' | 'document'>('all')
  const [view, setView] = useState<Media | null>(null)
  const [progress, setProgress] = useState<string | null>(null)

  const groups = useMemo(() => {
    const items = (media.data ?? []).filter((m) => filter === 'all' || m.kind === filter)
    const map = new Map<string, Media[]>()
    for (const m of items) { const k = format(new Date(m.taken_at), 'yyyy-MM-dd'); map.set(k, [...(map.get(k) ?? []), m]) }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [media.data, filter])

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return
    const arr = Array.from(files)
    try {
      for (let i = 0; i < arr.length; i++) { setProgress(`${i + 1}/${arr.length}`); await upload.mutateAsync({ files: [arr[i]] }) }
      toast.ok(`${arr.length} archivo${arr.length > 1 ? 's' : ''} subido${arr.length > 1 ? 's' : ''}`)
    } catch (e) { toast.err(errMsg(e)) } finally { setProgress(null) }
  }

  const del = async (m: Media) => {
    if (!confirm('¿Eliminar definitivamente?')) return
    await supabase.storage.from('media').remove([m.storage_path])
    await remove.mutateAsync(m.id); setView(null)
  }

  const share = async (m: Media) => {
    const url = await signedUrl('media', m.storage_path)
    if (!url) return
    try {
      const blob = await (await fetch(url)).blob()
      const file = new File([blob], m.filename ?? 'foto.jpg', { type: blob.type })
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: trip.name })
      else window.open(url, '_blank')
    } catch { /* cancelado */ }
  }

  if (media.isLoading) return <PageLoader />
  const total = media.data?.length ?? 0

  return (
    <div className="px-4 pb-6 pt-4">
      <div className="mb-3 flex items-center justify-between">
        <div><h2 className="text-xl font-bold">Recuerdos</h2><p className="text-xs text-ink-3">{total} archivo{total === 1 ? '' : 's'} · privados para el grupo</p></div>
        <button onClick={() => input.current?.click()} className="btn-primary" disabled={upload.isPending}>{upload.isPending ? <><Spinner /> {progress}</> : <><Camera size={16} /> Subir</>}</button>
        <input ref={input} type="file" accept="image/*,video/*,application/pdf" multiple hidden onChange={(e) => { onFiles(e.target.files); e.target.value = '' }} />
      </div>
      <div className="no-scrollbar mb-4 flex gap-1.5 overflow-x-auto">
        {([['all', 'Todo'], ['image', '📷 Fotos'], ['video', '🎬 Vídeos'], ['document', '📄 Docs']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className={`chip shrink-0 ${filter === k ? 'bg-gold text-bg' : 'bg-card text-ink-2'}`}>{l}</button>
        ))}
      </div>

      {groups.length === 0 ? (
        <EmptyState emoji="📸" title="Aún no hay recuerdos" text="Sube fotos y vídeos del viaje. Las fotos se comprimen y se limpian sus metadatos de ubicación antes de subirlas." />
      ) : groups.map(([day, items]) => (
        <section key={day} className="mb-5">
          <h3 className="mb-2 text-sm font-semibold capitalize text-ink-2">{fmtDay(day)}</h3>
          <div className="grid grid-cols-3 gap-1.5">
            {items.map((m) => <MediaThumb key={m.id} m={m} onClick={() => setView(m)} className="aspect-square w-full" />)}
          </div>
        </section>
      ))}

      {view && (
        <>
          <MediaViewer m={view} onClose={() => setView(null)} />
          <div className="fixed inset-x-0 top-0 z-[60] flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-4 py-3 safe-top">
            <div className="flex items-center gap-2 text-sm">
              {(() => { const p = memberById(view.uploader_id); return p ? <><Avatar name={p.display_name} path={p.avatar_path} size={28} /><span>{p.display_name}</span></> : null })()}
            </div>
            <div className="flex gap-2">
              <button onClick={() => share(view)} className="rounded-full bg-black/50 p-2" aria-label="Compartir"><Share2 size={18} /></button>
              {view.uploader_id === user?.id && <button onClick={() => del(view)} className="rounded-full bg-black/50 p-2 text-rose" aria-label="Eliminar"><Trash2 size={18} /></button>}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
