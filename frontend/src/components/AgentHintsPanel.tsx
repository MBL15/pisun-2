import { Bot, Sparkles } from 'lucide-react'
import type { AgentSuggestion, VerificationResult } from '../api/types'

const fieldLabels: Record<string, string> = {
  title: 'Название',
  description: 'Описание',
  conditions: 'Условия',
  address: 'Адрес',
  sport: 'Вид спорта',
  organizerContact: 'Контакты',
}

export function AgentHintsPanel({
  review,
  loading,
  onImprove,
  improving,
  variants,
  onApplyVariant,
}: {
  review: VerificationResult | null
  loading: boolean
  onImprove: () => void
  improving: boolean
  variants: string[]
  onApplyVariant: (text: string) => void
}) {
  if (!review && !loading) return null
  const ageTone = review?.ageRestriction === 'CHILD_SAFE' ? 'bg-pop-green' : 'bg-pop-orange'
  return (
    <section className="rounded-xl border-[3px] border-ink bg-white p-4 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Bot className="size-5" />
          Хранитель качества
        </h2>
        <button type="button" onClick={onImprove} disabled={improving} className="text-sm font-bold text-brand-700 underline">
          {improving ? 'Агент думает…' : 'Спросить агента, как улучшить'}
        </button>
      </div>
      {loading && !review && <p className="mt-2 text-sm text-slate-600">Смотрит текст…</p>}
      {review && (
        <div className="mt-3 space-y-3">
          <p className={`inline-block rounded-lg border-2 border-ink px-2 py-1 text-sm font-bold ${ageTone}`}>
            {review.ageRestriction === 'CHILD_SAFE' ? 'Прогноз: можно с детьми' : 'Прогноз: 18+'}
          </p>
          {review.ageExplanation && <p className="text-sm text-slate-700">{review.ageExplanation}</p>}
          {(review.suggestions?.length ?? 0) > 0 && (
            <ul className="space-y-2">
              {(review.suggestions ?? []).map((hint) => (
                <Hint key={`${hint.type}-${hint.field}-${hint.message}`} hint={hint} />
              ))}
            </ul>
          )}
          {(review.suggestions?.length ?? 0) === 0 && <p className="text-sm text-slate-600">Замечаний по полям нет. Можно отправлять.</p>}
        </div>
      )}
      {variants.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="flex items-center gap-2 text-sm font-bold">
            <Sparkles className="size-4" />
            Варианты описания — подставятся только если нажмёте «Взять этот текст»
          </p>
          {variants.map((variant) => (
            <div key={variant} className="rounded-lg border-2 border-ink bg-pop-yellow/40 p-3 text-sm">
              <p className="whitespace-pre-line">{variant}</p>
              <button type="button" className="mt-2 font-bold underline" onClick={() => onApplyVariant(variant)}>
                Взять этот текст
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function Hint({ hint }: { hint: AgentSuggestion }) {
  const label = hint.field ? fieldLabels[hint.field] ?? hint.field : 'Замечание'
  return (
    <li className="rounded-lg border-2 border-ink bg-pop-blue/40 px-3 py-2 text-sm">
      <span className="font-bold">{label}. </span>
      {hint.message}
    </li>
  )
}
