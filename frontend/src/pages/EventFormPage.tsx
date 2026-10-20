import { Bot, Check, Hourglass, MapPin, Plus, Save, Users } from 'lucide-react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { aiApi, eventsApi, sportsApi } from '../api/endpoints'
import type { Audience, EventForm, EventVerificationPreview, RegistrationMode, SkillLevel, SportEvent, SportNormalizeResult, SportSuggestItem } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { AgentHintsPanel } from '../components/AgentHintsPanel'
import { PickPointMap } from '../components/maps'
import { useToast } from '../components/Toast'
import { Button, EmptyState, ErrorBox, Field, LinkButton, Modal, PageHeader, Section, Spinner } from '../components/ui'
import { audienceLabels, levelLabels, modeHints, modeLabels, toLocalInput } from '../lib/format'
import { useAsync } from '../lib/useAsync'

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
  const { user } = useAuth()
  const sports = useAsync(() => sportsApi.list(), [])
  const [form, setForm] = useState<EventForm>(() => (event ? fromEvent(event) : emptyForm(defaultContact)))
  const [sportSearch, setSportSearch] = useState(event?.sportName ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [mapSearchQuery, setMapSearchQuery] = useState<string>()
  const [agentPreview, setAgentPreview] = useState<EventVerificationPreview | null>(null)
  const [sportHints, setSportHints] = useState<SportSuggestItem[]>([])
  const [missingSportOpen, setMissingSportOpen] = useState(false)
  const [missingSportQuery, setMissingSportQuery] = useState('')
  const [missingSportResult, setMissingSportResult] = useState<SportNormalizeResult | null>(null)
  const [missingBusy, setMissingBusy] = useState(false)
  const selectedSportName =
    sports.data?.find((s) => s.id === form.sportTypeId)?.name ?? (form.sportTypeId ? event?.sportName : sportSearch) ?? ''

  useEffect(() => {
    if (!form.title.trim() && !form.description.trim()) {
      setAgentPreview(null)
      return
    }
    const timer = window.setTimeout(async () => {
      try {
        const preview = await aiApi.verifyEventDraft({
          title: form.title,
          description: form.description,
          conditions: form.conditions,
          sportName: selectedSportName || null,
          audience: form.audience,
          startAt: new Date(form.startAt).toISOString(),
          organizerName: user?.displayName,
          organizationEvent: user?.role === 'ORGANIZATION',
          equipment: form.conditions,
        })
        setAgentPreview(preview)
      } catch {
        /* черновая проверка не блокирует форму */
      }
    }, 600)
    return () => window.clearTimeout(timer)
  }, [form.title, form.description, form.conditions, form.audience, form.startAt, selectedSportName, user?.displayName, user?.role])

  useEffect(() => {
    const q = sportSearch.trim()
    if (q.length < 2 || form.sportTypeId != null) {
      setSportHints([])
      return
    }
    const timer = window.setTimeout(() => {
      sportsApi.suggest(q).then(setSportHints).catch(() => setSportHints([]))
    }, 350)
    return () => window.clearTimeout(timer)
  }, [sportSearch, form.sportTypeId])

  const pickSport = (hint: SportSuggestItem) => {
    setForm((f) => ({ ...f, sportTypeId: hint.id, customSportName: null }))
    setSportSearch(hint.name)
    setSportHints([])
  }

  const onSportSearchChange = (value: string) => {
    setSportSearch(value)
    setForm((f) => ({ ...f, sportTypeId: null, customSportName: null }))
  }

  const set = <K extends keyof EventForm>(key: K, value: EventForm[K]) => setForm((f) => ({ ...f, [key]: value }))

  const validate = () => {
    const next: Record<string, string> = {}
    if (!form.title.trim()) next.title = 'Укажите название'
    if (!form.description.trim()) next.description = 'Расскажите, что будет происходить'
    if (!form.sportTypeId && !sportSearch.trim()) next.sport = 'Начните вводить вид спорта или выберите из подсказок'
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
      sportTypeId: form.sportTypeId,
      customSportName: form.sportTypeId ? null : blankToNull(sportSearch),
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
          <Field
            label="Направление"
            error={errors.sport}
            hint="Введите своими словами — «футбик», «шахматы», «фрисби». Подсказки из реестра; если не нашли — куратор поможет."
          >
            <input
              className="input"
              maxLength={80}
              placeholder="Начните вводить вид спорта…"
              value={sportSearch}
              onChange={(e) => onSportSearchChange(e.target.value)}
              autoComplete="off"
            />
            {form.sportTypeId != null && (
              <p className="mt-2 text-sm font-medium text-brand-800">
                Выбрано из справочника: {sports.data?.find((s) => s.id === form.sportTypeId)?.emoji} {selectedSportName}
                <button type="button" className="ml-2 font-semibold underline" onClick={() => onSportSearchChange('')}>
                  изменить
                </button>
              </p>
            )}
            {sportHints.length > 0 && (
              <ul className="mt-2 space-y-1 rounded-lg border-2 border-ink bg-pop-yellow/30 p-2 text-sm" role="listbox">
                {sportHints.map((hint) => (
                  <li key={hint.id}>
                    <button type="button" className="font-semibold underline" onClick={() => pickSport(hint)}>
                      {hint.emoji} {hint.name}
                    </button>{' '}
                    — похоже на ваш запрос
                  </li>
                ))}
              </ul>
            )}
            <button type="button" className="mt-2 text-sm font-semibold text-brand-700 underline" onClick={() => setMissingSportOpen(true)}>
              Не нашли? Спросите куратора видов спорта
            </button>
          </Field>
          {agentPreview && (
            <AgentHintsPanel
              title="Event Quality Guardian"
              suggestions={agentPreview.suggestions}
              descriptionVariants={agentPreview.descriptionVariants}
              onApplyDescription={(text) => set('description', text)}
            />
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
          <Field label="Адрес или место" error={errors.address} hint="Кликните по карте, чтобы поставить точку. Участники смогут построить маршрут.">
            <div className="flex gap-2">
              <input
                className="input"
                value={form.address}
                maxLength={300}
                placeholder="Красноярск, о. Татышев, у главного входа"
                onChange={(e) => set('address', e.target.value)}
              />
              <Button type="button" variant="secondary" onClick={() => setMapSearchQuery(form.address.trim() || undefined)} disabled={!form.address.trim()}>
                Найти
              </Button>
            </div>
          </Field>
          <PickPointMap
            latitude={form.latitude}
            longitude={form.longitude}
            searchQuery={mapSearchQuery}
            onPick={(lat, lon, address) =>
              setForm((f) => ({ ...f, latitude: lat, longitude: lon, address: address && !f.address.trim() ? address : f.address }))
            }
          />
          {form.latitude != null && form.longitude != null && (
            <p className="text-sm text-slate-600">
              Точка: {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}{' '}
              <button type="button" className="font-semibold underline" onClick={() => setForm((f) => ({ ...f, latitude: null, longitude: null }))}>
                убрать
              </button>
            </p>
          )}
          <Field label="Как найти (необязательно)">
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

      <Modal open={missingSportOpen} title="Куратор видов спорта" onClose={() => setMissingSportOpen(false)}>
          <p className="text-slate-700">Опишите вид спорта своими словами — агент найдёт похожий в реестре или предложит каноническое название.</p>
          <div className="mt-4">
          <Field label="Ваш вид спорта">
            <textarea
              className="input min-h-24"
              value={missingSportQuery}
              onChange={(e) => setMissingSportQuery(e.target.value)}
              placeholder="Например: играем во фрисби во дворе по вечерам"
            />
          </Field>
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              loading={missingBusy}
              onClick={async () => {
                setMissingBusy(true)
                try {
                  setMissingSportResult(await sportsApi.propose(missingSportQuery))
                } catch (e) {
                  notify('error', (e as Error).message)
                } finally {
                  setMissingBusy(false)
                }
              }}
            >
              Спросить куратора
            </Button>
          </div>
          {missingSportResult && (
            <div className="mt-4 space-y-3">
              <p className="font-medium">{missingSportResult.explanation}</p>
              <AgentHintsPanel suggestions={missingSportResult.suggestions} />
              {missingSportResult.existingSportName && missingSportResult.existingSportTypeId && (
                <Button
                  onClick={() => {
                    const id = missingSportResult.existingSportTypeId!
                    const name = missingSportResult.existingSportName!
                    setForm((f) => ({ ...f, sportTypeId: id, customSportName: null }))
                    setSportSearch(name)
                    setMissingSportOpen(false)
                    notify('success', `Выбрано: ${name}`)
                  }}
                >
                  Использовать «{missingSportResult.existingSportName}» из справочника
                </Button>
              )}
              {missingSportResult.acceptable && missingSportResult.proposedName && (
                <Button
                  onClick={() => {
                    const name = missingSportResult.proposedName!
                    onSportSearchChange(name)
                    setMissingSportOpen(false)
                    notify('success', 'Название подставлено — можно публиковать')
                  }}
                >
                  Принять «{missingSportResult.proposedName}»
                </Button>
              )}
            </div>
          )}
      </Modal>
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
