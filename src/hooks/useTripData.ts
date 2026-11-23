import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import type { Transport, Visit, Dish, Media, Expense, ChecklistItem, JournalEntry, TimelineEvent } from '@/lib/types'

type Table = 'transports' | 'visits' | 'dishes' | 'media' | 'expenses' | 'checklist_items' | 'journal_entries'

function useTable<T>(table: Table, tripId: string, select = '*', order?: { col: string; asc?: boolean }) {
  return useQuery({
    queryKey: [table, tripId],
    queryFn: async () => {
      let q = supabase.from(table).select(select).eq('trip_id', tripId)
      if (order) q = q.order(order.col, { ascending: order.asc ?? true })
      const { data, error } = await q
      if (error) throw error
      return data as unknown as T[]
    },
  })
}

export const useTransports = (tripId: string) => useTable<Transport>('transports', tripId, '*', { col: 'depart_at' })
export const useVisits = (tripId: string) => useTable<Visit>('visits', tripId, '*', { col: 'start_at' })
export const useDishes = (tripId: string) => useTable<Dish>('dishes', tripId, '*, dish_ratings(*)', { col: 'created_at' })
export const useMedia = (tripId: string) => useTable<Media>('media', tripId, '*', { col: 'taken_at', asc: false })
export const useExpenses = (tripId: string) => useTable<Expense>('expenses', tripId, '*', { col: 'spent_at', asc: false })
export const useChecklist = (tripId: string) => useTable<ChecklistItem>('checklist_items', tripId, '*', { col: 'created_at' })
export const useJournal = (tripId: string) => useTable<JournalEntry>('journal_entries', tripId, '*', { col: 'day' })

const WITH_CREATED_BY: Table[] = ['transports', 'visits', 'dishes', 'expenses', 'checklist_items']

/** Mutaciones genéricas: update si la fila trae id, insert si no. */
export function useUpsert<T extends { id?: string }>(table: Table, tripId: string) {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (row: Partial<T>) => {
      const { id, ...rest } = row as Partial<T> & { id?: string }
      const payload = rest as Record<string, unknown>
      const q = id
        ? supabase.from(table).update(payload).eq('id', id).select().single()
        : supabase.from(table).insert({ ...payload, trip_id: tripId, ...(WITH_CREATED_BY.includes(table) ? { created_by: user?.id } : {}) }).select().single()
      const { data, error } = await q
      if (error) throw error
      return data as T
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [table, tripId] }),
  })
}

export function useRemove(table: Table, tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [table, tripId] }),
  })
}

/** Transportes + visitas fusionados y ordenados para el timeline. */
export function useTimeline(tripId: string) {
  const t = useTransports(tripId)
  const v = useVisits(tripId)
  const events: TimelineEvent[] = [
    ...(t.data ?? []).map((x) => ({ type: 'transport' as const, id: x.id, start: new Date(x.depart_at), end: x.arrive_at ? new Date(x.arrive_at) : null, data: x })),
    ...(v.data ?? []).map((x) => ({ type: 'visit' as const, id: x.id, start: new Date(x.start_at), end: x.end_at ? new Date(x.end_at) : null, data: x })),
  ].sort((a, b) => a.start.getTime() - b.start.getTime())
  return { events, loading: t.isLoading || v.isLoading, error: t.error ?? v.error }
}
