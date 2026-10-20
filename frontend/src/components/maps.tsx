import L from 'leaflet'
import { Navigation } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-markercluster'
import type { SportEvent } from '../api/types'
import { formatShortDate, formatTime, osmRouteUrl } from '../lib/format'
import {
  KRASNOYARSK,
  fetchDrivingRoute,
  geocodeInKrasnoyarsk,
  reverseGeocodeOsm,
} from '../lib/osmGeocode'

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

type PinLook = { club?: boolean; past?: boolean; selected?: boolean; hover?: boolean }

function pinClass(look: PinLook): string {
  return [
    'map-pin',
    look.club && 'map-pin--club',
    look.past && !look.selected && 'map-pin--past',
    look.selected && 'map-pin--selected',
    look.hover && 'map-pin--hover',
  ]
    .filter(Boolean)
    .join(' ')
}

function pinHtml(glyph: string, look: PinLook, label?: string): string {
  const labelHtml = label ? `<span class="map-pin__label">${label}</span>` : ''
  return `<div class="${pinClass(look)}"><span class="map-pin__badge"><span class="map-pin__glyph">${glyph}</span></span><span class="map-pin__tail"></span>${labelHtml}</div>`
}

function pickerHtml(): string {
  return (
    '<div class="map-pin map-pin--picker">' +
    '<span class="map-pin__badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg></span>' +
    '<span class="map-pin__tail"></span></div>'
  )
}

function divPinIcon(glyph: string, look: PinLook, label?: string, large = false) {
  return L.divIcon({
    className: '',
    html: pinHtml(glyph, look, label),
    iconSize: large ? [64, 72] : [52, 60],
    iconAnchor: large ? [32, 72] : [26, 60],
  })
}

const pickerIcon = L.divIcon({
  className: '',
  html: pickerHtml(),
  iconSize: [64, 72],
  iconAnchor: [32, 72],
})

function touchDragEnabled(touchPreview?: boolean): boolean {
  if (!touchPreview) return true
  return !window.matchMedia('(pointer: coarse)').matches
}

const DEFAULT_GLYPH = '🏅'

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

function FitEventsBounds({ events, selectedId }: { events: SportEvent[]; selectedId?: number | null }) {
  const map = useMap()
  const fittedKeyRef = useRef('')

  useEffect(() => {
    const withCoords = events.filter((e) => e.latitude != null && e.longitude != null)
    const selected = selectedId ? withCoords.find((e) => e.id === selectedId) : undefined
    if (selected) {
      const lat = selected.latitude as number
      const lon = selected.longitude as number
      const size = map.getSize()
      const wide = size.x >= 640
      const offset: [number, number] = wide ? [200, 0] : [0, size.y * 0.2]
      const target = map.project([lat, lon], map.getZoom()).subtract(L.point(offset))
      map.panTo(map.unproject(target, map.getZoom()), { animate: true })
      return
    }
    const key = withCoords.map((e) => e.id).join(',')
    if (key === fittedKeyRef.current || withCoords.length === 0) return
    fittedKeyRef.current = key
    if (withCoords.length === 1) {
      map.setView([withCoords[0].latitude as number, withCoords[0].longitude as number], 14)
    } else {
      const bounds = L.latLngBounds(withCoords.map((e) => [e.latitude as number, e.longitude as number] as [number, number]))
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 })
    }
  }, [events, selectedId, map])

  return null
}

function EventPin({
  event,
  selected,
  onSelect,
}: {
  event: SportEvent
  selected: boolean
  onSelect: (event: SportEvent) => void
}) {
  const [hover, setHover] = useState(false)
  const lat = event.latitude as number
  const lon = event.longitude as number
  const look: PinLook = { club: event.organizerType === 'ORGANIZATION', past: event.past, selected, hover }
  const when = `${formatShortDate(event.startAt)}, ${formatTime(event.startAt)}`
  const icon = useMemo(
    () => divPinIcon(event.sportEmoji ?? DEFAULT_GLYPH, look, selected ? when : undefined, selected),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [event.id, selected, hover, event.sportEmoji, when],
  )

  return (
    <Marker
      position={[lat, lon]}
      icon={icon}
      zIndexOffset={selected ? 1000 : event.past ? 100 : 500}
      eventHandlers={{
        click: () => onSelect(event),
        mouseover: () => setHover(true),
        mouseout: () => setHover(false),
      }}
      title={selected ? undefined : `${event.title} · ${when}`}
    />
  )
}

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
  const withCoords = events.filter((e) => e.latitude != null && e.longitude != null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  return (
    <MapContainer
      center={KRASNOYARSK}
      zoom={12}
      scrollWheelZoom
      className={`map-host overflow-hidden rounded-xl border-[3px] border-ink bg-white shadow-md ${className}`}
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <MarkerClusterGroup chunkedLoading showCoverageOnHover={false}>
        {withCoords.map((event) => (
          <EventPin
            key={event.id}
            event={event}
            selected={event.id === selectedId}
            onSelect={(e) => onSelectRef.current(e)}
          />
        ))}
      </MarkerClusterGroup>
      <FitEventsBounds events={events} selectedId={selectedId} />
    </MapContainer>
  )
}

function PickPointInner({
  latitude,
  longitude,
  onPick,
}: {
  latitude: number | null
  longitude: number | null
  onPick: (lat: number, lon: number, address?: string) => void
}) {
  const [pos, setPos] = useState<[number, number] | null>(
    latitude != null && longitude != null ? [latitude, longitude] : null,
  )
  const onPickRef = useRef(onPick)
  onPickRef.current = onPick

  const place = useCallback(async (lat: number, lon: number) => {
    setPos([lat, lon])
    const address = await reverseGeocodeOsm(lat, lon).catch(() => undefined)
    onPickRef.current(lat, lon, address)
  }, [])

  useMapEvents({
    click(e) {
      void place(e.latlng.lat, e.latlng.lng)
    },
  })

  useEffect(() => {
    if (latitude != null && longitude != null) setPos([latitude, longitude])
  }, [latitude, longitude])

  if (!pos) return null
  return (
    <Marker
      position={pos}
      icon={pickerIcon}
      draggable
      eventHandlers={{
        dragend: (e) => {
          const { lat, lng } = e.target.getLatLng()
          void place(lat, lng)
        },
      }}
    />
  )
}

export function PickPointMap({
  latitude,
  longitude,
  onPick,
  searchQuery,
}: {
  latitude: number | null
  longitude: number | null
  onPick: (lat: number, lon: number, address?: string) => void
  searchQuery?: string
}) {
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const center: [number, number] = latitude != null && longitude != null ? [latitude, longitude] : KRASNOYARSK
  const zoom = latitude != null ? 15 : 12

  const findAddress = async () => {
    if (!searchQuery?.trim()) return
    setSearching(true)
    setSearchError(null)
    try {
      const coords = await geocodeInKrasnoyarsk(searchQuery)
      if (!coords) throw new Error('not found')
      onPick(coords[0], coords[1])
    } catch {
      setSearchError('Не удалось найти адрес — кликните по карте в нужном месте')
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="space-y-2">
      <MapContainer center={center} zoom={zoom} className="map-host h-80 overflow-hidden rounded-xl border-[3px] border-ink bg-white">
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <PickPointInner latitude={latitude} longitude={longitude} onPick={onPick} />
      </MapContainer>
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
        <span>Кликните по карте или перетащите метку. Адрес подставится через OpenStreetMap.</span>
        {searchQuery && (
          <button type="button" onClick={findAddress} disabled={searching} className="font-semibold text-brand-700 underline">
            {searching ? 'Ищем…' : 'Найти введённый адрес на карте'}
          </button>
        )}
      </div>
      {searchError && <p className="inline-block rounded-md border-2 border-ink bg-pop-yellow px-2 py-0.5 text-sm font-semibold text-ink">{searchError}</p>}
    </div>
  )
}

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
  const icon = useMemo(
    () => divPinIcon(emoji ?? DEFAULT_GLYPH, { club, selected: true }, '', true),
    [emoji, club],
  )

  return (
    <div className="space-y-3">
      <MapContainer
        center={[latitude, longitude]}
        zoom={15}
        dragging={touchDragEnabled(true)}
        scrollWheelZoom={false}
        className="map-host h-64 overflow-hidden rounded-xl border-[3px] border-ink bg-white"
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <Marker position={[latitude, longitude]} icon={icon} title={title} />
      </MapContainer>
      <a
        href={osmRouteUrl(latitude, longitude)}
        target="_blank"
        rel="noreferrer"
        className="lift flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border-[3px] border-ink bg-[#ffcc00] px-5 py-3 text-lg font-bold text-ink shadow-md hover:bg-[#ffd633]"
      >
        <Navigation className="size-5" />
        Построить маршрут в OpenStreetMap
      </a>
    </div>
  )
}

function RoutePolyline({ points }: { points: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [32, 32] })
    }
  }, [points, map])
  if (points.length < 2) return null
  return <Polyline pathOptions={{ color: '#2563eb', weight: 5, opacity: 0.85 }} positions={points} />
}

export function EventRoutePlanner({
  latitude,
  longitude,
  eventTitle,
}: {
  latitude: number
  longitude: number
  eventTitle: string
}) {
  const [from, setFrom] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [route, setRoute] = useState<[number, number][]>([])

  const build = async () => {
    if (!from.trim()) {
      setError('Укажите, откуда вы поедете')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const start = await geocodeInKrasnoyarsk(from.trim())
      if (!start) throw new Error('Не нашли адрес отправления — уточните формулировку')
      const points = await fetchDrivingRoute(start, [latitude, longitude])
      setRoute(points)
    } catch (e) {
      setRoute([])
      setError(e instanceof Error ? e.message : 'Не удалось построить маршрут')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3 rounded-xl border-[3px] border-ink bg-pop-blue/25 p-4">
      <p className="font-bold">Как добраться до «{eventTitle}»</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          className="input flex-1"
          placeholder="Откуда ехать: дом, метро, адрес"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <button
          type="button"
          onClick={build}
          disabled={busy}
          className="lift min-h-11 rounded-xl border-[3px] border-ink bg-[#ffcc00] px-4 font-bold shadow-md hover:bg-[#ffd633] disabled:opacity-60"
        >
          {busy ? 'Строим…' : 'Показать маршрут'}
        </button>
      </div>
      {error && <p className="text-sm font-semibold text-red-700">{error}</p>}
      <MapContainer
        center={[latitude, longitude]}
        zoom={11}
        dragging={touchDragEnabled(true)}
        className="map-host h-72 overflow-hidden rounded-xl border-[3px] border-ink bg-white"
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <Marker position={[latitude, longitude]} icon={divPinIcon('📍', { selected: true }, '', true)} />
        <RoutePolyline points={route} />
      </MapContainer>
      <a href={osmRouteUrl(latitude, longitude, from)} target="_blank" rel="noreferrer" className="text-sm font-semibold text-brand-700 underline">
        Открыть маршрут на openstreetmap.org
      </a>
    </div>
  )
}
