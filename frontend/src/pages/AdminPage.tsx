import {
  Ban,
  Bot,
  Building2,
  CalendarDays,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  History,
  MessageSquare,
  RotateCcw,
  Save,
  Search,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { aiApi, commentsApi, documentsApi, eventsApi, moderationApi, organizationsApi } from '../api/endpoints'
import type { AiSettings, ApplicationStatus, Comment, DocumentTemplate, EventStatus, ModerationAction, Organization, SportEvent } from '../api/types'
import { AgeBadge, AiBadge, EventStatusBadge, ModeBadge } from '../components/EventBadges'
import { ReasonDialog } from '../components/ReasonDialog'
import { useToast } from '../components/Toast'
import { Avatar, Badge, Button, EmptyState, ErrorBox, Field, Modal, PageHeader, Spinner, Tabs } from '../components/ui'
import { formatDateTime, organizationStatusLabels } from '../lib/format'
import { useAsync } from '../lib/useAsync'

type AdminTab = 'organizations' | 'events' | 'comments' | 'ai' | 'templates' | 'journal'

type ReasonRequest = {
  title: string
  description: string
  confirmLabel: string
  presets: string[]
  run: (reason: string) => Promise<unknown>
  done: string
}

export function AdminPage() {
  const [tab, setTab] = useState<AdminTab>('organizations')
  const pendingOrgs = useAsync(() => organizationsApi.list({ status: 'PENDING' }), [tab])
  const reviewEvents = useAsync(() => eventsApi.list({ scope: 'all', status: 'ON_REVIEW', includePast: true }), [tab])
  const hiddenComments = useAsync(() => commentsApi.all({ hidden: true }), [tab])

  return (
    <div>
      <PageHeader title="Администрирование" subtitle="Заявки организаций, контроль публикаций, обсуждения и ИИ-модерация" />
      <div className="mb-6">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: 'organizations', label: 'Организации', icon: <Building2 className="size-5" />, count: pendingOrgs.data?.length },
            { value: 'events', label: 'Мероприятия', icon: <CalendarDays className="size-5" />, count: reviewEvents.data?.length },
            { value: 'comments', label: 'Обсуждения', icon: <MessageSquare className="size-5" />, count: hiddenComments.data?.length },
            { value: 'ai', label: 'ИИ-модерация', icon: <Bot className="size-5" /> },
            { value: 'templates', label: 'Шаблоны документов', icon: <FileText className="size-5" /> },
            { value: 'journal', label: 'Журнал', icon: <History className="size-5" /> },
          ]}
        />
      </div>
      {tab === 'organizations' && <OrganizationsTab />}
      {tab === 'events' && <EventsTab />}
      {tab === 'comments' && <CommentsTab />}
      {tab === 'ai' && <AiTab />}
      {tab === 'templates' && <TemplatesTab />}
      {tab === 'journal' && <JournalTab />}
    </div>
  )
}

function useReasonDialog() {
  const { notify } = useToast()
  const [request, setRequest] = useState<ReasonRequest | null>(null)
  const dialog = (
    <ReasonDialog
      open={request !== null}
      title={request?.title ?? ''}
      description={request?.description}
      confirmLabel={request?.confirmLabel ?? 'Подтвердить'}
      presets={request?.presets}
      onClose={() => setRequest(null)}
      onConfirm={async (reason) => {
        if (!request) return
        await request.run(reason)
        notify('success', request.done)
      }}
    />
  )
  return { ask: setRequest, dialog }
}

function StatusFilter<T extends string>({ value, onChange, options }: { value: T | ''; onChange: (v: T | '') => void; options: [T | '', string][] }) {
  return (
    <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
      {options.map(([key, label]) => (
        <button
          key={key || 'all'}
          onClick={() => onChange(key)}
          aria-pressed={value === key}
          className={`min-h-11 shrink-0 rounded-full border-[3px] border-ink px-4 py-1.5 font-bold transition ${
            value === key ? 'translate-x-0.5 translate-y-0.5 bg-brand-600 text-[#111111]' : 'bg-white text-ink shadow-sm hover:bg-pop-yellow/50'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function OrganizationsTab() {
  const { notify } = useToast()
  const [status, setStatus] = useState<ApplicationStatus | ''>('PENDING')
  const { data, error, loading, reload } = useAsync(() => organizationsApi.list({ status: status || undefined }), [status])
  const [busy, setBusy] = useState<number | null>(null)
  const { ask, dialog } = useReasonDialog()

  const approve = async (org: Organization) => {
    setBusy(org.id)
    try {
      await moderationApi.approveOrganization(org.id)
      await reload()
      notify('success', `«${org.name}» допущена`, 'Теперь организация может публиковать мероприятия.')
    } catch (e) {
      notify('error', 'Ошибка', (e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      <StatusFilter
        value={status}
        onChange={setStatus}
        options={[
          ['PENDING', 'На рассмотрении'],
          ['APPROVED', 'Допущены'],
          ['REJECTED', 'Отклонены'],
          ['', 'Все'],
        ]}
      />
      {error && <ErrorBox error={error} onRetry={reload} />}
      {loading && !data && <Spinner />}
      {data?.length === 0 && <EmptyState icon={<Building2 className="size-8" />} title="Заявок нет" />}
      {data?.map((org) => (
        <article key={org.id} className="card space-y-3 p-5">
          <div className="flex flex-wrap items-start gap-4">
            <Avatar name={org.name} color={org.logoColor} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold sm:text-xl">{org.name}</h3>
                <Badge tone={org.status === 'APPROVED' ? 'green' : org.status === 'PENDING' ? 'amber' : 'red'}>{organizationStatusLabels[org.status]}</Badge>
              </div>
              <p className="text-sm text-muted">
                Заявитель: {org.ownerName} · подана {formatDateTime(org.createdAt)}
              </p>
            </div>
            <div className="flex w-full flex-wrap gap-2 sm:w-auto [&>button]:flex-1 sm:[&>button]:flex-none">
              {org.status !== 'APPROVED' && (
                <Button variant="success" size="sm" loading={busy === org.id} icon={<CheckCircle2 className="size-4" />} onClick={() => approve(org)}>
                  Одобрить
                </Button>
              )}
              {org.status !== 'REJECTED' && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<XCircle className="size-4" />}
                  onClick={() =>
                    ask({
                      title: `Отклонить «${org.name}»`,
                      description: 'Организация увидит причину и сможет исправить заявку.',
                      confirmLabel: 'Отклонить',
                      presets: ['Недостаточно информации о деятельности', 'Не указаны контакты для связи', 'Деятельность не связана со спортом'],
                      run: async (reason) => {
                        await moderationApi.rejectOrganization(org.id, reason)
                        await reload()
                      },
                      done: 'Заявка отклонена',
                    })
                  }
                >
                  {org.status === 'APPROVED' ? 'Отозвать допуск' : 'Отклонить'}
                </Button>
              )}
            </div>
          </div>
          <p className="font-medium text-brand-700">{org.sportsInterests}</p>
          <p className="whitespace-pre-line text-muted">{org.description}</p>
          <p className="text-sm text-muted">{[org.city, org.address, org.contacts, org.website].filter(Boolean).join(' · ')}</p>
          {org.rejectionReason && (
            <p className="rounded-xl bg-pop-red/30 p-3 text-ink">
              <span className="font-semibold">Причина отказа:</span> {org.rejectionReason}
            </p>
          )}
          {org.reviewedAt && <p className="text-sm text-muted">Решение: {org.reviewedBy} · {formatDateTime(org.reviewedAt)}</p>}
        </article>
      ))}
      {dialog}
    </div>
  )
}

const eventPresets = ['Нарушение правил платформы', 'Недостоверная информация о месте или времени', 'Коммерческая реклама, не связанная со спортом', 'Небезопасный формат мероприятия']

function EventsTab() {
  const { notify } = useToast()
  const [status, setStatus] = useState<EventStatus | ''>('')
  const [query, setQuery] = useState('')
  const [applied, setApplied] = useState('')
  const { data, error, loading, reload } = useAsync(
    () => eventsApi.list({ scope: 'all', status: status || undefined, q: applied || undefined, includePast: true }),
    [status, applied],
  )
  const { ask, dialog } = useReasonDialog()

  const publish = async (event: SportEvent) => {
    try {
      await moderationApi.publishEvent(event.id)
      await reload()
      notify('success', 'Опубликовано')
    } catch (e) {
      notify('error', 'Ошибка', (e as Error).message)
    }
  }

  const askAction = (event: SportEvent, action: 'unpublish' | 'delete') =>
    ask({
      title: `${action === 'delete' ? 'Удалить' : 'Снять с публикации'}: ${event.title}`,
      description: 'Причину увидят организатор и записавшиеся участники. Запись станет невозможна даже по прямой ссылке.',
      confirmLabel: action === 'delete' ? 'Удалить' : 'Снять',
      presets: eventPresets,
      run: async (reason) => {
        if (action === 'delete') await moderationApi.deleteEvent(event.id, reason)
        else await moderationApi.unpublishEvent(event.id, reason)
        await reload()
      },
      done: action === 'delete' ? 'Мероприятие удалено' : 'Снято с публикации',
    })

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <StatusFilter
          value={status}
          onChange={setStatus}
          options={[
            ['', 'Все'],
            ['PUBLISHED', 'Опубликованы'],
            ['ON_REVIEW', 'На проверке'],
            ['UNPUBLISHED', 'Сняты'],
            ['DELETED', 'Удалены'],
          ]}
        />
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            setApplied(query.trim())
          }}
        >
          <input className="input min-w-0 py-2" placeholder="Поиск" value={query} onChange={(e) => setQuery(e.target.value)} />
          <Button type="submit" variant="secondary" icon={<Search className="size-4" />}>
            Найти
          </Button>
        </form>
      </div>
      {error && <ErrorBox error={error} onRetry={reload} />}
      {loading && !data && <Spinner />}
      {data?.length === 0 && <EmptyState icon={<CalendarDays className="size-8" />} title="Мероприятий не найдено" />}
      {data?.map((event) => (
        <article key={event.id} className="card flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <EventStatusBadge status={event.status} />
              <AiBadge event={event} />
              <AgeBadge event={event} />
              <ModeBadge event={event} />
            </div>
            <Link to={`/events/${event.id}`} className="block text-lg font-bold hover:underline">
              {event.sportEmoji} {event.title}
            </Link>
            <p className="text-sm text-muted">
              {event.organizerName} · {formatDateTime(event.startAt)} · участников {event.participantsCount}
            </p>
            {event.aiSummary && <p className="text-sm text-muted">ИИ: {event.aiSummary}</p>}
            {event.moderationReason && <p className="text-sm font-medium text-red-700">Причина: {event.moderationReason}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {event.status === 'PUBLISHED' && (
              <Button variant="danger" size="sm" icon={<Ban className="size-4" />} onClick={() => askAction(event, 'unpublish')}>
                Снять
              </Button>
            )}
            {(event.status === 'ON_REVIEW' || event.status === 'UNPUBLISHED' || event.status === 'DELETED') && (
              <Button variant="success" size="sm" icon={<RotateCcw className="size-4" />} onClick={() => publish(event)}>
                Опубликовать
              </Button>
            )}
            {event.status !== 'DELETED' && (
              <Button variant="secondary" size="sm" icon={<Trash2 className="size-4" />} onClick={() => askAction(event, 'delete')}>
                Удалить
              </Button>
            )}
          </div>
        </article>
      ))}
      {dialog}
    </div>
  )
}

function CommentsTab() {
  const { notify } = useToast()
  const [hidden, setHidden] = useState<'all' | 'hidden' | 'visible'>('all')
  const { data, error, loading, reload } = useAsync(
    () => commentsApi.all({ hidden: hidden === 'all' ? undefined : hidden === 'hidden' }),
    [hidden],
  )
  const { ask, dialog } = useReasonDialog()
  const presets = ['Оскорбления', 'Спам или реклама', 'Личные данные третьих лиц', 'Не относится к мероприятию']

  const restore = async (comment: Comment) => {
    try {
      await moderationApi.restoreComment(comment.id)
      await reload()
      notify('success', 'Сообщение восстановлено')
    } catch (e) {
      notify('error', 'Ошибка', (e as Error).message)
    }
  }

  return (
    <div className="space-y-4">
      <StatusFilter
        value={hidden}
        onChange={(v) => setHidden((v || 'all') as typeof hidden)}
        options={[
          ['all', 'Все'],
          ['hidden', 'Скрытые'],
          ['visible', 'Видимые'],
        ]}
      />
      {error && <ErrorBox error={error} onRetry={reload} />}
      {loading && !data && <Spinner />}
      {data?.length === 0 && <EmptyState icon={<MessageSquare className="size-8" />} title="Сообщений нет" />}
      {data?.map((comment) => (
        <article key={comment.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
          <Avatar name={comment.authorName} color={comment.authorAvatarColor} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted">
              <span className="font-bold text-ink">{comment.authorName}</span>
              {comment.organizerReply && ' · организатор'} · {formatDateTime(comment.createdAt)} ·{' '}
              <Link to={`/events/${comment.eventId}`} className="text-brand-700 underline">
                {comment.eventTitle}
              </Link>
            </p>
            <p className="mt-1 whitespace-pre-line break-words">{comment.text}</p>
            {comment.hidden && (
              <p className="mt-1 text-sm font-medium text-amber-700">
                <EyeOff className="mr-1 inline size-4" />
                Скрыто{comment.hiddenByAi ? ' ИИ' : ''}: {comment.hiddenReason}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {comment.hidden ? (
              <Button variant="secondary" size="sm" icon={<Eye className="size-4" />} onClick={() => restore(comment)}>
                Вернуть
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                icon={<EyeOff className="size-4" />}
                onClick={() =>
                  ask({
                    title: 'Скрыть сообщение',
                    description: 'Сообщение увидят только автор и администраторы.',
                    confirmLabel: 'Скрыть',
                    presets,
                    run: async (reason) => {
                      await moderationApi.hideComment(comment.id, reason)
                      await reload()
                    },
                    done: 'Сообщение скрыто',
                  })
                }
              >
                Скрыть
              </Button>
            )}
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 className="size-4" />}
              onClick={() =>
                ask({
                  title: 'Удалить сообщение',
                  description: 'Сообщение будет удалено безвозвратно.',
                  confirmLabel: 'Удалить',
                  presets,
                  run: async (reason) => {
                    await moderationApi.deleteComment(comment.id, reason)
                    await reload()
                  },
                  done: 'Сообщение удалено',
                })
              }
            >
              Удалить
            </Button>
          </div>
        </article>
      ))}
      {dialog}
    </div>
  )
}

function Toggle({ checked, onChange, title, text, disabled }: { checked: boolean; onChange: (v: boolean) => void; title: string; text: ReactNode; disabled?: boolean }) {
  return (
    <label
      className={`flex items-start gap-4 rounded-xl border-[3px] border-ink p-4 transition ${checked ? 'bg-pop-green/40' : 'bg-white'} ${
        disabled ? 'opacity-60' : 'cursor-pointer hover:bg-pop-yellow/30'
      }`}
    >
      <input type="checkbox" className="mt-1 size-6 shrink-0 accent-ink" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="block font-bold">{title}</span>
        <span className="text-muted">{text}</span>
      </span>
    </label>
  )
}

function AiTab() {
  const { notify } = useToast()
  const settings = useAsync(() => aiApi.settings(), [])
  const verdicts = useAsync(() => aiApi.verdicts(), [])
  const agentStats = useAsync(() => aiApi.agentStats(), [])
  const [draft, setDraft] = useState<AiSettings | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (settings.data) setDraft(settings.data)
  }, [settings.data])

  const save = async () => {
    if (!draft) return
    setBusy(true)
    try {
      const saved = await aiApi.updateSettings({
        aiEnabled: draft.aiEnabled,
        autoHoldFlagged: draft.autoHoldFlagged,
        llmEnabled: draft.llmEnabled,
        commentFilterEnabled: draft.commentFilterEnabled,
        customStopWords: draft.customStopWords?.trim() || null,
      })
      settings.setData(saved)
      notify('success', 'Настройки ИИ сохранены')
    } catch (e) {
      notify('error', 'Ошибка', (e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <section className="card space-y-3 self-start p-5">
        <h2 className="text-xl font-bold">Настройки</h2>
        {settings.error && <ErrorBox error={settings.error} />}
        {!draft ? (
          <Spinner />
        ) : (
          <>
            <Toggle checked={draft.aiEnabled} onChange={(v) => setDraft({ ...draft, aiEnabled: v })} title="Проверять мероприятия" text="Анализ описания перед публикацией и возрастная метка" />
            <Toggle
              checked={draft.autoHoldFlagged}
              onChange={(v) => setDraft({ ...draft, autoHoldFlagged: v })}
              title="Отправлять подозрительные на проверку"
              text="События пользователей с нарушениями не попадут в афишу до решения администратора"
            />
            <Toggle
              checked={draft.llmEnabled}
              disabled={!draft.llmConfigured}
              onChange={(v) => setDraft({ ...draft, llmEnabled: v })}
              title="Использовать LLM"
              text={draft.llmConfigured ? `Модель: ${draft.llmModel}` : 'Не настроено: задайте AI_LLM_API_KEY. Работает встроенный анализатор.'}
            />
            <Toggle
              checked={draft.commentFilterEnabled}
              onChange={(v) => setDraft({ ...draft, commentFilterEnabled: v })}
              title="Фильтр обсуждений"
              text="Автоматически скрывать оскорбления и спам в комментариях"
            />
            <Field label="Дополнительные стоп-слова" hint="Через запятую или с новой строки">
              <textarea className="input min-h-20" value={draft.customStopWords ?? ''} onChange={(e) => setDraft({ ...draft, customStopWords: e.target.value })} />
            </Field>
            <Button loading={busy} icon={<Save className="size-5" />} onClick={save}>
              Сохранить
            </Button>
            {draft.updatedAt && <p className="text-sm text-muted">Изменено: {draft.updatedBy} · {formatDateTime(draft.updatedAt)}</p>}
          </>
        )}
      </section>

      <section className="space-y-3">
        {agentStats.data && (
          <article className="card space-y-2 p-4">
            <h2 className="text-xl font-bold">Event Quality Guardian — за 24 часа</h2>
            <p className="text-muted">
              Проверок: {agentStats.data.checks24h}, с флагами: {agentStats.data.flagged24h}, авто-придержек: {agentStats.data.autoUnpublish24h}
            </p>
            {agentStats.data.topFlagReasons.length > 0 && (
              <p className="text-sm text-muted">Частые причины: {agentStats.data.topFlagReasons.join(' · ')}</p>
            )}
          </article>
        )}
        <h2 className="text-xl font-bold">Последние проверки</h2>
        {verdicts.loading && !verdicts.data && <Spinner />}
        {verdicts.data?.map((verdict) => (
          <article key={verdict.id} className={`card p-4 ${verdict.status === 'FLAGGED' ? 'border-ink' : ''}`}>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={verdict.status === 'FLAGGED' ? 'red' : 'green'}>{verdict.status === 'FLAGGED' ? 'Нарушения' : 'Одобрено'}</Badge>
              <Badge tone={verdict.ageRestriction === 'CHILD_SAFE' ? 'brand' : 'orange'}>{verdict.ageRestriction === 'CHILD_SAFE' ? 'Можно детям' : '18+'}</Badge>
              {verdict.hold && <Badge tone="amber">Отправлено на проверку</Badge>}
              <span className="text-sm text-muted">
                {verdict.source} · {formatDateTime(verdict.createdAt)}
              </span>
            </div>
            <p className="mt-2 font-bold">
              {verdict.eventId ? (
                <Link to={`/events/${verdict.eventId}`} className="hover:underline">
                  {verdict.eventTitle}
                </Link>
              ) : (
                verdict.eventTitle
              )}
              {verdict.organizerName && <span className="font-normal text-muted"> · {verdict.organizerName}</span>}
            </p>
            <p className="text-muted">{verdict.summary}</p>
            {verdict.reasons.length > 0 && (
              <ul className="mt-1 list-inside list-disc text-sm text-muted">
                {verdict.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </section>
    </div>
  )
}

function TemplatesTab() {
  const { notify } = useToast()
  const templates = useAsync(() => documentsApi.templates(), [])
  const placeholders = useAsync(() => documentsApi.placeholders(), [])
  const [code, setCode] = useState<string | null>(null)
  const [draft, setDraft] = useState<DocumentTemplate | null>(null)
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const editorRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!templates.data?.length) return
    const current = templates.data.find((t) => t.code === code) ?? templates.data[0]
    setCode(current.code)
    setDraft(current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates.data])

  const select = (template: DocumentTemplate) => {
    setCode(template.code)
    setDraft(template)
  }

  const applySaved = async (saved: DocumentTemplate, message: string) => {
    setDraft(saved)
    await templates.reload()
    notify('success', message)
  }

  const run = async (action: () => Promise<DocumentTemplate>, message: string) => {
    setBusy(true)
    try {
      await applySaved(await action(), message)
    } catch (e) {
      notify('error', 'Ошибка', (e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const insert = (key: string) => {
    if (!draft) return
    const token = `{{${key}}}`
    const area = editorRef.current
    const start = area?.selectionStart ?? draft.content.length
    const end = area?.selectionEnd ?? start
    setDraft({ ...draft, content: draft.content.slice(0, start) + token + draft.content.slice(end) })
    requestAnimationFrame(() => {
      area?.focus()
      area?.setSelectionRange(start + token.length, start + token.length)
    })
  }

  if (templates.error) return <ErrorBox error={templates.error} onRetry={templates.reload} />
  if (!draft) return <Spinner />

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <section className="card space-y-4 p-5">
        <div className="flex flex-wrap gap-2">
          {templates.data?.map((template) => (
            <button
              key={template.code}
              onClick={() => select(template)}
              className={`rounded-xl border-[3px] border-ink px-4 py-2 font-bold ${template.code === code ? 'bg-ink text-white dark:text-[#111111]' : 'bg-white shadow-sm hover:bg-pop-yellow/50'}`}
            >
              {template.name}
            </button>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Название">
            <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </Field>
          <Field label="Описание">
            <input className="input" value={draft.description ?? ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </Field>
        </div>
        <Field label="Текст шаблона (HTML)" hint="Плейсхолдеры в двойных фигурных скобках подставляются при генерации">
          <textarea
            ref={editorRef}
            className="input min-h-80 font-mono text-sm sm:min-h-[420px]"
            spellCheck={false}
            value={draft.content}
            onChange={(e) => setDraft({ ...draft, content: e.target.value })}
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button
            loading={busy}
            icon={<Save className="size-5" />}
            onClick={() =>
              run(() => documentsApi.updateTemplate(draft.code, { name: draft.name, description: draft.description, content: draft.content }), 'Шаблон сохранён')
            }
          >
            Сохранить
          </Button>
          <Button variant="secondary" icon={<Eye className="size-5" />} onClick={() => setPreview(true)}>
            Просмотр
          </Button>
          <Button variant="secondary" icon={<Upload className="size-5" />} onClick={() => fileRef.current?.click()}>
            Загрузить файл
          </Button>
          <Button variant="ghost" icon={<RotateCcw className="size-5" />} onClick={() => run(() => documentsApi.resetTemplate(draft.code), 'Шаблон восстановлен по умолчанию')}>
            Сбросить
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".html,.htm,.txt,text/html,text/plain"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) void run(() => documentsApi.uploadTemplate(draft.code, file), `Загружен файл ${file.name}`)
            }}
          />
        </div>
        {draft.updatedAt && <p className="text-sm text-muted">Изменено: {draft.updatedBy ?? 'система'} · {formatDateTime(draft.updatedAt)}</p>}
      </section>

      <aside className="card space-y-3 self-start p-5">
        <h2 className="text-lg font-bold">Плейсхолдеры</h2>
        <p className="text-sm text-muted">Нажмите, чтобы вставить в позицию курсора.</p>
        <ul className="space-y-1">
          {Object.entries(placeholders.data ?? {}).map(([key, description]) => (
            <li key={key}>
              <button onClick={() => insert(key)} className="w-full rounded-lg px-2 py-1.5 text-left hover:bg-pop-yellow/50">
                <code className="text-sm font-semibold text-brand-700">{`{{${key}}}`}</code>
                <span className="block text-sm text-muted">{description}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <Modal open={preview} title={`Просмотр: ${draft.name}`} onClose={() => setPreview(false)} wide>
        <iframe title="Просмотр шаблона" className="h-[70svh] w-full rounded-xl border-[3px] border-ink bg-white" srcDoc={draft.content} sandbox="" />
      </Modal>
    </div>
  )
}

const journalLabels: Record<ModerationAction['type'], { label: string; tone: 'green' | 'red' | 'amber' | 'slate' | 'brand' }> = {
  ORGANIZATION_APPROVED: { label: 'Организация одобрена', tone: 'green' },
  ORGANIZATION_REJECTED: { label: 'Организация отклонена', tone: 'red' },
  EVENT_UNPUBLISHED: { label: 'Мероприятие снято', tone: 'red' },
  EVENT_DELETED: { label: 'Мероприятие удалено', tone: 'red' },
  EVENT_PUBLISHED: { label: 'Мероприятие опубликовано', tone: 'green' },
  COMMENT_HIDDEN: { label: 'Сообщение скрыто', tone: 'amber' },
  COMMENT_RESTORED: { label: 'Сообщение восстановлено', tone: 'green' },
  COMMENT_DELETED: { label: 'Сообщение удалено', tone: 'red' },
  SETTINGS_CHANGED: { label: 'Настройки ИИ', tone: 'brand' },
}

function JournalTab() {
  const { data, error, loading, reload } = useAsync(() => moderationApi.journal(), [])
  if (error) return <ErrorBox error={error} onRetry={reload} />
  if (loading && !data) return <Spinner />
  if (!data?.length) return <EmptyState icon={<History className="size-8" />} title="Журнал пуст" />
  return (
    <div className="card divide-y-2 divide-ink">
      {data.map((action) => {
        const meta = journalLabels[action.type]
        return (
          <div key={action.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start">
            <div className="w-40 shrink-0 text-sm text-muted">{formatDateTime(action.createdAt)}</div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={meta.tone}>{meta.label}</Badge>
                <span className="font-semibold">{action.targetTitle ?? `#${action.targetId}`}</span>
              </div>
              {action.reason && <p className="mt-1 text-muted">Причина: {action.reason}</p>}
            </div>
            <div className="text-sm text-muted">{action.adminName}</div>
          </div>
        )
      })}
    </div>
  )
}
