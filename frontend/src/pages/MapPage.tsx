import { CalendarDays, MapPinOff, Navigation } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { eventsApi } from '../api/endpoints'
import type { SportEvent } from '../api/types'
import { EventsMap, MapLegend } from '../components/maps'
import { Button, ErrorBox, Spinner } from '../components/ui'
import { formatRelativeDay, formatTime, plural, sportTone } from '../lib/format'
import { useAsync } from '../lib/useAsync'

export function MapPage() {
  const navigate = useNavigate()
  const events = useAsync(() => eventsApi.list({ includePast: true }), [])
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const all = events.data ?? []
  const located = all.filter((event) => event.latitude != null && event.longitude != null)
  const withoutPoint = all.filter((event) => event.latitude == null || event.longitude == null)
  const selected = located.find((event) => event.id === selectedId) ?? null

  return (
    <div className="flex flex-col gap-4 lg:-mb-6 lg:h-[calc(100svh_-_9.5rem)] lg:flex-row">
      <section className="relative h-[calc(100svh_-_var(--mobile-nav-h)_-_10rem)] min-h-80 shrink-0 overflow-hidden lg:h-auto lg:min-h-0 lg:flex-1">
        {events.loading && !events.data && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl border-[3px] border-ink bg-white">
            <Spinner label="Загружаем карту…" />
          </div>
        )}
        {events.error && <ErrorBox error={events.error} onRetry={events.reload} />}
        {events.data && (
          <EventsMap
            events={located}
            selectedId={selectedId}
            onSelect={(event) => setSelectedId(event.id)}
            className="h-full"
          />
        )}
        {selected && (
          <article className="card absolute inset-x-2 bottom-2 z-10 flex max-h-[calc(100%-1rem)] flex-col gap-1.5 overflow-y-auto p-3 sm:inset-x-3 sm:bottom-3 sm:left-auto sm:w-96 sm:gap-2 sm:p-4">
            <div className="flex items-start justify-between gap-2">
              <span className={`rounded-md border-2 border-ink px-2 py-0.5 text-sm font-bold ${sportTone(selected.sportTypeId)}`}>
                <span aria-hidden>{selected.sportEmoji} </span>
                {selected.sportName}
              </span>
              <button onClick={() => setSelectedId(null)} className="rounded-md border-2 border-ink bg-white px-2 py-0.5 text-sm font-bold hover:bg-pop-yellow" aria-label="Закрыть">
                Закрыть
              </button>
            </div>
            <h2 className="line-clamp-2 text-base leading-snug sm:text-lg">{selected.title}</h2>
            <p className="line-clamp-2 flex items-start gap-2 text-sm font-medium">
              <CalendarDays className="mt-0.5 size-4 shrink-0" aria-hidden />
              {formatRelativeDay(selected.startAt)}, {formatTime(selected.startAt)} · {selected.address}
            </p>
            <Button size="sm" onClick={() => navigate(`/events/${selected.id}`)} icon={<Navigation className="size-4" aria-hidden />}>
              Подробнее и запись
            </Button>
          </article>
        )}
      </section>

      <aside className="flex w-full shrink-0 flex-col gap-3 lg:w-80 lg:overflow-y-auto">
        <div className="rounded-xl border-[3px] border-ink bg-white px-4 py-3 shadow-sm">
          <h1 className="text-xl">Карта мероприятий</h1>
          <p className="mt-1 text-sm font-medium text-muted">
            {located.length === 0
              ? 'Пока нет мероприятий с точкой на карте.'
              : `На карте ${located.length} ${plural(located.length, 'мероприятие', 'мероприятия', 'мероприятий')}. Нажмите на метку или выберите из списка.`}
          </p>
          {located.length > 0 && <MapLegend showPast={located.some((event) => event.past)} className="mt-3" />}
        </div>
        {located.map((event) => (
          <EventRow key={event.id} event={event} active={event.id === selectedId} onSelect={() => setSelectedId(event.id)} />
        ))}
        {withoutPoint.length > 0 && (
          <p className="flex items-start gap-2 rounded-xl border-[3px] border-dashed border-ink bg-white p-3 text-sm font-medium">
            <MapPinOff className="size-5 shrink-0" aria-hidden />
            Без точки на карте: {withoutPoint.map((event) => event.title).join(', ')}
          </p>
        )}
      </aside>
    </div>
  )
}

function EventRow({ event, active, onSelect }: { event: SportEvent; active: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      aria-pressed={active}
      className={`rounded-xl border-[3px] border-ink p-3 text-left transition ${
        active ? 'translate-x-0.5 translate-y-0.5 bg-pop-yellow' : 'bg-white shadow-sm hover:bg-pop-yellow/40'
      }`}
    >
      <span className="text-sm font-bold">
        <span aria-hidden>{event.sportEmoji} </span>
        {event.sportName}
      </span>
      <span className="mt-0.5 block font-bold leading-snug">{event.title}</span>
      <span className="mt-1 block text-sm text-muted">
        {formatRelativeDay(event.startAt)}, {formatTime(event.startAt)}
      </span>
    </button>
  )
}
