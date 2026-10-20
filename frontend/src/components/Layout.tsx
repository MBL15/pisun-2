import {
  Building2,
  CalendarHeart,
  ChevronDown,
  LayoutDashboard,
  LogIn,
  LogOut,
  Moon,
  Map as MapIcon,
  Sun,
  PlusCircle,
  Search,
  Shield,
  Type,
  UserRound,
  Users,
  Zap,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import type { User } from '../api/types'
import { homeFor, useAuth } from '../auth/AuthContext'
import { roleLabels } from '../lib/format'
import { useTheme } from '../lib/theme'
import { Avatar } from './ui'

interface NavItem {
  to: string
  label: string
  /** Подпись в нижней навигации, если основная не помещается в ячейку. */
  short?: string
  icon: ReactNode
}

function navFor(user: User | null): NavItem[] {
  const feed = { to: '/feed', label: 'Афиша', icon: <Search className="size-5" /> }
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
        { to: '/my-organization', label: 'Моя организация', short: 'Мой клуб', icon: <LayoutDashboard className="size-5" /> },
        feed,
        map,
        { to: '/people', label: 'Люди', icon: <Users className="size-5" /> },
        create,
      ]
    case 'USER':
      return [feed, map, { to: '/people', label: 'Люди', icon: <Users className="size-5" /> }, orgs, create, cabinet]
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
        className="flex min-h-11 items-center gap-2 rounded-xl border-[3px] border-ink bg-surface py-1 pl-1 pr-3 shadow-sm lift"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={user ? `${user.displayName}, ${roleLabels[user.role]}` : 'Выбрать роль'}
      >
        {user ? (
          <>
            <Avatar name={user.displayName} color={user.avatarColor} size="sm" />
            <span className="hidden text-left leading-tight sm:block">
              <span className="block max-w-40 truncate text-sm font-semibold">{user.displayName}</span>
              <span className="block text-xs font-medium text-muted">{roleLabels[user.role]}</span>
            </span>
          </>
        ) : (
          <>
            <span className="flex size-8 items-center justify-center rounded-full border-2 border-ink bg-pop-yellow">
              <UserRound className="size-5 text-ink" aria-hidden />
            </span>
            <span className="hidden whitespace-nowrap text-sm font-bold min-[375px]:inline">Выбрать роль</span>
          </>
        )}
        <ChevronDown className={`size-4 text-ink transition ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-3 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-xl border-y-[3px] border-l-[3px] border-r-2 border-solid border-ink bg-surface shadow-sm"
        >
          {user && (
            <Link
              to={`/users/${user.id}`}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 border-b-[3px] border-ink px-4 py-3 hover:bg-pop-blue/30"
            >
              <Avatar name={user.displayName} color={user.avatarColor} size="sm" />
              <span className="min-w-0 text-left">
                <span className="block font-bold">Мой профиль</span>
                <span className="block text-xs font-medium text-muted">Как вас видят другие участники</span>
              </span>
            </Link>
          )}
          <p className="border-b-2 border-ink/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted">Сменить аккаунт</p>
          <div className="max-h-[min(24rem,calc(100svh-17rem))] overflow-y-auto overscroll-contain py-1">
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
                    {roleLabels[account.role]}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <div className="flex border-t-[3px] border-ink">
            <Link
              to="/login"
              onClick={() => setOpen(false)}
              className="flex min-w-0 flex-1 items-center justify-center gap-2 px-3 py-3.5 text-sm font-bold leading-tight text-white hover:bg-pop-yellow/40 hover:text-[#111111]"
            >
              <LogIn className="size-4 shrink-0" aria-hidden />
              <span className="text-center whitespace-nowrap">Вход</span>
            </Link>
            {user && (
              <button
                onClick={() => {
                  setOpen(false)
                  logout()
                  navigate('/login')
                }}
                className="flex flex-1 items-center justify-center gap-2 border-l-[3px] border-ink px-3 py-3.5 text-sm font-bold text-white hover:bg-pop-red/40"
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
  const [theme, toggleTheme] = useTheme()
  const location = useLocation()
  const isLanding = location.pathname === '/'

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex items-center gap-2 rounded-lg border-[3px] px-3 py-1.5 font-bold transition ${
      isActive ? 'border-ink bg-pop-yellow text-ink shadow-sm' : 'border-transparent text-ink hover:border-ink hover:bg-surface'
    }`

  return (
    <div className="flex min-h-svh flex-col">
      <a href="#main" className="sr-only z-50 rounded-lg border-[3px] border-ink bg-pop-yellow px-4 py-2 font-bold focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        К содержимому
      </a>
      <header className="sticky top-0 z-40 border-b-[3px] border-ink bg-surface">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2.5 sm:gap-4 sm:px-6 sm:py-3">
          <Link to={user ? homeFor(user) : '/'} className="group flex items-center gap-3" aria-label="СпортВместе — на главную">
            <span className="flex size-11 rotate-[-6deg] items-center justify-center rounded-xl border-[3px] border-ink bg-pop-yellow text-ink shadow-sm transition group-hover:rotate-0">
              <Zap className="size-6 fill-ink" aria-hidden />
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="block font-display text-lg font-black uppercase">СпортВместе</span>
              <span className="block text-xs font-semibold text-muted">находите компанию для спорта</span>
            </span>
          </Link>

          <nav className="ml-4 hidden items-center gap-1 lg:flex">
            {items.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/feed'} className={linkClass}>
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="flex size-11 items-center justify-center rounded-lg border-[3px] border-ink bg-surface text-ink shadow-sm lift"
              title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
              aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
              aria-pressed={theme === 'dark'}
            >
              {theme === 'dark' ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
            </button>
            <button
              onClick={toggleLargeText}
              className={`flex size-11 items-center justify-center rounded-lg border-[3px] border-ink transition ${largeText ? 'bg-ink text-paper' : 'bg-surface text-ink shadow-sm lift'}`}
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

      <main
        id="main"
        key={user?.id ?? 'guest'}
        className={
          isLanding
            ? 'w-full min-w-0 flex-1 pb-[calc(var(--mobile-nav-h)+2rem)] lg:pb-14'
            : 'mx-auto w-full min-w-0 max-w-7xl flex-1 px-4 pb-[calc(var(--mobile-nav-h)+2rem)] pt-5 sm:px-6 sm:pt-8 lg:pb-14'
        }
      >
        <Outlet />
      </main>

      <footer className="hidden border-t-[3px] border-ink bg-[#111111] py-5 text-center text-sm font-medium text-[#fff4dc] lg:block">
        <span className="font-display font-bold text-pop-yellow">СпортВместе</span> — прототип для кейса «Столото», финал ФСП · Вход имитируется
        демо-аккаунтами, бизнес-логика работает на реальной БД
      </footer>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid border-t-[3px] border-ink bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/feed'}
            className={({ isActive }) =>
              `mx-0.5 my-1.5 flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg border-[3px] py-1 text-xs font-bold tracking-tight min-[360px]:mx-1 min-[360px]:tracking-normal ${
                isActive ? 'border-ink bg-pop-yellow text-ink' : 'border-transparent text-ink'
              }`
            }
          >
            {item.icon}
            <span className="max-w-full truncate min-[360px]:px-0.5">{item.short ?? item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
