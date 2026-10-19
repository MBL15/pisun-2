import { MapPinOff, Navigation } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { SportEvent } from '../api/types'
import { formatShortDate, formatTime, yandexPointUrl, yandexRouteUrl } from '../lib/format'
import { KRASNOYARSK, loadYandexMaps, type YMaps } from '../lib/yandexMaps'

type MapInstance = YMaps

/** Создаёт карту в контейнере и отдаёт её в onReady; при размонтировании уничтожает. */
function useYandexMap(
  options: { center: [number, number]; zoom: number; controls?: string[]; scrollZoom?: boolean },
  onReady: (map: MapInstance, ymaps: YMaps) => void,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapInstance>(null)
  const ymapsRef = useRef<YMaps>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady

  useEffect(() => {
    let cancelled = false
    loadYandexMaps()
      .then((ymaps) => {
        if (cancelled || !containerRef.current) return
        const map = new ymaps.Map(
          containerRef.current,
          { center: options.center, zoom: options.zoom, controls: options.controls ?? ['zoomControl', 'geolocationControl'] },
          { suppressMapOpenBlock: true },
        )
        if (!options.scrollZoom) map.behaviors.disable('scrollZoom')
        mapRef.current = map
        ymapsRef.current = ymaps
        onReadyRef.current(map, ymaps)
        setReady(true)
      })
      .catch((e: Error) => !cancelled && setError(e.message))
    const container = containerRef.current
    const observer = new ResizeObserver(() => {
      const map = mapRef.current
      const element = containerRef.current
      if (!map || !element) return
      const { width, height } = element.getBoundingClientRect()
      const parentWidth = element.parentElement?.clientWidth ?? window.innerWidth
      // карта не должна подгоняться под собственный раздутый размер: иначе контейнер растёт вместе с ней
      if (width < 40 || width > parentWidth + 1 || height < 40 || height > window.innerHeight * 1.2) return
      map.container.fitToViewport()
    })
    if (container) observer.observe(container)
    return () => {
      cancelled = true
      observer.disconnect()
      mapRef.current?.destroy()
      mapRef.current = null
    }
    // карта создаётся один раз; обновления делаются через mapRef
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { containerRef, mapRef, ymapsRef, error, ready }
}

function MapFallback({ message, lat, lon }: { message: string; lat?: number | null; lon?: number | null }) {
  return (
    <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 rounded-xl border-[3px] border-dashed border-ink bg-white p-6 text-center font-medium text-ink">
      <MapPinOff className="size-8 text-slate-600" />
      <p>{message}</p>
      {lat != null && lon != null && (
        <a href={yandexPointUrl(lat, lon)} target="_blank" rel="noreferrer" className="font-semibold text-brand-700 underline">
          Открыть точку в Яндекс Картах
        </a>
      )}
    </div>
  )
}

const PIN_TEMPLATE =
  '<div class="{{ properties.pinClass }}">' +
  '<span class="map-pin__badge"><span class="map-pin__glyph">{{ properties.glyph }}</span></span>' +
  '<span class="map-pin__tail"></span>' +
  '{% if properties.label %}<span class="map-pin__label">{{ properties.label }}</span>{% endif %}' +
  '</div>'

const CLUSTER_TEMPLATE = '<div class="map-cluster">{{ properties.geoObjects.length }}</div>'

let layouts: { pin: YMaps; cluster: YMaps } | null = null

function mapLayouts(ymaps: YMaps) {
  layouts ??= {
    pin: ymaps.templateLayoutFactory.createClass(PIN_TEMPLATE),
    cluster: ymaps.templateLayoutFactory.createClass(CLUSTER_TEMPLATE),
  }
  return layouts
}

/** Область клика с запасом: метка рисуется HTML, и Яндекс Карты ловят события только по этой фигуре. */
const pinShape = (large: boolean) =>
  large
    ? { type: 'Rectangle', coordinates: [[-32, -72], [32, 0]] }
    : { type: 'Rectangle', coordinates: [[-26, -60], [26, 0]] }

function pinClass(options: { club?: boolean; past?: boolean; selected?: boolean; hover?: boolean }) {
  return [
    'map-pin',
    options.club && 'map-pin--club',
    options.past && !options.selected && 'map-pin--past',
    options.selected && 'map-pin--selected',
    options.hover && 'map-pin--hover',
  ]
    .filter(Boolean)
    .join(' ')
}

const DEFAULT_GLYPH = '🏅'

/** Подпись к условным обозначениям: цвет дублируется формой метки. */
export function MapLegend({ showPast = false, className = '' }: { showPast?: boolean; className?: string }) {
  const swatch = 'inline-block size-4 shrink-0 border-2 border-ink'
  return (
    <ul className={`flex flex-wrap gap-x-4 gap-y-1.5 text-sm font-semibold text-ink ${className}`}>
      <li className="inline-flex items-center gap-2">
        <span className={`${swatch} rounded-full bg-pop-blue`} aria-hidden /> события пользователей
      </li>
      <li className="inline-flex items-center gap-2">
        <span className={`${swatch} rounded-[4px] bg-pop-orange`} aria-hidden /> события клубов
      </li>
      <li className="inline-flex items-center gap-2">
        <span className={`${swatch} rounded-full bg-pop-yellow`} aria-hidden /> выбранное
      </li>
      {showPast && (
        <li className="inline-flex items-center gap-2">
          <span className={`${swatch} rounded-full border-dashed bg-slate-200`} aria-hidden /> уже прошло
        </li>
      )}
    </ul>
  )
}

/**
 * Двигает карту, только если точку не видно: она спрятана в кластере или лежит вне свободной зоны.
 * Карточка выбранного события закрывает карту справа на широком экране и снизу на мобильном.
 */
function revealPoint(map: MapInstance, coords: [number, number], clustered: boolean) {
  const projection = map.options.get('projection')
  const [width, height] = map.container.getSize()
  const wide = width >= 640
  const zoom = clustered ? Math.max(map.getZoom() + 2, 15) : map.getZoom()
  const [px, py] = projection.toGlobalPixels(coords, zoom)

  if (!clustered) {
    const [cx, cy] = projection.toGlobalPixels(map.getCenter(), zoom)
    const x = px - cx + width / 2
    const y = py - cy + height / 2
    const free = wide
      ? { left: 48, right: width - 430, top: 80, bottom: height - 16 }
      : { left: 32, right: width - 32, top: 80, bottom: height * 0.55 }
    if (x >= free.left && x <= free.right && y >= free.top && y <= free.bottom) return
  }

  const center = wide ? [px + 200, py] : [px, py + height * 0.2]
  map.setCenter(projection.fromGlobalPixels(center, zoom), zoom, { duration: 300 })
}

/** Все опубликованные мероприятия с кликабельными пинами. */
export function EventsMap({
  events,
  selectedId,
  onSelect,
  className = 'h-[60svh] min-h-96',
}: {
  events: SportEvent[]
  selectedId?: number | null
  onSelect: (event: SportEvent) => void
  className?: string
}) {
  const collectionRef = useRef<MapInstance>(null)
  const { containerRef, mapRef, ymapsRef, error, ready } = useYandexMap(
    { center: KRASNOYARSK, zoom: 12, scrollZoom: true, controls: ['zoomControl', 'geolocationControl', 'fullscreenControl'] },
    (map, ymaps) => {
      collectionRef.current = new ymaps.Clusterer({
        clusterIconLayout: mapLayouts(ymaps).cluster,
        clusterIconShape: { type: 'Circle', coordinates: [0, 0], radius: 28 },
        groupByCoordinates: false,
        clusterDisableClickZoom: false,
        gridSize: 72,
      })
      map.geoObjects.add(collectionRef.current)
    },
  )
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  const fittedKeyRef = useRef('')

  useEffect(() => {
    const ymaps = ymapsRef.current
    const collection = collectionRef.current
    const map = mapRef.current
    if (!ready || !ymaps || !collection || !map) return
    collection.removeAll()
    const withCoords = events.filter((event) => event.latitude != null && event.longitude != null)
    const { pin } = mapLayouts(ymaps)
    const placemarks = new Map<number, MapInstance>()
    withCoords.forEach((event) => {
      const selected = event.id === selectedId
      const look = { club: event.organizerType === 'ORGANIZATION', past: event.past, selected }
      const when = `${formatShortDate(event.startAt)}, ${formatTime(event.startAt)}`
      const placemark = new ymaps.Placemark(
        [event.latitude, event.longitude],
        {
          pinClass: pinClass(look),
          glyph: event.sportEmoji ?? DEFAULT_GLYPH,
          label: selected ? when : '',
          hintContent: selected ? undefined : `${event.title} · ${when}`,
        },
        {
          iconLayout: pin,
          iconShape: pinShape(selected),
          zIndex: selected ? 1000 : event.past ? 100 : 500,
          zIndexHover: 1100,
        },
      )
      placemark.events.add('mouseenter', () => placemark.properties.set('pinClass', pinClass({ ...look, hover: true })))
      placemark.events.add('mouseleave', () => placemark.properties.set('pinClass', pinClass(look)))
      placemark.events.add('click', () => onSelectRef.current(event))
      collection.add(placemark)
      placemarks.set(event.id, placemark)
    })
    const selected = selectedId ? withCoords.find((event) => event.id === selectedId) : undefined
    const placementKey = withCoords.map((event) => event.id).join(',')
    if (selected) {
      const placemark = placemarks.get(selected.id)
      const clustered = Boolean(placemark && collection.getObjectState(placemark)?.isClustered)
      revealPoint(map, [selected.latitude as number, selected.longitude as number], clustered)
    } else if (placementKey !== fittedKeyRef.current) {
      if (withCoords.length > 1) {
        const bounds = collection.getBounds()
        if (bounds) map.setBounds(bounds, { checkZoomRange: true, zoomMargin: 48, duration: 250 }).catch(() => undefined)
      } else if (withCoords.length === 1) {
        map.setCenter([withCoords[0].latitude, withCoords[0].longitude], 14)
      }
    }
    fittedKeyRef.current = placementKey
  }, [events, selectedId, ready, mapRef, ymapsRef])

  if (error) return <div className={className}><MapFallback message={error} /></div>
  return <div ref={containerRef} className={`ymaps-host overflow-hidden rounded-xl border-[3px] border-ink bg-white shadow-md ${className}`} />
}

/** Мини-карта в карточке события с кнопкой маршрута. */
export function MiniMap({
  latitude,
  longitude,
  title,
  emoji,
  club = false,
}: {
  latitude: number
  longitude: number
  title: string
  emoji?: string | null
  club?: boolean
}) {
  const { containerRef, error } = useYandexMap({ center: [latitude, longitude], zoom: 15, controls: ['zoomControl'] }, (map, ymaps) => {
    map.geoObjects.add(
      new ymaps.Placemark(
        [latitude, longitude],
        { hintContent: title, pinClass: pinClass({ club, selected: true }), glyph: emoji ?? DEFAULT_GLYPH, label: '' },
        { iconLayout: mapLayouts(ymaps).pin, iconShape: pinShape(true) },
      ),
    )
  })

  return (
    <div className="space-y-3">
      {error ? (
        <MapFallback message={error} lat={latitude} lon={longitude} />
      ) : (
        <div ref={containerRef} className="ymaps-host h-64 overflow-hidden rounded-xl border-[3px] border-ink bg-white" />
      )}
      <a
        href={yandexRouteUrl(latitude, longitude)}
        target="_blank"
        rel="noreferrer"
        className="lift flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border-[3px] border-ink bg-[#ffcc00] px-5 py-3 text-lg font-bold text-ink shadow-md hover:bg-[#ffd633]"
      >
        <Navigation className="size-5" />
        Построить маршрут в Яндекс Картах
      </a>
    </div>
  )
}
