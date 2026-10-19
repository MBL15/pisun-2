import { Bot, Check, Hourglass, MapPin, Plus, Save, Users } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { eventsApi, sportsApi } from '../api/endpoints'
import type { Audience, EventForm, RegistrationMode, SkillLevel, SportEvent } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { EventLocationMap } from '../components/EventLocationMap'
import { useToast } from '../components/Toast'
import { Button, EmptyState, ErrorBox, Field, LinkButton, PageHeader, Section, Spinner } from '../components/ui'
import { audienceLabels, levelLabels, modeHints, modeLabels, toLocalInput } from '../lib/format'
import { useAsync } from '../lib/useAsync'

const CUSTOM = -1

function defaultStart(): string {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  date.setHours(18, 0, 0, 0)
  return toLocalInput(date)
}

const emptyForm = (contact: string | null): EventForm => ({
  title: '',
  description: '',
  sportTypeId: null,
  customSportName: null,
  startAt: defaultStart(),
  durationMinutes: 90,
  address: '',
  locationNote: null,
  latitude: null,
  longitude: null,
  conditions: null,
  level: 'ANY',
  audience: 'ALL',
  capacity: null,
  registrationMode: 'FREE',
  organizerContact: contact,
})

const fromEvent = (event: SportEvent): EventForm => ({
  title: event.title,
  description: event.description,
  sportTypeId: event.sportTypeId,
  customSportName: null,
  startAt: event.startAt.slice(0, 16),
  durationMinutes: event.durationMinutes,
  address: event.address,
  locationNote: event.locationNote,
  latitude: event.latitude,
  longitude: event.longitude,
  conditions: event.conditions,
  level: event.level,
  audience: event.audience,
  capacity: event.capacity,
  registrationMode: event.registrationMode,
  organizerContact: event.organizerContact,
})

const blankToNull = (value: string | null) => (value && value.trim() ? value.trim() : null)

export function EventFormPage() {
  const params = useParams()
  const editId = params.id ? Number(params.id) : null
  const { user } = useAuth()
  const existing = useAsync(() => (editId ? eventsApi.get(editId) : Promise.resolve(null)), [editId])

  if (!user) return null
  const blocked =
    user.role === 'CHILD' || user.role === 'ADMIN'
      ? 'Создавать мероприятия могут взрослые пользователи и одобренные организации.'
      : user.role === 'ORGANIZATION' && user.organizationStatus !== 'APPROVED'
        ? 'Организация сможет публиковать мероприятия после одобрения заявки администратором.'
        : null

  if (blocked)
    return (
      <EmptyState
        icon={<Hourglass className="size-8" />}
        title="Создание мероприятий недоступно"
        text={blocked}
        action={
          user.role === 'ORGANIZATION' ? (
            <LinkButton to="/my-organization">Статус заявки</LinkButton>
          ) : (
            <LinkButton to="/">К афише</LinkButton>
          )
        }
      />
    )

  if (existing.loading && !existing.data) return <Spinner />
  if (existing.error) return <ErrorBox error={existing.error} />
  if (existing.data && !existing.data.viewer.organizer) return <ErrorBox error="Редактировать мероприятие может только его организатор." />

  return <EventEditor key={editId ?? 'new'} event={existing.data ?? null} defaultContact={user.email} />
}

function EventEditor({ event, defaultContact }: { event: SportEvent | null; defaultContact: string | null }) {
  const navigate = useNavigate()
  const { notify } = useToast()
  const sports = useAsync(() => sportsApi.list(), [])
  const [form, setForm] = useState<EventForm>(() => (event ? fromEvent(event) : emptyForm(defaultContact)))
  const [sportChoice, setSportChoice] = useState<number | ''>(event?.sportTypeId ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const chooseSport = (choice: number | '') => {
    setSportChoice(choice)
    if (choice === CUSTOM) setForm((f) => ({ ...f, sportTypeId: null }))
    else setForm((f) => ({ ...f, sportTypeId: choice === '' ? null : choice, customSportName: null }))
  }

  const set = <K extends keyof EventForm>(key: K, value: EventForm[K]) => setForm((f) => ({ ...f, [key]: value }))

  const validate = () => {
    const next: Record<string, string> = {}
    if (!form.title.trim()) next.title = 'Укажите название'
    if (!form.description.trim()) next.description = 'Расскажите, что будет происходить'
    if (sportChoice === '') next.sport = 'Выберите направление'
    if (sportChoice === CUSTOM && !form.customSportName?.trim()) next.sport = 'Введите название своего направления'
    if (!form.startAt) next.startAt = 'Укажите дату и время'
    else if (new Date(form.startAt) < new Date()) next.startAt = 'Дата уже прошла'
    if (!form.address.trim()) next.address = 'Укажите место проведения'
    if (form.capacity != null && form.capacity < 2) next.capacity = 'Хотя бы 2 места'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) {
      notify('error', 'Проверьте форму', 'Некоторые поля заполнены не полностью')
      return
    }
    setBusy(true)
    const body: EventForm = {
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      address: form.address.trim(),
      customSportName: sportChoice === CUSTOM ? blankToNull(form.customSportName) : null,
      locationNote: blankToNull(form.locationNote),
      conditions: blankToNull(form.conditions),
      organizerContact: blankToNull(form.organizerContact),
    }
    try {
      const saved = event ? await eventsApi.update(event.id, body) : await eventsApi.create(body)
      if (saved.status === 'ON_REVIEW') {
        notify('error', 'Отправлено на проверку', saved.aiSummary ?? 'ИИ-модератор нашёл возможные нарушения — администратор проверит мероприятие.')
      } else {
        notify('success', event ? 'Изменения сохранены' : 'Мероприятие опубликовано', saved.aiSummary ?? undefined)
      }
      navigate(`/events/${saved.id}`, { replace: true })
    } catch (err) {
      notify('error', 'Не удалось сохранить', (err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-6" noValidate>
      <PageHeader
        title={event ? 'Редактирование' : 'Новое мероприятие'}
        subtitle="Перед публикацией описание проверит ИИ-модератор и определит, подходит ли событие детям."
      />

      <Section title="Что за событие">
        <div className="space-y-5">
          <Field label="Название" error={errors.title}>
            <input className="input" value={form.title} maxLength={160} placeholder="Например: Футбол 5×5 во дворе" onChange={(e) => set('title', e.target.value)} />
          </Field>
          <Field label="Направление" error={errors.sport} hint="Нет нужного? Выберите «Своё направление» — оно появится в справочнике для всех.">
            <select
              className="input"
              value={sportChoice}
              onChange={(e) => chooseSport(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <option value="">— выберите —</option>
              {sports.data?.map((sport) => (
                <option key={sport.id} value={sport.id}>
                  {sport.emoji} {sport.name}
                </option>
              ))}
              <option value={CUSTOM}>➕ Своё направление…</option>
            </select>
          </Field>
          {sportChoice === CUSTOM && (
            <Field label="Название направления">
              <input
                className="input"
                maxLength={80}
                placeholder="Например: Фрисби, Скалолазание, Йога"
                value={form.customSportName ?? ''}
                onChange={(e) => set('customSportName', e.target.value)}
                autoFocus
              />
            </Field>
          )}
          <Field label="Описание" error={errors.description}>
            <textarea
              className="input min-h-36"
              maxLength={4000}
              placeholder="Что будете делать, для кого, что взять с собой"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </Field>
        </div>
      </Section>

      <Section title="Когда" >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Начало" error={errors.startAt}>
            <input type="datetime-local" className="input" value={form.startAt} onChange={(e) => set('startAt', e.target.value)} />
          </Field>
          <Field label="Длительность">
            <select className="input" value={form.durationMinutes} onChange={(e) => set('durationMinutes', Number(e.target.value))}>
              {[30, 45, 60, 90, 120, 150, 180, 240, 360].map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes < 60 ? `${minutes} мин` : `${minutes / 60} ч`}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      <Section title="Где" icon={<MapPin className="size-6 text-brand-600" />}>
        <div className="space-y-5">
          <EventLocationMap
            address={form.address}
            latitude={form.latitude}
            longitude={form.longitude}
            addressError={errors.address}
            onAddressChange={(address) => set('address', address)}
            onCoordsChange={(latitude, longitude) => setForm((f) => ({ ...f, latitude, longitude }))}
          />
          <Field label="Как найти (необязательно)" hint="Уточнение для участников: вход, ориентир, этаж">
            <input className="input" maxLength={500} placeholder="Вход со стороны парковки, ищите оранжевую палатку" value={form.locationNote ?? ''} onChange={(e) => set('locationNote', e.target.value)} />
          </Field>
        </div>
      </Section>

      <Section title="Участники и запись" icon={<Users className="size-6 text-brand-600" />}>
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {(['FREE', 'BY_APPLICATION'] as RegistrationMode[]).map((mode) => (
              <ChoiceCard key={mode} active={form.registrationMode === mode} onClick={() => set('registrationMode', mode)} title={modeLabels[mode]}>
                {modeHints[mode]}
              </ChoiceCard>
            ))}
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Уровень">
              <select className="input" value={form.level} onChange={(e) => set('level', e.target.value as SkillLevel)}>
                {(Object.keys(levelLabels) as SkillLevel[]).map((level) => (
                  <option key={level} value={level}>
                    {levelLabels[level]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Для кого">
              <select className="input" value={form.audience} onChange={(e) => set('audience', e.target.value as Audience)}>
                {(Object.keys(audienceLabels) as Audience[]).map((audience) => (
                  <option key={audience} value={audience}>
                    {audienceLabels[audience]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Мест" error={errors.capacity} hint="Пусто — без ограничений">
              <input
                type="number"
                min={2}
                className="input"
                value={form.capacity ?? ''}
                onChange={(e) => set('capacity', e.target.value ? Number(e.target.value) : null)}
              />
            </Field>
          </div>
          <Field label="Условия участия" hint="Экипировка, взносы, требования к опыту">
            <textarea className="input min-h-24" maxLength={2000} value={form.conditions ?? ''} onChange={(e) => set('conditions', e.target.value)} />
          </Field>
          <Field label="Контакты и детали для участников" hint="Увидят только записанные участники: телефон, чат, точное место встречи">
            <textarea className="input min-h-20" maxLength={1000} value={form.organizerContact ?? ''} onChange={(e) => set('organizerContact', e.target.value)} />
          </Field>
        </div>
      </Section>

      <div className="flex items-start gap-3 rounded-xl border-[3px] border-ink bg-pop-blue p-4 font-medium text-ink shadow-md">
        <Bot className="size-6 shrink-0 text-brand-600" />
        <p>
          ИИ-модератор проверит текст на запрещённый контент и присвоит метку «Можно детям» или «18+». Если найдутся нарушения, мероприятие
          сначала посмотрит администратор.
        </p>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" size="lg" onClick={() => navigate(-1)}>
          Отмена
        </Button>
        <Button type="submit" size="lg" loading={busy} icon={event ? <Save className="size-5" /> : <Plus className="size-5" />}>
          {event ? 'Сохранить' : 'Опубликовать'}
        </Button>
      </div>
    </form>
  )
}

function ChoiceCard({ active, onClick, title, children }: { active: boolean; onClick: () => void; title: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative rounded-xl border-[3px] border-ink p-4 text-left transition ${
        active ? 'translate-x-0.5 translate-y-0.5 bg-pop-yellow' : 'bg-white shadow-md hover:bg-pop-yellow/30'
      }`}
    >
      {active && (
        <span className="absolute -right-2.5 -top-2.5 flex size-7 items-center justify-center rounded-full border-2 border-ink bg-pop-green" aria-hidden>
          <Check className="size-4" strokeWidth={3} />
        </span>
      )}
      <span className="block text-lg font-bold">{title}</span>
      <span className="text-slate-700">{children}</span>
    </button>
  )
}
