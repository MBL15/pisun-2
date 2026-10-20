import { useEffect, useState } from 'react'

/** Совпадает с breakpoint `lg` в Tailwind (1024px). */
export function useMobileLayout() {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 1023px)').matches : false,
  )

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const update = () => setMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return mobile
}
