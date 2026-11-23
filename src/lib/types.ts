export type TransportKind = 'flight' | 'train' | 'bus' | 'ferry' | 'car' | 'taxi' | 'metro' | 'tram' | 'walk' | 'other'
export type VisitCategory = 'monument' | 'museum' | 'tour' | 'nature' | 'show' | 'food' | 'shopping' | 'nightlife' | 'free' | 'other'
export type DishCategory = 'starter' | 'main' | 'dessert' | 'drink' | 'snack' | 'breakfast'
export type MediaKind = 'image' | 'video' | 'document'

export interface Profile {
  id: string
  display_name: string
  avatar_path: string | null
  consent_version: string
  consent_at: string
  created_at: string
}

export interface Trip {
  id: string
  name: string
  destination: string
  country: string | null
  lat: number | null
  lng: number | null
  start_date: string
  end_date: string
  description: string | null
  cover_path: string | null
  currency: string
  home_currency: string
  timezone: string
  invite_code: string
  created_by: string | null
  created_at: string
}

export interface TripMember {
  trip_id: string
  user_id: string
  role: 'owner' | 'member'
  joined_at: string
  profile?: Profile
}

export interface Transport {
  id: string
  trip_id: string
  kind: TransportKind
  carrier: string | null
  code: string | null
  from_name: string
  from_lat: number | null
  from_lng: number | null
  to_name: string
  to_lat: number | null
  to_lng: number | null
  depart_at: string
  arrive_at: string | null
  booking_ref: string | null
  seats: string | null
  price: number | null
  currency: string | null
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface Visit {
  id: string
  trip_id: string
  title: string
  category: VisitCategory
  place_name: string | null
  address: string | null
  lat: number | null
  lng: number | null
  start_at: string
  end_at: string | null
  ticket_ref: string | null
  price: number | null
  currency: string | null
  url: string | null
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface Dish {
  id: string
  trip_id: string
  name: string
  category: DishCategory
  description: string | null
  typical_price: number | null
  currency: string | null
  where_to_try: string | null
  lat: number | null
  lng: number | null
  photo_path: string | null
  created_by: string | null
  created_at: string
  dish_ratings?: DishRating[]
}

export interface DishRating {
  dish_id: string
  user_id: string
  rating: number
  comment: string | null
  tried_at: string
}

export interface Media {
  id: string
  trip_id: string
  uploader_id: string | null
  storage_path: string
  kind: MediaKind
  mime: string | null
  filename: string | null
  size_bytes: number | null
  caption: string | null
  taken_at: string
  ref_type: 'transport' | 'visit' | 'dish' | null
  ref_id: string | null
  created_at: string
}

export interface Expense {
  id: string
  trip_id: string
  payer_id: string
  title: string
  amount: number
  currency: string
  split_with: string[]
  spent_at: string
  created_by: string | null
  created_at: string
}

export interface ChecklistItem {
  id: string
  trip_id: string
  text: string
  done: boolean
  assigned_to: string | null
  created_by: string | null
  created_at: string
}

export interface JournalEntry {
  id: string
  trip_id: string
  author_id: string
  day: string
  content: string
  mood: string | null
  created_at: string
  updated_at: string
}

/** Evento unificado del timeline */
export type TimelineEvent =
  | { type: 'transport'; id: string; start: Date; end: Date | null; data: Transport }
  | { type: 'visit'; id: string; start: Date; end: Date | null; data: Visit }
