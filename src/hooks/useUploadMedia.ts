import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { uploadToBucket } from '@/lib/storage'
import { compressImage, extFromMime, kindFromMime } from '@/lib/images'
import { useAuth } from './useAuth'

export interface UploadArgs {
  files: File[]
  ref?: { type: 'transport' | 'visit' | 'dish'; id: string } | null
  caption?: string
}

/** Sube fotos/vídeos/PDF al bucket privado `media` y crea la fila en `media`. */
export function useUploadMedia(tripId: string) {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async ({ files, ref, caption }: UploadArgs) => {
      for (const file of files) {
        const kind = kindFromMime(file.type)
        let body: Blob = file
        let mime = file.type
        if (kind === 'image') { body = await compressImage(file); if (body !== file) mime = 'image/jpeg' }
        if (body.size > 50 * 1024 * 1024) throw new Error(`${file.name}: supera 50 MB`)
        const path = `${tripId}/${crypto.randomUUID()}.${extFromMime(mime)}`
        await uploadToBucket('media', path, body, mime)
        const taken = file.lastModified ? new Date(file.lastModified).toISOString() : new Date().toISOString()
        const { error } = await supabase.from('media').insert({
          trip_id: tripId, uploader_id: user?.id, storage_path: path, kind, mime, filename: file.name,
          size_bytes: body.size, caption: caption || null, taken_at: taken,
          ref_type: ref?.type ?? null, ref_id: ref?.id ?? null,
        })
        if (error) throw error
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['media', tripId] }),
  })
}
