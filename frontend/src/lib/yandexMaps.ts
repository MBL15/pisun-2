/* Минимальный загрузчик Yandex Maps JS API 2.1 без сторонних обёрток. */

export type YMaps = any

declare global {
  interface Window {
    ymaps?: YMaps
  }
}

export const KRASNOYARSK: [number, number] = [56.0153, 92.8932]

let loading: Promise<YMaps> | null = null

export function loadYandexMaps(): Promise<YMaps> {
  if (window.ymaps?.Map) return Promise.resolve(window.ymaps)
  if (loading) return loading

  loading = new Promise((resolve, reject) => {
    const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY as string | undefined
    const script = document.createElement('script')
    script.src = `https://api-maps.yandex.ru/2.1/?lang=ru_RU${apiKey ? `&apikey=${apiKey}` : ''}`
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
  const maps = (import.meta.env.VITE_YANDEX_MAPS_API_KEY as string | undefined)?.trim()
  const geocoder = (import.meta.env.VITE_YANDEX_GEOCODER_API_KEY as string | undefined)?.trim()
  return Boolean(maps || geocoder)
}
