import { Building2, CalendarDays, CheckCircle2, Clock3, Globe, MapPin, Phone, PlusCircle, Search, Send, XCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { eventsApi, organizationsApi } from '../api/endpoints'
import type { Organization, OrganizationForm } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { EventCard } from '../components/EventCard'
import { useToast } from '../components/Toast'
import { Avatar, Badge, Button, EmptyState, ErrorBox, Field, LinkButton, PageHeader, Section, Spinner } from '../components/ui'
import { formatDateTime, organizationStatusLabels } from '../lib/format'
import { useAsync } from '../lib/useAsync'

export function OrganizationsPage() {
  const [query, setQuery] = useState('')
  const [applied, setApplied] = useState('')
  const { data, error, loading, reload } = useAsync(() => organizationsApi.list({ q: applied || undefined, status: 'APPROVED' }), [applied])

  return (
    <div>
      <PageHeader title="Клубы и организации" subtitle="Проверенные администратором организаторы регулярных занятий" />
      <form
        className="mb-6 flex gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          setApplied(query.trim())
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
          <input className="input pl-12" placeholder="Название или вид спорта" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Button type="submit">Найти</Button>
      </form>
      {error && <ErrorBox error={error} onRetry={reload} />}
      {loading && !data && <Spinner />}
      {data && data.length === 0 && <EmptyState icon={<Building2 className="size-8" />} title="Ничего не найдено" />}
      <div className="grid gap-5 sm:grid-cols-2">
        {data?.map((org) => (
          <Link key={org.id} to={`/organizations/${org.id}`} className="card flex gap-4 p-4 lift sm:p-5">
            <span className="contents sm:hidden">
              <Avatar name={org.name} color={org.logoColor} />
            </span>
            <span className="hidden sm:contents">
              <Avatar name={org.name} color={org.logoColor} size="lg" />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-bold sm:text-xl">{org.name}</h2>
              <p className="mt-1 font-medium text-brand-700">{org.sportsInterests}</p>
              <p className="mt-2 line-clamp-2 text-muted">{org.description}</p>
              {org.city && (
                <p className="mt-2 flex items-center gap-1 text-sm text-muted">
                  <MapPin className="size-4" />
                  {org.city}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function OrganizationPage() {
  const id = Number(useParams().id)
  const org = useAsync(() => organizationsApi.get(id), [id])
  const events = useAsync(() => eventsApi.list({ organizationId: id }), [id])

  if (org.loading && !org.data) return <Spinner />
  if (org.error) return <ErrorBox error={org.error} />
  if (!org.data) return null

  return (
    <div className="space-y-6">
      <OrganizationHeader org={org.data} />
      <Section title="Ближайшие мероприятия" icon={<CalendarDays className="size-6 text-brand-600" />}>
        {events.loading && !events.data && <Spinner />}
        {events.data?.length === 0 && <p className="text-muted">Сейчас нет запланированных мероприятий.</p>}
        <div className="grid gap-5 sm:grid-cols-2">
          {events.data?.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </Section>
    </div>
  )
}

function OrganizationHeader({ org }: { org: Organization }) {
  return (
    <section className="card p-4 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row">
        <span className="hidden sm:block">
          <Avatar name={org.name} color={org.logoColor} size="lg" />
        </span>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="sm:hidden">
              <Avatar name={org.name} color={org.logoColor} />
            </span>
            <h1 className="min-w-0 flex-1 text-xl font-extrabold sm:flex-none sm:text-3xl">{org.name}</h1>
            {org.status === 'APPROVED' && (
              <Badge tone="green" icon={<CheckCircle2 className="size-4" />}>
                Проверенная организация
              </Badge>
            )}
          </div>
          <p className="font-medium text-brand-700 sm:text-lg">{org.sportsInterests}</p>
          <p className="whitespace-pre-line text-muted sm:text-lg">{org.description}</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-muted">
            {(org.city || org.address) && (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4 shrink-0" />
                {[org.city, org.address].filter(Boolean).join(', ')}
              </span>
            )}
            {org.contacts && (
              <span className="flex items-center gap-1.5">
                <Phone className="size-4 shrink-0" />
                {org.contacts}
              </span>
            )}
            {org.website && (
              <a href={org.website.startsWith('http') ? org.website : `https://${org.website}`} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-1.5 break-all text-brand-700 underline">
                <Globe className="size-4 shrink-0" />
                {org.website}
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

const toForm = (org: Organization | null): OrganizationForm => ({
  name: org?.name ?? '',
  description: org?.description ?? '',
  sportsInterests: org?.sportsInterests ?? '',
  city: org?.city ?? 'Красноярск',
  address: org?.address ?? '',
  contacts: org?.contacts ?? '',
  website: org?.website ?? '',
})

export function MyOrganizationPage() {
  const { refreshUser } = useAuth()
  const org = useAsync(
    () => organizationsApi.my().catch((e) => (e instanceof ApiError && e.status === 404 ? null : Promise.reject(e))),
    [],
  )
  const events = useAsync(() => eventsApi.mine(), [])
  const [editing, setEditing] = useState(false)

  if (org.loading && org.data === undefined) return <Spinner />
  if (org.error) return <ErrorBox error={org.error} onRetry={org.reload} />
  const current = org.data ?? null

  const saved = async (value: Organization) => {
    org.setData(value)
    setEditing(false)
    await refreshUser()
  }

  if (!current || editing) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader
          title={current ? 'Анкета организации' : 'Заявка на регистрацию организации'}
          subtitle={
            current?.status === 'REJECTED'
              ? 'Исправьте данные с учётом замечаний — заявка снова уйдёт на рассмотрение.'
              : 'Администратор проверит данные. После одобрения вы сможете публиковать мероприятия.'
          }
        />
        <OrganizationEditor org={current} onSaved={saved} onCancel={current ? () => setEditing(false) : undefined} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <StatusCard org={current} onEdit={() => setEditing(true)} />
      <OrganizationHeader org={current} />
      {current.status === 'APPROVED' && (
        <Section
          title="Наши мероприятия"
          icon={<CalendarDays className="size-6 text-brand-600" />}
          action={
            <LinkButton to="/events/new" icon={<PlusCircle className="size-5" />}>
              Создать
            </LinkButton>
          }
        >
          {events.loading && !events.data && <Spinner />}
          {events.data?.length === 0 && <p className="text-muted">Вы ещё не создали ни одного мероприятия.</p>}
          <div className="grid gap-5 sm:grid-cols-2">
            {events.data?.map((event) => (
              <EventCard key={event.id} event={event} showStatus />
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

function StatusCard({ org, onEdit }: { org: Organization; onEdit: () => void }) {
  const styles = {
    PENDING: { box: 'bg-pop-yellow', icon: <Clock3 className="size-8" aria-hidden /> },
    APPROVED: { box: 'bg-pop-green', icon: <CheckCircle2 className="size-8" aria-hidden /> },
    REJECTED: { box: 'bg-pop-red', icon: <XCircle className="size-8" aria-hidden /> },
    CANCELLED: { box: 'bg-white', icon: <XCircle className="size-8" aria-hidden /> },
  }[org.status]

  const text = {
    PENDING: 'Заявка на рассмотрении у администратора. Публиковать мероприятия пока нельзя — мы сообщим о решении здесь.',
    APPROVED: 'Организация допущена: вы можете публиковать мероприятия, они сразу попадают в афишу.',
    REJECTED: 'Заявка отклонена. Исправьте анкету и отправьте её повторно.',
    CANCELLED: 'Заявка отозвана.',
  }[org.status]

  return (
    <section className={`flex flex-col gap-4 rounded-2xl border-[3px] border-ink p-5 text-ink shadow-md sm:flex-row sm:items-center ${styles.box}`}>
      {styles.icon}
      <div className="flex-1">
        <p className="text-lg font-bold">Статус заявки: {organizationStatusLabels[org.status]}</p>
        <p className="mt-1">{text}</p>
        {org.status === 'REJECTED' && org.rejectionReason && (
          <p className="mt-2 rounded-lg border-2 border-ink bg-white p-3">
            <span className="font-semibold">Причина отказа:</span> {org.rejectionReason}
          </p>
        )}
        {org.reviewedAt && (
          <p className="mt-1 text-sm opacity-80">
            Рассмотрено: {org.reviewedBy} · {formatDateTime(org.reviewedAt)}
          </p>
        )}
      </div>
      <Button variant={org.status === 'REJECTED' ? 'primary' : 'secondary'} onClick={onEdit}>
        {org.status === 'REJECTED' ? 'Исправить и отправить' : 'Редактировать анкету'}
      </Button>
    </section>
  )
}

function OrganizationEditor({ org, onSaved, onCancel }: { org: Organization | null; onSaved: (org: Organization) => Promise<void>; onCancel?: () => void }) {
  const { notify } = useToast()
  const [form, setForm] = useState<OrganizationForm>(() => toForm(org))
  const [busy, setBusy] = useState(false)
  const set = (key: keyof OrganizationForm, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.description.trim() || !form.sportsInterests.trim()) {
      notify('error', 'Заполните название, описание и направления')
      return
    }
    setBusy(true)
    try {
      const saved = org ? await organizationsApi.update(org.id, form) : await organizationsApi.submit(form)
      notify('success', saved.status === 'PENDING' ? 'Заявка отправлена на рассмотрение' : 'Анкета сохранена')
      await onSaved(saved)
    } catch (err) {
      notify('error', 'Не удалось сохранить', (err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-5 p-4 sm:p-6">
      {org?.status === 'REJECTED' && org.rejectionReason && (
        <div className="rounded-2xl border-[3px] border-ink bg-pop-red shadow-md p-4 text-ink">
          <span className="font-semibold">Замечание администратора:</span> {org.rejectionReason}
        </div>
      )}
      <Field label="Название">
        <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} />
      </Field>
      <Field label="Направления и интересы" hint="Через запятую: футбол, бег, ОФП">
        <input className="input" value={form.sportsInterests} onChange={(e) => set('sportsInterests', e.target.value)} />
      </Field>
      <Field label="Описание деятельности">
        <textarea className="input min-h-32" value={form.description} onChange={(e) => set('description', e.target.value)} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Город">
          <input className="input" value={form.city ?? ''} onChange={(e) => set('city', e.target.value)} />
        </Field>
        <Field label="Адрес">
          <input className="input" value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} />
        </Field>
        <Field label="Контакты">
          <input className="input" value={form.contacts ?? ''} onChange={(e) => set('contacts', e.target.value)} />
        </Field>
        <Field label="Сайт или соцсети">
          <input className="input" value={form.website ?? ''} onChange={(e) => set('website', e.target.value)} />
        </Field>
      </div>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Отмена
          </Button>
        )}
        <Button type="submit" loading={busy} icon={<Send className="size-5" />}>
          {org ? (org.status === 'APPROVED' ? 'Сохранить' : 'Отправить на рассмотрение') : 'Подать заявку'}
        </Button>
      </div>
    </form>
  )
}
