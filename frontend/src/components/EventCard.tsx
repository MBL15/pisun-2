import { Building2, CalendarDays, MapPin, MessageCircle, UserRound, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { SportEvent } from '../api/types'
import { formatRelativeDay, formatTime, plural, sportTone } from '../lib/format'
import { AgeBadge, EventStatusBadge, ModeBadge, RegistrationBadge } from './EventBadges'

export function EventCard({ event, showStatus = false }: { event: SportEvent; showStatus?: boolean }) {
  const myActive = event.viewer.myRegistrations.find((r) => r.status === 'APPROVED' || r.status === 'PENDING')
  const spots =
    event.capacity == null
      ? `${event.participantsCount} ${plural(event.participantsCount, 'участник', 'участника', 'участников')}`
      : event.spotsLeft === 0
        ? 'Мест нет'
        : `Свободно ${event.spotsLeft} из ${event.capacity}`

  return (
    <Link to={`/events/${event.id}`} className="card lift group flex flex-col overflow-hidden">
      <div className={`flex items-center justify-between gap-3 border-b-[3px] border-ink px-5 py-3 ${sportTone(event.sportTypeId)}`}>
        <span className="inline-flex items-center gap-2 font-bold text-ink">
          <span className="flex size-9 items-center justify-center rounded-lg border-2 border-ink bg-white text-xl leading-none" aria-hidden>
            {event.sportEmoji ?? '🏅'}
          </span>
          {event.sportName}
        </span>
        {showStatus ? <EventStatusBadge status={event.status} /> : <AgeBadge event={event} />}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <h3 className="text-lg leading-snug decoration-[3px] underline-offset-4 group-hover:underline">{event.title}</h3>
          <p className="mt-1.5 line-clamp-2 text-muted">{event.description}</p>
        </div>

        <dl className="space-y-2 text-ink">
          <div className="flex items-center gap-2.5">
            <CalendarDays className="size-5 shrink-0" aria-hidden />
            <dd className="font-bold">
              {formatRelativeDay(event.startAt)}, {formatTime(event.startAt)}
            </dd>
          </div>
          <div className="flex items-center gap-2.5">
            <MapPin className="size-5 shrink-0" aria-hidden />
            <dd className="line-clamp-1">{event.address}</dd>
          </div>
          <div className="flex items-center gap-2.5">
            {event.organizerType === 'ORGANIZATION' ? (
              <Building2 className="size-5 shrink-0" aria-hidden />
            ) : (
              <UserRound className="size-5 shrink-0" aria-hidden />
            )}
            <dd className="line-clamp-1 font-medium">{event.organizerName}</dd>
          </div>
        </dl>

        <div className="mt-auto flex flex-wrap items-center gap-2 border-t-2 border-dashed border-ink pt-4">
          {myActive ? (
            <RegistrationBadge status={myActive.status} label={myActive.status === 'APPROVED' ? 'Вы записаны' : 'Заявка на рассмотрении'} />
          ) : (
            <ModeBadge event={event} />
          )}
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-ink">
            <Users className="size-4" aria-hidden />
            {spots}
          </span>
          {event.commentsCount > 0 && (
            <span className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-ink" aria-label={`Сообщений: ${event.commentsCount}`}>
              <MessageCircle className="size-4" aria-hidden />
              {event.commentsCount}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
