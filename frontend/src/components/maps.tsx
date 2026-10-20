import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { Navigation } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import type { SportEvent } from '../api/types'
import { formatShortDate, formatTime } from '../lib/format'
import { KRASNOYARSK, geocodeAddress, osmRouteUrl, reverseGeocode } from '../lib/osmGeocode'

L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

const DEFAULT_GLYPH = '🏅'
const TILE = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

function pinClass(options: { club?: boolean; past?: boolean; selected?: boolean }) {
  return [
    'map-pin',
    options.club && 'map-pin--club',
    options.past && !options.selected && 'map-pin--past',
    options.selected && 'map-pin--selected',
  ]
    .filter(Boolean)
    .join(' ')
}

function PinMarker({
  emoji,
  label,
  club,
  past,
  selected,
}: {
  emoji: string
  label?: string
  club?: boolean
  past?: boolean
  selected?: boolean
}) {
  const html = `<div class="${pinClass({ club, past, selected })}"><span class="map-pin__badge"><span class="map-pin__glyph">${emoji}</span></span><span class="map-pin__tail"></span>${label ? `<span class="map-pin__label">${label}</span>` : ''}</div>`
  const icon = L.divIcon({ html, className: 'map-pin-host', iconSize: [64, 72], iconAnchor: [32, 72] })
  return icon
}

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

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap()
  const key = points.map((p) => p.join(',')).join('|')
  useEffect(() => {
    if (points.length === 0) return
    if (points.length === 1) {
      map.setView(points[0], 14)
      return
    }
    map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 14 })
  }, [key, map, points])
  return null
}

function PanToSelected({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap()
  useEffect(() => {
    map.panTo([lat, lon], { animate: true })
  }, [lat, lon, map])
  return null
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
  const withCoords = useMemo(
    () => events.filter((e) => e.latitude != null && e.longitude != null),
    [events],
  )
  const points = useMemo(
    () => withCoords.map((e) => [e.latitude as number, e.longitude as number] as [number, number]),
    [withCoords],
  )
  const selected = selectedId ? withCoords.find((e) => e.id === selectedId) : undefined

  return (
    <MapContainer center={[KRASNOYARSK.lat, KRASNOYARSK.lon]} zoom={12} scrollWheelZoom className={`leaflet-host overflow-hidden rounded-xl border-[3px] border-ink bg-white shadow-md ${className}`}>
      <TileLayer url={TILE} attribution={ATTRIBUTION} />
      {!selected && points.length > 0 && <FitBounds points={points} />}
      {selected && selected.latitude != null && selected.longitude != null && (
        <PanToSelected lat={selected.latitude} lon={selected.longitude} />
      )}
      {withCoords.map((event) => {
        const selectedMark = event.id === selectedId
        const when = `${formatShortDate(event.startAt)}, ${formatTime(event.startAt)}`
        const icon = PinMarker({
          emoji: event.sportEmoji ?? DEFAULT_GLYPH,
          label: selectedMark ? when : undefined,
          club: event.organizerType === 'ORGANIZATION',
          past: event.past,
          selected: selectedMark,
        })
        return (
          <Marker
            key={event.id}
            position={[event.latitude as number, event.longitude as number]}
            icon={icon}
            eventHandlers={{ click: () => onSelect(event) }}
          >
            {!selectedMark && (
              <Popup>
                <strong>{event.title}</strong>
                <br />
                {when}
              </Popup>
            )}
          </Marker>
        )
      })}
    </MapContainer>
  )
}

/** Зум колёсиком только когда курсор над картой — страница при этом не прокручивается. */
function ScrollWheelZoomOnHover() {
  const map = useMap()
  useEffect(() => {
    map.scrollWheelZoom.disable()
    const container = map.getContainer()
    const enable = () => map.scrollWheelZoom.enable()
    const disable = () => map.scrollWheelZoom.disable()
    container.addEventListener('mouseenter', enable)
    container.addEventListener('mouseleave', disable)
    container.addEventListener('focusin', enable)
    container.addEventListener('focusout', disable)
    return () => {
      container.removeEventListener('mouseenter', enable)
      container.removeEventListener('mouseleave', disable)
      container.removeEventListener('focusin', enable)
      container.removeEventListener('focusout', disable)
      map.scrollWheelZoom.disable()
    }
  }, [map])
  return null
}

function PickPointInner({
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
  const map = useMap()
  const [position, setPosition] = useState<[number, number] | null>(
    latitude != null && longitude != null ? [latitude, longitude] : null,
  )
  const onPickRef = useRef(onPick)
  onPickRef.current = onPick
  const lastSearch = useRef<string | undefined>(undefined)
  const positionRef = useRef(position)
  positionRef.current = position

  const updatePoint = useCallback(async (lat: number, lon: number, syncAddress: boolean) => {
    setPosition([lat, lon])
    if (syncAddress) {
      const address = await reverseGeocode(lat, lon).catch(() => undefined)
      onPickRef.current(lat, lon, address)
    } else {
      onPickRef.current(lat, lon)
    }
  }, [])

  useMapEvents({
    click(e) {
      void updatePoint(e.latlng.lat, e.latlng.lng, true)
    },
  })

  useEffect(() => {
    if (latitude != null && longitude != null) {
      setPosition([latitude, longitude])
    }
  }, [latitude, longitude])

  useEffect(() => {
    const q = searchQuery?.trim()
    if (!q || q === lastSearch.current) return
    lastSearch.current = q
    let cancelled = false
    void (async () => {
      const pos = positionRef.current
      const near =
        latitude != null && longitude != null
          ? { lat: latitude, lon: longitude }
          : pos
            ? { lat: pos[0], lon: pos[1] }
            : undefined
      const hit = await geocodeAddress(q, near).catch(() => null)
      if (cancelled || !hit) return
      setPosition([hit.lat, hit.lon])
      map.setView([hit.lat, hit.lon], Math.max(map.getZoom(), 16), { animate: true })
      onPickRef.current(hit.lat, hit.lon, hit.address)
    })()
    return () => {
      cancelled = true
    }
  }, [searchQuery, latitude, longitude, map])

  if (!position) return null

  const pickerIcon = L.divIcon({
    html: `<div class="map-pin map-pin--picker"><span class="map-pin__badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg></span><span class="map-pin__tail"></span></div>`,
    className: 'map-pin-host',
    iconSize: [64, 72],
    iconAnchor: [32, 72],
  })

  return (
    <Marker
      position={position}
      icon={pickerIcon}
      draggable
      eventHandlers={{
        dragend: (e) => {
          const { lat, lng } = e.target.getLatLng()
          void updatePoint(lat, lng, true)
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
  const center: [number, number] = latitude != null && longitude != null ? [latitude, longitude] : [KRASNOYARSK.lat, KRASNOYARSK.lon]
  const zoom = latitude != null ? 16 : 12

  return (
    <div className="space-y-2">
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={false} className="leaflet-host h-64 overflow-hidden rounded-xl border-[3px] border-ink bg-white sm:h-80">
        <TileLayer url={TILE} attribution={ATTRIBUTION} />
        <ScrollWheelZoomOnHover />
        <PickPointInner latitude={latitude} longitude={longitude} onPick={onPick} searchQuery={searchQuery} />
      </MapContainer>
      <p className="text-sm text-muted">
        Кликните по карте или перетащите метку — в строке появится адрес «город, улица, дом». Наведите курсор на карту и прокрутите колёсико, чтобы приблизить. Кнопка «На карте» ищет введённый адрес.
      </p>
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
  const icon = PinMarker({ emoji: emoji ?? DEFAULT_GLYPH, club, selected: true })
  return (
    <div className="space-y-3">
      <MapContainer center={[latitude, longitude]} zoom={15} scrollWheelZoom={false} dragging={false} className="leaflet-host h-64 overflow-hidden rounded-xl border-[3px] border-ink bg-white">
        <TileLayer url={TILE} attribution={ATTRIBUTION} />
        <Marker position={[latitude, longitude]} icon={icon}>
          <Popup>{title}</Popup>
        </Marker>
      </MapContainer>
      <a
        href={osmRouteUrl(latitude, longitude)}
        target="_blank"
        rel="noreferrer"
        className="lift flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border-[3px] border-ink bg-pop-green px-4 py-3 text-center font-bold leading-tight text-[#111111] shadow-md hover:bg-pop-green/80 sm:px-5 sm:text-lg"
      >
        <Navigation className="size-5 shrink-0" />
        Открыть маршрут в OpenStreetMap
      </a>
    </div>
  )
}

function RouteLayer({ from, to }: { from: [number, number]; to: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    const group = L.layerGroup().addTo(map)
    const line = L.polyline([from, to], { color: '#2563eb', weight: 5, opacity: 0.85 })
    line.addTo(group)
    map.fitBounds(L.latLngBounds([from, to]), { padding: [40, 40] })
    return () => {
      group.remove()
    }
  }, [from, to, map])
  return null
}

export function EventRoutePlanner({ latitude, longitude, eventTitle }: { latitude: number; longitude: number; eventTitle: string }) {
  const [from, setFrom] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [start, setStart] = useState<[number, number] | null>(null)
  const dest: [number, number] = [latitude, longitude]

  const build = async () => {
    if (!from.trim()) {
      setError('Укажите, откуда вы поедете')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const hit = await geocodeAddress(from.trim())
      if (!hit) throw new Error('Не нашли адрес отправления — уточните формулировку')
      setStart([hit.lat, hit.lon])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось построить маршрут')
      setStart(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3 rounded-xl border-[3px] border-ink bg-pop-blue/25 p-4">
      <p className="font-bold">Как добраться до «{eventTitle}»</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input className="input flex-1" placeholder="Откуда ехать: дом, метро, адрес" value={from} onChange={(e) => setFrom(e.target.value)} />
        <button type="button" onClick={build} disabled={busy} className="lift min-h-11 rounded-xl border-[3px] border-ink bg-pop-green px-4 font-bold shadow-md hover:bg-pop-green/80 disabled:opacity-60">
          {busy ? 'Ищем…' : 'Показать на карте'}
        </button>
      </div>
      {error && <p className="text-sm font-semibold text-red-700">{error}</p>}
      <MapContainer center={dest} zoom={11} scrollWheelZoom className="leaflet-host h-72 overflow-hidden rounded-xl border-[3px] border-ink bg-white">
        <TileLayer url={TILE} attribution={ATTRIBUTION} />
        <Marker position={dest} icon={PinMarker({ emoji: DEFAULT_GLYPH, selected: true })} />
        {start && <RouteLayer from={start} to={dest} />}
        {start && <Marker position={start} />}
      </MapContainer>
      <a href={osmRouteUrl(latitude, longitude, from)} target="_blank" rel="noreferrer" className="text-sm font-semibold text-brand-700 underline">
        Построить маршрут в OpenStreetMap
      </a>
    </div>
  )
}
