import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react'

interface AsyncState<T> {
  data: T | undefined
  error: Error | null
  loading: boolean
  reload: () => Promise<void>
  setData: (value: T) => void
}

/** Загружает данные при монтировании и при изменении deps; reload() — повторная загрузка без мигания. */
export function useAsync<T>(loader: () => Promise<T>, deps: DependencyList): AsyncState<T> {
  const [data, setData] = useState<T>()
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)
  const loaderRef = useRef(loader)
  loaderRef.current = loader
  const requestId = useRef(0)

  const run = useCallback(async (silent: boolean) => {
    const id = ++requestId.current
    if (!silent) setLoading(true)
    try {
      const result = await loaderRef.current()
      if (id === requestId.current) {
        setData(result)
        setError(null)
      }
    } catch (e) {
      if (id === requestId.current) setError(e as Error)
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void run(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  const reload = useCallback(() => run(true), [run])

  return { data, error, loading, reload, setData }
}
