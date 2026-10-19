import { Baby, Bot, CircleCheck, Clock3, Hourglass, ShieldAlert, Users, XCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import type { ApplicationStatus, EventStatus, SportEvent } from '../api/types'
import { ageLabels, eventStatusLabels, modeLabels, registrationStatusLabels } from '../lib/format'
import { Badge } from './ui'

export function ModeBadge({ event }: { event: SportEvent }) {
  return event.registrationMode === 'FREE' ? (
    <Badge tone="green" icon={<Users className="size-4" />}>
      {modeLabels.FREE}
    </Badge>
  ) : (
    <Badge tone="violet" icon={<Hourglass className="size-4" />}>
      {modeLabels.BY_APPLICATION}
    </Badge>
  )
}

export function AgeBadge({ event }: { event: SportEvent }) {
  if (!event.ageRestriction) return null
  return event.ageRestriction === 'CHILD_SAFE' && event.aiStatus === 'AI_APPROVED' ? (
    <Badge tone="brand" icon={<Baby className="size-4" />}>
      {ageLabels.CHILD_SAFE}
    </Badge>
  ) : (
    <Badge tone="orange">{ageLabels.ADULT_ONLY}</Badge>
  )
}

export function AiBadge({ event }: { event: SportEvent }) {
  if (!event.aiStatus) return null
  return event.aiStatus === 'AI_APPROVED' ? (
    <Badge tone="green" icon={<Bot className="size-4" />}>
      Проверено ИИ
    </Badge>
  ) : (
    <Badge tone="red" icon={<ShieldAlert className="size-4" />}>
      ИИ: требует внимания
    </Badge>
  )
}

const statusTone: Record<EventStatus, 'green' | 'amber' | 'red' | 'slate'> = {
  PUBLISHED: 'green',
  ON_REVIEW: 'amber',
  UNPUBLISHED: 'red',
  DELETED: 'slate',
}

export function EventStatusBadge({ status }: { status: EventStatus }) {
  return <Badge tone={statusTone[status]}>{eventStatusLabels[status]}</Badge>
}

const registrationTone: Record<ApplicationStatus, 'green' | 'amber' | 'red' | 'slate'> = {
  APPROVED: 'green',
  PENDING: 'amber',
  REJECTED: 'red',
  CANCELLED: 'slate',
}

const registrationIcon: Record<ApplicationStatus, ReactNode> = {
  APPROVED: <CircleCheck className="size-4" />,
  PENDING: <Clock3 className="size-4" />,
  REJECTED: <XCircle className="size-4" />,
  CANCELLED: <XCircle className="size-4" />,
}

export function RegistrationBadge({ status, label }: { status: ApplicationStatus; label?: string }) {
  return (
    <Badge tone={registrationTone[status]} icon={registrationIcon[status]}>
      {label ?? registrationStatusLabels[status]}
    </Badge>
  )
}
