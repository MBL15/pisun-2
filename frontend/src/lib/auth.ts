import type { User } from '../api/types'

/** Сообщение при попытке входа в аккаунт организации без допуска администратора. */
export function organizationLoginBlocked(user: User): string | null {
  if (user.role !== 'ORGANIZATION') return null
  if (user.organizationStatus === 'APPROVED') return null
  if (user.organizationStatus === 'REJECTED') {
    return 'Заявка организации отклонена. Исправьте анкету в разделе «Моя организация» после входа — пока вход недоступен.'
  }
  return 'Организация пока не подтверждена'
}
