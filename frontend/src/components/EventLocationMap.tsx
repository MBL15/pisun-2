import { Loader2, MapPin, MapPinOff } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { geocodeAddress, reverseGeocodeAddress, suggestAddresses, type AddressSuggestion } from '../lib/geocoder'
import { hasGeocoderKey, KRASNOYARSK, loadYandexMaps, type YMaps } from '../lib/yandexMaps'
import { Button } from './ui'

type MapHandle = YMaps

type Props = {
  address: string
  latitude: number | null
  longitude: number | null
  addressError?: string
  onAddressChange: (address: string) => void
  onCoordsChange: (latitude: number | null, longitude: number | null) => void
}

const PICK_ZOOM = 16
const DEFAULT_ZOOM = 12

function coordsKey(lat: number | null, lon: number | null): string {
  if (lat == null || lon == null) return ''
  return `${lat.toFixed(6)}:${lon.toFixed(6)}`
}

export function EventLocationMap({ address, latitude, longitude, addressError, onAddressChange, onCoordsChange }: Props) {
  const listId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapHandle | null>(null)
  const ymapsRef = useRef<YMaps | null>(null)
  const placemarkRef = useRef<MapHandle | null>(null)
  const geocodeGenRef = useRef(0)
  const lastSyncedCoords = useRef('')

  const onAddressChangeRef = useRef(onAddressChange)
  const onCoordsChangeRef = useRef(onCoordsChange)
  onAddressChangeRef.current = onAddressChange
  onCoordsChangeRef.current = onCoordsChange

  const [mapError, setMapError] = useState<string | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const [geocodeError, setGeocodeError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [resolvedHint, setResolvedHint] = useState<string | null>(null)

  const syncPlacemark = useCallback((map: MapHandle, ymaps: YMaps, lat: number, lon: number, onDragEnd: (lat: number, lon: number) => void) => {
    const coords: [number, number] = [lat, lon]
    if (placemarkRef.current) {
      placemarkRef.current.geometry.setCoordinates(coords)
      return
    }
    const placemark = new ymaps.Placemark(
      coords,
      { hintContent: 'Перетащите метку, чтобы уточнить место' },
      {
        preset: 'islands#yellowIcon',
        draggable: true,
        zIndex: 1000,
      },
    )
    placemark.events.add('dragend', () => {
      const [nextLat, nextLon] = placemark.geometry.getCoordinates() as [number, number]
      onDragEnd(nextLat, nextLon)
    })
    map.geoObjects.add(placemark)
    placemarkRef.current = placemark
  }, [])

  const removePlacemark = useCallback((map: MapHandle) => {
    if (placemarkRef.current) {
      map.geoObjects.remove(placemarkRef.current)
      placemarkRef.current = null
    }
  }, [])

  const applyCoords = useCallback(async (lat: number, lon: number, source: 'map' | 'drag' | 'search') => {
    const ymaps = ymapsRef.current
    const map = mapRef.current
    if (!ymaps || !map) return

    onCoordsChangeRef.current(lat, lon)
    lastSyncedCoords.current = coordsKey(lat, lon)
    syncPlacemark(map, ymaps, lat, lon, (nextLat, nextLon) => {
      void applyCoordsRef.current(nextLat, nextLon, 'drag')
    })
    map.setCenter([lat, lon], Math.max(map.getZoom(), PICK_ZOOM), { duration: source === 'drag' ? 0 : 250 })

    if (!hasGeocoderKey()) {
      setResolvedHint(null)
      setGeocodeError('Укажите адрес текстом — для автоподстановки нужен ключ Яндекс Карт (VITE_YANDEX_MAPS_API_KEY).')
      return
    }

    const generation = ++geocodeGenRef.current
    setGeocoding(true)
    setGeocodeError(null)
    try {
      const resolved = await reverseGeocodeAddress(ymaps, lat, lon)
      if (generation !== geocodeGenRef.current) return
      if (resolved) {
        onAddressChangeRef.current(resolved)
        setResolvedHint(resolved)
        setGeocodeError(null)
      } else {
        setResolvedHint(null)
        setGeocodeError('Не удалось определить адрес по точке — допишите место вручную.')
      }
    } finally {
      if (generation === geocodeGenRef.current) setGeocoding(false)
    }
  }, [syncPlacemark])

  const applyCoordsRef = useRef(applyCoords)
  useEffect(() => {
    applyCoordsRef.current = applyCoords
  }, [applyCoords])

  const geocodeQuery = useCallback(
    async (query: string) => {
      const ymaps = ymapsRef.current
      const map = mapRef.current
      const trimmed = query.trim()
      if (!ymaps || !map || !trimmed) return

      if (!hasGeocoderKey()) {
        setGeocodeError('Поиск адреса на карте недоступен без ключа VITE_YANDEX_MAPS_API_KEY. Поставьте точку кликом по карте.')
        return
      }

      const generation = ++geocodeGenRef.current
      setGeocoding(true)
      setGeocodeError(null)
      setSuggestOpen(false)
      try {
        const hit = await geocodeAddress(ymaps, trimmed)
        if (generation !== geocodeGenRef.current) return
        if (!hit) {
          setGeocodeError('Адрес не найден. Уточните запрос или кликните по карте в нужном месте.')
          return
        }
        onAddressChangeRef.current(hit.address)
        setResolvedHint(hit.address)
        onCoordsChangeRef.current(hit.latitude, hit.longitude)
        lastSyncedCoords.current = coordsKey(hit.latitude, hit.longitude)
        syncPlacemark(map, ymaps, hit.latitude, hit.longitude, (lat, lon) => {
          void applyCoordsRef.current(lat, lon, 'drag')
        })
        map.setCenter([hit.latitude, hit.longitude], PICK_ZOOM, { duration: 300 })
      } finally {
        if (generation === geocodeGenRef.current) setGeocoding(false)
      }
    },
    [syncPlacemark],
  )

  useEffect(() => {
    let cancelled = false
    const initialLat = latitude
    const initialLon = longitude

    loadYandexMaps()
      .then((ymaps) => {
        if (cancelled || !containerRef.current) return
        ymapsRef.current = ymaps
        const center: [number, number] =
          initialLat != null && initialLon != null ? [initialLat, initialLon] : KRASNOYARSK
        const zoom = initialLat != null && initialLon != null ? PICK_ZOOM : DEFAULT_ZOOM
        const map = new ymaps.Map(
          containerRef.current,
          { center, zoom, controls: ['zoomControl', 'geolocationControl'] },
          { suppressMapOpenBlock: true },
        )
        map.behaviors.disable('scrollZoom')
        mapRef.current = map

        map.events.add('click', (event: YMaps) => {
          const [lat, lon] = event.get('coords') as [number, number]
          void applyCoordsRef.current(lat, lon, 'map')
        })

        if (initialLat != null && initialLon != null) {
          lastSyncedCoords.current = coordsKey(initialLat, initialLon)
          syncPlacemark(map, ymaps, initialLat, initialLon, (lat, lon) => {
            void applyCoordsRef.current(lat, lon, 'drag')
          })
        }

        setMapReady(true)
      })
      .catch((error: Error) => {
        if (!cancelled) setMapError(error.message)
      })

    const element = containerRef.current
    const observer = new ResizeObserver(() => {
      const map = mapRef.current
      const node = containerRef.current
      if (!map || !node) return
      const { width, height } = node.getBoundingClientRect()
      const parentWidth = node.parentElement?.clientWidth ?? window.innerWidth
      if (width < 40 || width > parentWidth + 1 || height < 40 || height > window.innerHeight * 1.2) return
      map.container.fitToViewport()
    })
    if (element) observer.observe(element)

    return () => {
      cancelled = true
      observer.disconnect()
      mapRef.current?.destroy()
      mapRef.current = null
      placemarkRef.current = null
      ymapsRef.current = null
    }
  }, [syncPlacemark])

  useEffect(() => {
    const map = mapRef.current
    const ymaps = ymapsRef.current
    if (!mapReady || !map || !ymaps) return

    const key = coordsKey(latitude, longitude)
    if (key === lastSyncedCoords.current) return
    lastSyncedCoords.current = key

    if (latitude != null && longitude != null) {
      syncPlacemark(map, ymaps, latitude, longitude, (lat, lon) => {
        void applyCoordsRef.current(lat, lon, 'drag')
      })
    } else {
      removePlacemark(map)
    }
  }, [latitude, longitude, mapReady, removePlacemark, syncPlacemark])

  useEffect(() => {
    const ymaps = ymapsRef.current
    if (!mapReady || !ymaps || !hasGeocoderKey()) {
      setSuggestions([])
      return
    }
    const query = address.trim()
    if (query.length < 2) {
      setSuggestions([])
      return
    }
    const timer = window.setTimeout(() => {
      void suggestAddresses(ymaps, query).then((items) => {
        setSuggestions(items)
        setSuggestOpen(items.length > 0)
      })
    }, 280)
    return () => window.clearTimeout(timer)
  }, [address, mapReady])

  const pickSuggestion = (value: string) => {
    onAddressChange(value)
    setSuggestOpen(false)
    setSuggestions([])
    void geocodeQuery(value)
  }

  if (mapError) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border-[3px] border-dashed border-ink bg-white p-6 text-center font-medium text-ink">
        <MapPinOff className="size-8 text-slate-600" />
        <p>{mapError}</p>
        <p className="text-sm text-slate-600">Адрес можно указать текстом — карта необязательна.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <label className="mb-1.5 block text-sm font-bold text-ink" htmlFor={`${listId}-address`}>
          Адрес или место
        </label>
        <div className="flex gap-2">
          <input
            id={`${listId}-address`}
            className="input"
            value={address}
            maxLength={300}
            placeholder="Красноярск, о. Татышев, у главного входа"
            autoComplete="off"
            role="combobox"
            aria-expanded={suggestOpen}
            aria-controls={`${listId}-suggest`}
            aria-invalid={Boolean(addressError)}
            onChange={(e) => {
              onAddressChange(e.target.value)
              setGeocodeError(null)
              setResolvedHint(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void geocodeQuery(address)
              }
              if (e.key === 'Escape') setSuggestOpen(false)
            }}
            onFocus={() => suggestions.length > 0 && setSuggestOpen(true)}
            onBlur={() => window.setTimeout(() => setSuggestOpen(false), 150)}
          />
          <Button type="button" variant="secondary" onClick={() => void geocodeQuery(address)} disabled={!address.trim() || geocoding}>
            {geocoding ? <Loader2 className="size-5 animate-spin" /> : 'Найти'}
          </Button>
        </div>
        {addressError && <p className="mt-1 text-sm font-semibold text-red-700">{addressError}</p>}
        {!hasGeocoderKey() && (
          <p className="mt-1 text-sm text-slate-600">
            Ключ Яндекс Карт не задан: поиск адреса отключён, но точку можно поставить кликом по карте.
          </p>
        )}
        {suggestOpen && suggestions.length > 0 && (
          <ul
            id={`${listId}-suggest`}
            role="listbox"
            className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border-[3px] border-ink bg-white py-1 shadow-md"
          >
            {suggestions.map((item) => (
              <li key={item.value} role="option">
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-pop-yellow/40"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickSuggestion(item.value)}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="relative">
        <div ref={containerRef} className="ymaps-host h-[22rem] overflow-hidden rounded-xl border-[3px] border-ink bg-white sm:h-96" />
        {!mapReady && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-white/80">
            <Loader2 className="size-8 animate-spin text-brand-600" />
          </div>
        )}
        {geocoding && mapReady && (
          <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-2 rounded-lg border-2 border-ink bg-white px-2 py-1 text-sm font-semibold shadow-sm">
            <Loader2 className="size-4 animate-spin" />
            Определяем адрес…
          </div>
        )}
      </div>

      <div className="space-y-1 text-sm text-slate-700">
        <p className="inline-flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 shrink-0 text-brand-600" />
          Кликните по карте или перетащите жёлтую метку. Адрес подставится автоматически, если настроен ключ API.
        </p>
        {latitude != null && longitude != null && (
          <p>
            Координаты: {latitude.toFixed(5)}, {longitude.toFixed(5)}{' '}
            <button
              type="button"
              className="font-semibold underline"
              onClick={() => {
                onCoordsChange(null, null)
                setResolvedHint(null)
                setGeocodeError(null)
                lastSyncedCoords.current = ''
                const map = mapRef.current
                if (map) removePlacemark(map)
              }}
            >
              убрать точку
            </button>
          </p>
        )}
        {resolvedHint && !geocodeError && (
          <p className="rounded-md border-2 border-ink bg-pop-green/40 px-2 py-1 font-medium text-ink">На карте: {resolvedHint}</p>
        )}
        {geocodeError && (
          <p className="inline-block rounded-md border-2 border-ink bg-pop-yellow px-2 py-0.5 font-semibold text-ink">{geocodeError}</p>
        )}
      </div>
    </div>
  )
}
