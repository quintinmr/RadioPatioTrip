import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { supabaseConfigured } from '@/lib/supabase'
import { PageLoader, Toaster } from '@/components/ui'
import AuthPage from '@/pages/AuthPage'
import TripsPage from '@/pages/TripsPage'
import TripLayout from '@/pages/TripLayout'
import TimelinePage from '@/pages/TimelinePage'
import MapPage from '@/pages/MapPage'
import FoodPage from '@/pages/FoodPage'
import GalleryPage from '@/pages/GalleryPage'
import MorePage from '@/pages/MorePage'
import ExpensesPage from '@/pages/ExpensesPage'
import ChecklistPage from '@/pages/ChecklistPage'
import JournalPage from '@/pages/JournalPage'
import MembersPage from '@/pages/MembersPage'
import SettingsPage from '@/pages/SettingsPage'
import PrivacyPage from '@/pages/PrivacyPage'

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } })

function Guard({ children }: { children: React.ReactElement }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function NotConfigured() {
  return (
    <div className="mx-auto max-w-md p-6 text-sm leading-relaxed">
      <h1 className="mb-3 text-2xl">Falta configurar Supabase</h1>
      <p className="text-ink-2">Crea un archivo <code className="rounded bg-card px-1">.env</code> con <code className="rounded bg-card px-1">VITE_SUPABASE_URL</code> y <code className="rounded bg-card px-1">VITE_SUPABASE_ANON_KEY</code> (mira <code className="rounded bg-card px-1">.env.example</code> y el README) y vuelve a arrancar.</p>
    </div>
  )
}

export default function App() {
  if (!supabaseConfigured) return <NotConfigured />
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <Toaster />
          <Routes>
            <Route path="/login" element={<AuthPage />} />
            <Route path="/privacidad" element={<PrivacyPage />} />
            <Route path="/" element={<Guard><TripsPage /></Guard>} />
            <Route path="/ajustes" element={<Guard><SettingsPage /></Guard>} />
            <Route path="/viaje/:tripId" element={<Guard><TripLayout /></Guard>}>
              <Route index element={<TimelinePage />} />
              <Route path="mapa" element={<MapPage />} />
              <Route path="comida" element={<FoodPage />} />
              <Route path="fotos" element={<GalleryPage />} />
              <Route path="mas" element={<MorePage />} />
              <Route path="gastos" element={<ExpensesPage />} />
              <Route path="maleta" element={<ChecklistPage />} />
              <Route path="diario" element={<JournalPage />} />
              <Route path="grupo" element={<MembersPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
