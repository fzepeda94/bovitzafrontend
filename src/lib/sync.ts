import { api, ApiError } from './api'
import { offlineDb } from './offline'

let running = false

export async function runSync(): Promise<void> {
  if (running || !navigator.onLine) return
  running = true
  try {
    const pending = await offlineDb.queue.where('status').anyOf('Pendiente', 'Error').sortBy('createdAt')
    for (const item of pending) {
      await offlineDb.queue.update(item.id, { status: 'Sincronizando', attempts: item.attempts + 1 })
      try {
        await api<unknown>(item.endpoint, { method: item.method, body: JSON.stringify(item.payload), headers: { 'X-Idempotency-Key': item.id, 'X-BovItza-Origin': 'sincronizacion' } })
        await offlineDb.queue.update(item.id, { status: 'Sincronizada' })
      } catch (error) {
        const conflict = error instanceof ApiError && error.status === 409
        await offlineDb.queue.update(item.id, { status: conflict ? 'Conflicto' : 'Error', error: error instanceof Error ? error.message : 'Error desconocido' })
      }
    }
  } finally { running = false }
}
