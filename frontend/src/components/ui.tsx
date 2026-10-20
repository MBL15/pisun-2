import { Loader2, TriangleAlert, X } from 'lucide-react'
import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { initials } from '../lib/format'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'accent'
type Size = 'md' | 'lg' | 'sm'

const solid = 'border-[3px] border-ink shadow-md lift disabled:shadow-none disabled:translate-0'

const variants: Record<Variant, string> = {
  primary: `${solid} bg-brand-600 text-[#111111] hover:bg-brand-500`,
  secondary: `${solid} bg-surface text-ink hover:bg-pop-yellow/40 dark:hover:bg-pop-yellow dark:hover:text-[#111111]`,
  ghost: 'border-[3px] border-transparent text-ink hover:border-ink hover:bg-surface',
  danger: `${solid} bg-pop-red text-ink hover:bg-[#ff8585]`,
  success: `${solid} bg-pop-green text-ink hover:bg-[#7ef0b6]`,
  accent: `${solid} bg-pop-yellow text-[#111111] hover:bg-accent-400`,
}

const sizes: Record<Size, string> = {
  sm: 'min-h-10 px-3 py-1.5 text-sm rounded-lg gap-1.5',
  md: 'min-h-12 px-4 py-2 text-base rounded-xl gap-2',
  lg: 'min-h-14 px-6 py-3 text-lg rounded-xl gap-2.5',
}

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra = '') {
  return `inline-flex items-center justify-center font-bold transition disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${extra}`
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
}

export function Button({ variant = 'primary', size = 'md', loading, icon, children, className = '', disabled, ...rest }: ButtonProps) {
  return (
    <button className={buttonClass(variant, size, className)} disabled={disabled || loading} {...rest}>
      {loading ? <Loader2 className="size-5 animate-spin" /> : icon}
      {children}
    </button>
  )
}

export function LinkButton({
  to,
  variant = 'primary',
  size = 'md',
  icon,
  children,
  className = '',
}: {
  to: string
  variant?: Variant
  size?: Size
  icon?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <Link to={to} className={buttonClass(variant, size, className)}>
      {icon}
      {children}
    </Link>
  )
}

type BadgeTone = 'slate' | 'brand' | 'green' | 'amber' | 'red' | 'violet' | 'orange'

const badgeTones: Record<BadgeTone, string> = {
  slate: 'bg-white',
  brand: 'bg-pop-blue',
  green: 'bg-pop-green',
  amber: 'bg-pop-yellow',
  red: 'bg-pop-red',
  violet: 'bg-pop-lilac',
  orange: 'bg-pop-orange',
}

export function Badge({ tone = 'slate', icon, children }: { tone?: BadgeTone; icon?: ReactNode; children: ReactNode }) {
  return (
    <span className={`inline-flex max-w-full shrink-0 items-center gap-1 rounded-full sm:whitespace-nowrap border-2 border-ink px-2.5 py-0.5 text-sm font-bold text-ink ${badgeTones[tone]}`}>
      {icon}
      {children}
    </span>
  )
}

export function Spinner({ label = 'Загружаем…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-ink" role="status">
      <Loader2 className="size-7 animate-spin text-brand-600" />
      <span className="text-lg font-bold">{label}</span>
    </div>
  )
}

export function ErrorBox({ error, onRetry }: { error: Error | string; onRetry?: () => void }) {
  const message = typeof error === 'string' ? error : error.message
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border-[3px] border-ink bg-pop-red p-5 text-ink shadow-md sm:flex-row sm:items-center" role="alert">
      <TriangleAlert className="size-7 shrink-0" aria-hidden />
      <p className="flex-1 text-base font-semibold">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Повторить
        </Button>
      )}
    </div>
  )
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border-[3px] border-dashed border-ink bg-white px-6 py-12 text-center">
      <div className="flex size-16 rotate-[-4deg] items-center justify-center rounded-xl border-[3px] border-ink bg-pop-yellow text-3xl text-ink shadow-sm">{icon}</div>
      <h3 className="text-xl">{title}</h3>
      {text && <p className="max-w-md text-muted">{text}</p>}
      {action}
    </div>
  )
}

export function Avatar({ name, color, size = 'md' }: { name: string; color?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const dimension = size === 'sm' ? 'size-8 text-xs' : size === 'lg' ? 'size-16 text-xl' : 'size-11 text-sm'
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full border-2 border-ink font-bold text-[#111111] ${dimension}`}
      style={{ backgroundColor: color ?? '#64748b' }}
      aria-hidden
    >
      {initials(name)}
    </span>
  )
}

export function Modal({
  open,
  title,
  onClose,
  children,
  wide,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-ink/60 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal
        aria-label={title}
        className={`flex max-h-[92svh] w-full flex-col rounded-t-2xl border-[3px] border-ink bg-surface shadow-xl sm:rounded-2xl ${wide ? 'sm:max-w-4xl' : 'sm:max-w-lg'}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 rounded-t-xl border-b-[3px] border-ink bg-pop-yellow px-4 py-3 sm:px-6 sm:py-4">
          <h2 className="min-w-0 text-lg">{title}</h2>
          <button onClick={onClose} className="shrink-0 rounded-lg border-2 border-ink bg-white p-1.5 text-ink shadow-sm lift" aria-label="Закрыть">
            <X className="size-6" />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pb-5">{children}</div>
      </div>
    </div>
  )
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && !error && <span className="mt-1.5 block text-sm text-muted">{hint}</span>}
      {error && (
        <span className="mt-2 inline-block rounded-md border-2 border-ink bg-pop-red px-2 py-0.5 text-sm font-bold text-ink" role="alert">
          {error}
        </span>
      )}
    </label>
  )
}

export function Section({ title, icon, action, children }: { title: string; icon?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="card p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex min-w-0 items-center gap-3 text-lg sm:text-xl">
          {icon && (
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border-2 border-ink bg-pop-yellow [&>svg]:size-5 [&>svg]:text-ink" aria-hidden>
              {icon}
            </span>
          )}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function Tabs<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T
  onChange: (value: T) => void
  items: { value: T; label: string; icon?: ReactNode; count?: number }[]
}) {
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const list = listRef.current
    const active = list?.querySelector<HTMLElement>('[aria-selected="true"]')
    if (!list || !active) return
    const box = list.getBoundingClientRect()
    const tab = active.getBoundingClientRect()
    if (tab.left < box.left) list.scrollBy({ left: tab.left - box.left - 8, behavior: 'smooth' })
    else if (tab.right > box.right) list.scrollBy({ left: tab.right - box.right + 8, behavior: 'smooth' })
  }, [value])

  return (
    <div ref={listRef} className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist">
      {items.map((item) => (
        <button
          key={item.value}
          role="tab"
          aria-selected={value === item.value}
          onClick={() => onChange(item.value)}
          className={`inline-flex min-h-12 shrink-0 items-center gap-2 rounded-xl border-[3px] border-ink px-4 py-2 font-bold transition ${
            value === item.value ? 'translate-x-0.5 translate-y-0.5 bg-[#111111] text-white' : 'bg-white text-ink shadow-sm hover:bg-pop-yellow/50'
          }`}
        >
          {item.icon}
          {item.label}
          {item.count !== undefined && item.count > 0 && (
            <span className="rounded-full border-2 border-ink bg-pop-yellow px-2 text-sm text-ink">
              {item.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[clamp(1.1rem,5.6vw,1.5rem)] sm:text-4xl">
          <span className="box-decoration-clone bg-pop-yellow px-1.5 leading-[1.35]">{title}</span>
        </h1>
        {subtitle && <p className="mt-3 max-w-3xl text-base font-medium text-muted sm:text-lg">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
