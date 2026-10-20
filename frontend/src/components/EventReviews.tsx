import { Star } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { eventsApi } from '../api/endpoints'
import type { EventReview, SportEvent } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { useToast } from './Toast'
import { Avatar, Button, EmptyState, ErrorBox, Field, Section, Spinner } from './ui'
import { formatDateTime, plural } from '../lib/format'
import { useAsync } from '../lib/useAsync'

function StarRow({ value, onChange, readonly = false }: { value: number; onChange?: (n: number) => void; readonly?: boolean }) {
  return (
    <div className="flex gap-1" role={readonly ? 'img' : 'group'} aria-label={`Оценка ${value} из 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(n)}
          className={`rounded p-0.5 transition ${readonly ? 'cursor-default' : 'hover:scale-110'} ${n <= value ? 'text-amber-500' : 'text-slate-300'}`}
          aria-label={`${n} ${plural(n, 'звезда', 'звезды', 'звёзд')}`}
        >
          <Star className="size-6" fill={n <= value ? 'currentColor' : 'none'} strokeWidth={2} />
        </button>
      ))}
    </div>
  )
}

export function EventReviews({ event, onChanged }: { event: SportEvent; onChanged: () => Promise<void> }) {
  const { user } = useAuth()
  const { notify } = useToast()
  const list = useAsync(() => eventsApi.reviews(event.id), [event.id])
  const [stars, setStars] = useState(event.viewer.myReviewStars ?? 5)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)

  const summary = event.reviews
  const canForm = event.viewer.canLeaveReview || event.viewer.myReviewStars != null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await eventsApi.upsertReview(event.id, { stars, comment: comment.trim() || undefined })
      notify('success', event.viewer.myReviewStars != null ? 'Отзыв обновлён' : 'Спасибо за отзыв!')
      await list.reload()
      await onChanged()
    } catch (err) {
      notify('error', 'Не удалось сохранить отзыв', (err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section
      title="Отзывы участников"
      icon={<Star className="size-6 fill-amber-400 text-amber-500" />}
      action={
        summary.count > 0 ? (
          <p className="text-sm font-bold text-muted">
            {summary.averageStars.toFixed(1)} · {summary.count}{' '}
            {plural(summary.count, 'отзыв', 'отзыва', 'отзывов')}
          </p>
        ) : undefined
      }
    >
      {summary.count === 0 && !canForm && (
        <p className="text-muted">Пока нет отзывов — они появятся после завершения мероприятия.</p>
      )}

      {canForm && user && (
        <form onSubmit={submit} className="mb-6 space-y-3 rounded-xl border-2 border-ink/15 bg-surface/60 p-4">
          <p className="font-semibold">
            {event.viewer.myReviewStars != null ? 'Ваша оценка' : 'Оцените мероприятие как участник'}
          </p>
          <StarRow value={stars} onChange={setStars} />
          <Field label="Комментарий (необязательно)">
            <textarea
              className="input min-h-24"
              maxLength={1000}
              placeholder="Что понравилось или что можно улучшить?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </Field>
          {!event.viewer.canLeaveReview && event.viewer.reviewBlockedReason && event.viewer.myReviewStars == null && (
            <p className="text-sm text-muted">{event.viewer.reviewBlockedReason}</p>
          )}
          {event.viewer.canLeaveReview && (
            <Button type="submit" loading={busy}>
              {event.viewer.myReviewStars != null ? 'Обновить отзыв' : 'Отправить отзыв'}
            </Button>
          )}
        </form>
      )}

      {!user && event.viewer.reviewBlockedReason && (
        <p className="mb-4 text-sm text-muted">{event.viewer.reviewBlockedReason}</p>
      )}

      {user && !canForm && event.viewer.reviewBlockedReason && (
        <p className="mb-4 text-sm text-muted">{event.viewer.reviewBlockedReason}</p>
      )}

      {list.loading && !list.data && <Spinner />}
      {list.error && <ErrorBox error={list.error} onRetry={list.reload} />}
      {list.data?.length === 0 && summary.count === 0 && canForm && (
        <EmptyState icon={<Star className="size-8" />} title="Станьте первым" text="Ваш отзыв поможет другим выбрать организатора." />
      )}
      <ul className="space-y-4">
        {list.data?.map((review) => (
          <ReviewItem key={review.id} review={review} />
        ))}
      </ul>
    </Section>
  )
}

function ReviewItem({ review }: { review: EventReview }) {
  return (
    <li className="flex gap-3 rounded-xl border-2 border-ink/10 p-4">
      <Avatar name={review.authorName} color={review.authorAvatarColor} size="sm" />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold">{review.authorName}</span>
          {review.mine && <span className="text-xs font-semibold text-brand-700">это вы</span>}
          <StarRow value={review.stars} readonly />
        </div>
        {review.comment && <p className="whitespace-pre-line text-ink">{review.comment}</p>}
        <p className="text-xs text-muted">{formatDateTime(review.createdAt)}</p>
      </div>
    </li>
  )
}
