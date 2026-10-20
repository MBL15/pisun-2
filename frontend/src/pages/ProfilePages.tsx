import { BadgeCheck, CalendarCheck, CalendarDays, Heart, HeartHandshake, MapPin, Pencil, PlusCircle, Shield, UserPlus, Users } from 'lucide-react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { eventsApi, familiesApi, friendsApi, usersApi } from '../api/endpoints'
import type { Family, MyRegistration, User } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { RegistrationBadge } from '../components/EventBadges'
import { EventCard } from '../components/EventCard'
import { EventRoutePlanner } from '../components/maps'
import { VerificationRequestModal } from '../components/VerificationRequestModal'
import { DisplayNameWithBadge } from '../components/VerifiedBadge'
import { useToast } from '../components/Toast'
import { Avatar, Badge, Button, EmptyState, ErrorBox, Field, LinkButton, Modal, Section, Spinner, Tabs } from '../components/ui'
import {
  formatRelativeDay,
  formatTime,
  genderLabels,
  normalizeReputation,
  plural,
  REPUTATION_MIN_TO_CREATE,
  reputationHint,
  reputationTone,
  roleLabels,
} from '../lib/format'
import { useAsync } from '../lib/useAsync'

export function ProfilePage() {
  const id = Number(useParams().id)
  const { user: me } = useAuth()
  const profile = useAsync(() => usersApi.get(id), [id])
  const events = useAsync(() => eventsApi.list({ organizerUserId: id }), [id])

  if (profile.loading && !profile.data) return <Spinner />
  if (profile.error) return <ErrorBox error={profile.error} />
  if (!profile.data) return null
  const person = profile.data

  return (
    <div className="space-y-6">
      <ProfileCard
        user={person}
        action={
          me && me.id !== person.id && (person.role === 'USER' || person.role === 'ORGANIZATION') ? (
            <ProfileFriendActions person={person} onChanged={profile.reload} />
          ) : undefined
        }
      />
      {person.role === 'ORGANIZATION' && person.organizationId && (
        <Section title="Клуб" icon={<Users className="size-6 text-brand-600" />}>
          <Link to={`/organizations/${person.organizationId}`} className="font-semibold text-brand-700 hover:underline">
            {person.organizationName ?? 'Страница организации'}
          </Link>
        </Section>
      )}
      {person.role === 'USER' && (
        <Section title="Организует" icon={<CalendarDays className="size-6 text-brand-600" />}>
          {events.data?.length === 0 && <p className="text-muted">Сейчас нет запланированных мероприятий.</p>}
          <div className="grid gap-5 sm:grid-cols-2">
            {events.data?.filter((e) => e.organizerType === 'USER').map((event) => <EventCard key={event.id} event={event} />)}
          </div>
        </Section>
      )}
    </div>
  )
}

function reputationBarClass(tone: ReturnType<typeof reputationTone>): string {
  switch (tone) {
    case 'red':
      return 'bg-red-500'
    case 'amber':
      return 'bg-amber-500'
    case 'green':
      return 'bg-emerald-500'
    default:
      return 'bg-slate-400'
  }
}

function ReputationPanel({ user }: { user: User }) {
  if (user.role !== 'USER') return null
  const score = normalizeReputation(user.reputation)
  const blocked = user.canCreateEvents === false
  const tone = reputationTone(score, blocked)
  const width = `${Math.min(100, Math.max(0, score))}%`
  const thresholdLeft = `${REPUTATION_MIN_TO_CREATE}%`

  return (
    <div
      className="rounded-2xl border-2 border-ink/10 bg-surface/80 p-3 sm:p-4 dark:border-white/10"
      aria-label={`Репутация ${score} из 100`}
    >
      <div className="flex flex-wrap items-start gap-3">
        <span className="hidden size-11 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-pop-blue/30 text-[#111111] sm:flex">
          <Shield className="size-6" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-sm font-bold uppercase tracking-wide text-muted">Репутация организатора</p>
            <Badge tone={tone}>{score} баллов</Badge>
            {blocked ? (
              <Badge tone="red">Создание мероприятий закрыто</Badge>
            ) : (
              <Badge tone="green">Можно организовывать</Badge>
            )}
          </div>
          <div className="relative h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div className={`h-full rounded-full transition-[width] ${reputationBarClass(tone)}`} style={{ width }} />
            <div
              className="pointer-events-none absolute inset-y-0 w-0.5 bg-ink/40 dark:bg-white/50"
              style={{ left: thresholdLeft }}
              title={`Минимум ${REPUTATION_MIN_TO_CREATE} баллов для создания мероприятий`}
            />
          </div>
          <p className="text-xs text-muted">
            Порог для публикации событий — {REPUTATION_MIN_TO_CREATE} баллов (отметка на шкале).
          </p>
          <p className="text-sm text-muted">{reputationHint(score, blocked)}</p>
        </div>
      </div>
    </div>
  )
}

function ProfileCard({ user, action }: { user: User; action?: ReactNode }) {
  return (
    <section className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:gap-5 sm:p-6">
      <span className="hidden sm:block">
        <Avatar name={user.displayName} color={user.avatarColor} size="lg" />
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-3">
          <span className="sm:hidden">
            <Avatar name={user.displayName} color={user.avatarColor} />
          </span>
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-xl font-extrabold sm:text-3xl">
              <DisplayNameWithBadge name={user.displayName} verified={user.verified} />
            </h1>
            <Badge tone={user.role === 'CHILD' ? 'brand' : 'slate'}>{roleLabels[user.role]}</Badge>
          </div>
        </div>
        <p className="flex flex-wrap gap-x-5 gap-y-1 text-muted">
          {user.age && <span>{user.age} {plural(user.age, 'год', 'года', 'лет')}</span>}
          {user.city && (
            <span className="flex items-center gap-1">
              <MapPin className="size-4" />
              {user.city}
            </span>
          )}
          {user.parentName && <span>Родитель: {user.parentName}</span>}
          {user.spouseName && <span>Супруг(а): {user.spouseName}</span>}
        </p>
        {user.interests && (
          <p className="flex items-center gap-2 font-medium text-brand-700">
            <Heart className="size-4" />
            {user.interests}
          </p>
        )}
        {user.bio && <p className="whitespace-pre-line text-muted">{user.bio}</p>}
        <ReputationPanel user={user} />
      </div>
      {action}
    </section>
  )
}

type CabinetTab = 'registrations' | 'events' | 'family'

function ProfileFriendActions({ person, onChanged }: { person: User; onChanged: () => void }) {
  const { notify } = useToast()
  const act = async () => {
    try {
      if (person.friendship === 'INCOMING') await friendsApi.accept(person.id)
      else await friendsApi.sendRequest(person.id)
      notify('success', person.friendship === 'INCOMING' ? 'Вы приняли заявку' : 'Заявка отправлена')
      onChanged()
    } catch (e) {
      notify('error', (e as Error).message)
    }
  }
  if (person.friendship === 'FRIENDS') return <Badge tone="green">Друзья</Badge>
  if (person.friendship === 'OUTGOING') return <Badge tone="amber">Заявка отправлена</Badge>
  return (
    <Button variant="secondary" icon={<UserPlus className="size-4" />} onClick={act}>
      {person.friendship === 'INCOMING' ? 'Принять в друзья' : 'Добавить в друзья'}
    </Button>
  )
}

export function CabinetPage() {
  const { user, refreshUser } = useAuth()
  const [tab, setTab] = useState<CabinetTab>('registrations')
  const [editing, setEditing] = useState(false)
  const [verifyOpen, setVerifyOpen] = useState(false)
  const verification = useAsync(() => (user?.role === 'USER' ? usersApi.myVerification() : Promise.resolve(null)), [user?.id, user?.role])
  const registrations = useAsync(() => eventsApi.myRegistrations(), [])
  const events = useAsync(() => (user?.role === 'USER' ? eventsApi.mine() : Promise.resolve([])), [user?.role])
  const family = useAsync(async () => {
    if (user?.role !== 'USER' || !user.familyId) return null
    return familiesApi.my()
  }, [user?.id, user?.familyId, user?.role])

  if (!user) return null

  const tabs: { value: CabinetTab; label: string; icon: ReactNode; count?: number }[] = [
    { value: 'registrations', label: 'Мои записи', icon: <CalendarCheck className="size-5" /> },
  ]
  if (user.role === 'USER') {
    tabs.push({ value: 'events', label: 'Я организую', icon: <CalendarDays className="size-5" />, count: events.data?.reduce((n, e) => n + e.pendingCount, 0) })
    tabs.push({ value: 'family', label: 'Семья', icon: <HeartHandshake className="size-5" /> })
  }

  return (
    <div className="space-y-6">
      <ProfileCard
        user={user}
        action={
          <div className="flex flex-col gap-2">
            <Button variant="secondary" icon={<Pencil className="size-4" />} onClick={() => setEditing(true)}>
              Изменить
            </Button>
            {user.role === 'USER' && !user.verified && (
              <Button variant="secondary" icon={<BadgeCheck className="size-4" />} onClick={() => setVerifyOpen(true)}>
                Получить галочку
              </Button>
            )}
          </div>
        }
      />
      {user.role === 'USER' && !user.verified && verification.data?.status === 'PENDING' && (
        <p className="rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Заявка на верификацию на рассмотрении у администратора.
        </p>
      )}
      <VerificationRequestModal
        open={verifyOpen}
        onClose={() => setVerifyOpen(false)}
        latest={verification.data ?? null}
        onSubmitted={async () => {
          await verification.reload()
          await refreshUser()
        }}
      />
      <Tabs value={tab} onChange={setTab} items={tabs} />

      {tab === 'registrations' && <RegistrationsList state={registrations} />}

      {tab === 'events' && (
        <div className="space-y-4">
          {!user.canCreateEvents && user.role === 'USER' && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
              {reputationHint(user.reputation, true)}
            </p>
          )}
          <div className="flex justify-end">
            {user.canCreateEvents ? (
              <LinkButton to="/events/new" icon={<PlusCircle className="size-5" />}>
                Создать мероприятие
              </LinkButton>
            ) : (
              <Button variant="secondary" disabled icon={<PlusCircle className="size-5" />}>
                Создать мероприятие
              </Button>
            )}
          </div>
          {events.loading && !events.data && <Spinner />}
          {events.data?.length === 0 && (
            <EmptyState icon={<CalendarDays className="size-8" />} title="Вы ещё ничего не организовали" text="Соберите компанию для любимого вида спорта." />
          )}
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {events.data?.map((event) => (
              <div key={event.id} className="relative min-w-0">
                {event.pendingCount > 0 && (
                  <span className="absolute -right-2 -top-2 z-10 rounded-full bg-accent-500 px-3 py-1 text-sm font-bold text-[#111111] shadow">
                    {event.pendingCount} {plural(event.pendingCount, 'заявка', 'заявки', 'заявок')}
                  </span>
                )}
                <EventCard event={event} showStatus />
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'family' && (
        <FamilyPanel
          user={user}
          family={family.data ?? null}
          familyState={family}
          onChanged={async () => {
            await Promise.all([family.reload(), refreshUser()])
          }}
        />
      )}

      {editing && (
        <ProfileEditor
          user={user}
          onClose={() => setEditing(false)}
          onSaved={async () => {
            setEditing(false)
            await refreshUser()
          }}
        />
      )}
    </div>
  )
}

function RegistrationsList({ state }: { state: { data: MyRegistration[] | undefined; error: Error | null; loading: boolean; reload: () => Promise<void> } }) {
  const [routeEventId, setRouteEventId] = useState<number | null>(null)
  if (state.error) return <ErrorBox error={state.error} onRetry={state.reload} />
  if (state.loading && !state.data) return <Spinner />
  const list = state.data ?? []
  if (list.length === 0)
    return (
      <EmptyState
        icon={<CalendarCheck className="size-8" />}
        title="Записей пока нет"
        text="Найдите занятие по душе в афише."
        action={<LinkButton to="/feed">Открыть афишу</LinkButton>}
      />
    )

  const upcoming = list.filter((r) => !r.event.past)
  const past = list.filter((r) => r.event.past)

  const row = ({ registration, event }: MyRegistration) => (
    <div key={registration.id} className="space-y-3">
      <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <Link to={`/events/${event.id}`} className="flex min-w-0 flex-1 items-start gap-3 transition lift">
          <span className="text-3xl">{event.sportEmoji ?? '🏅'}</span>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold">{event.title}</p>
            <p className="text-muted">
              {formatRelativeDay(event.startAt)}, {formatTime(event.startAt)} · {event.address}
            </p>
            {registration.child && <p className="text-sm font-medium text-emerald-700">Участник: {registration.participantName}</p>}
            {registration.decisionComment && <p className="text-sm text-muted">Организатор: {registration.decisionComment}</p>}
            {event.status !== 'PUBLISHED' && event.moderationReason && (
              <p className="text-sm font-medium text-red-700">Снято с публикации: {event.moderationReason}</p>
            )}
          </div>
        </Link>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <RegistrationBadge status={registration.status} label={registration.child ? childLabel(registration.status) : undefined} />
          {registration.status === 'APPROVED' && event.latitude != null && event.longitude != null && !event.past && (
            <Button type="button" variant="secondary" size="sm" onClick={() => setRouteEventId(routeEventId === event.id ? null : event.id)}>
              Как добраться
            </Button>
          )}
        </div>
      </div>
      {routeEventId === event.id && event.latitude != null && event.longitude != null && (
        <EventRoutePlanner latitude={event.latitude} longitude={event.longitude} eventTitle={event.title} />
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      {upcoming.length > 0 && <div className="space-y-3">{upcoming.map(row)}</div>}
      {past.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-muted">Прошедшие</h2>
          <div className="space-y-3 opacity-75">{past.map(row)}</div>
        </div>
      )}
    </div>
  )
}

const childLabel = (status: MyRegistration['registration']['status']) =>
  ({ PENDING: 'Заявка ждёт решения', APPROVED: 'Ребёнок записан', REJECTED: 'Заявка отклонена', CANCELLED: 'Запись отменена' })[status]

function splitName(displayName: string) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return { first: parts[0] ?? '', last: '' }
  return { first: parts[0], last: parts.slice(1).join(' ') }
}

function ChildProfileModal({
  child,
  open,
  onClose,
  onUpdated,
}: {
  child: User
  open: boolean
  onClose: () => void
  onUpdated: () => Promise<void>
}) {
  const { notify } = useToast()
  const { first, last } = splitName(child.displayName)
  const [freeEntry, setFreeEntry] = useState(child.freeEventEntry)
  const [busy, setBusy] = useState(false)
  const approvals = useAsync(() => (open ? eventsApi.parentApprovals() : Promise.resolve([])), [child.id, open])

  useEffect(() => {
    setFreeEntry(child.freeEventEntry)
  }, [child.freeEventEntry, child.id])

  const childPending = (approvals.data ?? []).filter((row) => row.registration.participantId === child.id)

  const saveSettings = async () => {
    setBusy(true)
    try {
      await usersApi.updateChildSettings(child.id, { freeEventEntry: freeEntry })
      notify('success', 'Настройки сохранены')
      await onUpdated()
    } catch (err) {
      notify('error', 'Не удалось сохранить', (err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const decide = async (eventId: number, registrationId: number, status: 'APPROVED' | 'REJECTED') => {
    try {
      await eventsApi.parentDecision(eventId, registrationId, status)
      notify('success', status === 'APPROVED' ? 'Заявка одобрена' : 'Заявка отклонена')
      await Promise.all([approvals.reload(), onUpdated()])
    } catch (err) {
      notify('error', 'Не удалось принять решение', (err as Error).message)
    }
  }

  const lastSeen = child.lastActiveAt ? `${formatRelativeDay(child.lastActiveAt)}, ${formatTime(child.lastActiveAt)}` : 'Ещё не заходил(а) в аккаунт'

  return (
    <Modal open={open} title={child.displayName} onClose={onClose}>
      <div className="space-y-5">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-semibold text-muted">Имя</dt>
            <dd className="text-lg font-bold">{first || '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-muted">Фамилия</dt>
            <dd className="text-lg font-bold">{last || '—'}</dd>
          </div>
        </dl>
        <p className="text-sm text-muted">
          <span className="font-semibold text-ink">Последняя активность:</span> {lastSeen}
        </p>
        <Field
          label="Свободный вход на мероприятия"
          hint="Если «Нет», заявки ребёнка сначала уходят вам на согласование — только после этого он попадёт в число участников."
        >
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-ink bg-white p-3 font-semibold">
            <input type="checkbox" className="size-5 accent-brand-600" checked={freeEntry} onChange={(e) => setFreeEntry(e.target.checked)} />
            {freeEntry ? 'Да — записывается без вашего подтверждения' : 'Нет — нужно ваше одобрение'}
          </label>
        </Field>
        <Button type="button" loading={busy} onClick={saveSettings}>
          Сохранить настройки
        </Button>
        {childPending.length > 0 && (
          <div className="space-y-3 rounded-xl border-2 border-ink bg-pop-yellow/40 p-4">
            <p className="font-bold">Ждут вашего решения</p>
            <ul className="space-y-3">
              {childPending.map(({ registration, event }) => (
                <li key={registration.id} className="rounded-lg border-2 border-ink bg-white p-3">
                  <p className="font-semibold">{event.title}</p>
                  <p className="text-sm text-muted">
                    {formatRelativeDay(event.startAt)}, {formatTime(event.startAt)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button size="sm" variant="success" onClick={() => decide(event.id, registration.id, 'APPROVED')}>
                      Одобрить
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => decide(event.id, registration.id, 'REJECTED')}>
                      Отклонить
                    </Button>
                    <LinkButton to={`/events/${event.id}`} size="sm">
                      Открыть
                    </LinkButton>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  )
}

function FamilyPanel({
  user,
  family,
  familyState,
  onChanged,
}: {
  user: User
  family: Family | null
  familyState: { loading: boolean; error: Error | null; reload: () => Promise<void> }
  onChanged: () => Promise<void>
}) {
  const { notify } = useToast()
  const { reloadAccounts } = useAuth()
  const spouses = useAsync(async () => {
    if (user.role !== 'USER' || !user.gender) return []
    if (!user.familyId) return familiesApi.eligibleSpouses()
    if (family?.canAddSpouse) return familiesApi.eligibleSpouses()
    return []
  }, [user.id, user.familyId, user.gender, user.role, family?.canAddSpouse])
  const [spouseId, setSpouseId] = useState<number | ''>('')
  const [creating, setCreating] = useState(false)
  const [addingSpouse, setAddingSpouse] = useState(false)
  const [selectedChild, setSelectedChild] = useState<User | null>(null)
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [interests, setInterests] = useState('')
  const [addingChild, setAddingChild] = useState(false)

  if (familyState.error) return <ErrorBox error={familyState.error} onRetry={familyState.reload} />
  if (familyState.loading && !family) return <Spinner />

  const createFamily = async () => {
    setCreating(true)
    try {
      await familiesApi.create(spouseId === '' ? undefined : spouseId)
      await onChanged()
      notify('success', 'Семья создана', spouseId === '' ? 'Можно сразу добавить детей. Партнёра можно пригласить позже.' : 'Теперь оба родителя могут добавлять детей и записывать их на занятия.')
    } catch (err) {
      notify('error', 'Не удалось создать семью', (err as Error).message)
    } finally {
      setCreating(false)
    }
  }

  const addChild = async (e: FormEvent) => {
    e.preventDefault()
    setAddingChild(true)
    try {
      const child = await usersApi.addChild(user.id, { displayName: name.trim(), age: Number(age), interests: interests.trim() || undefined })
      setName('')
      setAge('')
      setInterests('')
      await Promise.all([onChanged(), reloadAccounts()])
      notify('success', `Аккаунт для ${child.displayName} создан`, 'Ребёнок увидит только безопасные мероприятия.')
    } catch (err) {
      notify('error', 'Не удалось добавить', (err as Error).message)
    } finally {
      setAddingChild(false)
    }
  }

  if (!family) {
    return (
      <Section title="Создать семью" icon={<HeartHandshake className="size-6 text-brand-600" />}>
        <div className="space-y-4">
          {!user.gender && (
            <p className="rounded-xl border-2 border-ink bg-pop-yellow/50 p-4 font-medium text-ink">
              Укажите пол в профиле (кнопка «Изменить» выше) — семью могут создать мужчина и женщина.
            </p>
          )}
          <p className="text-muted">
            Можно создать семью сразу и добавить детей — второй родитель необязателен. Партнёра можно выбрать сейчас или позже в настройках семьи.
          </p>
          {spouses.error && <ErrorBox error={spouses.error} onRetry={spouses.reload} />}
          {spouses.loading && !spouses.data ? (
            <Spinner label="Ищем партнёров…" />
          ) : (
            <>
              <Field label="Партнёр (необязательно)">
                <select className="input" value={spouseId} onChange={(e) => setSpouseId(e.target.value === '' ? '' : Number(e.target.value))} disabled={!user.gender}>
                  <option value="">— без партнёра —</option>
                  {spouses.data?.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.displayName}
                      {person.age ? `, ${person.age} лет` : ''}
                    </option>
                  ))}
                </select>
              </Field>
              {user.gender && spouses.data?.length === 0 && (
                <p className="text-muted">Сейчас нет подходящих партнёров — зарегистрируйте второго родителя или переключитесь на другой демо-аккаунт.</p>
              )}
              <Button type="button" loading={creating} disabled={!user.gender} onClick={createFamily} icon={<HeartHandshake className="size-5" />}>
                Создать семью
              </Button>
            </>
          )}
        </div>
      </Section>
    )
  }

  const addSpouse = async () => {
    if (spouseId === '') return
    setAddingSpouse(true)
    try {
      await familiesApi.addSpouse(spouseId)
      setSpouseId('')
      await onChanged()
      notify('success', 'Партнёр добавлен в семью')
    } catch (err) {
      notify('error', 'Не удалось добавить партнёра', (err as Error).message)
    } finally {
      setAddingSpouse(false)
    }
  }

  const kids = family.children

  return (
    <div className="space-y-6">
      {selectedChild && (
        <ChildProfileModal
          child={selectedChild}
          open
          onClose={() => setSelectedChild(null)}
          onUpdated={onChanged}
        />
      )}
      <Section title="Ваша семья" icon={<HeartHandshake className="size-6 text-brand-600" />}>
        <div className="grid gap-3 sm:grid-cols-2">
          {family.maleName && (
            <div className="rounded-xl border-2 border-ink bg-pop-blue/30 p-4">
              <p className="text-sm font-semibold text-muted">Мужчина</p>
              <p className="text-lg font-bold">{family.maleName}</p>
            </div>
          )}
          {family.femaleName && (
            <div className="rounded-xl border-2 border-ink bg-pop-pink/30 p-4">
              <p className="text-sm font-semibold text-muted">Женщина</p>
              <p className="text-lg font-bold">{family.femaleName}</p>
            </div>
          )}
        </div>
        {family.canAddSpouse && (
          <div className="mt-4 space-y-3 rounded-xl border-2 border-dashed border-ink bg-white p-4">
            <p className="font-semibold">Добавить второго родителя (необязательно)</p>
            <Field label="Партнёр">
              <select className="input" value={spouseId} onChange={(e) => setSpouseId(e.target.value === '' ? '' : Number(e.target.value))}>
                <option value="">— выберите —</option>
                {spouses.data?.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.displayName}
                  </option>
                ))}
              </select>
            </Field>
            <Button type="button" loading={addingSpouse} disabled={spouseId === ''} onClick={addSpouse} icon={<UserPlus className="size-5" />}>
              Пригласить в семью
            </Button>
          </div>
        )}
      </Section>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Дети" icon={<Users className="size-6 text-brand-600" />}>
          {kids.length === 0 ? (
            <p className="text-muted">Добавьте ребёнка — любой из родителей сможет записывать его на занятия и формировать согласие.</p>
          ) : (
            <ul className="space-y-3">
              {kids.map((child) => (
                <li key={child.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedChild(child)}
                    className="flex w-full items-center gap-3 rounded-xl border-2 border-ink bg-pop-green/30 p-3 text-left transition hover:bg-pop-green/50"
                  >
                    <Avatar name={child.displayName} color={child.avatarColor} />
                    <div>
                      <p className="font-bold">{child.displayName}</p>
                      <p className="text-sm text-muted">
                        {child.age} {plural(child.age ?? 0, 'год', 'года', 'лет')}
                        {child.interests ? ` · ${child.interests}` : ''}
                        {!child.freeEventEntry && ' · нужно ваше одобрение записей'}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="Добавить ребёнка" icon={<UserPlus className="size-6 text-brand-600" />}>
          <form onSubmit={addChild} className="space-y-4">
            <Field label="Имя">
              <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Возраст" hint="От 3 до 17 лет">
              <input className="input" type="number" min={3} max={17} required value={age} onChange={(e) => setAge(e.target.value)} />
            </Field>
            <Field label="Интересы (необязательно)">
              <input className="input" value={interests} onChange={(e) => setInterests(e.target.value)} />
            </Field>
            <Button type="submit" loading={addingChild} disabled={!name.trim() || !age} icon={<UserPlus className="size-5" />}>
              Добавить
            </Button>
          </form>
        </Section>
      </div>
    </div>
  )
}

function ProfileEditor({ user, onClose, onSaved }: { user: User; onClose: () => void; onSaved: () => Promise<void> }) {
  const { notify } = useToast()
  const [form, setForm] = useState({
    displayName: user.displayName,
    city: user.city ?? '',
    interests: user.interests ?? '',
    bio: user.bio ?? '',
    gender: user.gender ?? '',
  })
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await usersApi.update(user.id, {
        displayName: form.displayName.trim(),
        city: form.city.trim() || null,
        interests: form.interests.trim() || null,
        bio: form.bio.trim() || null,
        gender: user.role === 'USER' && form.gender ? (form.gender as User['gender']) : undefined,
      })
      notify('success', 'Профиль обновлён')
      await onSaved()
    } catch (err) {
      notify('error', 'Не удалось сохранить', (err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open title="Профиль" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Имя">
          <input className="input" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
        </Field>
        <Field label="Город">
          <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </Field>
        <Field label="Интересы">
          <input className="input" value={form.interests} onChange={(e) => setForm({ ...form, interests: e.target.value })} />
        </Field>
        <Field label="О себе">
          <textarea className="input min-h-24" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        </Field>
        {user.role === 'USER' && (
          <Field label="Пол" hint={user.familyId ? 'В семье пол изменить нельзя' : 'Нужен для создания семьи'}>
            <select
              className="input"
              value={form.gender}
              disabled={Boolean(user.familyId)}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
            >
              <option value="">— не указан —</option>
              {(Object.keys(genderLabels) as Array<keyof typeof genderLabels>).map((value) => (
                <option key={value} value={value}>
                  {genderLabels[value]}
                </option>
              ))}
            </select>
          </Field>
        )}
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" loading={busy}>
            Сохранить
          </Button>
        </div>
      </form>
    </Modal>
  )
}
