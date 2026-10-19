/** HTTP Geocoder API (отдельный ключ, не JS API). */

const API_KEY = (import.meta.env.VITE_YANDEX_GEOCODER_API_KEY as string | undefined)?.trim()

type GeocodeResponse = {
  response?: {
    GeoObjectCollection?: {
      featureMember?: Array<{
        GeoObject?: {
          metaDataProperty?: { GeocoderMetaData?: { text?: string } }
          Point?: { pos?: string }
        }
      }>
    }
  }
}

function firstGeoObject(body: GeocodeResponse) {
  return body.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject
}

export function hasHttpGeocoderKey(): boolean {
  return Boolean(API_KEY)
}

export async function geocodeAddress(query: string): Promise<{ lat: number; lon: number; address?: string } | null> {
  if (!API_KEY) return null
  const url = new URL('https://geocode-maps.yandex.ru/1.x/')
  url.searchParams.set('apikey', API_KEY)
  url.searchParams.set('format', 'json')
  url.searchParams.set('results', '1')
  url.searchParams.set('geocode', query)
  const response = await fetch(url)
  if (!response.ok) return null
  const body = (await response.json()) as GeocodeResponse
  const geo = firstGeoObject(body)
  const pos = geo?.Point?.pos
  if (!pos) return null
  const [lonStr, latStr] = pos.split(' ')
  const lat = Number(latStr)
  const lon = Number(lonStr)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  return {
    lat,
    lon,
    address: geo?.metaDataProperty?.GeocoderMetaData?.text,
  }
}

export async function reverseGeocodeCoords(lat: number, lon: number): Promise<string | undefined> {
  if (!API_KEY) return undefined
  const url = new URL('https://geocode-maps.yandex.ru/1.x/')
  url.searchParams.set('apikey', API_KEY)
  url.searchParams.set('format', 'json')
  url.searchParams.set('results', '1')
  url.searchParams.set('geocode', `${lon},${lat}`)
  const response = await fetch(url)
  if (!response.ok) return undefined
  const body = (await response.json()) as GeocodeResponse
  return firstGeoObject(body)?.metaDataProperty?.GeocoderMetaData?.text
}
