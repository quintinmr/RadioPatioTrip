import { useEffect, useState, type ReactNode } from 'react'
import { X, Loader2 } from 'lucide-react'
import { useSignedUrl } from '@/hooks/useSignedUrl'
import { initials } from '@/lib/format'

export function Spinner({ className = '' }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} size={20} />
}

export function PageLoader() {
  return <div className="flex h-full min-h-[40vh] items-center justify-center text-ink-3"><Spinner /></div>
}

export function Avatar({ name, path, size = 36, className = '' }: { name: string; path?: string | null; size?: number; className?: string }) {
  const url = useSignedUrl('avatars', path)
  return (
    <div
      className={`shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-gold/70 to-rose/70 text-bg font-bold grid place-items-center ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      title={name}
    >
      {url ? <img src={url} alt={name} className="h-full w-full object-cover" /> : initials(name)}
    </div>
  )
}

export function AvatarStack({ people, size = 28 }: { people: { name: string; path?: string | null }[]; size?: number }) {
  return (
    <div className="flex -space-x-2">
      {people.slice(0, 5).map((p, i) => <Avatar key={i} name={p.name} path={p.path} size={size} className="ring-2 ring-card" />)}
      {people.length > 5 && <div className="grid place-items-center rounded-full bg-line text-xs ring-2 ring-card" style={{ width: size, height: size }}>+{people.length - 5}</div>}
    </div>
  )
}

export function EmptyState({ emoji, title, text, action }: { emoji: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="fade-in flex flex-col items-center gap-2 px-6 py-14 text-center">
      <div className="text-5xl">{emoji}</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {text && <p className="max-w-xs text-sm text-ink-2">{text}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

/** Hoja inferior (modal) para formularios */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fade-in relative flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-3xl bg-bg-2 shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-full p-2 text-ink-2 hover:bg-line" aria-label="Cerrar"><X size={20} /></button>
        </div>
        <div className="safe-bottom overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-3">{hint}</span>}
    </label>
  )
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-xl bg-bg-2 p-1">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition ${value === o.value ? 'bg-gold text-bg' : 'text-ink-2 hover:text-ink'}`}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Fab({ onClick, label, icon }: { onClick: () => void; label: string; icon: ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label}
      className="fixed bottom-[calc(76px+env(safe-area-inset-bottom))] right-4 z-30 flex items-center gap-2 rounded-full bg-gold px-4 py-3 font-semibold text-bg shadow-lg shadow-gold/30 transition active:scale-95">
      {icon}<span className="hidden sm:inline">{label}</span>
    </button>
  )
}

/** Toasts mínimos */
type Toast = { id: number; text: string; kind: 'ok' | 'err' }
let push: ((t: Omit<Toast, 'id'>) => void) | null = null
export const toast = {
  ok: (text: string) => push?.({ text, kind: 'ok' }),
  err: (text: string) => push?.({ text, kind: 'err' }),
}
export function Toaster() {
  const [items, setItems] = useState<Toast[]>([])
  useEffect(() => {
    push = (t) => {
      const id = Date.now() + Math.random()
      setItems((s) => [...s, { ...t, id }])
      setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), 3500)
    }
    return () => { push = null }
  }, [])
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4 safe-top">
      {items.map((t) => (
        <div key={t.id} className={`fade-in rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg ${t.kind === 'ok' ? 'bg-moss text-bg' : 'bg-rose text-bg'}`}>{t.text}</div>
      ))}
    </div>
  )
}

export function errMsg(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message)
  return 'Algo ha fallado'
}
