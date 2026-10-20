import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type Tone = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  tone: Tone
  title: string
  text?: string
}

interface ToastContextValue {
  notify: (tone: Tone, title: string, text?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const toneStyles: Record<Tone, string> = {
  success: 'bg-pop-green',
  error: 'bg-pop-red',
  info: 'bg-pop-blue',
}

const toneIcons: Record<Tone, ReactNode> = {
  success: <CheckCircle2 className="size-6 shrink-0" aria-hidden />,
  error: <TriangleAlert className="size-6 shrink-0" aria-hidden />,
  info: <Info className="size-6 shrink-0" aria-hidden />,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: number) => setItems((list) => list.filter((item) => item.id !== id)), [])

  const notify = useCallback(
    (tone: Tone, title: string, text?: string) => {
      const id = Date.now() + Math.random()
      setItems((list) => [...list.slice(-3), { id, tone, title, text }])
      setTimeout(() => dismiss(id), tone === 'error' ? 8000 : 5000)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ notify }), [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--mobile-nav-h)+0.75rem)] z-[100] flex flex-col items-center gap-3 px-4 lg:bottom-6 lg:items-end"
        aria-live="polite"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role={item.tone === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border-[3px] border-ink p-4 text-ink shadow-lg ${toneStyles[item.tone]}`}
          >
            {toneIcons[item.tone]}
            <div className="min-w-0 flex-1">
              <p className="font-bold">{item.title}</p>
              {item.text && <p className="mt-1 text-sm font-medium">{item.text}</p>}
            </div>
            <button onClick={() => dismiss(item.id)} className="rounded-md border-2 border-ink bg-white p-1 hover:bg-pop-yellow" aria-label="Закрыть">
              <X className="size-5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}
