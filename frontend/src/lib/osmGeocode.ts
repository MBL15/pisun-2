/** Геокодирование через Nominatim (OpenStreetMap). Без API-ключа. */

export const KRASNOYARSK = { lat: 56.0153, lon: 92.8932 } as const

const NOMINATIM = 'https://nominatim.openstreetmap.org'
const USER_AGENT = 'SportVmeste/1.0 (local dev; contact@demo.sport)'

async function nominatim<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(path, NOMINATIM)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  const response = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': USER_AGENT } })
  if (!response.ok) throw new Error(`Геокодер ответил ${response.status}`)
  return response.json() as Promise<T>
}

type NominatimResult = {
  lat: string
  lon: string
  display_name: string
}

export async function geocodeAddress(query: string): Promise<{ lat: number; lon: number; address: string } | null> {
  const q = query.trim()
  if (!q) return null
  const full = q.toLowerCase().includes('красноярск') ? q : `Красноярск, ${q}`
  const results = await nominatim<NominatimResult[]>('/search', {
    q: full,
    format: 'json',
    limit: '1',
    countrycodes: 'ru',
  })
  const first = results[0]
  if (!first) return null
  return { lat: Number(first.lat), lon: Number(first.lon), address: first.display_name }
}

export async function reverseGeocode(lat: number, lon: number): Promise<string | undefined> {
  const result = await nominatim<NominatimResult>('/reverse', {
    lat: String(lat),
    lon: String(lon),
    format: 'json',
  })
  return result.display_name
}

export function osmPointUrl(lat: number, lon: number, zoom = 16): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=${zoom}/${lat}/${lon}`
}

export function osmRouteUrl(lat: number, lon: number, from?: string): string {
  const dest = `${lat},${lon}`
  if (from?.trim()) {
    return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${encodeURIComponent(from.trim())};${dest}`
  }
  return osmPointUrl(lat, lon)
}
