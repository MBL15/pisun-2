import { Lock, SearchX } from 'lucide-react'
import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { RoleType } from './api/types'
import { useAuth } from './auth/AuthContext'
import { Layout } from './components/Layout'
import { EmptyState, LinkButton, Spinner } from './components/ui'
import { AdminPage } from './pages/AdminPage'
import { EventFormPage } from './pages/EventFormPage'
import { EventPage } from './pages/EventPage'
import { FeedPage } from './pages/FeedPage'
import { LandingPage } from './pages/LandingPage'
import { MapPage } from './pages/MapPage'
import { LoginPage } from './pages/LoginPage'
import { MyOrganizationPage, OrganizationPage, OrganizationsPage } from './pages/OrganizationPages'
import { CabinetPage, ProfilePage } from './pages/ProfilePages'

function RequireRole({ roles, children }: { roles?: RoleType[]; children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (roles && !roles.includes(user.role))
    return <EmptyState icon={<Lock className="size-8" aria-hidden />} title="Раздел недоступен для вашей роли" text="Переключитесь на подходящий демо-аккаунт в правом верхнем углу." action={<LinkButton to="/feed">К афише</LinkButton>} />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<LandingPage />} />
        <Route path="feed" element={<FeedPage />} />
        <Route path="map" element={<MapPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="events/new" element={<RequireRole roles={['USER', 'ORGANIZATION']}><EventFormPage /></RequireRole>} />
        <Route path="events/:id" element={<EventPage />} />
        <Route path="events/:id/edit" element={<RequireRole roles={['USER', 'ORGANIZATION']}><EventFormPage /></RequireRole>} />
        <Route path="organizations" element={<OrganizationsPage />} />
        <Route path="organizations/:id" element={<OrganizationPage />} />
        <Route path="my-organization" element={<RequireRole roles={['ORGANIZATION']}><MyOrganizationPage /></RequireRole>} />
        <Route path="users/:id" element={<ProfilePage />} />
        <Route path="me" element={<RequireRole roles={['USER', 'CHILD']}><CabinetPage /></RequireRole>} />
        <Route path="admin" element={<RequireRole roles={['ADMIN']}><AdminPage /></RequireRole>} />
        <Route path="*" element={<EmptyState icon={<SearchX className="size-8" aria-hidden />} title="Страница не найдена" action={<LinkButton to="/feed">К афише</LinkButton>} />} />
      </Route>
    </Routes>
  )
}
