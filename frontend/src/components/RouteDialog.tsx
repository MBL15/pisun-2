import { Navigation } from 'lucide-react'
import { useEffect, useState } from 'react'
import { mapsApi } from '../api/endpoints'
import type { RoutePlan } from '../api/types'
import { loadYandexMaps } from '../lib/yandexMaps'
import { Button, Field, Modal } from './ui'

const modes = [
  { id: 'walking', label: 'Пешком' },
  { id: 'auto', label: 'На авто' },
  { id: 'transit', label: 'Транспорт' },
] as const

export function RouteDialog({
  title,
  latitude,
  longitude,
  onClose,
}: {
  title: string
  latitude: number
  longitude: number
  onClose: () => void
}) {
  const [origin, setOrigin] = useState('')
  const [mode, setMode] = useState<(typeof modes)[number]['id']>('walking')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [plan, setPlan] = useState<RoutePlan | null>(null)

  const build = async () => {
    setBusy(true)
    setError(null)
    try {
      const places = await mapsApi.geocode(origin)
      if (places.length === 0) {
        setError('Адрес не нашёлся. Напишите улицу и город, например: Красноярск, Красной Армии 10.')
        setPlan(null)
        return
      }
      const from = places[0]
      const route = await mapsApi.route(from.latitude, from.longitude, latitude, longitude, mode)
      setPlan(route)
    } catch (e) {
      setPlan(null)
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open title={`Как добраться: ${title}`} onClose={onClose} wide>
      <div className="space-y-4">
        <Field label="Откуда едете" hint="Яндекс найдёт адрес и построит путь до площадки">
          <input className="input" value={origin} placeholder="Красноярск, улица и дом" onChange={(e) => setOrigin(e.target.value)} />
        </Field>
        <div className="flex flex-wrap gap-2">
          {modes.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setMode(item.id)}
              className={`rounded-lg border-2 border-ink px-3 py-1.5 text-sm font-bold ${mode === item.id ? 'bg-pop-yellow' : 'bg-white'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <Button type="button" onClick={build} loading={busy} disabled={origin.trim().length < 3} icon={<Navigation className="size-4" />}>
          Построить маршрут
        </Button>
        {error && <p className="rounded-lg border-2 border-ink bg-pop-yellow px-3 py-2 text-sm font-semibold">{error}</p>}
        {plan && (
          <div className="space-y-3">
            <p className="font-bold">
              {formatDistance(plan.distanceMeters)} · {formatDuration(plan.durationSeconds)}
            </p>
            <RouteMap plan={plan} latitude={latitude} longitude={longitude} />
          </div>
        )}
      </div>
    </Modal>
  )
}

function RouteMap({ plan, latitude, longitude }: { plan: RoutePlan; latitude: number; longitude: number }) {
  const [host, setHost] = useState<HTMLDivElement | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!host) return
    let map: { destroy: () => void; geoObjects: { add: (object: unknown) => void }; setBounds: (bounds: unknown, options: unknown) => void } | null = null
    let cancelled = false
    loadYandexMaps()
      .then((ymaps) => {
        if (cancelled) return
        const coords = plan.points.map((point) => [point.latitude, point.longitude])
        const created = new ymaps.Map(host, { center: [latitude, longitude], zoom: 13, controls: ['zoomControl'] }, { suppressMapOpenBlock: true })
        map = created
        const line = new ymaps.Polyline(coords, {}, { strokeColor: '#111111', strokeWidth: 4 })
        created.geoObjects.add(line)
        if (coords.length > 1) {
          created.setBounds(line.geometry.getBounds(), { checkZoomRange: true, zoomMargin: 24 })
        }
      })
      .catch((e: Error) => setError(e.message))
    return () => {
      cancelled = true
      if (map && typeof map.destroy === 'function') map.destroy()
    }
  }, [host, plan, latitude, longitude])

  if (error) return <p className="text-sm">{error}</p>
  return <div ref={setHost} className="ymaps-host h-72 overflow-hidden rounded-xl border-[3px] border-ink" />
}

function formatDistance(meters: number) {
  if (meters < 1000) return `${meters} м`
  return `${(meters / 1000).toFixed(1)} км`
}

function formatDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60))
  if (minutes < 60) return `${minutes} мин`
  return `${Math.floor(minutes / 60)} ч ${minutes % 60} мин`
}
