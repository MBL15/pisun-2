import type {
  AgeRestriction,
  ApplicationStatus,
  Audience,
  EventStatus,
  RegistrationMode,
  Gender,
  RoleType,
  SkillLevel,
} from '../api/types'

const dateFmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' })
const shortDateFmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })
const timeFmt = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })
const dateTimeFmt = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

export const formatDate = (iso: string) => dateFmt.format(new Date(iso))
export const formatShortDate = (iso: string) => shortDateFmt.format(new Date(iso))
export const formatTime = (iso: string) => timeFmt.format(new Date(iso))
export const formatDateTime = (iso: string) => dateTimeFmt.format(new Date(iso))

export function formatRelativeDay(iso: string): string {
  const date = new Date(iso)
  const today = new Date()
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diff = Math.round((startOf(date) - startOf(today)) / 86_400_000)
  if (diff === 0) return 'Сегодня'
  if (diff === 1) return 'Завтра'
  if (diff === 2) return 'Послезавтра'
  return formatDate(iso)
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} мин`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} ч ${rest} мин` : `${hours} ч`
}

/** Значение для <input type="datetime-local"> в локальном времени. */
export function toLocalInput(date: Date): string {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return shifted.toISOString().slice(0, 16)
}

export function toIsoDate(date: Date): string {
  return toLocalInput(date).slice(0, 10)
}

export function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

export const roleLabels: Record<RoleType, string> = {
  USER: 'Пользователь',
  CHILD: 'Ребёнок',
  ADMIN: 'Администратор',
  ORGANIZATION: 'Организация',
}

export const genderLabels: Record<Gender, string> = {
  MALE: 'Мужчина',
  FEMALE: 'Женщина',
}

export const modeLabels: Record<RegistrationMode, string> = {
  FREE: 'Свободная запись',
  BY_APPLICATION: 'По заявке',
}

export const modeHints: Record<RegistrationMode, string> = {
  FREE: 'Записываетесь — и сразу в составе участников',
  BY_APPLICATION: 'Организатор рассмотрит заявку и примет решение',
}

export const levelLabels: Record<SkillLevel, string> = {
  ANY: 'Любой уровень',
  BEGINNER: 'Для начинающих',
  AMATEUR: 'Любители',
  PRO: 'Опытные',
}

export const audienceLabels: Record<Audience, string> = {
  ALL: 'Для всех возрастов',
  KIDS: 'Для детей',
  ADULTS: 'Только взрослые',
}

export const ageLabels: Record<AgeRestriction, string> = {
  CHILD_SAFE: 'Можно детям',
  ADULT_ONLY: '18+',
}

export const eventStatusLabels: Record<EventStatus, string> = {
  PUBLISHED: 'Опубликовано',
  ON_REVIEW: 'На проверке',
  UNPUBLISHED: 'Снято с публикации',
  DELETED: 'Удалено',
}

export const registrationStatusLabels: Record<ApplicationStatus, string> = {
  PENDING: 'Заявка ждёт решения',
  APPROVED: 'Вы в составе участников',
  REJECTED: 'Заявка отклонена',
  CANCELLED: 'Запись отменена',
}

export const organizationStatusLabels: Record<ApplicationStatus, string> = {
  PENDING: 'На рассмотрении',
  APPROVED: 'Допущена',
  REJECTED: 'Отклонена',
  CANCELLED: 'Отозвана',
}

export function osmPointUrl(lat: number, lon: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`
}

export function osmRouteUrl(lat: number, lon: number, from?: string): string {
  const to = `${lat},${lon}`
  if (from?.trim()) {
    return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${encodeURIComponent(from.trim())}%3B${encodeURIComponent(to)}`
  }
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${encodeURIComponent(to)}`
}

const sportTones = ['bg-pop-yellow', 'bg-pop-blue', 'bg-pop-green', 'bg-pop-pink', 'bg-pop-lilac', 'bg-pop-orange', 'bg-pop-cyan']

/** Стабильный цвет «стикера» направления, чтобы карточки разных видов спорта различались. */
export const sportTone = (sportTypeId: number) => sportTones[Math.abs(sportTypeId) % sportTones.length]

export const REPUTATION_DEFAULT = 100
export const REPUTATION_MIN_TO_CREATE = 30

export function normalizeReputation(score: number | undefined | null): number {
  return typeof score === 'number' && Number.isFinite(score) ? score : REPUTATION_DEFAULT
}

export function reputationHint(score: number, blocked: boolean): string {
  if (blocked) {
    return `Создание мероприятий недоступно: репутация ${score} баллов (нужно не меньше ${REPUTATION_MIN_TO_CREATE}). Баллы снижают отзывы участников и решения модерации (снятие или удаление мероприятия).`
  }
  if (score < 60) {
    return `Репутация ${score} баллов — будьте внимательны к правилам: при ${REPUTATION_MIN_TO_CREATE} и ниже публикация событий закроется. Хорошие отзывы после мероприятий помогают восстановить рейтинг.`
  }
  return `Репутация ${score} баллов — на неё влияют отзывы участников и модерация платформы.`
}

export function reputationTone(score: number, blocked: boolean): 'red' | 'amber' | 'green' | 'slate' {
  if (blocked) return 'red'
  if (score < 60) return 'amber'
  if (score >= 80) return 'green'
  return 'slate'
}

export function initials(name: string): string {
  return name
    .replace(/[«»"]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}
