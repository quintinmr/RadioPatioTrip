import { useRef, useState } from 'react'
import { Paperclip, Trash2 } from 'lucide-react'
import { useMedia, useRemove } from '@/hooks/useTripData'
import { useUploadMedia } from '@/hooks/useUploadMedia'
import { supabase } from '@/lib/supabase'
import { MediaThumb, MediaViewer } from './MediaThumb'
import { Spinner, errMsg, toast } from './ui'
import type { Media } from '@/lib/types'

/** Adjuntos (billetes, entradas, fotos) ligados a un transporte / visita / plato. */
export function Attachments({ tripId, refType, refId, accept = 'image/*,video/*,application/pdf' }: { tripId: string; refType: 'transport' | 'visit' | 'dish'; refId: string; accept?: string }) {
  const media = useMedia(tripId)
  const upload = useUploadMedia(tripId)
  const remove = useRemove('media', tripId)
  const input = useRef<HTMLInputElement>(null)
  const [view, setView] = useState<Media | null>(null)
  const items = (media.data ?? []).filter((m) => m.ref_type === refType && m.ref_id === refId)

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return
    try { await upload.mutateAsync({ files: Array.from(files), ref: { type: refType, id: refId } }); toast.ok('Adjuntado') }
    catch (e) { toast.err(errMsg(e)) }
  }
  const del = async (m: Media) => {
    if (!confirm('¿Eliminar este archivo?')) return
    await supabase.storage.from('media').remove([m.storage_path])
    remove.mutate(m.id)
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="label mb-0">Billetes, entradas y fotos</span>
        <button type="button" onClick={() => input.current?.click()} className="chip bg-card-2 text-ink hover:bg-line" disabled={upload.isPending}>
          {upload.isPending ? <Spinner className="h-3 w-3" /> : <Paperclip size={12} />} Adjuntar
        </button>
        <input ref={input} type="file" accept={accept} multiple hidden onChange={(e) => { onFiles(e.target.files); e.target.value = '' }} />
      </div>
      {items.length === 0 ? <p className="text-xs text-ink-3">Nada adjunto todavía. Sube el PDF del billete o la entrada para tenerla a mano.</p> : (
        <div className="grid grid-cols-4 gap-2">
          {items.map((m) => (
            <div key={m.id} className="group relative aspect-square">
              <MediaThumb m={m} onClick={() => setView(m)} className="h-full w-full" />
              <button onClick={() => del(m)} className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-rose opacity-80" aria-label="Eliminar"><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      )}
      {view && <MediaViewer m={view} onClose={() => setView(null)} />}
    </div>
  )
}
