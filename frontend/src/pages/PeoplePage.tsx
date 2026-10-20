import { Search, UserPlus, Users } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { friendsApi } from '../api/endpoints'
import type { User } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { DisplayNameWithBadge } from '../components/VerifiedBadge'
import { useToast } from '../components/Toast'
import { Avatar, Badge, Button, EmptyState, ErrorBox, PageHeader, Section, Spinner } from '../components/ui'
import { useAsync } from '../lib/useAsync'

export function PeoplePage() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [applied, setApplied] = useState('')
  const search = useAsync(() => (applied.length >= 2 ? friendsApi.search(applied) : Promise.resolve([])), [applied])
  const friends = useAsync(() => friendsApi.list(), [])
  const incoming = useAsync(() => friendsApi.incoming(), [])
  const { notify } = useToast()

  const send = async (target: User) => {
    try {
      await friendsApi.sendRequest(target.id)
      notify('success', 'Заявка отправлена')
      await search.reload()
    } catch (e) {
      notify('error', 'Не удалось отправить заявку', (e as Error).message)
    }
  }

  const accept = async (fromId: number) => {
    try {
      await friendsApi.accept(fromId)
      notify('success', 'Теперь вы друзья')
      await incoming.reload()
      await friends.reload()
    } catch (e) {
      notify('error', 'Не удалось принять заявку', (e as Error).message)
    }
  }

  if (!user) return null

  return (
    <div className="space-y-6">
      <PageHeader title="Люди" subtitle="Найдите единомышленников и добавляйте в друзья — так вы увидите их закрытые мероприятия" />

      {incoming.data && incoming.data.length > 0 && (
        <Section title="Заявки в друзья" icon={<UserPlus className="size-6 text-brand-600" />}>
          <ul className="space-y-3">
            {incoming.data.map((person) => (
              <li key={person.id} className="card flex flex-wrap items-center gap-3 p-4">
                <Avatar name={person.displayName} color={person.avatarColor} />
                <div className="min-w-0 flex-1">
                  <Link to={`/users/${person.id}`} className="font-bold text-brand-700 hover:underline">
                    <DisplayNameWithBadge name={person.displayName} verified={person.verified} />
                  </Link>
                  {person.interests && <p className="text-sm text-muted">{person.interests}</p>}
                </div>
                <Button size="sm" onClick={() => accept(person.id)}>
                  Принять
                </Button>
                <Button size="sm" variant="secondary" onClick={() => friendsApi.reject(person.id).then(() => incoming.reload())}>
                  Отклонить
                </Button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Мои друзья" icon={<Users className="size-6 text-brand-600" />}>
        {friends.loading && !friends.data && <Spinner />}
        {friends.data?.length === 0 && <p className="text-muted">Пока нет друзей — найдите людей через поиск ниже.</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          {friends.data?.map((person) => (
            <Link key={person.id} to={`/users/${person.id}`} className="card flex items-center gap-3 p-4 lift">
              <Avatar name={person.displayName} color={person.avatarColor} />
              <div>
                <p className="font-bold">
                  <DisplayNameWithBadge name={person.displayName} verified={person.verified} />
                </p>
                {person.city && <p className="text-sm text-muted">{person.city}</p>}
              </div>
            </Link>
          ))}
        </div>
      </Section>

      <form
        className="flex gap-3"
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          setApplied(query.trim())
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
          <input className="input pl-12" placeholder="Имя или интересы" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Button type="submit">Найти</Button>
      </form>

      {search.error && <ErrorBox error={search.error} onRetry={search.reload} />}
      {search.loading && applied.length >= 2 && <Spinner />}
      {applied.length >= 2 && search.data?.length === 0 && !search.loading && (
        <EmptyState icon={<Search className="size-8" />} title="Никого не нашли" />
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {search.data?.map((person) => (
          <article key={person.id} className="card space-y-3 p-4">
            <div className="flex gap-3">
              <Avatar name={person.displayName} color={person.avatarColor} size="lg" />
              <div>
                <Link to={`/users/${person.id}`} className="text-lg font-bold text-brand-700 hover:underline">
                  <DisplayNameWithBadge name={person.displayName} verified={person.verified} />
                </Link>
                {person.interests && <p className="text-sm font-medium text-brand-800">{person.interests}</p>}
                {person.bio && <p className="line-clamp-2 text-sm text-muted">{person.bio}</p>}
              </div>
            </div>
            <FriendAction person={person} onChanged={() => search.reload()} onSend={() => send(person)} />
          </article>
        ))}
      </div>
    </div>
  )
}

function FriendAction({ person, onSend, onChanged }: { person: User; onSend: () => void; onChanged: () => void }) {
  switch (person.friendship) {
    case 'FRIENDS':
      return <Badge tone="green">Уже друзья</Badge>
    case 'OUTGOING':
      return <Badge tone="amber">Заявка отправлена</Badge>
    case 'INCOMING':
      return (
        <Button size="sm" onClick={() => friendsApi.accept(person.id).then(onChanged)}>
          Принять заявку
        </Button>
      )
    default:
      return (
        <Button size="sm" variant="secondary" icon={<UserPlus className="size-4" />} onClick={onSend}>
          В друзья
        </Button>
      )
  }
}
