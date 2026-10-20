import {
  Bot,
  Building2,
  CalendarHeart,
  ChevronRight,
  MapPin,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { LinkButton } from '../components/ui'

const steps = [
  {
    title: 'Найдите активность',
    text: 'Афиша с фильтрами по направлению, дате и записи — от пробежки до шахматного блица.',
    icon: Sparkles,
    tone: 'bg-pop-blue',
  },
  {
    title: 'Запишитесь или соберите своё',
    text: 'Свободная запись или заявка организатору. Клубы публикуют события после допуска администратора.',
    icon: CalendarHeart,
    tone: 'bg-pop-green',
  },
  {
    title: 'Приходите с компанией',
    text: 'Карта с метками, обсуждение у события и подсказки ИИ-модератора для безопасной среды.',
    icon: MapPin,
    tone: 'bg-pop-orange',
  },
] as const

const proofs = [
  { label: 'ИИ-проверка событий', icon: Bot },
  { label: 'Детский режим', icon: ShieldCheck },
  { label: 'Клубы и организации', icon: Building2 },
] as const

export function LandingPage() {
  const { user } = useAuth()

  return (
    <div className="pb-8">
      {/* Hero */}
      <section className="relative overflow-hidden border-b-[3px] border-[#111111] bg-pop-yellow px-4 py-14 text-[#111111] sm:px-6 sm:py-20 lg:py-24 dark:border-[#111111] dark:text-[#111111]">
        <div className="pointer-events-none absolute -right-16 top-8 size-48 rotate-12 rounded-2xl border-[3px] border-[#111111] bg-pop-blue shadow-lg sm:size-64" aria-hidden />
        <div className="pointer-events-none absolute -left-10 bottom-6 size-32 -rotate-6 rounded-full border-[3px] border-[#111111] bg-pop-pink shadow-md sm:size-40" aria-hidden />
        <div className="relative mx-auto max-w-5xl">
          <p className="card-glow inline-flex items-center gap-2 rounded-full border-[3px] border-[#111111] bg-white px-3 py-1 text-sm font-bold text-[#111111] shadow-sm dark:bg-white dark:text-[#111111]">
            <Zap className="size-4 text-[#111111]" aria-hidden />
            Россия - спортивная держава
          </p>
          <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.05] sm:text-6xl lg:text-7xl">
            Находите компанию для спорта рядом с домом
          </h1>
          <p className="mt-5 max-w-2xl text-lg font-medium leading-relaxed text-[#111111]/90 sm:text-xl dark:text-[#111111]/90">
            Дворовый футбол, пробежки, шахматы в парке — записывайтесь сами, ведите ребёнка или соберите своё мероприятие на карте.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <LinkButton to="/feed" size="lg" variant="primary" icon={<ChevronRight className="size-5" aria-hidden />}>
              Смотреть афишу
            </LinkButton>
            <LinkButton to={user ? '/feed' : '/login'} size="lg" variant="secondary">
              {user ? 'Продолжить как ' + user.displayName.split(' ')[0] : 'Войти или выбрать роль'}
            </LinkButton>
          </div>
        </div>
      </section>

      {/* Value strip */}
      <section className="border-b-[3px] border-ink bg-surface px-4 py-10 sm:px-6">
        <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {proofs.map(({ label, icon: Icon }) => (
            <div
              key={label}
              className="card-glow flex items-center gap-3 rounded-xl border-[3px] border-ink bg-paper px-4 py-3 shadow-sm"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border-2 border-ink bg-pop-yellow">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="text-sm font-bold leading-snug">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Steps */}
      <section className="px-4 py-14 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-black sm:text-4xl">Как это работает</h2>
          <p className="mt-2 max-w-2xl text-lg font-medium text-muted">Три шага от идеи до встречи на площадке или в парке.</p>
          <ul className="mt-8 grid gap-5 lg:grid-cols-3">
            {steps.map(({ title, text, icon: Icon, tone }, index) => (
              <li key={title} className="card card-glow flex flex-col gap-4 p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className={`flex size-12 items-center justify-center rounded-xl border-[3px] border-ink ${tone} shadow-sm`}>
                    <Icon className="size-6" aria-hidden />
                  </span>
                  <span className="font-display text-4xl font-black text-ink/25">{index + 1}</span>
                </div>
                <h3 className="text-xl font-bold">{title}</h3>
                <p className="flex-1 text-base font-medium leading-relaxed text-muted">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Bento highlight */}
      <section className="px-4 pb-14 sm:px-6 sm:pb-16">
        <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-5">
          <div className="card card-glow relative overflow-hidden p-6 lg:col-span-3 lg:p-8">
            <h2 className="text-2xl font-black sm:text-3xl">Карта с характером</h2>
            <p className="mt-3 max-w-lg text-base font-medium leading-relaxed text-muted">
              Метки в стиле платформы: клубы — оранжевые, пользователи — голубые, выбранное событие подсвечивается. Стройте маршрут в Яндекс Картах в один клик.
            </p>
            <Link to="/map" className="mt-6 inline-flex items-center gap-2 font-bold text-brand-600 underline-offset-4 hover:underline">
              Открыть карту
              <ChevronRight className="size-4" aria-hidden />
            </Link>
            <div
              className="pointer-events-none absolute -bottom-6 -right-6 hidden size-[110px] rounded-2xl border-[3px] border-ink bg-pop-lilac shadow-lg sm:block"
              aria-hidden
            />
          </div>
          <div className="card card-glow flex flex-col justify-between shadow-none bg-pop-green/30 p-6 lg:col-span-2">
            <div>
              <h2 className="text-xl font-black">Для семьи</h2>
              <p className="mt-2 text-sm font-medium leading-relaxed text-muted">
                Детский режим показывает только безопасные события. Родитель записывает ребёнка и получает согласие для печати.
              </p>
            </div>
            <LinkButton to="/login" variant="accent" size="md" className="neo-flat mt-6 w-full">
              Попробовать демо
            </LinkButton>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 sm:px-6">
        <div className="card card-glow mx-auto max-w-5xl px-6 py-10 text-center sm:py-12">
        <h2 className="font-display text-2xl font-black uppercase text-ink sm:text-4xl sm:tracking-wide">
          <span className="text-pop-yellow">Спорт</span>
          <wbr />
          Вместе
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-lg font-medium text-muted">Откройте афишу, выберите демо-аккаунт и пройдите сценарии кейса за несколько минут.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
          <LinkButton to="/feed" variant="accent" size="lg">
            Перейти к мероприятиям
          </LinkButton>
          <LinkButton to="/organizations" variant="secondary" size="lg">
            Каталог клубов
          </LinkButton>
        </div>
        </div>
      </section>
    </div>
  )
}
