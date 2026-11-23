import { NavLink, Outlet, useParams, Link } from 'react-router-dom'
import { CalendarClock, Map, UtensilsCrossed, Images, LayoutGrid, ChevronLeft } from 'lucide-react'
import { useTripQuery, TripProvider } from '@/hooks/useTrip'
import { PageLoader, AvatarStack, errMsg } from '@/components/ui'

const tabs = [
  { to: '', label: 'Plan', icon: CalendarClock, end: true },
  { to: 'mapa', label: 'Mapa', icon: Map },
  { to: 'comida', label: 'Carta', icon: UtensilsCrossed },
  { to: 'fotos', label: 'Fotos', icon: Images },
  { to: 'mas', label: 'Más', icon: LayoutGrid },
]

export default function TripLayout() {
  const { tripId } = useParams()
  const q = useTripQuery(tripId)
  if (q.isLoading) return <PageLoader />
  if (q.error || !q.data) return <div className="p-6 text-rose">{errMsg(q.error)} <Link to="/" className="underline">Volver</Link></div>
  const { trip, members } = q.data

  return (
    <TripProvider trip={trip} members={members}>
      <div className="flex min-h-full flex-col">
        <header className="safe-top sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur">
          <div className="mx-auto flex max-w-lg items-center gap-2 px-3 py-2.5">
            <Link to="/" className="rounded-full p-1.5 text-ink-2 hover:bg-card" aria-label="Volver"><ChevronLeft size={22} /></Link>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold leading-tight">{trip.name}</h1>
              <p className="truncate text-xs text-ink-2">{trip.destination}</p>
            </div>
            <Link to={`/viaje/${trip.id}/grupo`}><AvatarStack people={members.map((m) => ({ name: m.profile?.display_name ?? '?', path: m.profile?.avatar_path }))} /></Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-lg flex-1 pb-[calc(72px+env(safe-area-inset-bottom))]">
          <Outlet />
        </main>

        <nav className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/90 backdrop-blur">
          <div className="mx-auto grid max-w-lg grid-cols-5">
            {tabs.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end}
                className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${isActive ? 'text-gold' : 'text-ink-3'}`}>
                <Icon size={22} /> {label}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </TripProvider>
  )
}
