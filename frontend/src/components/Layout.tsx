import {
  Building2,
  CalendarHeart,
  ChevronDown,
  LayoutDashboard,
  LogIn,
  LogOut,
  Map as MapIcon,
  PlusCircle,
  Search,
  Shield,
  Type,
  UserRound,
  Zap,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import type { User } from '../api/types'
import { homeFor, useAuth } from '../auth/AuthContext'
import { roleLabels } from '../lib/format'
import { Avatar } from './ui'

interface NavItem {
  to: string
  label: string
  icon: ReactNode
}

function navFor(user: User | null): NavItem[] {
  const feed = { to: '/', label: 'Афиша', icon: <Search className="size-5" /> }
  const map = { to: '/map', label: 'Карта', icon: <MapIcon className="size-5" /> }
  const orgs = { to: '/organizations', label: 'Клубы', icon: <Building2 className="size-5" /> }
  const create = { to: '/events/new', label: 'Создать', icon: <PlusCircle className="size-5" /> }
  const cabinet = { to: '/me', label: 'Кабинет', icon: <CalendarHeart className="size-5" /> }
  switch (user?.role) {
    case 'ADMIN':
      return [{ to: '/admin', label: 'Модерация', icon: <Shield className="size-5" /> }, feed, map, orgs]
    case 'CHILD':
      return [feed, map, { ...cabinet, label: 'Мои занятия' }]
    case 'ORGANIZATION':
      return [
        { to: '/my-organization', label: 'Моя организация', icon: <LayoutDashboard className="size-5" /> },
        feed,
        map,
        create,
      ]
    case 'USER':
      return [feed, map, orgs, create, cabinet]
    default:
      return [feed, map, orgs]
  }
}

const roleTone: Record<string, string> = {
  USER: 'bg-pop-blue',
  CHILD: 'bg-pop-green',
  ADMIN: 'bg-pop-red',
  ORGANIZATION: 'bg-pop-orange',
}

function RoleSwitcher() {
  const { user, demoAccounts, loginById, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const close = (event: MouseEvent) => ref.current && !ref.current.contains(event.target as Node) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const switchTo = async (id: number) => {
    setOpen(false)
    const next = await loginById(id)
    navigate(homeFor(next))
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-11 items-center gap-2 rounded-xl border-[3px] border-ink bg-white py-1 pl-1 pr-3 shadow-sm lift"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {user ? (
          <>
            <Avatar name={user.displayName} color={user.avatarColor} size="sm" />
            <span className="hidden text-left leading-tight sm:block">
              <span className="block max-w-40 truncate text-sm font-semibold">{user.displayName}</span>
              <span className="block text-xs font-medium text-slate-600">{user.demoLabel ?? roleLabels[user.role]}</span>
            </span>
          </>
        ) : (
          <>
            <span className="flex size-8 items-center justify-center rounded-full border-2 border-ink bg-pop-yellow">
              <UserRound className="size-5 text-ink" aria-hidden />
            </span>
            <span className="text-sm font-bold">Выбрать роль</span>
          </>
        )}
        <ChevronDown className={`size-4 text-ink transition ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 z-50 mt-3 w-80 overflow-hidden rounded-xl border-[3px] border-ink bg-white shadow-lg">
          <p className="border-b-[3px] border-ink bg-pop-yellow px-4 py-3 text-sm font-semibold text-ink">
            Быстрое переключение демо-аккаунтов. Все изменения сохраняются в базе.
          </p>
          <div className="max-h-96 overflow-y-auto py-1">
            {demoAccounts.map((account) => (
              <button
                key={account.id}
                role="menuitem"
                onClick={() => switchTo(account.id)}
                className={`flex w-full items-center gap-3 border-b-2 border-ink/10 px-4 py-2.5 text-left last:border-b-0 hover:bg-pop-yellow/40 ${account.id === user?.id ? 'bg-pop-blue/30' : ''}`}
              >
                <Avatar name={account.displayName} color={account.avatarColor} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{account.displayName}</span>
                  <span className={`mt-0.5 inline-block rounded border-2 border-ink px-1.5 text-xs font-bold text-ink ${roleTone[account.role]}`}>
                    {account.demoLabel ?? roleLabels[account.role]}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <div className="flex border-t-[3px] border-ink">
            <Link to="/login" onClick={() => setOpen(false)} className="flex flex-1 items-center justify-center gap-2 py-3 text-sm font-bold text-ink hover:bg-pop-yellow/40">
              <LogIn className="size-4" />
              Вход и регистрация
            </Link>
            {user && (
              <button
                onClick={() => {
                  setOpen(false)
                  logout()
                  navigate('/login')
                }}
                className="flex flex-1 items-center justify-center gap-2 border-l-[3px] border-ink py-3 text-sm font-bold text-ink hover:bg-pop-red/40"
              >
                <LogOut className="size-4" />
                Выйти
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function useLargeText(): [boolean, () => void] {
  const [large, setLarge] = useState(() => localStorage.getItem('sportvmeste.largeText') === '1')
  useEffect(() => {
    document.documentElement.classList.toggle('large-text', large)
    localStorage.setItem('sportvmeste.largeText', large ? '1' : '0')
  }, [large])
  return [large, () => setLarge((value) => !value)]
}

export function Layout() {
  const { user } = useAuth()
  const items = navFor(user)
  const [largeText, toggleLargeText] = useLargeText()
  const location = useLocation()

  useEffect(() => {
    // Не возвращать результат: в актуальном Chrome scrollTo отдаёт Promise, и React принимает его за очистку эффекта.
    window.scrollTo(0, 0)
  }, [location.pathname])

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex items-center gap-2 rounded-lg border-[3px] px-3 py-1.5 font-bold transition ${
      isActive ? 'border-ink bg-pop-yellow text-ink shadow-sm' : 'border-transparent text-ink hover:border-ink hover:bg-white'
    }`

  return (
    <div className="flex min-h-svh flex-col">
      <a href="#main" className="sr-only z-50 rounded-lg border-[3px] border-ink bg-pop-yellow px-4 py-2 font-bold focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        К содержимому
      </a>
      <header className="sticky top-0 z-40 border-b-[3px] border-ink bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link to={user ? homeFor(user) : '/'} className="group flex items-center gap-3" aria-label="СпортВместе — на главную">
            <span className="flex size-11 rotate-[-6deg] items-center justify-center rounded-xl border-[3px] border-ink bg-pop-yellow text-ink shadow-sm transition group-hover:rotate-0">
              <Zap className="size-6 fill-ink" aria-hidden />
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="block font-display text-lg font-black uppercase">СпортВместе</span>
              <span className="block text-xs font-semibold text-slate-600">находите компанию для спорта</span>
            </span>
          </Link>

          <nav className="ml-4 hidden items-center gap-1 lg:flex">
            {items.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} className={linkClass}>
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={toggleLargeText}
              className={`flex size-11 items-center justify-center rounded-lg border-[3px] border-ink transition ${largeText ? 'bg-ink text-white' : 'bg-white text-ink shadow-sm lift'}`}
              title="Крупный шрифт"
              aria-label="Крупный шрифт"
              aria-pressed={largeText}
            >
              <Type className="size-5" />
            </button>
            <RoleSwitcher />
          </div>
        </div>
      </header>

      <main id="main" key={user?.id ?? 'guest'} className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-4 pb-28 pt-8 sm:px-6 lg:pb-14">
        <Outlet />
      </main>

      <footer className="hidden border-t-[3px] border-ink bg-ink py-5 text-center text-sm font-medium text-white lg:block">
        <span className="font-display font-bold text-pop-yellow">СпортВместе</span> — прототип для кейса «Столото», финал ФСП · Вход имитируется
        демо-аккаунтами, бизнес-логика работает на реальной БД
      </footer>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid border-t-[3px] border-ink bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `mx-1 my-1.5 flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg border-[3px] py-1 text-xs font-bold ${
                isActive ? 'border-ink bg-pop-yellow text-ink' : 'border-transparent text-ink'
              }`
            }
          >
            {item.icon}
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
