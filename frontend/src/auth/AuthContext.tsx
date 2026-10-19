import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { setSession } from '../api/client'
import { usersApi } from '../api/endpoints'
import type { User } from '../api/types'
import { organizationLoginBlocked } from '../lib/auth'

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
          .then((user) => (organizationLoginBlocked(user) ? apply(null) : apply(user)))
          .catch(() => apply(null))
      : Promise.resolve()
    Promise.all([restore, reloadAccounts()]).finally(() => setLoading(false))
  }, [apply, reloadAccounts])

  const loginById = useCallback(
    async (id: number) => {
      const next = await usersApi.get(id)
      const blocked = organizationLoginBlocked(next)
      if (blocked) {
        throw new Error(blocked)
      }
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
