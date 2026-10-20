import { useEffect, useState } from 'react'

const STORAGE_KEY = 'sportvmeste.theme'

export type ThemeMode = 'light' | 'dark'

function systemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function readStoredTheme(): ThemeMode {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark') return saved
  return systemPrefersDark() ? 'dark' : 'light'
}

/** Вызывается из main.tsx до первого рендера, чтобы не мигала светлая тема. */
export function initTheme() {
  document.documentElement.classList.toggle('dark', readStoredTheme() === 'dark')
}

function applyTheme(mode: ThemeMode) {
  document.documentElement.classList.toggle('dark', mode === 'dark')
  localStorage.setItem(STORAGE_KEY, mode)
}

export function useTheme(): [ThemeMode, () => void] {
  const [mode, setMode] = useState<ThemeMode>(() => readStoredTheme())

  useEffect(() => {
    applyTheme(mode)
  }, [mode])

  return [mode, () => setMode((current) => (current === 'dark' ? 'light' : 'dark'))]
}
