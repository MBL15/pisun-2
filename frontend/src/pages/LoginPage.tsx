import { Building2, LogIn, UserPlus, UserRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { usersApi } from '../api/endpoints'
import type { User } from '../api/types'
import { homeFor, useAuth } from '../auth/AuthContext'
import { useToast } from '../components/Toast'
import { Avatar, Button, ErrorBox, Field, Spinner, Tabs } from '../components/ui'

const hints: Record<number, string> = {
  1: 'Создаёт события, записывается сам и записывает сына. Организатор шахматного блица.',
  2: 'Видит только безопасные проверенные занятия; при записи формируется согласие родителя.',
  3: 'Допуск организаций, снятие событий с публикации, модерация обсуждений, настройки ИИ.',
  4: 'Допущенный клуб: публикует события без премодерации, рассматривает 2 заявки на футбол.',
  5: 'Клуб ждёт допуска: страница скрыта, публикация событий заблокирована.',
  6: 'Ещё один участник — удобно проверять события «глазами другого пользователя».',
  7: 'Организатор скандинавской ходьбы «по заявке» и события, придержанного ИИ.',
}

const roleSticker: Record<User['role'], string> = {
  USER: 'bg-pop-blue',
  CHILD: 'bg-pop-green',
  ADMIN: 'bg-pop-red',
  ORGANIZATION: 'bg-pop-orange',
}

export function LoginPage() {
  const { demoAccounts, login, loading } = useAuth()
  const navigate = useNavigate()

  const enter = (user: User) => {
    login(user)
    navigate(homeFor(user))
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
      <section>
        <h1 className="text-3xl sm:text-5xl">
          <span className="bg-pop-yellow px-1.5">Вход</span>
        </h1>
        <p className="mt-3 text-lg font-medium text-slate-700">
          Авторизация имитируется: выберите демо-аккаунт — пароль не нужен. Роль можно сменить в любой момент кнопкой в шапке.
        </p>
        {loading ? (
          <Spinner />
        ) : demoAccounts.length === 0 ? (
          <div className="mt-6">
            <ErrorBox error="Не удалось получить список аккаунтов. Проверьте, что бэкенд запущен (start.ps1 / start.sh)." />
          </div>
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {demoAccounts.map((account) => (
              <button
                key={account.id}
                onClick={() => enter(account)}
                className="card lift flex items-start gap-4 p-4 text-left hover:bg-pop-yellow/30"
              >
                <Avatar name={account.displayName} color={account.avatarColor} />
                <span className="min-w-0">
                  <span className="block font-bold">{account.displayName}</span>
                  <span className={`mt-1 inline-block rounded border-2 border-ink px-1.5 text-xs font-bold ${roleSticker[account.role]}`}>
                    {account.demoLabel}
                  </span>
                  <span className="mt-1 block text-sm text-slate-600">{hints[account.id] ?? account.bio}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <RegisterForm onRegistered={enter} />
    </div>
  )
}

function RegisterForm({ onRegistered }: { onRegistered: (user: User) => void }) {
  const [kind, setKind] = useState<'USER' | 'ORGANIZATION'>('USER')
  const [form, setForm] = useState({ displayName: '', email: '', age: '', city: 'Красноярск', interests: '' })
  const [org, setOrg] = useState({ name: '', description: '', sportsInterests: '', address: '', contacts: '', website: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const { notify } = useToast()
  const { reloadAccounts } = useAuth()

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const user = await usersApi.register({
        displayName: form.displayName,
        email: form.email || undefined,
        age: form.age ? Number(form.age) : undefined,
        city: form.city || undefined,
        interests: form.interests || undefined,
        role: kind,
        organization: kind === 'ORGANIZATION' ? { ...org, city: form.city } : undefined,
      })
      await reloadAccounts()
      notify(
        'success',
        kind === 'ORGANIZATION' ? 'Заявка организации отправлена' : 'Аккаунт создан',
        kind === 'ORGANIZATION' ? 'Администратор рассмотрит её — статус виден в разделе «Моя организация».' : undefined,
      )
      onRegistered(user)
    } catch (e) {
      setError(e as ApiError)
    } finally {
      setBusy(false)
    }
  }

  const fieldError = (name: string) => error?.fields?.[name] ?? error?.fields?.[`organization.${name}`]

  return (
    <section className="card h-fit p-6">
      <h2 className="flex items-center gap-2 text-2xl font-bold">
        <UserPlus className="size-6 text-brand-600" />
        Регистрация
      </h2>
      <p className="mt-1 text-slate-600">Новый аккаунт сохранится в базе и появится в списке для входа.</p>
      <div className="mt-4">
        <Tabs
          value={kind}
          onChange={setKind}
          items={[
            { value: 'USER', label: 'Я участник', icon: <UserRound className="size-4" /> },
            { value: 'ORGANIZATION', label: 'Я представляю клуб', icon: <Building2 className="size-4" /> },
          ]}
        />
      </div>

      <form onSubmit={submit} className="mt-5 space-y-4">
        <Field label={kind === 'ORGANIZATION' ? 'Имя представителя' : 'Как вас зовут'} error={fieldError('displayName')}>
          <input className="input" required value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Почта" hint="Подтверждение не требуется" error={fieldError('email')}>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Возраст" error={fieldError('age')}>
            <input className="input" type="number" min={14} max={120} value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
          </Field>
        </div>
        <Field label="Город">
          <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </Field>

        {kind === 'USER' ? (
          <Field label="Чем хотите заниматься" hint="Например: бег, настольный теннис">
            <input className="input" value={form.interests} onChange={(e) => setForm({ ...form, interests: e.target.value })} />
          </Field>
        ) : (
          <div className="space-y-4 rounded-xl border-[3px] border-ink bg-pop-orange/35 p-4">
            <p className="text-sm text-ink">
              Страница клуба появится на платформе после одобрения администратором. До этого вы видите статус заявки, но не можете публиковать события.
            </p>
            <Field label="Название организации" error={fieldError('name')}>
              <input className="input" required value={org.name} onChange={(e) => setOrg({ ...org, name: e.target.value })} />
            </Field>
            <Field label="Чем занимается" error={fieldError('description')}>
              <textarea className="input min-h-24" required value={org.description} onChange={(e) => setOrg({ ...org, description: e.target.value })} />
            </Field>
            <Field label="Спортивные направления" error={fieldError('sportsInterests')}>
              <input className="input" required placeholder="Футбол, баскетбол" value={org.sportsInterests} onChange={(e) => setOrg({ ...org, sportsInterests: e.target.value })} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Адрес">
                <input className="input" value={org.address} onChange={(e) => setOrg({ ...org, address: e.target.value })} />
              </Field>
              <Field label="Контакты">
                <input className="input" value={org.contacts} onChange={(e) => setOrg({ ...org, contacts: e.target.value })} />
              </Field>
            </div>
          </div>
        )}

        {error && !error.fields && <ErrorBox error={error} />}
        <Button type="submit" size="lg" className="w-full" loading={busy} icon={<LogIn className="size-5" />}>
          {kind === 'ORGANIZATION' ? 'Отправить заявку на допуск' : 'Зарегистрироваться и войти'}
        </Button>
      </form>
    </section>
  )
}
