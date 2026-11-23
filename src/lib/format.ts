import { format, formatDistanceToNowStrict, isSameDay, differenceInCalendarDays, eachDayOfInterval, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export const fmtTime = (d: Date | string) => format(typeof d === 'string' ? new Date(d) : d, 'HH:mm')
export const fmtDay = (d: Date | string) => format(typeof d === 'string' ? parseISO(d) : d, "EEEE d 'de' MMMM", { locale: es })
export const fmtDayShort = (d: Date | string) => format(typeof d === 'string' ? parseISO(d) : d, 'EEE d', { locale: es })
export const fmtDate = (d: Date | string) => format(typeof d === 'string' ? parseISO(d) : d, 'd MMM yyyy', { locale: es })
export const fmtDateTime = (d: Date | string) => format(typeof d === 'string' ? new Date(d) : d, "d MMM, HH:mm", { locale: es })
export const fmtRelative = (d: Date | string) => formatDistanceToNowStrict(typeof d === 'string' ? new Date(d) : d, { locale: es, addSuffix: true })

export const money = (n: number | null | undefined, cur = 'GBP') =>
  n == null ? '' : new Intl.NumberFormat('es-ES', { style: 'currency', currency: cur, maximumFractionDigits: 2 }).format(n)

export const tripDays = (start: string, end: string) => eachDayOfInterval({ start: parseISO(start), end: parseISO(end) })
export const daysUntil = (start: string) => differenceInCalendarDays(parseISO(start), new Date())
export { isSameDay }

/** Convierte un Date local a valor para <input type="datetime-local"> */
export const toLocalInput = (d: Date | string | null | undefined) => {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
export const fromLocalInput = (s: string) => (s ? new Date(s).toISOString() : null)

export const initials = (name: string) => name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('')
