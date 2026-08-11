import Dexie, { type EntityTable } from 'dexie'
import type { Animal, AnimalFormData } from '../types'

export interface AnimalDraft { id: string; payload: AnimalFormData | unknown; updatedAt: string }
export interface SyncQueueItem {
  id: string
  kind: 'animal-draft' | 'move' | 'weight' | 'treatment' | 'birth' | 'note'
  endpoint: string
  method: 'POST' | 'PUT'
  payload: unknown
  status: 'Pendiente' | 'Sincronizando' | 'Sincronizada' | 'Conflicto' | 'Error'
  attempts: number
  error?: string
  createdAt: string
}

export class BovItzáOfflineDb extends Dexie {
  animals!: EntityTable<Animal, 'id'>
  drafts!: EntityTable<AnimalDraft, 'id'>
  queue!: EntityTable<SyncQueueItem, 'id'>

  constructor() {
    super('bovitza-offline')
    this.version(1).stores({ animals: 'id,codigoAnimal,propietarioActualId,potreroId', drafts: 'id,updatedAt', queue: 'id,status,createdAt' })
  }
}

export const offlineDb = new BovItzáOfflineDb()

export async function enqueue(item: Omit<SyncQueueItem, 'id' | 'status' | 'attempts' | 'createdAt'>): Promise<string> {
  const id = crypto.randomUUID()
  await offlineDb.queue.add({ ...item, id, status: 'Pendiente', attempts: 0, createdAt: new Date().toISOString() })
  return id
}
