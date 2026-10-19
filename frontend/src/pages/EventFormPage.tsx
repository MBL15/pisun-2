import { Bot, Check, Hourglass, MapPin, Plus, Save, Users } from 'lucide-react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { aiApi, eventsApi, mapsApi, sportsApi } from '../api/endpoints'
import type {
  Audience,
  EventForm,
  GeoPlace,
  RegistrationMode,
  SkillLevel,
  SportEvent,
  SportHit,
  SportProposal,
  SportType,
  VerificationResult,
} from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { AgentHintsPanel } from '../components/AgentHintsPanel'
import { PickPointMap } from '../components/maps'
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

function sportLabel(sport: SportType): string {
  return sport.emoji ? `${sport.emoji} ${sport.name}` : sport.name
}

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
  const organization = user?.role === 'ORGANIZATION' && user.organizationStatus === 'APPROVED'

  const [form, setForm] = useState<EventForm>(() => (event ? fromEvent(event) : emptyForm(defaultContact)))
  const [sportQuery, setSportQuery] = useState(() => (event ? event.sportName : ''))
  const [sportChoice, setSportChoice] = useState<number | ''>(() => {
    if (event?.sportCustom) return CUSTOM
    return event?.sportTypeId ?? ''
  })
  const [sportHits, setSportHits] = useState<SportHit[]>([])
  const [addressHits, setAddressHits] = useState<GeoPlace[]>([])
  const [askSport, setAskSport] = useState(false)
  const [sportStory, setSportStory] = useState('')
  const [proposal, setProposal] = useState<SportProposal | null>(null)
  const [proposing, setProposing] = useState(false)
  const [review, setReview] = useState<VerificationResult | null>(null)
  const [reviewing, setReviewing] = useState(false)
  const [variants, setVariants] = useState<string[]>([])
  const [improving, setImproving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [searchQuery, setSearchQuery] = useState<string>()

  const set = <K extends keyof EventForm>(key: K, value: EventForm[K]) => setForm((f) => ({ ...f, [key]: value }))

  const selectKnownSport = (sport: SportType) => {
    setSportChoice(sport.id)
    setForm((f) => ({ ...f, sportTypeId: sport.id, customSportName: null }))
    setSportQuery(sportLabel(sport))
    setSportHits([])
    setAskSport(false)
    setProposal(null)
  }

  const chooseCustom = () => {
    setSportChoice(CUSTOM)
    setForm((f) => ({
      ...f,
      sportTypeId: null,
      customSportName: f.customSportName?.trim() ? f.customSportName : sportQuery.trim() || null,
    }))
    setSportHits([])
  }

  const sportNameForAgent = (): string => {
    if (sportChoice === CUSTOM) return (form.customSportName ?? sportQuery).trim()
    if (typeof sportChoice === 'number' && sportChoice > 0) {
      const fromHit = sportHits.find((hit) => hit.sport.id === sportChoice)?.sport.name
      if (fromHit) return fromHit
      if (event && event.sportTypeId === sportChoice) return event.sportName
    }
    return sportQuery.trim()
  }

  useEffect(() => {
    const q = sportQuery.trim()
    if (sportChoice === CUSTOM || q.length < 2) {
      setSportHits([])
      return
    }
    const timer = window.setTimeout(() => {
      sportsApi
        .suggest(q)
        .then(setSportHits)
        .catch(() => setSportHits([]))
    }, 350)
    return () => window.clearTimeout(timer)
  }, [sportQuery, sportChoice])

  useEffect(() => {
    const q = form.address.trim()
    if (q.length < 4) {
      setAddressHits([])
      return
    }
    const timer = window.setTimeout(() => {
      mapsApi
        .geocode(q)
        .then(setAddressHits)
        .catch(() => setAddressHits([]))
    }, 400)
    return () => window.clearTimeout(timer)
  }, [form.address])

  useEffect(() => {
    if (!user) return
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setReviewing(true)
      try {
        const result = await aiApi.verifyDraft(
          {
            eventId: event?.id,
            title: form.title.trim() || 'Черновик',
            description: form.description,
            conditions: form.conditions ?? undefined,
            sportName: sportNameForAgent() || undefined,
            audience: form.audience,
            startAt: form.startAt,
            organizationEvent: organization,
            organizerName: user.displayName,
          },
          controller.signal,
        )
        setReview(result)
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) setReview(null)
      } finally {
        setReviewing(false)
      }
    }, 600)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [
    user,
    event?.id,
    form.title,
    form.description,
    form.conditions,
    form.audience,
    form.startAt,
    form.sportTypeId,
    form.customSportName,
    sportQuery,
    sportChoice,
    organization,
  ])

  const askImprove = async () => {
    if (!user) return
    setImproving(true)
    try {
      const result = await aiApi.improve({
        title: form.title.trim() || 'Черновик',
        description: form.description,
        conditions: form.conditions ?? undefined,
        sportName: sportNameForAgent() || undefined,
        address: form.address.trim() || undefined,
      })
      setVariants(result.variants)
    } catch (err) {
      notify('error', 'Агент не ответил', (err as Error).message)
    } finally {
      setImproving(false)
    }
  }

  const submitSportProposal = async () => {
    const name = sportQuery.trim()
    if (name.length < 2) {
      notify('error', 'Короткое название', 'Напишите вид спорта хотя бы из двух символов')
      return
    }
    setProposing(true)
    setProposal(null)
    try {
      const result = await sportsApi.propose({ name, description: sportStory.trim() || undefined })
      setProposal(result)
      if (result.sport && (result.decision === 'ADDED' || result.decision === 'MATCH')) {
        selectKnownSport(result.sport)
      }
    } catch (err) {
      notify('error', 'Не удалось отправить заявку', (err as Error).message)
    } finally {
      setProposing(false)
    }
  }

  const pickAddress = (place: GeoPlace) => {
    setForm((f) => ({ ...f, address: place.address, latitude: place.latitude, longitude: place.longitude }))
    setAddressHits([])
  }

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
        notify(
          'info',
          'Отправлено на проверку',
          saved.aiSummary ?? 'ИИ-модератор нашёл возможные нарушения — администратор проверит мероприятие.',
        )
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
        subtitle={
          organization
            ? 'Хранитель качества подскажет по тексту и возрастной метке. События одобренной организации выходят в афишу сразу.'
            : 'Хранитель качества подскажет по полям и прогнозирует возраст. Событие попадёт в афишу после подтверждения администратором.'
        }
      />

      <Section title="Что за событие">
        <div className="space-y-5">
          <Field label="Название" error={errors.title}>
            <input className="input" value={form.title} maxLength={160} placeholder="Например: Футбол 5×5 во дворе" onChange={(e) => set('title', e.target.value)} />
          </Field>
          <Field
            label="Направление"
            error={errors.sport}
            hint="Начните вводить название — появятся виды из реестра. Если нужного нет, нажмите «Нет вашего вида спорта?»."
          >
            <div className="relative">
              <input
                className="input"
                value={sportQuery}
                maxLength={80}
                placeholder="Например: футбол, биатлон, настольный теннис"
                onChange={(e) => {
                  setSportQuery(e.target.value)
                  if (sportChoice !== CUSTOM) {
                    setSportChoice('')
                    setForm((f) => ({ ...f, sportTypeId: null }))
                  }
                }}
                onFocus={() => {
                  if (sportQuery.trim().length >= 2 && sportChoice !== CUSTOM) {
                    sportsApi
                      .suggest(sportQuery.trim())
                      .then(setSportHits)
                      .catch(() => setSportHits([]))
                  }
                }}
              />
              {sportHits.length > 0 && sportChoice !== CUSTOM && (
                <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border-[3px] border-ink bg-white py-1 shadow-lg">
                  {sportHits.map((hit) => (
                    <li key={hit.sport.id}>
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left hover:bg-pop-yellow/50"
                        onClick={() => selectKnownSport(hit.sport)}
                      >
                        <span className="font-bold">{sportLabel(hit.sport)}</span>
                        <span className="mt-0.5 block text-sm text-slate-600">{hit.message}</span>
                      </button>
                    </li>
                  ))}
                  <li>
                    <button
                      type="button"
                      className="block w-full border-t-2 border-ink/20 px-3 py-2 text-left font-bold hover:bg-pop-blue/40"
                      onClick={chooseCustom}
                    >
                      ➕ Своё направление…
                    </button>
                  </li>
                </ul>
              )}
            </div>
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
          {!askSport ? (
            <button type="button" className="text-sm font-bold text-brand-700 underline" onClick={() => setAskSport(true)}>
              Нет вашего вида спорта?
            </button>
          ) : (
            <div className="space-y-3 rounded-xl border-[3px] border-ink bg-pop-blue/30 p-4">
              <p className="font-bold">Куратор справочника проверит название</p>
              <p className="text-sm text-slate-700">
                Опишите активность — похожее имя предложим выбрать, новое и адекватное добавим в справочник.
              </p>
              <Field label="Как называется вид спорта или активность">
                <input
                  className="input"
                  value={sportQuery}
                  maxLength={80}
                  placeholder="Например: пickleball, скандинавская ходьба"
                  onChange={(e) => setSportQuery(e.target.value)}
                />
              </Field>
              <Field label="Коротко, чем занимаетесь (необязательно)">
                <textarea
                  className="input min-h-20"
                  maxLength={500}
                  placeholder="Правила, инвентарь, для кого подходит"
                  value={sportStory}
                  onChange={(e) => setSportStory(e.target.value)}
                />
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" loading={proposing} onClick={submitSportProposal}>
                  Отправить куратору
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => setAskSport(false)}>
                  Скрыть
                </Button>
              </div>
              {proposal && (
                <div
                  className={`rounded-lg border-2 border-ink px-3 py-2 text-sm ${
                    proposal.decision === 'REJECTED' ? 'bg-pop-red/40' : 'bg-pop-green/40'
                  }`}
                >
                  <p className="font-semibold">{proposal.message}</p>
                  {proposal.similar.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {proposal.similar.map((hit) => (
                        <li key={hit.sport.id}>
                          <button type="button" className="font-bold underline" onClick={() => selectKnownSport(hit.sport)}>
                            {sportLabel(hit.sport)} — {hit.message}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
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

      <AgentHintsPanel
        review={review}
        loading={reviewing}
        onImprove={askImprove}
        improving={improving}
        variants={variants}
        onApplyVariant={(text) => {
          set('description', text)
          setVariants([])
        }}
      />

      <Section title="Когда">
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
          <Field
            label="Адрес или место"
            error={errors.address}
            hint="Подсказки появятся по мере ввода. Кликните по карте, чтобы поставить точку. Участники смогут построить маршрут."
          >
            <div className="relative space-y-2">
              <div className="flex gap-2">
                <input
                  className="input"
                  value={form.address}
                  maxLength={300}
                  placeholder="Красноярск, о. Татышев, у главного входа"
                  onChange={(e) => set('address', e.target.value)}
                />
                <Button type="button" variant="secondary" onClick={() => setSearchQuery(form.address.trim() || undefined)} disabled={!form.address.trim()}>
                  Найти
                </Button>
              </div>
              {addressHits.length > 0 && (
                <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-xl border-[3px] border-ink bg-white py-1 shadow-lg">
                  {addressHits.map((place) => (
                    <li key={`${place.latitude}-${place.longitude}-${place.address}`}>
                      <button type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-pop-yellow/50" onClick={() => pickAddress(place)}>
                        {place.address}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Field>
          <PickPointMap
            latitude={form.latitude}
            longitude={form.longitude}
            searchQuery={searchQuery}
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
          {event ? 'Сохранить' : organization ? 'Опубликовать' : 'Отправить на подтверждение'}
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
