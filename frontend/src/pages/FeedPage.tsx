import {
  Baby,
  CalendarDays,
  LayoutGrid,
  Map as MapIcon,
  MapPin,
  PlusCircle,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trophy,
  Users,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { eventsApi, sportsApi } from '../api/endpoints'
import type { EventFilters, RegistrationMode, SportEvent } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { EventCard } from '../components/EventCard'
import { AgeBadge, ModeBadge } from '../components/EventBadges'
import { EventsMap, MapLegend } from '../components/maps'
import { Button, EmptyState, ErrorBox, LinkButton, Spinner } from '../components/ui'
import { formatRelativeDay, formatTime, sportTone, toIsoDate } from '../lib/format'
import { useAsync } from '../lib/useAsync'

type DateRange = 'any' | 'today' | 'weekend' | 'week'

const chip = 'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border-[3px] border-ink px-4 py-1.5 font-bold transition'
const chipOn = 'translate-x-0.5 translate-y-0.5 bg-ink text-white dark:text-[#111111]'
const chipOff = 'bg-white text-ink shadow-sm hover:bg-pop-yellow/50'

function rangeToDates(range: DateRange): Pick<EventFilters, 'from' | 'to'> {
  const now = new Date()
  const addDays = (days: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + days)
  switch (range) {
    case 'today':
      return { from: toIsoDate(now), to: toIsoDate(now) }
    case 'week':
      return { from: toIsoDate(now), to: toIsoDate(addDays(7)) }
    case 'weekend': {
      const day = now.getDay()
      const toSaturday = day === 0 ? -1 : 6 - day
      return { from: toIsoDate(addDays(Math.max(toSaturday, 0))), to: toIsoDate(addDays(toSaturday + 1)) }
    }
    default:
      return {}
  }
}

export function FeedPage({ initialView = 'list' }: { initialView?: 'list' | 'map' }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [view, setView] = useState(initialView)
  const [query, setQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [sportTypeId, setSportTypeId] = useState<number | undefined>()
  const [mode, setMode] = useState<RegistrationMode | undefined>()
  const [range, setRange] = useState<DateRange>('any')
  const [kidsOnly, setKidsOnly] = useState(false)
  const [selected, setSelected] = useState<SportEvent | null>(null)

  const filters = useMemo<EventFilters>(
    () => ({ q: appliedQuery || undefined, sportTypeId, mode, childSafe: kidsOnly || undefined, ...rangeToDates(range) }),
    [appliedQuery, sportTypeId, mode, kidsOnly, range],
  )
  const events = useAsync(() => eventsApi.list(filters), [filters])
  const sports = useAsync(() => sportsApi.list(), [])

  const isChild = user?.role === 'CHILD'
  const canCreate = user?.role === 'USER' || (user?.role === 'ORGANIZATION' && user.organizationStatus === 'APPROVED')
  const hasFilters = Boolean(appliedQuery || sportTypeId || mode || kidsOnly || range !== 'any')
  const popularSports = useMemo(() => {
    return [...(sports.data ?? [])]
      .filter((sport) => sport.eventsCount > 0 || !sport.custom)
      .sort((a, b) => b.eventsCount - a.eventsCount || a.name.localeCompare(b.name, 'ru'))
  }, [sports.data])

  const reset = () => {
    setQuery('')
    setAppliedQuery('')
    setSportTypeId(undefined)
    setMode(undefined)
    setRange('any')
    setKidsOnly(false)
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border-[3px] border-ink bg-pop-yellow px-5 py-7 text-[#111111] shadow-lg sm:px-10 sm:py-12">
        <div className="pointer-events-none absolute right-6 top-6 hidden gap-4 lg:flex" aria-hidden>
          <span className="flex size-24 rotate-[8deg] items-center justify-center rounded-2xl border-[3px] border-ink bg-pop-blue shadow-md">
            <Trophy className="size-12" strokeWidth={2.5} />
          </span>
          <span className="mt-16 flex size-20 rotate-[-10deg] items-center justify-center rounded-full border-[3px] border-ink bg-pop-pink shadow-md">
            <Users className="size-10" strokeWidth={2.5} />
          </span>
          <span className="mt-2 flex size-16 rotate-[14deg] items-center justify-center rounded-xl border-[3px] border-ink bg-pop-green shadow-md">
            <MapPin className="size-8" strokeWidth={2.5} />
          </span>
        </div>
        <div className="relative max-w-2xl">
          <span className="inline-block -rotate-2 rounded-md border-2 border-ink bg-white px-2.5 py-0.5 text-sm font-bold uppercase tracking-wider">
            Красноярск · спорт рядом
          </span>
          <h1 className="mt-4 text-[1.625rem] font-black uppercase leading-[1.1] min-[400px]:text-3xl sm:text-5xl">
            {isChild ? `Привет, ${user?.displayName.split(' ')[0]}! Во что поиграем?` : 'Хочется заниматься, но не с кем?'}
          </h1>
          <p className="mt-4 max-w-xl text-lg font-medium">
            {isChild
              ? 'Здесь только проверенные занятия, на которые можно детям.'
              : 'Найдите компанию рядом: футбол во дворе, шахматы в парке, утренние пробежки — или соберите свою.'}
          </p>
          <p className="mt-6 text-base font-semibold">Используйте поиск в полоске направлений ниже — по виду спорта, месту или названию.</p>
        </div>
      </section>

      {isChild && (
        <div className="flex items-center gap-3 rounded-2xl border-[3px] border-ink bg-pop-green p-4 font-semibold text-ink shadow-md">
          <ShieldCheck className="size-7 shrink-0" aria-hidden />
          <p>Детский режим: показываем только мероприятия, которые ИИ-модератор отметил как безопасные для детей.</p>
        </div>
      )}

      <section className="space-y-4">
        <div className="no-scrollbar -mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-2 pt-1">
          <form
            id="feed-search"
            className="relative min-w-[min(100%,14rem)] shrink-0 sm:min-w-[16rem]"
            role="search"
            onSubmit={(event) => {
              event.preventDefault()
              setAppliedQuery(query.trim())
            }}
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink" aria-hidden />
            <input
              className="input min-h-11 w-full py-2 pl-9 pr-3 text-sm"
              placeholder="Поиск…"
              aria-label="Поиск мероприятий"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </form>
          <button type="submit" form="feed-search" className={`${chip} ${chipOff}`}>
            Найти
          </button>
          <button
            onClick={() => setSportTypeId(undefined)}
            aria-pressed={!sportTypeId}
            className={`${chip} ${!sportTypeId ? chipOff + ' ring-2 ring-ink ring-offset-2' : chipOff}`}
          >
            Все
          </button>
          {popularSports.map((sport) => (
            <button
              key={sport.id}
              onClick={() => setSportTypeId(sport.id === sportTypeId ? undefined : sport.id)}
              aria-pressed={sport.id === sportTypeId}
              className={`${chip} ${sport.id === sportTypeId ? chipOn : chipOff}`}
            >
              <span aria-hidden>{sport.emoji}</span>
              {sport.name}
              {sport.eventsCount > 0 && (
                <span className="rounded-full border-2 border-ink bg-pop-yellow px-1.5 text-xs font-bold text-ink">{sport.eventsCount}</span>
              )}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
          <SlidersHorizontal className="hidden size-5 text-ink sm:block" aria-hidden />
          <select className="input min-w-0 py-2 pl-3 sm:w-auto sm:pl-4" value={range} onChange={(event) => setRange(event.target.value as DateRange)} aria-label="Когда">
            <option value="any">Любая дата</option>
            <option value="today">Сегодня</option>
            <option value="weekend">Ближайшие выходные</option>
            <option value="week">На этой неделе</option>
          </select>
          <select
            className="input min-w-0 py-2 pl-3 sm:w-auto sm:pl-4"
            value={mode ?? ''}
            onChange={(event) => setMode((event.target.value || undefined) as RegistrationMode | undefined)}
            aria-label="Режим записи"
          >
            <option value="">Любая запись</option>
            <option value="FREE">Свободная запись</option>
            <option value="BY_APPLICATION">По заявке</option>
          </select>
          {(!isChild || hasFilters) && (
            <div className="col-span-2 flex gap-2 sm:contents">
              {!isChild && (
                <button
                  onClick={() => setKidsOnly((value) => !value)}
                  className={`inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border-[3px] border-ink px-4 py-2 font-bold text-[#111111] transition sm:flex-none ${
                    kidsOnly ? 'translate-x-0.5 translate-y-0.5 bg-pop-green' : 'bg-white shadow-sm hover:bg-pop-green/40'
                  }`}
                  aria-pressed={kidsOnly}
                >
                  <Baby className="size-5" />
                  Можно с детьми
                </button>
              )}
              {hasFilters && (
                <button onClick={reset} className="inline-flex min-h-12 items-center gap-1 px-2 font-bold text-ink underline decoration-2 underline-offset-4">
                  <X className="size-4" />
                  Сбросить
                </button>
              )}
            </div>
          )}
          <div className="col-span-2 flex rounded-xl border-[3px] border-ink bg-white p-1 shadow-sm sm:ml-auto" role="group" aria-label="Вид афиши">
            <button
              onClick={() => setView('list')}
              aria-pressed={view === 'list'}
              className={`inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-3 py-1.5 font-bold sm:flex-none ${view === 'list' ? 'bg-[#111111] text-white' : 'text-ink hover:bg-pop-yellow/50'}`}
            >
              <LayoutGrid className="size-4" />
              Список
            </button>
            <button
              onClick={() => setView('map')}
              aria-pressed={view === 'map'}
              className={`inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-3 py-1.5 font-bold sm:flex-none ${view === 'map' ? 'bg-[#111111] text-white' : 'text-ink hover:bg-pop-yellow/50'}`}
            >
              <MapIcon className="size-4" />
              Карта
            </button>
          </div>
        </div>
      </section>

      {events.error && <ErrorBox error={events.error} onRetry={events.reload} />}
      {events.loading && !events.data && <Spinner />}

      {events.data && view === 'map' && (
        <div className="relative">
          <EventsMap events={events.data} selectedId={selected?.id} onSelect={setSelected} />
          {selected && (
            <div className="card pointer-events-auto absolute inset-x-3 bottom-3 z-[1000] flex flex-col gap-3 p-4 shadow-xl sm:left-auto sm:right-3 sm:w-96">
              <div className="flex items-start justify-between gap-2">
                <span className={`rounded-md border-2 border-ink px-2 py-0.5 font-bold ${sportTone(selected.sportTypeId)}`}>
                  {selected.sportEmoji} {selected.sportName}
                </span>
                <button onClick={() => setSelected(null)} aria-label="Закрыть" className="rounded-md border-2 border-ink bg-white p-1 hover:bg-pop-yellow">
                  <X className="size-5" />
                </button>
              </div>
              <h3 className="text-lg">{selected.title}</h3>
              <p className="flex items-center gap-2 font-medium text-ink">
                <CalendarDays className="size-4 shrink-0" aria-hidden />
                {formatRelativeDay(selected.startAt)}, {formatTime(selected.startAt)} · {selected.address}
              </p>
              <div className="flex flex-wrap gap-2">
                <ModeBadge event={selected} />
                <AgeBadge event={selected} />
              </div>
              <Button onClick={() => navigate(`/events/${selected.id}`)}>Подробнее и запись</Button>
            </div>
          )}
          <MapLegend className="mt-4" />
        </div>
      )}

      {events.data && view === 'list' && (
        events.data.length === 0 ? (
          <EmptyState
            icon={<Search className="size-8" />}
            title="Подходящих мероприятий пока нет"
            text={canCreate ? 'Соберите свою компанию — создайте мероприятие, и его увидят другие.' : 'Попробуйте изменить фильтры.'}
            action={
              canCreate ? (
                <LinkButton to="/events/new" icon={<PlusCircle className="size-5" />}>
                  Создать мероприятие
                </LinkButton>
              ) : hasFilters ? (
                <Button variant="secondary" onClick={reset}>
                  Сбросить фильтры
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <p className="shrink-0 text-muted">Найдено: {events.data.length}</p>
              {canCreate && (
                <Link to="/events/new" className="inline-flex items-center gap-2 font-semibold text-brand-700 hover:underline">
                  <PlusCircle className="size-5 shrink-0" />
                  Не нашли подходящее? Создайте своё
                </Link>
              )}
            </div>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {events.data.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </>
        )
      )}
    </div>
  )
}
