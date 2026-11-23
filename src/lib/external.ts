/** APIs públicas sin clave: tiempo (Open-Meteo) y cambio de divisa (Frankfurter). */

export interface DailyWeather { date: string; tmax: number; tmin: number; code: number; rain: number }

export async function fetchWeather(lat: number, lng: number, start: string, end: string): Promise<DailyWeather[]> {
  // Open-Meteo solo da previsión 16 días; recortamos el rango a lo disponible.
  const today = new Date()
  const max = new Date(today.getTime() + 15 * 86400000)
  const s = new Date(start) < today ? today : new Date(start)
  const e = new Date(end) > max ? max : new Date(end)
  if (s > e) return []
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  const params = new URLSearchParams({
    latitude: String(lat), longitude: String(lng), timezone: 'auto',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    start_date: iso(s), end_date: iso(e),
  })
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
  if (!res.ok) return []
  const j = await res.json()
  return (j.daily?.time ?? []).map((date: string, i: number) => ({
    date, tmax: j.daily.temperature_2m_max[i], tmin: j.daily.temperature_2m_min[i],
    code: j.daily.weather_code[i], rain: j.daily.precipitation_probability_max?.[i] ?? 0,
  }))
}

export function weatherEmoji(code: number): string {
  if (code === 0) return '☀️'
  if (code <= 2) return '🌤️'
  if (code === 3) return '☁️'
  if (code <= 49) return '🌫️'
  if (code <= 59) return '🌦️'
  if (code <= 69) return '🌧️'
  if (code <= 79) return '🌨️'
  if (code <= 84) return '🌧️'
  if (code <= 94) return '🌨️'
  return '⛈️'
}

export async function fetchRate(from: string, to: string): Promise<number | null> {
  if (from === to) return 1
  try {
    const res = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`)
    if (!res.ok) return null
    const j = await res.json()
    return j.rates?.[to] ?? null
  } catch {
    return null
  }
}
