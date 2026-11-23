import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Trip, TripMember, Profile } from '@/lib/types'

interface TripCtx {
  trip: Trip
  members: TripMember[]
  memberById: (id: string | null | undefined) => Profile | undefined
  refresh: () => void
}

const Ctx = createContext<TripCtx | null>(null)

export function useTripQuery(tripId: string | undefined) {
  return useQuery({
    queryKey: ['trip', tripId],
    enabled: !!tripId,
    queryFn: async () => {
      const [t, m] = await Promise.all([
        supabase.from('trips').select('*').eq('id', tripId!).single(),
        supabase.from('trip_members').select('*, profile:profiles(*)').eq('trip_id', tripId!).order('joined_at'),
      ])
      if (t.error) throw t.error
      if (m.error) throw m.error
      return { trip: t.data as Trip, members: m.data as TripMember[] }
    },
  })
}

export function TripProvider({ trip, members, children }: { trip: Trip; members: TripMember[]; children: ReactNode }) {
  const qc = useQueryClient()

  // Realtime: cualquier cambio en las tablas del viaje refresca las consultas afectadas
  useEffect(() => {
    const tables = ['transports', 'visits', 'dishes', 'media', 'expenses', 'checklist_items', 'journal_entries', 'trip_members']
    let ch = supabase.channel(`trip-${trip.id}`)
    for (const table of tables) {
      ch = ch.on('postgres_changes', { event: '*', schema: 'public', table, filter: `trip_id=eq.${trip.id}` }, () => {
        qc.invalidateQueries({ queryKey: [table, trip.id] })
        if (table === 'trip_members') qc.invalidateQueries({ queryKey: ['trip', trip.id] })
      })
    }
    // dish_ratings no tiene trip_id: cualquier cambio refresca la carta
    ch = ch.on('postgres_changes', { event: '*', schema: 'public', table: 'dish_ratings' }, () => qc.invalidateQueries({ queryKey: ['dishes', trip.id] }))
    ch.subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [trip.id, qc])

  const value: TripCtx = {
    trip, members,
    memberById: (id) => members.find((m) => m.user_id === id)?.profile,
    refresh: () => qc.invalidateQueries({ queryKey: ['trip', trip.id] }),
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useTrip() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useTrip fuera de TripProvider')
  return v
}
