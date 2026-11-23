import type { TransportKind, VisitCategory, DishCategory } from './types'

export const TRANSPORT_LABELS: Record<TransportKind, { label: string; emoji: string; color: string }> = {
  flight: { label: 'Vuelo', emoji: '✈️', color: 'var(--color-sky)' },
  train: { label: 'Tren', emoji: '🚆', color: 'var(--color-teal)' },
  bus: { label: 'Autobús', emoji: '🚌', color: 'var(--color-moss)' },
  ferry: { label: 'Ferry', emoji: '⛴️', color: 'var(--color-sky)' },
  car: { label: 'Coche', emoji: '🚗', color: 'var(--color-plum)' },
  taxi: { label: 'Taxi', emoji: '🚕', color: 'var(--color-gold)' },
  metro: { label: 'Metro', emoji: '🚇', color: 'var(--color-teal)' },
  tram: { label: 'Tranvía', emoji: '🚊', color: 'var(--color-teal)' },
  walk: { label: 'A pie', emoji: '🚶', color: 'var(--color-ink-2)' },
  other: { label: 'Otro', emoji: '🧭', color: 'var(--color-ink-2)' },
}

export const VISIT_LABELS: Record<VisitCategory, { label: string; emoji: string; color: string }> = {
  monument: { label: 'Monumento', emoji: '🏰', color: 'var(--color-gold)' },
  museum: { label: 'Museo', emoji: '🖼️', color: 'var(--color-plum)' },
  tour: { label: 'Excursión', emoji: '🥾', color: 'var(--color-moss)' },
  nature: { label: 'Naturaleza', emoji: '🌄', color: 'var(--color-moss)' },
  show: { label: 'Espectáculo', emoji: '🎭', color: 'var(--color-rose)' },
  food: { label: 'Comer / beber', emoji: '🍽️', color: 'var(--color-rose)' },
  shopping: { label: 'Compras', emoji: '🛍️', color: 'var(--color-sky)' },
  nightlife: { label: 'Noche', emoji: '🍻', color: 'var(--color-plum)' },
  free: { label: 'Tiempo libre', emoji: '☕', color: 'var(--color-ink-2)' },
  other: { label: 'Otro', emoji: '📍', color: 'var(--color-ink-2)' },
}

export const DISH_LABELS: Record<DishCategory, { label: string; emoji: string }> = {
  breakfast: { label: 'Desayuno', emoji: '🥞' },
  starter: { label: 'Entrantes', emoji: '🥣' },
  main: { label: 'Principales', emoji: '🍖' },
  dessert: { label: 'Postres', emoji: '🍰' },
  snack: { label: 'Para picar', emoji: '🥨' },
  drink: { label: 'Bebidas', emoji: '🥃' },
}

export const DISH_ORDER: DishCategory[] = ['breakfast', 'starter', 'main', 'dessert', 'snack', 'drink']
