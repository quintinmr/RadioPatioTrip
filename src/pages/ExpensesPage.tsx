import { useMemo, useState, type FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useTrip } from '@/hooks/useTrip'
import { useAuth } from '@/hooks/useAuth'
import { useExpenses, useUpsert, useRemove } from '@/hooks/useTripData'
import { Avatar, EmptyState, Field, PageLoader, Sheet, Spinner, errMsg, toast } from '@/components/ui'
import { money, fmtDateTime, toLocalInput, fromLocalInput } from '@/lib/format'
import type { Expense } from '@/lib/types'

/** Liquidación mínima: quién paga a quién para saldar las deudas. */
function settle(balances: Record<string, number>): Array<{ from: string; to: string; amount: number }> {
  const debtors = Object.entries(balances).filter(([, v]) => v < -0.005).map(([k, v]) => ({ id: k, v: -v })).sort((a, b) => b.v - a.v)
  const creditors = Object.entries(balances).filter(([, v]) => v > 0.005).map(([k, v]) => ({ id: k, v })).sort((a, b) => b.v - a.v)
  const out: Array<{ from: string; to: string; amount: number }> = []
  let i = 0, j = 0
  while (i < debtors.length && j < creditors.length) {
    const amt = Math.min(debtors[i].v, creditors[j].v)
    out.push({ from: debtors[i].id, to: creditors[j].id, amount: amt })
    debtors[i].v -= amt; creditors[j].v -= amt
    if (debtors[i].v < 0.005) i++
    if (creditors[j].v < 0.005) j++
  }
  return out
}

export default function ExpensesPage() {
  const { trip, members, memberById } = useTrip()
  const { user } = useAuth()
  const expenses = useExpenses(trip.id)
  const remove = useRemove('expenses', trip.id)
  const [open, setOpen] = useState(false)

  const { balances, total, mine } = useMemo(() => {
    const b: Record<string, number> = {}
    for (const m of members) b[m.user_id] = 0
    let total = 0, mine = 0
    for (const e of expenses.data ?? []) {
      const amount = Number(e.amount)
      total += amount
      const parts = e.split_with.length ? e.split_with : members.map((m) => m.user_id)
      const share = amount / parts.length
      b[e.payer_id] = (b[e.payer_id] ?? 0) + amount
      for (const p of parts) { b[p] = (b[p] ?? 0) - share; if (p === user?.id) mine += share }
    }
    return { balances: b, total, mine }
  }, [expenses.data, members, user?.id])

  if (expenses.isLoading) return <PageLoader />
  const name = (id: string) => memberById(id)?.display_name ?? '?'

  return (
    <div className="px-4 pb-6 pt-4">
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="card p-4"><p className="text-xs text-ink-3">Total del grupo</p><p className="text-2xl font-bold">{money(total, trip.currency)}</p></div>
        <div className="card p-4"><p className="text-xs text-ink-3">Mi parte</p><p className="text-2xl font-bold text-gold">{money(mine, trip.currency)}</p></div>
      </div>

      <h3 className="mb-2 text-sm font-semibold text-ink-2">Balance</h3>
      <ul className="card mb-4 divide-y divide-line">
        {members.map((m) => { const v = balances[m.user_id] ?? 0; return (
          <li key={m.user_id} className="flex items-center gap-3 px-4 py-2.5">
            <Avatar name={m.profile?.display_name ?? '?'} path={m.profile?.avatar_path} size={30} />
            <span className="flex-1 text-sm">{m.profile?.display_name}</span>
            <span className={`text-sm font-semibold ${v > 0.005 ? 'text-moss' : v < -0.005 ? 'text-rose' : 'text-ink-3'}`}>{v > 0 ? '+' : ''}{money(v, trip.currency)}</span>
          </li>) })}
      </ul>

      {settle(balances).length > 0 && (
        <>
          <h3 className="mb-2 text-sm font-semibold text-ink-2">Para quedar en paz</h3>
          <ul className="mb-4 space-y-1.5">
            {settle(balances).map((s, i) => <li key={i} className="rounded-xl bg-card-2 px-4 py-2 text-sm"><b>{name(s.from)}</b> paga <b className="text-gold">{money(s.amount, trip.currency)}</b> a <b>{name(s.to)}</b></li>)}
          </ul>
        </>
      )}

      <h3 className="mb-2 text-sm font-semibold text-ink-2">Movimientos</h3>
      {(expenses.data ?? []).length === 0 ? <EmptyState emoji="💸" title="Sin gastos" text="Apunta lo que vaya pagando cada uno y la app calcula el reparto." /> : (
        <ul className="space-y-2">
          {expenses.data!.map((e) => (
            <li key={e.id} className="card flex items-center gap-3 p-3">
              <Avatar name={name(e.payer_id)} path={memberById(e.payer_id)?.avatar_path} size={34} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{e.title}</p>
                <p className="text-xs text-ink-3">{name(e.payer_id)} · {fmtDateTime(e.spent_at)} · {e.split_with.length ? `entre ${e.split_with.length}` : 'entre todos'}</p>
              </div>
              <span className="font-bold">{money(Number(e.amount), e.currency)}</span>
              {(e.payer_id === user?.id || e.created_by === user?.id) && <button onClick={() => confirm('¿Eliminar gasto?') && remove.mutate(e.id)} className="p-1 text-ink-3 hover:text-rose" aria-label="Eliminar"><Trash2 size={16} /></button>}
            </li>
          ))}
        </ul>
      )}

      <button onClick={() => setOpen(true)} aria-label="Añadir gasto" className="fixed bottom-[calc(76px+env(safe-area-inset-bottom))] right-4 z-30 rounded-full bg-gold p-4 text-bg shadow-lg shadow-gold/30 active:scale-95"><Plus size={24} /></button>
      {open && <ExpenseForm onClose={() => setOpen(false)} />}
    </div>
  )
}

function ExpenseForm({ onClose }: { onClose: () => void }) {
  const { trip, members } = useTrip()
  const { user } = useAuth()
  const upsert = useUpsert<Expense>('expenses', trip.id)
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState(trip.currency)
  const [payer, setPayer] = useState(user!.id)
  const [at, setAt] = useState(toLocalInput(new Date()))
  const [parts, setParts] = useState<string[]>(members.map((m) => m.user_id))
  const toggle = (id: string) => setParts((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!parts.length) return toast.err('Elige al menos una persona')
    try {
      await upsert.mutateAsync({ title, amount: Number(amount), currency, payer_id: payer, spent_at: fromLocalInput(at)!, split_with: parts.length === members.length ? [] : parts })
      toast.ok('Gasto apuntado'); onClose()
    } catch (err) { toast.err(errMsg(err)) }
  }
  return (
    <Sheet open onClose={onClose} title="Nuevo gasto">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Concepto"><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Cena en The Albanach" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Importe"><input className="input" type="number" step="0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required min="0.01" /></Field>
          <Field label="Moneda"><select className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>{[trip.currency, trip.home_currency].filter((v, i, a) => a.indexOf(v) === i).map((c) => <option key={c}>{c}</option>)}</select></Field>
        </div>
        <Field label="¿Quién pagó?"><select className="input" value={payer} onChange={(e) => setPayer(e.target.value)}>{members.map((m) => <option key={m.user_id} value={m.user_id}>{m.profile?.display_name}</option>)}</select></Field>
        <Field label="Cuándo"><input className="input" type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} /></Field>
        <div>
          <span className="label">Se reparte entre</span>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => <button type="button" key={m.user_id} onClick={() => toggle(m.user_id)} className={`chip ${parts.includes(m.user_id) ? 'bg-gold text-bg' : 'bg-card-2 text-ink-2'}`}>{m.profile?.display_name}</button>)}
          </div>
        </div>
        <button className="btn-primary w-full" disabled={upsert.isPending}>{upsert.isPending ? <Spinner /> : 'Guardar'}</button>
      </form>
    </Sheet>
  )
}
