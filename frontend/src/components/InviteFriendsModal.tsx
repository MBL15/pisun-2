import { Users } from 'lucide-react'
import { useState } from 'react'
import { eventsApi, friendsApi } from '../api/endpoints'
import type { User } from '../api/types'
import { useToast } from './Toast'
import { Avatar, Button, Modal } from './ui'
import { useAsync } from '../lib/useAsync'

export function InviteFriendsModal({
  open,
  eventId,
  onDone,
}: {
  open: boolean
  eventId: number
  onClose?: () => void
  onDone: () => void
}) {
  const friends = useAsync(() => friendsApi.list(), [open])
  const [selected, setSelected] = useState<number[]>([])
  const [busy, setBusy] = useState(false)
  const { notify } = useToast()

  const toggle = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const submit = async () => {
    if (selected.length === 0) {
      onDone()
      return
    }
    setBusy(true)
    try {
      await eventsApi.inviteFriends(eventId, selected)
      notify('success', 'Приглашения сохранены')
      onDone()
    } catch (e) {
      notify('error', 'Не удалось отправить приглашения', (e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} title="Пригласим друзей?" onClose={onDone} wide>
      <p className="mb-4 text-muted">
        Закрытое мероприятие и так видят ваши друзья. Отметьте тех, кому хотите напомнить — они получат отметку приглашения.
      </p>
      {friends.loading && <p className="text-sm text-muted">Загружаем список друзей…</p>}
      {friends.data?.length === 0 && (
        <p className="text-sm text-muted">Пока нет друзей — добавьте людей в разделе «Люди».</p>
      )}
      <ul className="mb-4 max-h-64 space-y-2 overflow-y-auto">
        {friends.data?.map((person: User) => (
          <li key={person.id}>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-ink/15 px-3 py-2">
              <input type="checkbox" checked={selected.includes(person.id)} onChange={() => toggle(person.id)} />
              <Avatar name={person.displayName} color={person.avatarColor} size="sm" />
              <span className="font-semibold">{person.displayName}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onDone}>
          Пропустить
        </Button>
        <Button loading={busy} icon={<Users className="size-5" />} onClick={submit}>
          {selected.length ? `Пригласить (${selected.length})` : 'Готово'}
        </Button>
      </div>
    </Modal>
  )
}
