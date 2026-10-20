import type { User } from '../api/types'

/**
 * Подсказка о статусе допуска организации — показывается после входа, но вход не блокирует:
 * представитель должен видеть заявку и решение администратора при любом статусе.
 */
export function organizationStatusHint(user: User): string | null {
  if (user.role !== 'ORGANIZATION') return null
  if (user.organizationStatus === 'REJECTED') {
    return 'Заявка организации отклонена — исправьте анкету в разделе «Моя организация» и отправьте повторно.'
  }
  if (user.organizationStatus !== 'APPROVED') {
    return 'Заявка организации на рассмотрении — публикация событий откроется после допуска.'
  }
  return null
}
