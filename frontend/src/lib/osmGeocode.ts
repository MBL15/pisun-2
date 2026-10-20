/** Геокодирование и маршруты через публичные сервисы OpenStreetMap (ключ не нужен). */

export const KRASNOYARSK: [number, number] = [56.0153, 92.8932]

const NOMINATIM_BASE = (import.meta.env.VITE_NOMINATIM_URL as string | undefined)?.replace(/\/$/, '')
  || 'https://nominatim.openstreetmap.org'
const OSRM_BASE = (import.meta.env.VITE_OSRM_URL as string | undefined)?.replace(/\/$/, '')
  || 'https://router.project-osrm.org'

const APP_NAME = 'SportVmeste/1.0'

async function nominatimFetch(path: string): Promise<Response> {
  return fetch(`${NOMINATIM_BASE}${path}`, {
    headers: { Accept: 'application/json', 'Accept-Language': 'ru', 'User-Agent': APP_NAME },
  })
}

export async function geocodeInKrasnoyarsk(query: string): Promise<[number, number] | null> {
  const q = encodeURIComponent(`Красноярск, ${query.trim()}`)
  const res = await nominatimFetch(`/search?q=${q}&format=json&limit=1`)
  if (!res.ok) return null
  const data = (await res.json()) as { lat: string; lon: string }[]
  const first = data[0]
  if (!first) return null
  return [Number(first.lat), Number(first.lon)]
}

export async function reverseGeocodeOsm(lat: number, lon: number): Promise<string | undefined> {
  const res = await nominatimFetch(`/reverse?lat=${lat}&lon=${lon}&format=json`)
  if (!res.ok) return undefined
  const data = (await res.json()) as { display_name?: string }
  return data.display_name
}

/** Координаты маршрута [lat, lon][] для Leaflet. */
export async function fetchDrivingRoute(from: [number, number], to: [number, number]): Promise<[number, number][]> {
  const [lat1, lon1] = from
  const [lat2, lon2] = to
  const url = `${OSRM_BASE}/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=full&geometries=geojson`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error('Не удалось построить маршрут')
  const data = (await res.json()) as {
    routes?: { geometry?: { coordinates?: [number, number][] } }[]
  }
  const coords = data.routes?.[0]?.geometry?.coordinates
  if (!coords?.length) throw new Error('Маршрут не найден')
  return coords.map(([lon, lat]) => [lat, lon] as [number, number])
}
