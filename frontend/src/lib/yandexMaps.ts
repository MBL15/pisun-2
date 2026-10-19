/* Минимальный загрузчик Yandex Maps JS API 2.1 без сторонних обёрток. */

export type YMaps = any

declare global {
  interface Window {
    ymaps?: YMaps
  }
}

export const KRASNOYARSK: [number, number] = [56.0153, 92.8932]

/** Ограничение поиска адреса и подсказок — Красноярск и окрестности. */
export const KRASNOYARSK_BOUNDS: [[number, number], [number, number]] = [
  [56.005, 92.65],
  [56.18, 93.15],
]

let loading: Promise<YMaps> | null = null

export function loadYandexMaps(): Promise<YMaps> {
  if (window.ymaps?.Map) return Promise.resolve(window.ymaps)
  if (loading) return loading

  loading = new Promise((resolve, reject) => {
    const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY as string | undefined
    const script = document.createElement('script')
    const params = new URLSearchParams({
      lang: 'ru_RU',
      load: 'package.full,suggest',
    })
    if (apiKey) params.set('apikey', apiKey)
    script.src = `https://api-maps.yandex.ru/2.1/?${params.toString()}`
    script.async = true
    script.onload = () => {
      if (!window.ymaps) {
        loading = null
        reject(new Error('Яндекс Карты не инициализировались'))
        return
      }
      window.ymaps.ready(() => resolve(window.ymaps))
    }
    script.onerror = () => {
      loading = null
      script.remove()
      reject(new Error('Не удалось загрузить Яндекс Карты — проверьте подключение к интернету'))
    }
    document.head.appendChild(script)
  })
  return loading
}

export function hasGeocoderKey(): boolean {
  return Boolean(import.meta.env.VITE_YANDEX_MAPS_API_KEY)
}
