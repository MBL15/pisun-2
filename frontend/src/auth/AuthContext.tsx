import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError, setSession } from '../api/client'
import { usersApi } from '../api/endpoints'
import type { User } from '../api/types'

const STORAGE_KEY = 'sportvmeste.userId'

interface AuthContextValue {
  user: User | null
  loading: boolean
  demoAccounts: User[]
  login: (user: User) => void
  loginById: (id: number) => Promise<User>
  logout: () => void
  refreshUser: () => Promise<void>
  reloadAccounts: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [demoAccounts, setDemoAccounts] = useState<User[]>([])

  const apply = useCallback((next: User | null) => {
    setSession(next ? { id: next.id, role: next.role } : null)
    setUser(next)
    if (next) localStorage.setItem(STORAGE_KEY, String(next.id))
    else localStorage.removeItem(STORAGE_KEY)
  }, [])

  const reloadAccounts = useCallback(async () => {
    try {
      setDemoAccounts(await usersApi.list(true))
    } catch {
      setDemoAccounts([])
    }
  }, [])

  useEffect(() => {
    const saved = Number(localStorage.getItem(STORAGE_KEY))
    const restore = saved
      ? usersApi
          .get(saved)
          .then((next) => {
            if (organizationEntryMessage(next)) {
              apply(null)
              return
            }
            apply(next)
          })
          .catch(() => apply(null))
      : Promise.resolve()
    Promise.all([restore, reloadAccounts()]).finally(() => setLoading(false))
  }, [apply, reloadAccounts])

  const loginById = useCallback(
    async (id: number) => {
      const next = await usersApi.get(id)
      const block = organizationEntryMessage(next)
      if (block) throw new ApiError(403, 'PENDING', block)
      apply(next)
      return next
    },
    [apply],
  )

  const refreshUser = useCallback(async () => {
    if (user) apply(await usersApi.get(user.id))
  }, [apply, user])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      demoAccounts,
      login: apply,
      loginById,
      logout: () => apply(null),
      refreshUser,
      reloadAccounts,
    }),
    [user, loading, demoAccounts, apply, loginById, refreshUser, reloadAccounts],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}

/** Организация в статусе PENDING не может войти, пока админ не одобрит заявку. */
export function organizationEntryMessage(user: User): string | null {
  if (user.role !== 'ORGANIZATION' || user.organizationStatus !== 'PENDING') return null
  return 'Организация пока не подтверждена. Дождитесь решения администратора — после одобрения вход откроется.'
}

/** Стартовая страница роли после входа. */
export function homeFor(user: User): string {
  switch (user.role) {
    case 'ADMIN':
      return '/admin'
    case 'ORGANIZATION':
      return '/my-organization'
    default:
      return '/'
  }
}
