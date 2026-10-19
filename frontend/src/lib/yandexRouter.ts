/** HTTP Router API — длина и время маршрута (отдельный ключ). */

const API_KEY = (import.meta.env.VITE_YANDEX_ROUTER_API_KEY as string | undefined)?.trim()

type RouteResponse = {
  route?: {
    legs?: Array<{
      status?: string
      steps?: Array<{ length?: number; duration?: number }>
    }>
  }
}

export function hasRouterKey(): boolean {
  return Boolean(API_KEY)
}

export type RouteSummary = { distanceM: number; durationS: number }

export async function fetchRouteSummary(
  fromLon: number,
  fromLat: number,
  toLon: number,
  toLat: number,
): Promise<RouteSummary | null> {
  if (!API_KEY) return null
  const url = new URL('https://api.routing.yandex.net/v2/route')
  url.searchParams.set('apikey', API_KEY)
  url.searchParams.set('waypoints', `${fromLat},${fromLon}|${toLat},${toLon}`)
  const response = await fetch(url)
  if (!response.ok) return null
  const body = (await response.json()) as RouteResponse
  const leg = body.route?.legs?.[0]
  if (!leg || leg.status !== 'OK') return null
  let distanceM = 0
  let durationS = 0
  for (const step of leg.steps ?? []) {
    distanceM += step.length ?? 0
    durationS += step.duration ?? 0
  }
  if (distanceM <= 0 && durationS <= 0) return null
  return { distanceM, durationS }
}

export function formatRouteSummary(summary: RouteSummary): string {
  const km = summary.distanceM / 1000
  const distance =
    km >= 10 ? `${Math.round(km)} км` : km >= 1 ? `${km.toFixed(1)} км` : `${Math.round(summary.distanceM)} м`
  const minutes = Math.max(1, Math.round(summary.durationS / 60))
  return `≈ ${minutes} мин, ${distance}`
}
