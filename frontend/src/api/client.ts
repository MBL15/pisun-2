import type { RoleType } from './types'

const configuredApi = import.meta.env.VITE_API_URL as string | undefined
/**
 * По умолчанию запросы идут на тот же origin: в dev-режиме /api проксирует Vite
 * (vite.config.ts), в Docker — nginx. Так сборка работает и с телефона по адресу
 * компьютера; прямой адрес шлюза можно задать через VITE_API_URL.
 */
export const API_URL =
  configuredApi === undefined || configuredApi === null || configuredApi === ''
    ? ''
    : configuredApi.replace(/\/$/, '')

export class ApiError extends Error {
  status: number
  code: string
  fields?: Record<string, string>

  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message)
    this.status = status
    this.code = code
    this.fields = fields
  }
}

interface Session {
  id: number
  role: RoleType
}

let session: Session | null = null

/** Имитация авторизации: каждый запрос несёт id и роль выбранного демо-аккаунта. */
export function setSession(next: Session | null) {
  session = next
}

function headers(extra?: HeadersInit): Headers {
  const result = new Headers(extra)
  if (session) {
    result.set('X-User-Id', String(session.id))
    result.set('X-User-Role', session.role)
  }
  return result
}

export function buildQuery(params: object): string {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  })
  const query = search.toString()
  return query ? `?${query}` : ''
}

async function parseError(response: Response): Promise<ApiError> {
  try {
    const body = await response.json()
    return new ApiError(response.status, body.code ?? 'ERROR', body.message ?? response.statusText, body.fields)
  } catch {
    const fallback =
      response.status === 503 || response.status === 502
        ? 'Сервис временно недоступен. Проверьте, что бэкенд запущен, и повторите попытку.'
        : `Ошибка ${response.status}`
    return new ApiError(response.status, 'ERROR', fallback)
  }
}

const REQUEST_TIMEOUT_MS = 12_000

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isForm = init.body instanceof FormData
  const finalHeaders = headers(init.headers)
  if (init.body && !isForm && !finalHeaders.has('Content-Type')) {
    finalHeaders.set('Content-Type', 'application/json')
  }
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers: finalHeaders, signal })
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === 'TimeoutError'
    throw new ApiError(
      0,
      'NETWORK',
      timedOut
        ? 'Сервер не ответил вовремя. Запустите бэкенд (`.\\start.ps1` или api-gateway на порту 8080) и обновите страницу.'
        : 'Нет связи с сервером. Запустите бэкенд (api-gateway на порту 8080) и обновите страницу.',
    )
  }
  if (!response.ok) throw await parseError(response)
  if (response.status === 204) return undefined as T
  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, form: FormData) => request<T>(path, { method: 'POST', body: form }),
}
