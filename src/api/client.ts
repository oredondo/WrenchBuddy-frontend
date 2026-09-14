export type ApiError = {
  status: number
  message: string
  details?: unknown
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || ''


function absoluteUrl(path: string): string {
  return path.startsWith('http') ? path : `${API_BASE}${path}`
}

let csrfInit: Promise<void> | null = null

async function ensureCsrfCookie(): Promise<void> {
  // Fuerza a que el backend setee la cookie csrftoken (requiere endpoint GET /api/csrf/)
  if (getCookie('csrftoken')) return
  if (!csrfInit) {
    csrfInit = fetch(absoluteUrl('/api/csrf/'), {
      method: 'GET',
      credentials: 'include',
    })
      .then(() => undefined)
      .catch(() => undefined)
  }
  await csrfInit
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^|; )' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[2]) : null
}

function csrfHeader(): Record<string, string> {
  const csrf = getCookie('csrftoken')
  return csrf ? { 'X-CSRFToken': csrf } : {}
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = absoluteUrl(path)

  const method = (options.method || 'GET').toUpperCase()
  const isUnsafe = !['GET', 'HEAD', 'OPTIONS'].includes(method)

  if (isUnsafe && !getCookie('csrftoken')) {
    await ensureCsrfCookie()
  }

  const headers: HeadersInit = {
    ...(options.headers || {}),
    ...(isUnsafe ? csrfHeader() : {}),
  }

  // Cuando mandamos JSON, ponemos content-type automáticamente
  if (options.body && !(headers as any)['Content-Type'] && !(options.body instanceof FormData)) {
    ;(headers as any)['Content-Type'] = 'application/json'
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // necesario para sesión de Django
  })

  const contentType = res.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')

  const payload = isJson ? await res.json().catch(() => null) : await res.text().catch(() => '')

  if (!res.ok) {
    let message = 'Error'
    if (payload && typeof payload === 'object') {
      if ('detail' in payload && payload.detail) {
        message = String(payload.detail)
      } else {
        const parts: string[] = []
        for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
          if (Array.isArray(value)) {
            parts.push(`${key}: ${value.join(', ')}`)
          } else if (typeof value === 'string') {
            parts.push(`${key}: ${value}`)
          }
        }
        if (parts.length > 0) {
          message = parts.join(' | ')
        } else {
          message = res.statusText || 'Error'
        }
      }
    } else {
      message = res.statusText || 'Error'
    }

    const err: ApiError = { status: res.status, message, details: payload }
    throw err
  }

  return payload as T
}
