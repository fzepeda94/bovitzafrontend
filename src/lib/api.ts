import type { AuthResponse } from '../types'
import { notify, requestConfirmation } from './feedback'

const baseUrl = import.meta.env.VITE_API_URL ?? '/api/v1'
const authKey = 'bovitza.auth'

export class ApiError extends Error {
  constructor(public readonly status: number, message: string, public readonly details?: unknown) {
    super(message)
  }
}

export function getStoredAuth(): AuthResponse | null {
  try { return JSON.parse(localStorage.getItem(authKey) ?? 'null') as AuthResponse | null } catch { return null }
}

export function storeAuth(auth: AuthResponse | null): void {
  if (auth) localStorage.setItem(authKey, JSON.stringify(auth))
  else localStorage.removeItem(authKey)
}

async function refreshSession(auth: AuthResponse): Promise<AuthResponse | null> {
  const response = await fetch(`${baseUrl}/auth/refresh`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: auth.refreshToken })
  })
  if (!response.ok) { storeAuth(null); return null }
  const updated = await response.json() as AuthResponse
  storeAuth(updated)
  return updated
}

function isMutation(method: string): boolean {
  return method !== 'GET' && method !== 'HEAD'
}

function shouldNotify(path: string): boolean {
  return path !== '/auth/refresh' && path !== '/auth/revoke'
}

function resourceName(path: string): string {
  if (path.includes('/entidades/')) return 'la entidad'
  if (path.includes('/fincas/')) return 'la finca'
  if (path.includes('/usuarios/')) return 'el usuario'
  if (path.includes('/roles/')) return 'el rol'
  if (path.includes('/permisos/')) return 'el permiso'
  if (path.includes('/pesajes/') || path.includes('/salud/')) return 'el registro del historial'
  if (path.includes('/catalogos/')) return 'el valor del catálogo'
  return 'el registro'
}

function successNotice(method: string, path: string): { title: string; message: string } {
  if (path === '/auth/login') return { title: 'Sesión iniciada', message: 'Bienvenido nuevamente a BovItzá.' }
  if (path.includes('/reactivar')) return { title: 'Registro reactivado', message: 'La información vuelve a estar disponible en el sistema.' }
  if (method === 'DELETE') return { title: 'Registro desactivado', message: 'La baja lógica se realizó correctamente y el historial se conserva.' }
  if (method === 'PUT' || method === 'PATCH') return { title: 'Cambios guardados', message: 'La información fue actualizada correctamente.' }
  return { title: 'Registro creado', message: 'La información fue guardada correctamente.' }
}

function errorTitle(method: string, path: string): string {
  if (path === '/auth/login') return 'No se pudo iniciar sesión'
  if (method === 'DELETE') return 'No se pudo desactivar'
  if (method === 'PUT' || method === 'PATCH') return 'No se pudieron guardar los cambios'
  return 'No se pudo crear el registro'
}

export async function api<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase()
  const mutation = isMutation(method)
  if (method === 'DELETE' && retry) {
    const accepted = await requestConfirmation({
      title: 'Confirmar desactivación',
      message: `¿Está seguro de que desea desactivar ${resourceName(path)}? No se eliminará físicamente y su historial permanecerá disponible.`,
      confirmLabel: 'Sí, desactivar',
      cancelLabel: 'Cancelar',
    })
    if (!accepted) return undefined as T
  }
  const auth = getStoredAuth()
  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json')
  if (auth) {
    headers.set('Authorization', `Bearer ${auth.accessToken}`)
    headers.set('X-Tenant-Id', auth.tenantId)
  }
  let response: Response
  try {
    response = await fetch(`${baseUrl}${path}`, { ...init, headers })
  } catch (error) {
    if (mutation && shouldNotify(path)) notify({ tone: 'error', title: 'No se pudo completar', message: error instanceof Error ? error.message : 'Revise su conexión e inténtelo nuevamente.' })
    throw error
  }
  if (response.status === 401 && retry && auth && await refreshSession(auth)) return api<T>(path, init, false)
  if (!response.ok) {
    const details = await response.json().catch(() => null) as { detail?: string; title?: string } | null
    const message = details?.detail ?? details?.title ?? 'No fue posible completar la operación.'
    if (mutation && shouldNotify(path)) notify({ tone: 'error', title: errorTitle(method, path), message })
    throw new ApiError(response.status, message, details)
  }
  if (mutation && shouldNotify(path)) notify({ tone: 'success', ...successNotice(method, path) })
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export { baseUrl }
