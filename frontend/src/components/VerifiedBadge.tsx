import { BadgeCheck } from 'lucide-react'

export function VerifiedBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center text-sky-600 dark:text-sky-400 ${className}`}
      title="Проверенный организатор"
      aria-label="Проверенный организатор"
    >
      <BadgeCheck className="size-5 shrink-0" strokeWidth={2.25} aria-hidden />
    </span>
  )
}

export function DisplayNameWithBadge({ name, verified }: { name: string; verified?: boolean }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5">
      <span className="truncate">{name}</span>
      {verified && <VerifiedBadge />}
    </span>
  )
}
