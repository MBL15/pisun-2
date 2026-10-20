import { Bot, Sparkles } from 'lucide-react'
import type { AgentSuggestion } from '../api/types'

const tone: Record<string, string> = {
  INFO: 'border-slate-300 bg-slate-50',
  WARNING: 'border-amber-400 bg-pop-yellow/40',
  FLAG: 'border-red-500 bg-red-50',
}

export function AgentHintsPanel({
  title,
  suggestions,
  descriptionVariants,
  onApplyDescription,
}: {
  title?: string
  suggestions: AgentSuggestion[]
  descriptionVariants?: string[]
  onApplyDescription?: (text: string) => void
}) {
  if (suggestions.length === 0 && !(descriptionVariants?.length ?? 0)) return null

  return (
    <section className="space-y-3 rounded-xl border-[3px] border-ink bg-white p-4 shadow-md">
      <h3 className="flex items-center gap-2 text-lg font-bold">
        <Bot className="size-5 text-brand-600" />
        {title ?? 'Подсказки агента'}
      </h3>
      <ul className="space-y-2">
        {suggestions.map((item, index) => (
          <li key={`${item.field}-${index}`} className={`rounded-lg border-2 px-3 py-2 text-sm ${tone[item.type] ?? tone.INFO}`}>
            <span className="font-semibold capitalize">{fieldLabel(item.field)}: </span>
            {item.message}
          </li>
        ))}
      </ul>
      {descriptionVariants && descriptionVariants.length > 0 && onApplyDescription && (
        <div className="space-y-2 border-t-2 border-dashed border-slate-200 pt-3">
          <p className="flex items-center gap-2 text-sm font-bold text-brand-700">
            <Sparkles className="size-4" />
            Как улучшить описание
          </p>
          {descriptionVariants.map((variant) => (
            <button
              key={variant.slice(0, 40)}
              type="button"
              className="block w-full rounded-lg border-2 border-ink bg-pop-blue/30 p-3 text-left text-sm hover:bg-pop-yellow/40"
              onClick={() => onApplyDescription(variant)}
            >
              {variant}
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function fieldLabel(field: string): string {
  const map: Record<string, string> = {
    title: 'Название',
    description: 'Описание',
    conditions: 'Условия',
    sportType: 'Направление',
    audience: 'Аудитория',
  }
  return map[field] ?? field
}
