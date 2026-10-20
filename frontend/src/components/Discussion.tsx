import { BadgeCheck, EyeOff, MessageCircle, Reply, RotateCcw, Send, Trash2 } from 'lucide-react'
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { commentsApi, eventsApi, moderationApi } from '../api/endpoints'
import type { Comment, SportEvent } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { formatDateTime } from '../lib/format'
import { useAsync } from '../lib/useAsync'
import { ReasonDialog } from './ReasonDialog'
import { useToast } from './Toast'
import { Avatar, Button, ErrorBox, Section, Spinner } from './ui'

type ModerationDialog = { comment: Comment; action: 'hide' | 'delete' }

export function Discussion({ event, onChanged }: { event: SportEvent; onChanged: () => Promise<void> }) {
  const { user } = useAuth()
  const { notify } = useToast()
  const { data, error, loading, reload } = useAsync(() => eventsApi.comments(event.id), [event.id])
  const [replyTo, setReplyTo] = useState<Comment | null>(null)
  const [dialog, setDialog] = useState<ModerationDialog | null>(null)

  const closed = event.status === 'UNPUBLISHED' || event.status === 'DELETED'
  const isAdmin = user?.role === 'ADMIN'

  const threads = useMemo(() => {
    const list = data ?? []
    const ids = new Set(list.map((c) => c.id))
    const roots = list.filter((c) => c.parentId == null || !ids.has(c.parentId))
    const replies = new Map<number, Comment[]>()
    for (const comment of list) {
      if (comment.parentId != null && ids.has(comment.parentId)) {
        replies.set(comment.parentId, [...(replies.get(comment.parentId) ?? []), comment])
      }
    }
    return roots.map((root) => ({ root, replies: replies.get(root.id) ?? [] }))
  }, [data])

  const refresh = async () => {
    await Promise.all([reload(), onChanged()])
  }

  const remove = async (comment: Comment) => {
    try {
      await commentsApi.remove(comment.id)
      await refresh()
      notify('info', 'Сообщение удалено')
    } catch (e) {
      notify('error', 'Не удалось удалить', (e as Error).message)
    }
  }

  const restore = async (comment: Comment) => {
    try {
      await moderationApi.restoreComment(comment.id)
      await refresh()
      notify('success', 'Сообщение снова видно всем')
    } catch (e) {
      notify('error', 'Ошибка', (e as Error).message)
    }
  }

  const renderComment = (comment: Comment, nested = false) => (
    <CommentItem
      key={comment.id}
      comment={comment}
      nested={nested}
      isAdmin={isAdmin}
      canReply={Boolean(user) && !closed && !isAdmin}
      onReply={() => setReplyTo(comment.parentId ? (data?.find((c) => c.id === comment.parentId) ?? comment) : comment)}
      onDelete={() => remove(comment)}
      onModerate={(action) => setDialog({ comment, action })}
      onRestore={() => restore(comment)}
    />
  )

  return (
    <Section title={`Обсуждение${data ? ` · ${data.length}` : ''}`} icon={<MessageCircle className="size-6 text-brand-600" />}>
      {error && <ErrorBox error={error} onRetry={reload} />}
      {loading && !data && <Spinner />}

      {data && threads.length === 0 && (
        <p className="mb-4 text-muted">Пока никто ничего не спросил. Задайте вопрос — организатор ответит здесь.</p>
      )}

      <div className="space-y-5">
        {threads.map(({ root, replies }) => (
          <div key={root.id}>
            {renderComment(root)}
            {replies.length > 0 && <div className="ml-6 mt-3 space-y-3 border-l-[3px] border-ink pl-4 sm:ml-14">{replies.map((r) => renderComment(r, true))}</div>}
            {replyTo?.id === root.id && (
              <div className="ml-6 mt-3 sm:ml-14">
                <CommentForm
                  eventId={event.id}
                  parent={root}
                  onCancel={() => setReplyTo(null)}
                  onSent={async (comment) => {
                    setReplyTo(null)
                    await refresh()
                    if (comment.hidden) notify('error', 'Сообщение скрыто ИИ-модератором', comment.hiddenReason ?? undefined)
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {closed ? (
        <p className="mt-5 rounded-xl border-[3px] border-dashed border-ink bg-white p-4 font-medium text-ink">Обсуждение закрыто: мероприятие снято с публикации.</p>
      ) : user && !isAdmin ? (
        <div className="mt-5 border-t-2 border-ink pt-5">
          <CommentForm
            eventId={event.id}
            organizer={event.viewer.organizer}
            onSent={async (comment) => {
              await refresh()
              if (comment.hidden) notify('error', 'Сообщение скрыто ИИ-модератором', comment.hiddenReason ?? undefined)
            }}
          />
        </div>
      ) : !user ? (
        <p className="mt-5 text-muted">Войдите, чтобы задать вопрос организатору.</p>
      ) : null}

      <ReasonDialog
        open={dialog !== null}
        title={dialog?.action === 'delete' ? 'Удалить сообщение' : 'Скрыть сообщение'}
        description={
          dialog?.action === 'delete'
            ? 'Сообщение будет удалено безвозвратно. Действие попадёт в журнал модерации.'
            : 'Сообщение увидят только автор и администраторы, вместе с причиной.'
        }
        confirmLabel={dialog?.action === 'delete' ? 'Удалить' : 'Скрыть'}
        presets={['Оскорбления', 'Спам или реклама', 'Личные данные третьих лиц', 'Не относится к мероприятию']}
        onClose={() => setDialog(null)}
        onConfirm={async (reason) => {
          if (!dialog) return
          if (dialog.action === 'delete') await moderationApi.deleteComment(dialog.comment.id, reason)
          else await moderationApi.hideComment(dialog.comment.id, reason)
          await refresh()
          notify('success', dialog.action === 'delete' ? 'Сообщение удалено' : 'Сообщение скрыто')
        }}
      />
    </Section>
  )
}

function CommentAuthorProfileLink({ comment, className, children }: { comment: Comment; className?: string; children: ReactNode }) {
  return (
    <Link
      to={`/users/${comment.authorId}`}
      className={className}
      title={`Профиль: ${comment.authorName}`}
    >
      {children}
    </Link>
  )
}

function CommentItem({
  comment,
  nested,
  isAdmin,
  canReply,
  onReply,
  onDelete,
  onModerate,
  onRestore,
}: {
  comment: Comment
  nested: boolean
  isAdmin: boolean
  canReply: boolean
  onReply: () => void
  onDelete: () => void
  onModerate: (action: 'hide' | 'delete') => void
  onRestore: () => void
}) {
  return (
    <article className={`flex gap-3 ${comment.hidden ? 'opacity-80' : ''}`}>
      <CommentAuthorProfileLink comment={comment} className="shrink-0 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
        <Avatar name={comment.authorName} color={comment.authorAvatarColor} size={nested ? 'sm' : 'md'} />
      </CommentAuthorProfileLink>
      <div className="min-w-0 flex-1">
        <div
          className={`rounded-2xl px-4 py-3 ${
            comment.hidden
              ? 'border-2 border-dashed border-ink bg-white'
              : comment.organizerReply
                ? 'border-[3px] border-ink bg-pop-blue/40 shadow-sm'
                : 'border-2 border-ink bg-white'
          }`}
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <CommentAuthorProfileLink comment={comment} className="font-bold text-brand-800 hover:underline dark:text-brand-300">
              {comment.authorName}
            </CommentAuthorProfileLink>
            {comment.organizerReply && (
              <span className="inline-flex items-center gap-1 rounded-full border-2 border-ink bg-brand-600 px-2 py-0.5 text-xs font-bold text-[#111111]">
                <BadgeCheck className="size-3.5" />
                Организатор
              </span>
            )}
            <span className="text-sm text-muted">{formatDateTime(comment.createdAt)}</span>
          </div>
          {comment.hidden && (
            <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-muted">
              <EyeOff className="size-4" />
              {comment.text ? `Скрыто${comment.hiddenByAi ? ' ИИ-модератором' : ' модератором'}: ${comment.hiddenReason ?? ''}` : comment.hiddenReason}
            </p>
          )}
          {comment.text && <p className="mt-1 whitespace-pre-line break-words text-ink">{comment.text}</p>}
        </div>
        <div className="mt-1 flex flex-wrap gap-3 pl-2 text-sm font-semibold text-muted">
          {canReply && !comment.hidden && (
            <button onClick={onReply} className="inline-flex items-center gap-1 hover:underline">
              <Reply className="size-4" />
              Ответить
            </button>
          )}
          {comment.canDelete && (
            <button onClick={onDelete} className="inline-flex items-center gap-1 hover:text-red-600">
              <Trash2 className="size-4" />
              Удалить
            </button>
          )}
          {isAdmin && (
            <>
              {comment.hidden ? (
                <button onClick={onRestore} className="inline-flex items-center gap-1 hover:text-emerald-700">
                  <RotateCcw className="size-4" />
                  Вернуть
                </button>
              ) : (
                <button onClick={() => onModerate('hide')} className="inline-flex items-center gap-1 hover:text-amber-700">
                  <EyeOff className="size-4" />
                  Скрыть
                </button>
              )}
              <button onClick={() => onModerate('delete')} className="inline-flex items-center gap-1 hover:text-red-600">
                <Trash2 className="size-4" />
                Удалить
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  )
}

function CommentForm({
  eventId,
  parent,
  organizer,
  onCancel,
  onSent,
}: {
  eventId: number
  parent?: Comment
  organizer?: boolean
  onCancel?: () => void
  onSent: (comment: Comment) => Promise<void>
}) {
  const { notify } = useToast()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!text.trim()) return
    setBusy(true)
    try {
      const comment = await eventsApi.addComment(eventId, text.trim(), parent?.id)
      setText('')
      await onSent(comment)
    } catch (e) {
      notify('error', 'Не удалось отправить', (e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <textarea
        className="input min-h-20"
        placeholder={parent ? `Ответ для ${parent.authorName}` : organizer ? 'Ответьте участникам или сделайте объявление' : 'Спросите организатора о деталях'}
        value={text}
        maxLength={2000}
        onChange={(e) => setText(e.target.value)}
        autoFocus={Boolean(parent)}
      />
      <div className="flex flex-wrap justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Отмена
          </Button>
        )}
        <Button type="submit" loading={busy} disabled={!text.trim()} icon={<Send className="size-4" />}>
          Отправить
        </Button>
      </div>
    </form>
  )
}
