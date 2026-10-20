/** Геокодирование через Nominatim (OpenStreetMap). Без API-ключа. */

export const KRASNOYARSK = { lat: 56.0153, lon: 92.8932 } as const

/** Ограничение поиска Красноярском (viewbox: minLon,maxLat,maxLon,minLat). */
const KRASNOYARSK_VIEWBOX = '92.65,56.18,93.08,55.92'

const NOMINATIM = 'https://nominatim.openstreetmap.org'
const USER_AGENT = 'SportVmeste/1.0 (local dev; contact@demo.sport)'

async function nominatim<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(path, NOMINATIM)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  const response = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': USER_AGENT } })
  if (!response.ok) throw new Error(`Геокодер ответил ${response.status}`)
  return response.json() as Promise<T>
}

type NominatimAddress = {
  city?: string
  town?: string
  village?: string
  suburb?: string
  neighbourhood?: string
  road?: string
  pedestrian?: string
  footway?: string
  house_number?: string
  building?: string
  amenity?: string
  leisure?: string
  place?: string
}

type NominatimResult = {
  lat: string
  lon: string
  display_name: string
  address?: NominatimAddress
}

/** «Город, улица, дом/здание» для строки в форме. */
export function formatShortAddress(address?: NominatimAddress, fallbackDisplay?: string): string | undefined {
  if (address) {
    const city = address.city || address.town || address.village || 'Красноярск'
    const street = address.road || address.pedestrian || address.footway
    const house = address.house_number || address.building
    if (street && house) return `${city}, ${street}, ${house}`
    if (street) return `${city}, ${street}`
    const place = address.amenity || address.leisure || address.place || address.suburb || address.neighbourhood
    if (place && city) return `${city}, ${place}`
    if (place) return `Красноярск, ${place}`
  }
  if (!fallbackDisplay) return undefined
  const parts = fallbackDisplay.split(',').map((p) => p.trim()).filter(Boolean)
  if (parts.length >= 3) {
    const city = parts.find((p) => /красноярск/i.test(p)) ?? parts[0]
    return `${city}, ${parts[parts.length - 2]}, ${parts[parts.length - 1]}`
  }
  return parts.slice(0, 3).join(', ')
}

function distanceMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371000
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLon = ((b.lon - a.lon) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function pickBestResult(results: NominatimResult[], near?: { lat: number; lon: number }): NominatimResult | undefined {
  if (results.length === 0) return undefined
  if (!near) return results[0]
  let best = results[0]
  let bestDist = distanceMeters(near, { lat: Number(best.lat), lon: Number(best.lon) })
  for (const item of results.slice(1)) {
    const dist = distanceMeters(near, { lat: Number(item.lat), lon: Number(item.lon) })
    if (dist < bestDist) {
      best = item
      bestDist = dist
    }
  }
  return best
}

export async function geocodeAddress(
  query: string,
  near?: { lat: number; lon: number },
): Promise<{ lat: number; lon: number; address: string } | null> {
  const q = query.trim()
  if (!q) return null
  const full = q.toLowerCase().includes('красноярск') ? q : `Красноярск, ${q}`
  const baseParams = {
    q: full,
    format: 'json',
    limit: '5',
    countrycodes: 'ru',
    addressdetails: '1',
  }
  let results = await nominatim<NominatimResult[]>('/search', {
    ...baseParams,
    viewbox: KRASNOYARSK_VIEWBOX,
    bounded: '1',
  })
  if (results.length === 0) {
    results = await nominatim<NominatimResult[]>('/search', baseParams)
  }
  const first = pickBestResult(results, near)
  if (!first) return null
  const address = formatShortAddress(first.address, first.display_name) ?? first.display_name
  return { lat: Number(first.lat), lon: Number(first.lon), address }
}

export async function reverseGeocode(lat: number, lon: number): Promise<string | undefined> {
  const result = await nominatim<NominatimResult>('/reverse', {
    lat: String(lat),
    lon: String(lon),
    format: 'json',
    zoom: '18',
    addressdetails: '1',
  })
  return formatShortAddress(result.address, result.display_name)
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
