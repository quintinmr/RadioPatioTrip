import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Users, Wallet, ListChecks, BookOpenText, Settings, ChevronRight, Coins } from 'lucide-react'
import { useTrip } from '@/hooks/useTrip'
import { fetchRate } from '@/lib/external'
import { useState } from 'react'

export default function MorePage() {
  const { trip, members } = useTrip()
  const items = [
    { to: 'grupo', icon: Users, label: 'Grupo', sub: `${members.length} viajero${members.length === 1 ? '' : 's'} · código de invitación`, color: 'text-plum' },
    { to: 'gastos', icon: Wallet, label: 'Gastos compartidos', sub: 'Quién pagó qué y quién debe a quién', color: 'text-moss' },
    { to: 'maleta', icon: ListChecks, label: 'Maleta y tareas', sub: 'Lista compartida: que no se olvide nada', color: 'text-sky' },
    { to: 'diario', icon: BookOpenText, label: 'Diario del viaje', sub: 'Una entrada por día y persona', color: 'text-gold' },
  ]
  return (
    <div className="px-4 pb-6 pt-4">
      <CurrencyWidget from={trip.currency} to={trip.home_currency} />
      <ul className="mt-4 space-y-2">
        {items.map(({ to, icon: Icon, label, sub, color }) => (
          <li key={to}>
            <Link to={`/viaje/${trip.id}/${to}`} className="card flex items-center gap-3 p-4 hover:border-gold/50">
              <Icon size={24} className={color} />
              <div className="min-w-0 flex-1"><p className="font-semibold">{label}</p><p className="truncate text-xs text-ink-3">{sub}</p></div>
              <ChevronRight size={18} className="text-ink-3" />
            </Link>
          </li>
        ))}
        <li>
          <Link to="/ajustes" className="card flex items-center gap-3 p-4 hover:border-gold/50">
            <Settings size={24} className="text-ink-2" />
            <div className="min-w-0 flex-1"><p className="font-semibold">Mi cuenta y privacidad</p><p className="truncate text-xs text-ink-3">Foto, nombre, exportar o borrar mis datos</p></div>
            <ChevronRight size={18} className="text-ink-3" />
          </Link>
        </li>
      </ul>
      {trip.description && <p className="mt-6 whitespace-pre-wrap text-sm text-ink-2">{trip.description}</p>}
    </div>
  )
}

function CurrencyWidget({ from, to }: { from: string; to: string }) {
  const [amount, setAmount] = useState('10')
  const rate = useQuery({ queryKey: ['rate', from, to], staleTime: 12 * 3600 * 1000, queryFn: () => fetchRate(from, to) })
  if (from === to) return null
  const n = Number(amount) || 0
  return (
    <div className="card flex items-center gap-3 p-4">
      <Coins size={24} className="text-gold" />
      <div className="flex flex-1 items-center gap-2">
        <input className="input w-24 text-right" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <span className="text-sm font-semibold">{from}</span>
        <span className="text-ink-3">=</span>
        <span className="text-lg font-bold text-gold">{rate.isLoading ? '…' : rate.data ? `${(n * rate.data).toFixed(2)} ${to}` : <span className="text-sm text-rose">sin cambio (¿sin conexión?)</span>}</span>
      </div>
    </div>
  )
}
