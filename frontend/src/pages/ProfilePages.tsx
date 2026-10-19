import { Baby, CalendarCheck, CalendarDays, Heart, MapPin, Pencil, PlusCircle, UserPlus, Users } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { eventsApi, usersApi } from '../api/endpoints'
import type { MyRegistration, User } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { RegistrationBadge } from '../components/EventBadges'
import { EventCard } from '../components/EventCard'
import { useToast } from '../components/Toast'
import { Avatar, Badge, Button, EmptyState, ErrorBox, Field, LinkButton, Modal, Section, Spinner, Tabs } from '../components/ui'
import { formatRelativeDay, formatTime, plural, roleLabels } from '../lib/format'
import { useAsync } from '../lib/useAsync'

export function ProfilePage() {
  const id = Number(useParams().id)
  const profile = useAsync(() => usersApi.get(id), [id])
  const events = useAsync(() => eventsApi.list({ organizerUserId: id }), [id])

  if (profile.loading && !profile.data) return <Spinner />
  if (profile.error) return <ErrorBox error={profile.error} />
  if (!profile.data) return null
  const person = profile.data

  return (
    <div className="space-y-6">
      <ProfileCard user={person} />
      {person.role === 'USER' && (
        <Section title="Организует" icon={<CalendarDays className="size-6 text-brand-600" />}>
          {events.data?.length === 0 && <p className="text-slate-600">Сейчас нет запланированных мероприятий.</p>}
          <div className="grid gap-5 sm:grid-cols-2">
            {events.data?.filter((e) => e.organizerType === 'USER').map((event) => <EventCard key={event.id} event={event} />)}
          </div>
        </Section>
      )}
    </div>
  )
}

function ProfileCard({ user, action }: { user: User; action?: ReactNode }) {
  return (
    <section className="card flex flex-col gap-5 p-6 sm:flex-row sm:items-start">
      <Avatar name={user.displayName} color={user.avatarColor} size="lg" />
      <div className="flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-extrabold">{user.displayName}</h1>
          <Badge tone={user.role === 'CHILD' ? 'brand' : 'slate'}>{roleLabels[user.role]}</Badge>
        </div>
        <p className="flex flex-wrap gap-x-5 gap-y-1 text-slate-600">
          {user.age && <span>{user.age} {plural(user.age, 'год', 'года', 'лет')}</span>}
          {user.city && (
            <span className="flex items-center gap-1">
              <MapPin className="size-4" />
              {user.city}
            </span>
          )}
          {user.parentName && <span>Родитель: {user.parentName}</span>}
        </p>
        {user.interests && (
          <p className="flex items-center gap-2 font-medium text-brand-700">
            <Heart className="size-4" />
            {user.interests}
          </p>
        )}
        {user.bio && <p className="whitespace-pre-line text-slate-700">{user.bio}</p>}
      </div>
      {action}
    </section>
  )
}

type CabinetTab = 'registrations' | 'events' | 'children'

export function CabinetPage() {
  const { user, refreshUser } = useAuth()
  const [tab, setTab] = useState<CabinetTab>('registrations')
  const [editing, setEditing] = useState(false)
  const registrations = useAsync(() => eventsApi.myRegistrations(), [])
  const events = useAsync(() => (user?.role === 'USER' ? eventsApi.mine() : Promise.resolve([])), [user?.role])
  const children = useAsync(() => (user?.role === 'USER' ? usersApi.children(user.id) : Promise.resolve([] as User[])), [user?.id])

  if (!user) return null

  const tabs: { value: CabinetTab; label: string; icon: ReactNode; count?: number }[] = [
    { value: 'registrations', label: 'Мои записи', icon: <CalendarCheck className="size-5" /> },
  ]
  if (user.role === 'USER') {
    tabs.push({ value: 'events', label: 'Я организую', icon: <CalendarDays className="size-5" />, count: events.data?.reduce((n, e) => n + e.pendingCount, 0) })
    tabs.push({ value: 'children', label: 'Дети', icon: <Baby className="size-5" /> })
  }

  return (
    <div className="space-y-6">
      <ProfileCard
        user={user}
        action={
          <Button variant="secondary" icon={<Pencil className="size-4" />} onClick={() => setEditing(true)}>
            Изменить
          </Button>
        }
      />
      <Tabs value={tab} onChange={setTab} items={tabs} />

      {tab === 'registrations' && <RegistrationsList state={registrations} />}

      {tab === 'events' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <LinkButton to="/events/new" icon={<PlusCircle className="size-5" />}>
              Создать мероприятие
            </LinkButton>
          </div>
          {events.loading && !events.data && <Spinner />}
          {events.data?.length === 0 && (
            <EmptyState icon={<CalendarDays className="size-8" />} title="Вы ещё ничего не организовали" text="Соберите компанию для любимого вида спорта." />
          )}
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {events.data?.map((event) => (
              <div key={event.id} className="relative">
                {event.pendingCount > 0 && (
                  <span className="absolute -right-2 -top-2 z-10 rounded-full bg-accent-500 px-3 py-1 text-sm font-bold text-white shadow">
                    {event.pendingCount} {plural(event.pendingCount, 'заявка', 'заявки', 'заявок')}
                  </span>
                )}
                <EventCard event={event} showStatus />
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'children' && <ChildrenPanel parent={user} kids={children.data ?? []} onAdded={children.reload} />}

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
  if (state.error) return <ErrorBox error={state.error} onRetry={state.reload} />
  if (state.loading && !state.data) return <Spinner />
  const list = state.data ?? []
  if (list.length === 0)
    return (
      <EmptyState
        icon={<CalendarCheck className="size-8" />}
        title="Записей пока нет"
        text="Найдите занятие по душе в афише."
        action={<LinkButton to="/">Открыть афишу</LinkButton>}
      />
    )

  const upcoming = list.filter((r) => !r.event.past)
  const past = list.filter((r) => r.event.past)

  const row = ({ registration, event }: MyRegistration) => (
    <Link key={registration.id} to={`/events/${event.id}`} className="card flex flex-col gap-3 p-4 transition lift sm:flex-row sm:items-center">
      <span className="text-3xl">{event.sportEmoji ?? '🏅'}</span>
      <div className="min-w-0 flex-1">
        <p className="text-lg font-bold">{event.title}</p>
        <p className="text-slate-600">
          {formatRelativeDay(event.startAt)}, {formatTime(event.startAt)} · {event.address}
        </p>
        {registration.child && <p className="text-sm font-medium text-emerald-700">Участник: {registration.participantName}</p>}
        {registration.decisionComment && <p className="text-sm text-slate-600">Организатор: {registration.decisionComment}</p>}
        {event.status !== 'PUBLISHED' && event.moderationReason && (
          <p className="text-sm font-medium text-red-700">Снято с публикации: {event.moderationReason}</p>
        )}
      </div>
      <RegistrationBadge status={registration.status} label={registration.child ? childLabel(registration.status) : undefined} />
    </Link>
  )

  return (
    <div className="space-y-6">
      {upcoming.length > 0 && <div className="space-y-3">{upcoming.map(row)}</div>}
      {past.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-600">Прошедшие</h2>
          <div className="space-y-3 opacity-75">{past.map(row)}</div>
        </div>
      )}
    </div>
  )
}

const childLabel = (status: MyRegistration['registration']['status']) =>
  ({ PENDING: 'Заявка ждёт решения', APPROVED: 'Ребёнок записан', REJECTED: 'Заявка отклонена', CANCELLED: 'Запись отменена' })[status]

function ChildrenPanel({ parent, kids, onAdded }: { parent: User; kids: User[]; onAdded: () => Promise<void> }) {
  const { notify } = useToast()
  const { reloadAccounts } = useAuth()
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [interests, setInterests] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const child = await usersApi.addChild(parent.id, { displayName: name.trim(), age: Number(age), interests: interests.trim() || undefined })
      setName('')
      setAge('')
      setInterests('')
      await Promise.all([onAdded(), reloadAccounts()])
      notify('success', `Аккаунт для ${child.displayName} создан`, 'Ребёнок увидит только безопасные мероприятия.')
    } catch (err) {
      notify('error', 'Не удалось добавить', (err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Section title="Детские аккаунты" icon={<Users className="size-6 text-brand-600" />}>
        {kids.length === 0 ? (
          <p className="text-slate-600">Добавьте ребёнка, чтобы записывать его на занятия. Для каждой записи автоматически сформируется согласие родителя.</p>
        ) : (
          <ul className="space-y-3">
            {kids.map((child) => (
              <li key={child.id} className="flex items-center gap-3 rounded-xl border-2 border-ink bg-pop-green/30 p-3">
                <Avatar name={child.displayName} color={child.avatarColor} />
                <div>
                  <p className="font-bold">{child.displayName}</p>
                  <p className="text-sm text-slate-600">
                    {child.age} {plural(child.age ?? 0, 'год', 'года', 'лет')}
                    {child.interests ? ` · ${child.interests}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="Добавить ребёнка" icon={<UserPlus className="size-6 text-brand-600" />}>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Имя">
            <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Возраст" hint="От 3 до 17 лет">
            <input className="input" type="number" min={3} max={17} required value={age} onChange={(e) => setAge(e.target.value)} />
          </Field>
          <Field label="Интересы (необязательно)">
            <input className="input" value={interests} onChange={(e) => setInterests(e.target.value)} />
          </Field>
          <Button type="submit" loading={busy} disabled={!name.trim() || !age} icon={<UserPlus className="size-5" />}>
            Добавить
          </Button>
        </form>
      </Section>
    </div>
  )
}

function ProfileEditor({ user, onClose, onSaved }: { user: User; onClose: () => void; onSaved: () => Promise<void> }) {
  const { notify } = useToast()
  const [form, setForm] = useState({ displayName: user.displayName, city: user.city ?? '', interests: user.interests ?? '', bio: user.bio ?? '' })
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
        <div className="flex justify-end gap-3">
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
