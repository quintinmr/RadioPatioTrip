import { FileText, Play } from 'lucide-react'
import { useSignedUrl } from '@/hooks/useSignedUrl'
import type { Media } from '@/lib/types'

export function MediaThumb({ m, onClick, className = '' }: { m: Media; onClick?: () => void; className?: string }) {
  const url = useSignedUrl('media', m.storage_path)
  return (
    <button type="button" onClick={onClick} className={`relative overflow-hidden rounded-xl bg-card-2 ${className}`}>
      {m.kind === 'image' && url && <img src={url} alt={m.caption ?? ''} loading="lazy" className="h-full w-full object-cover" />}
      {m.kind === 'video' && url && <video src={url + '#t=0.1'} muted playsInline preload="metadata" className="h-full w-full object-cover" />}
      {m.kind === 'video' && <div className="absolute inset-0 grid place-items-center"><div className="rounded-full bg-black/50 p-2"><Play size={18} fill="white" /></div></div>}
      {m.kind === 'document' && <div className="grid h-full w-full place-items-center text-ink-2"><FileText size={28} /><span className="mt-1 max-w-full truncate px-2 text-[10px]">{m.filename}</span></div>}
    </button>
  )
}

export function MediaViewer({ m, onClose }: { m: Media; onClose: () => void }) {
  const url = useSignedUrl('media', m.storage_path)
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black" onClick={onClose}>
      <div className="flex flex-1 items-center justify-center" onClick={(e) => e.stopPropagation()}>
        {m.kind === 'image' && url && <img src={url} alt={m.caption ?? ''} className="max-h-full max-w-full object-contain" />}
        {m.kind === 'video' && url && <video src={url} controls autoPlay playsInline className="max-h-full max-w-full" />}
        {m.kind === 'document' && url && <iframe src={url} title={m.filename ?? 'documento'} className="h-full w-full bg-white" />}
      </div>
      {m.caption && <p className="safe-bottom px-4 py-3 text-center text-sm text-ink-2">{m.caption}</p>}
    </div>
  )
}
