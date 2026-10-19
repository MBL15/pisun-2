import type {
  AgeRestriction,
  ApplicationStatus,
  Audience,
  EventStatus,
  RegistrationMode,
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

export function yandexRouteUrl(lat: number, lon: number, from?: string): string {
  const dest = `${lat},${lon}`
  if (from?.trim()) {
    return `https://yandex.ru/maps/?rtext=${encodeURIComponent(from.trim())}~${dest}&rtt=auto`
  }
  return `https://yandex.ru/maps/?rtext=~${dest}&rtt=auto`
}

export function yandexPointUrl(lat: number, lon: number): string {
  return `https://yandex.ru/maps/?pt=${lon},${lat}&z=16&l=map`
}

const sportTones = ['bg-pop-yellow', 'bg-pop-blue', 'bg-pop-green', 'bg-pop-pink', 'bg-pop-lilac', 'bg-pop-orange', 'bg-pop-cyan']

/** Стабильный цвет «стикера» направления, чтобы карточки разных видов спорта различались. */
export const sportTone = (sportTypeId: number) => sportTones[Math.abs(sportTypeId) % sportTones.length]

export function initials(name: string): string {
  return name
    .replace(/[«»"]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}
