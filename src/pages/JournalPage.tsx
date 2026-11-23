import { useState } from 'react'
import { format } from 'date-fns'
import { useTrip } from '@/hooks/useTrip'
import { useAuth } from '@/hooks/useAuth'
import { useJournal, useUpsert } from '@/hooks/useTripData'
import { Avatar, PageLoader, Spinner, errMsg, toast } from '@/components/ui'
import { fmtDay, tripDays, fmtDayShort } from '@/lib/format'
import type { JournalEntry } from '@/lib/types'

const MOODS = ['🤩', '😊', '😴', '🥶', '🍻', '🤯']

export default function JournalPage() {
  const { trip, memberById } = useTrip()
  const { user } = useAuth()
  const journal = useJournal(trip.id)
  const upsert = useUpsert<JournalEntry>('journal_entries', trip.id)
  const days = tripDays(trip.start_date, trip.end_date)
  const todayKey = format(new Date(), 'yyyy-MM-dd')
  const [day, setDay] = useState(days.find((d) => format(d, 'yyyy-MM-dd') === todayKey) ? todayKey : format(days[0], 'yyyy-MM-dd'))
  const entries = (journal.data ?? []).filter((e) => e.day === day)
  const mine = entries.find((e) => e.author_id === user?.id)
  const [text, setText] = useState<string | null>(null)
  const [mood, setMood] = useState<string | null>(null)
  const value = text ?? mine?.content ?? ''
  const moodValue = mood ?? mine?.mood ?? ''

  const save = async () => {
    try {
      await upsert.mutateAsync({ ...(mine ? { id: mine.id } : {}), author_id: user!.id, day, content: value, mood: moodValue || null, updated_at: new Date().toISOString() })
      toast.ok('Diario guardado'); setText(null); setMood(null)
    } catch (e) { toast.err(errMsg(e)) }
  }

  if (journal.isLoading) return <PageLoader />
  return (
    <div className="px-4 pb-6 pt-4">
      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
        {days.map((d) => { const k = format(d, 'yyyy-MM-dd'); const has = (journal.data ?? []).some((e) => e.day === k); return (
          <button key={k} onClick={() => { setDay(k); setText(null); setMood(null) }} className={`chip shrink-0 ${day === k ? 'bg-gold text-bg' : 'bg-card text-ink-2'}`}>{fmtDayShort(d)}{has ? ' ·' : ''}</button>) })}
      </div>
      <h2 className="mb-3 text-xl font-bold capitalize">{fmtDay(day)}</h2>

      <div className="card mb-4 p-4">
        <div className="mb-2 flex gap-1">{MOODS.map((m) => <button key={m} onClick={() => setMood(m)} className={`rounded-lg px-2 py-1 text-xl ${moodValue === m ? 'bg-gold/20 ring-1 ring-gold' : ''}`}>{m}</button>)}</div>
        <textarea className="input" rows={5} value={value} onChange={(e) => setText(e.target.value)} placeholder="¿Qué ha pasado hoy? Lo mejor, lo peor, la anécdota…" />
        <button onClick={save} className="btn-primary mt-2 w-full" disabled={upsert.isPending || (!value.trim())}>{upsert.isPending ? <Spinner /> : mine ? 'Actualizar mi entrada' : 'Guardar mi entrada'}</button>
      </div>

      {entries.filter((e) => e.author_id !== user?.id).map((e) => { const p = memberById(e.author_id); return (
        <article key={e.id} className="card fade-in mb-3 p-4">
          <header className="mb-2 flex items-center gap-2"><Avatar name={p?.display_name ?? '?'} path={p?.avatar_path} size={28} /><span className="text-sm font-semibold">{p?.display_name}</span>{e.mood && <span className="ml-auto text-xl">{e.mood}</span>}</header>
          <p className="whitespace-pre-wrap text-sm text-ink-2">{e.content}</p>
        </article>) })}
    </div>
  )
}
