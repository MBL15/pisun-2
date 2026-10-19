import {
  ArrowLeft,
  Ban,
  Bot,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Info,
  ListChecks,
  MapPin,
  Pencil,
  RotateCcw,
  Shield,
  Sparkles,
  Trash2,
  TriangleAlert,
  UserRound,
  Users,
  XCircle,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { eventsApi, moderationApi, usersApi } from '../api/endpoints'
import type { Registration, SportEvent, User } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { Discussion } from '../components/Discussion'
import { DocumentDialog } from '../components/DocumentDialog'
import { AgeBadge, AiBadge, EventStatusBadge, ModeBadge, RegistrationBadge } from '../components/EventBadges'
import { MiniMap } from '../components/maps'
import { ReasonDialog } from '../components/ReasonDialog'
import { useToast } from '../components/Toast'
import { Avatar, Badge, Button, ErrorBox, LinkButton, Section, Spinner } from '../components/ui'
import {
  audienceLabels,
  formatDate,
  formatDateTime,
  formatDuration,
  formatTime,
  levelLabels,
  modeHints,
  modeLabels,
  registrationStatusLabels,
  sportTone,
} from '../lib/format'
import { useAsync } from '../lib/useAsync'

export function EventPage() {
  const id = Number(useParams().id)
  const { user } = useAuth()
  const { data: event, error, loading, reload } = useAsync(() => eventsApi.get(id), [id])

  if (loading && !event) return <Spinner />
  if (error)
    return (
      <div className="space-y-4">
        <BackLink />
        <ErrorBox error={error} />
      </div>
    )
  if (!event) return null

  return (
    <div className="space-y-6">
      <BackLink />
      <StatusBanner event={event} />

      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex -rotate-1 items-center gap-2 rounded-lg border-[3px] border-ink px-3 py-1 font-bold shadow-sm ${sportTone(event.sportTypeId)}`}>
            <span className="text-xl" aria-hidden>
              {event.sportEmoji ?? '🏅'}
            </span>
            {event.sportName}
            {event.sportCustom && <span className="text-xs font-semibold">· своё направление</span>}
          </span>
          <ModeBadge event={event} />
          <AgeBadge event={event} />
          <AiBadge event={event} />
          {event.status !== 'PUBLISHED' && <EventStatusBadge status={event.status} />}
        </div>
        <h1 className="max-w-4xl text-3xl font-black leading-tight sm:text-5xl">{event.title}</h1>
        <OrganizerLink event={event} />
      </header>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
        <div className="min-w-0 space-y-6">
          <Section title="Когда и где" icon={<CalendarDays className="size-6 text-brand-600" />}>
            <dl className="grid gap-4 sm:grid-cols-2">
              <InfoRow icon={<CalendarDays />} label="Дата" value={formatDate(event.startAt)} />
              <InfoRow
                icon={<Clock />}
                label="Время"
                value={`${formatTime(event.startAt)}–${formatTime(event.endAt)} (${formatDuration(event.durationMinutes)})`}
              />
              <InfoRow icon={<MapPin />} label="Место" value={event.address} />
              {event.locationNote && <InfoRow icon={<Info />} label="Как найти" value={event.locationNote} />}
            </dl>
            {event.latitude != null && event.longitude != null && (
              <div className="mt-5">
                <MiniMap
                  latitude={event.latitude}
                  longitude={event.longitude}
                  title={event.title}
                  emoji={event.sportEmoji}
                  club={event.organizerType === 'ORGANIZATION'}
                />
              </div>
            )}
          </Section>

          <Section title="О мероприятии" icon={<Sparkles className="size-6 text-brand-600" />}>
            <p className="whitespace-pre-line text-lg leading-relaxed text-slate-800">{event.description}</p>
          </Section>

          <Section title="Условия участия" icon={<ListChecks className="size-6 text-brand-600" />}>
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge tone="slate">{levelLabels[event.level]}</Badge>
              <Badge tone="slate">{audienceLabels[event.audience]}</Badge>
              <Badge tone="slate">
                {event.capacity ? `Мест: ${event.capacity}` : 'Без ограничения мест'}
              </Badge>
            </div>
            <p className="whitespace-pre-line text-lg leading-relaxed text-slate-800">
              {event.conditions || 'Организатор не указал особых требований.'}
            </p>
            <div className={`mt-4 rounded-xl border-[3px] border-ink p-4 ${event.registrationMode === 'FREE' ? 'bg-pop-green/40' : 'bg-pop-lilac/40'}`}>
              <p className="font-bold">{modeLabels[event.registrationMode]}</p>
              <p className="text-slate-800">{modeHints[event.registrationMode]}</p>
            </div>
          </Section>

          {event.aiSummary && <AiVerdictCard event={event} />}

          <Discussion event={event} onChanged={reload} />
        </div>

        <aside className="min-w-0 space-y-6">
          <RegistrationPanel event={event} user={user} onChanged={reload} />
          {event.viewer.organizer && <OrganizerPanel event={event} onChanged={reload} />}
          {user?.role === 'ADMIN' && <AdminPanel event={event} onChanged={reload} />}
        </aside>
      </div>
    </div>
  )
}

function BackLink() {
  const navigate = useNavigate()
  return (
    <Button variant="secondary" size="sm" onClick={() => navigate(-1)} icon={<ArrowLeft className="size-4" aria-hidden />}>
      Назад
    </Button>
  )
}

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border-2 border-ink bg-pop-yellow text-ink [&>svg]:size-5" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-bold uppercase tracking-wide text-slate-700">{label}</dt>
        <dd className="break-words text-lg font-bold">{value}</dd>
      </div>
    </div>
  )
}

function OrganizerLink({ event }: { event: SportEvent }) {
  const to = event.organizerType === 'ORGANIZATION' && event.organizationId ? `/organizations/${event.organizationId}` : `/users/${event.organizerUserId}`
  return (
    <Link to={to} className="inline-flex items-center gap-3 rounded-xl border-[3px] border-ink bg-white py-2 pl-2 pr-4 shadow-sm lift">
      <span className={`flex size-10 items-center justify-center rounded-lg border-2 border-ink text-ink ${event.organizerType === 'ORGANIZATION' ? 'bg-pop-orange' : 'bg-pop-blue'}`} aria-hidden>
        {event.organizerType === 'ORGANIZATION' ? <Building2 className="size-5" /> : <UserRound className="size-5" />}
      </span>
      <span className="leading-tight">
        <span className="block text-xs font-bold uppercase tracking-wide text-slate-700">{event.organizerType === 'ORGANIZATION' ? 'Организация' : 'Организатор'}</span>
        <span className="block font-bold">{event.organizerName}</span>
      </span>
    </Link>
  )
}

function StatusBanner({ event }: { event: SportEvent }) {
  if (event.status === 'UNPUBLISHED' || event.status === 'DELETED') {
    return (
      <div className="flex gap-4 rounded-2xl border-[3px] border-ink bg-pop-red shadow-md p-5 text-ink">
        <Ban className="size-8 shrink-0" aria-hidden />
        <div>
          <p className="text-lg font-bold">
            {event.status === 'DELETED' ? 'Мероприятие удалено администратором' : 'Мероприятие снято с публикации'}
          </p>
          <p className="mt-1">Запись закрыта, событие не показывается в афише.</p>
          {event.moderationReason && (
            <p className="mt-2">
              <span className="font-semibold">Причина:</span> {event.moderationReason}
            </p>
          )}
          {event.moderatedAt && (
            <p className="mt-1 text-sm opacity-80">
              {event.moderatedBy} · {formatDateTime(event.moderatedAt)}
            </p>
          )}
        </div>
      </div>
    )
  }
  if (event.status === 'ON_REVIEW') {
    return (
      <div className="flex gap-4 rounded-2xl border-[3px] border-ink bg-pop-yellow shadow-md p-5 text-ink">
        <TriangleAlert className="size-8 shrink-0" aria-hidden />
        <div>
          <p className="text-lg font-bold">Мероприятие на проверке у администратора</p>
          <p className="mt-1">ИИ-модератор нашёл возможные нарушения. Пока событие видите только вы и администратор.</p>
        </div>
      </div>
    )
  }
  if (event.past) {
    return (
      <div className="rounded-2xl border-[3px] border-ink bg-white shadow-md p-4 font-semibold text-slate-700">Мероприятие уже прошло.</div>
    )
  }
  return null
}

function AiVerdictCard({ event }: { event: SportEvent }) {
  const flagged = event.aiStatus === 'FLAGGED'
  return (
    <section className={`rounded-2xl border-[3px] border-ink p-5 shadow-md ${flagged ? 'bg-pop-yellow' : 'bg-pop-green'}`}>
      <h2 className="flex items-center gap-2 text-lg">
        <span className="flex size-9 items-center justify-center rounded-lg border-2 border-ink bg-white" aria-hidden>
          <Bot className="size-5" />
        </span>
        Заключение ИИ-модератора
      </h2>
      <p className="mt-3 font-medium text-ink">{event.aiSummary}</p>
      {event.aiReasons.length > 0 && (
        <ul className="mt-2 list-inside list-disc text-sm font-medium text-ink">
          {event.aiReasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}
    </section>
  )
}

function RegistrationPanel({ event, user, onChanged }: { event: SportEvent; user: User | null; onChanged: () => Promise<void> }) {
  const { notify } = useToast()
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [document, setDocument] = useState<{ childId?: number; intro?: string } | null>(null)
  const children = useAsync(() => (user?.role === 'USER' ? usersApi.children(user.id) : Promise.resolve([] as User[])), [user?.id])

  const mine = event.viewer.myRegistrations
  const selfActive = mine.find((r) => r.participantId === user?.id && (r.status === 'APPROVED' || r.status === 'PENDING'))
  const activeChildIds = new Set(mine.filter((r) => r.child && (r.status === 'APPROVED' || r.status === 'PENDING')).map((r) => r.participantId))
  const childSafe = event.ageRestriction === 'CHILD_SAFE' && event.aiStatus === 'AI_APPROVED'
  const byApplication = event.registrationMode === 'BY_APPLICATION'

  const register = async (childId?: number) => {
    setBusy(childId ? `child-${childId}` : 'self')
    try {
      const registration = await eventsApi.register(event.id, { childId, message: message.trim() || undefined })
      setMessage('')
      await onChanged()
      const approved = registration.status === 'APPROVED'
      notify(
        'success',
        approved ? `${childId ? registration.participantName + ' записан(а)' : 'Вы записаны'}!` : 'Заявка отправлена',
        approved ? 'Организационная информация открылась ниже.' : 'Организатор рассмотрит её — статус обновится здесь и в кабинете.',
      )
      if (childId || user?.role === 'CHILD') {
        setDocument({
          childId,
          intro: 'Согласие родителя сформировано автоматически по шаблону. Распечатайте или сохраните его в PDF и передайте организатору.',
        })
      }
    } catch (e) {
      notify('error', 'Не удалось записаться', (e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const cancel = async (registration: Registration) => {
    setBusy(`cancel-${registration.id}`)
    try {
      await eventsApi.cancel(event.id, registration.id)
      await onChanged()
      notify('info', 'Запись отменена')
    } catch (e) {
      notify('error', 'Не удалось отменить', (e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const canUseDocs = user && (user.role === 'USER' || user.role === 'CHILD')

  return (
    <section className="card sticky top-24 space-y-4 p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xl font-bold">Запись</h2>
        <span className="text-slate-600">
          <Users className="mr-1 inline size-4" />
          {event.participantsCount}
          {event.capacity ? ` из ${event.capacity}` : ''} {byApplication && event.pendingCount > 0 ? `· заявок: ${event.pendingCount}` : ''}
        </span>
      </div>

      {mine.length > 0 && (
        <ul className="space-y-2">
          {mine.map((registration) => (
            <li key={registration.id} className="rounded-xl border-2 border-ink bg-paper p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">{registration.participantId === user?.id ? 'Вы' : registration.participantName}</span>
                <RegistrationBadge
                  status={registration.status}
                  label={registration.participantId === user?.id ? undefined : registrationStatusLabels[registration.status].replace('Вы', 'Ребёнок')}
                />
              </div>
              {registration.status === 'PENDING' && (
                <p className="mt-2 text-sm text-slate-600">Ожидает решения организатора. До принятия вы ещё не подтверждённый участник.</p>
              )}
              {registration.decisionComment && (
                <p className="mt-2 text-sm text-slate-700">
                  <span className="font-semibold">Организатор:</span> {registration.decisionComment}
                </p>
              )}
              {(registration.status === 'PENDING' || registration.status === 'APPROVED') && event.status === 'PUBLISHED' && (
                <button
                  onClick={() => cancel(registration)}
                  disabled={busy === `cancel-${registration.id}`}
                  className="mt-2 text-sm font-semibold text-slate-600 underline hover:text-red-600"
                >
                  {registration.status === 'PENDING' ? 'Отозвать заявку' : 'Отменить запись'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {event.viewer.canSeeContacts && event.organizerContact && (
        <div className="rounded-2xl border-[3px] border-ink bg-pop-green shadow-md p-4">
          <p className="flex items-center gap-2 font-bold text-ink">
            <CheckCircle2 className="size-5" />
            Информация для участников
          </p>
          <p className="mt-1 whitespace-pre-line text-ink">{event.organizerContact}</p>
        </div>
      )}

      {!user ? (
        <LinkButton to="/login" size="lg" className="w-full">
          Войти, чтобы записаться
        </LinkButton>
      ) : event.viewer.registrationOpen ? (
        <div className="space-y-3">
          {!selfActive && (
            <>
              {byApplication && (
                <textarea
                  className="input min-h-20"
                  placeholder="Сообщение организатору (необязательно): опыт, вопросы"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              )}
              <Button size="lg" variant={byApplication ? 'primary' : 'success'} className="w-full" loading={busy === 'self'} onClick={() => register()}>
                {byApplication ? 'Подать заявку' : 'Записаться'}
              </Button>
              <p className="text-center text-sm text-slate-600">{modeHints[event.registrationMode]}</p>
            </>
          )}
          {user.role === 'USER' && (children.data?.length ?? 0) > 0 && (
            <div className="space-y-2 border-t-2 border-ink pt-3">
              <p className="font-semibold">Записать ребёнка</p>
              {!childSafe ? (
                <p className="text-sm text-slate-600">Мероприятие не отмечено как безопасное для детей.</p>
              ) : (
                children.data!.map((child) => (
                  <Button
                    key={child.id}
                    variant="secondary"
                    className="w-full"
                    disabled={activeChildIds.has(child.id)}
                    loading={busy === `child-${child.id}`}
                    onClick={() => register(child.id)}
                  >
                    {activeChildIds.has(child.id) ? `${child.displayName} уже записан(а)` : `Записать: ${child.displayName}, ${child.age} лет`}
                  </Button>
                ))
              )}
            </div>
          )}
        </div>
      ) : (
        !selfActive && (
          <div className="flex gap-3 rounded-xl border-[3px] border-dashed border-ink bg-white p-4 font-medium text-ink">
            <Info className="size-5 shrink-0" />
            <p>{event.viewer.registrationBlockedReason}</p>
          </div>
        )
      )}

      {canUseDocs && (
        <div className="space-y-2 border-t-2 border-ink pt-3">
          <p className="text-sm text-slate-600">Заявление с данными события заполняется автоматически:</p>
          <Button variant="secondary" className="w-full" icon={<FileText className="size-5" />} onClick={() => setDocument({})}>
            {user.role === 'CHILD' ? 'Согласие родителя' : 'Заявление на участие'}
          </Button>
          {user.role === 'USER' &&
            childSafe &&
            children.data?.map((child) => (
              <Button
                key={child.id}
                variant="ghost"
                className="w-full"
                icon={<FileText className="size-5" />}
                onClick={() => setDocument({ childId: child.id })}
              >
                Согласие на ребёнка: {child.displayName}
              </Button>
            ))}
        </div>
      )}

      {user && document && (
        <DocumentDialog
          open
          onClose={() => setDocument(null)}
          eventId={event.id}
          userId={user.id}
          childId={document.childId}
          intro={document.intro}
        />
      )}
    </section>
  )
}

function OrganizerPanel({ event, onChanged }: { event: SportEvent; onChanged: () => Promise<void> }) {
  const { notify } = useToast()
  const { data, reload } = useAsync(() => eventsApi.registrations(event.id), [event.id, event.participantsCount, event.pendingCount])
  const [busy, setBusy] = useState<number | null>(null)
  const [comments, setComments] = useState<Record<number, string>>({})

  const decide = async (registration: Registration, status: 'APPROVED' | 'REJECTED') => {
    setBusy(registration.id)
    try {
      await eventsApi.decide(event.id, registration.id, status, comments[registration.id]?.trim() || undefined)
      await Promise.all([reload(), onChanged()])
      notify('success', status === 'APPROVED' ? `${registration.participantName} в составе участников` : 'Заявка отклонена', 'Участник увидит решение у себя.')
    } catch (e) {
      notify('error', 'Не удалось сохранить решение', (e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const pending = data?.filter((r) => r.status === 'PENDING') ?? []
  const approved = data?.filter((r) => r.status === 'APPROVED') ?? []
  const other = data?.filter((r) => r.status === 'REJECTED' || r.status === 'CANCELLED') ?? []

  return (
    <section className="card space-y-4 p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold">Вы организатор</h2>
        {event.status !== 'UNPUBLISHED' && event.status !== 'DELETED' && (
          <LinkButton to={`/events/${event.id}/edit`} variant="secondary" size="sm" icon={<Pencil className="size-4" />}>
            Изменить
          </LinkButton>
        )}
      </div>

      {pending.length > 0 && (
        <div className="space-y-3">
          <h3 className="inline-block rounded-md border-2 border-ink bg-pop-lilac px-2 py-0.5 text-base">Заявки на рассмотрении · {pending.length}</h3>
          {pending.map((registration) => (
            <div key={registration.id} className="rounded-2xl border-[3px] border-ink bg-pop-lilac shadow-md/50 p-3">
              <p className="font-semibold">
                {registration.participantName}
                {registration.participantAge && <span className="font-normal text-slate-600">, {registration.participantAge} лет</span>}
                {registration.child && <span className="ml-1 text-sm text-emerald-700">(ребёнок, записал {registration.registeredByName})</span>}
              </p>
              {registration.message && <p className="mt-1 text-slate-700">«{registration.message}»</p>}
              <input
                className="input mt-2 py-2 text-sm"
                placeholder="Комментарий участнику (необязательно)"
                value={comments[registration.id] ?? ''}
                onChange={(e) => setComments({ ...comments, [registration.id]: e.target.value })}
              />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button variant="success" size="sm" loading={busy === registration.id} icon={<CheckCircle2 className="size-4" />} onClick={() => decide(registration, 'APPROVED')}>
                  Принять
                </Button>
                <Button variant="secondary" size="sm" disabled={busy === registration.id} icon={<XCircle className="size-4" />} onClick={() => decide(registration, 'REJECTED')}>
                  Отклонить
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <h3 className="mb-3 inline-block rounded-md border-2 border-ink bg-pop-green px-2 py-0.5 text-base">Участники · {approved.length}</h3>
        {approved.length === 0 ? (
          <p className="text-slate-600">Пока никто не записался.</p>
        ) : (
          <ul className="space-y-2">
            {approved.map((registration) => (
              <li key={registration.id} className="flex items-center gap-3">
                <Avatar name={registration.participantName} size="sm" />
                <span>
                  {registration.participantName}
                  {registration.child && <span className="ml-1 text-sm text-emerald-700">· ребёнок</span>}
                </span>
                {event.registrationMode === 'BY_APPLICATION' && (
                  <button onClick={() => decide(registration, 'REJECTED')} className="ml-auto text-sm text-slate-600 hover:text-red-600">
                    исключить
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {other.length > 0 && (
        <details className="text-sm text-slate-600">
          <summary className="cursor-pointer font-semibold">Отклонённые и отменённые · {other.length}</summary>
          <ul className="mt-2 space-y-1">
            {other.map((registration) => (
              <li key={registration.id}>
                {registration.participantName} — {registration.status === 'REJECTED' ? 'отклонена' : 'отменена участником'}
                {registration.status === 'REJECTED' && event.status === 'PUBLISHED' && (
                  <button onClick={() => decide(registration, 'APPROVED')} className="ml-2 font-semibold text-brand-700 underline">
                    принять
                  </button>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}

function AdminPanel({ event, onChanged }: { event: SportEvent; onChanged: () => Promise<void> }) {
  const { notify } = useToast()
  const [dialog, setDialog] = useState<'unpublish' | 'delete' | null>(null)
  const [busy, setBusy] = useState(false)

  const publish = async () => {
    setBusy(true)
    try {
      await moderationApi.publishEvent(event.id)
      await onChanged()
      notify('success', 'Мероприятие опубликовано')
    } catch (e) {
      notify('error', 'Ошибка', (e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const presets = ['Нарушение правил платформы', 'Недостоверная информация о месте или времени', 'Коммерческая реклама, не связанная со спортом', 'Небезопасный формат мероприятия']

  return (
    <section className="card space-y-3 border-ink p-5">
      <h2 className="flex items-center gap-2 text-xl font-bold">
        <Shield className="size-6" aria-hidden />
        Модерация
      </h2>
      <p className="text-sm text-slate-600">
        Администратор не рассматривает заявки участников — это делает организатор. Здесь — контроль публикации.
      </p>
      {event.status === 'PUBLISHED' ? (
        <>
          <Button variant="danger" className="w-full" icon={<Ban className="size-5" />} onClick={() => setDialog('unpublish')}>
            Снять с публикации
          </Button>
          <Button variant="secondary" className="w-full" icon={<Trash2 className="size-5" />} onClick={() => setDialog('delete')}>
            Удалить мероприятие
          </Button>
        </>
      ) : (
        <>
          {event.status !== 'DELETED' && (
            <Button variant="secondary" className="w-full" icon={<Trash2 className="size-5" />} onClick={() => setDialog('delete')}>
              Удалить мероприятие
            </Button>
          )}
          <Button variant="success" className="w-full" loading={busy} icon={<RotateCcw className="size-5" />} onClick={publish}>
            {event.status === 'ON_REVIEW' ? 'Проверено — опубликовать' : 'Восстановить публикацию'}
          </Button>
        </>
      )}
      <ReasonDialog
        open={dialog !== null}
        title={dialog === 'delete' ? 'Удалить мероприятие' : 'Снять с публикации'}
        description="Причину увидят организатор и записавшиеся участники. Записаться на событие будет нельзя, даже по прямой ссылке."
        confirmLabel={dialog === 'delete' ? 'Удалить' : 'Снять с публикации'}
        presets={presets}
        onClose={() => setDialog(null)}
        onConfirm={async (reason) => {
          if (dialog === 'delete') await moderationApi.deleteEvent(event.id, reason)
          else await moderationApi.unpublishEvent(event.id, reason)
          await onChanged()
          notify('success', dialog === 'delete' ? 'Мероприятие удалено' : 'Мероприятие снято с публикации')
        }}
      />
    </section>
  )
}
