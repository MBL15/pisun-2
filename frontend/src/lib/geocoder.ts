import type { YMaps } from './yandexMaps'
import { KRASNOYARSK_BOUNDS } from './yandexMaps'

export type GeocodeHit = {
  latitude: number
  longitude: number
  address: string
}

function withCity(query: string): string {
  const trimmed = query.trim()
  if (!trimmed) return trimmed
  return /красноярск/i.test(trimmed) ? trimmed : `Красноярск, ${trimmed}`
}

function hitFromGeoObject(geo: YMaps): GeocodeHit | null {
  if (!geo?.geometry) return null
  const coords = geo.geometry.getCoordinates() as [number, number] | undefined
  if (!coords || coords.length < 2) return null
  const address =
    (typeof geo.getAddressLine === 'function' && geo.getAddressLine()) ||
    (typeof geo.properties?.get === 'function' && geo.properties.get('text')) ||
    ''
  return {
    latitude: coords[0],
    longitude: coords[1],
    address: String(address).trim() || `${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}`,
  }
}

/** Прямой геокод: текст → координаты и нормализованный адрес. */
export async function geocodeAddress(ymaps: YMaps, query: string): Promise<GeocodeHit | null> {
  const search = withCity(query)
  if (!search) return null
  const result = await ymaps.geocode(search, {
    results: 1,
    boundedBy: KRASNOYARSK_BOUNDS,
    strictBounds: false,
  })
  return hitFromGeoObject(result.geoObjects.get(0))
}

/** Обратный геокод: координаты → адрес для поля формы. */
export async function reverseGeocodeAddress(ymaps: YMaps, latitude: number, longitude: number): Promise<string | null> {
  try {
    for (const kind of ['house', 'street', 'locality'] as const) {
      const result = await ymaps.geocode([latitude, longitude], { results: 1, kind })
      const hit = hitFromGeoObject(result.geoObjects.get(0))
      if (hit?.address) return hit.address
    }
    const fallback = await ymaps.geocode([latitude, longitude], { results: 1 })
    return hitFromGeoObject(fallback.geoObjects.get(0))?.address ?? null
  } catch {
    return null
  }
}

export type AddressSuggestion = { value: string; label: string }

/** Подсказки адреса (нужен API-ключ в URL скрипта карт). */
export async function suggestAddresses(ymaps: YMaps, query: string): Promise<AddressSuggestion[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2 || typeof ymaps.suggest !== 'function') return []
  try {
    const items = await ymaps.suggest(withCity(trimmed), {
      results: 7,
      boundedBy: KRASNOYARSK_BOUNDS,
    })
    return (items as { value: string; displayName?: string }[]).map((item) => ({
      value: item.value,
      label: item.displayName ?? item.value,
    }))
  } catch {
    return []
  }
}
