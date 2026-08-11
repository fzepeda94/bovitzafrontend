import { useState } from 'react'
import {
  DndContext,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  GripVertical,
  MoveRight,
  Target,
  X,
} from 'lucide-react'

import { api } from '../lib/api'
import type {
  Animal,
  Farm,
  PagedResult,
  Pasture,
} from '../types'
import {
  Badge,
  Button,
  Card,
  Input,
} from '../components/ui'
import { PageHeader } from '../components/Page'

type FarmWithStatus = Farm & {
  activo?: boolean
}

type PastureWithStatus = Pasture & {
  activo?: boolean
  destinoProductivo?: string | null
}

interface PendingMove {
  animal: Animal
  pasture: PastureWithStatus
}

function obtenerEtiquetaEstado(
  estado: string,
) {
  return estado === 'NoDisponible'
    ? 'No disponible'
    : estado
}

export function MapaPotrerosPagina() {
  const client = useQueryClient()

  const [
    pending,
    setPending,
  ] = useState<PendingMove | null>(
    null,
  )

  const [error, setError] =
    useState('')

  const animals = useQuery({
    queryKey: ['animals-map'],

    queryFn: () =>
      api<PagedResult<Animal>>(
        '/animales?page=1&pageSize=1000',
      ),
  })

  const pastures = useQuery({
    queryKey: ['pastures-map'],

    queryFn: () => {
      const params =
        new URLSearchParams({
          page: '1',
          pageSize: '1000',
          search: '',
          incluirInactivos: 'false',
        })

      return api<
        PagedResult<PastureWithStatus>
      >(
        `/potreros?${params.toString()}`,
      )
    },
  })

  const farms = useQuery({
    queryKey: ['farms-map'],

    queryFn: () => {
      const params =
        new URLSearchParams({
          page: '1',
          pageSize: '1000',
          search: '',
          incluirInactivos: 'false',
        })

      return api<
        PagedResult<FarmWithStatus>
      >(
        `/fincas?${params.toString()}`,
      )
    },
  })

  const animalItems =
    animals.data?.items ?? []

  const pastureItems =
    pastures.data?.items ?? []

  const farmItems =
    farms.data?.items ?? []

  const unassigned =
    animalItems.filter(
      animal => !animal.potreroId,
    )

  const end = (
    event: DragEndEvent,
  ) => {
    const animal =
      animalItems.find(
        item =>
          item.id ===
          String(event.active.id),
      )

    const pasture =
      pastureItems.find(
        item =>
          item.id ===
          String(event.over?.id),
      )

    if (
      animal &&
      pasture &&
      animal.potreroId !==
        pasture.id
    ) {
      setError('')

      setPending({
        animal,
        pasture,
      })
    }
  }

  const confirmMove = async (
    date: string,
    reason: string,
    notes: string,
  ) => {
    if (!pending) {
      return
    }

    try {
      const observaciones = [
        reason.trim(),
        notes.trim(),
      ]
        .filter(Boolean)
        .join(' · ')

      await api(
        `/animales/${pending.animal.id}/movimientos`,
        {
          method: 'POST',

          body: JSON.stringify({
            fincaId:
              pending.pasture
                .fincaId,

            potreroId:
              pending.pasture.id,

            fecha: date,

            motivoMovimientoId:
              null,

            responsableId: null,

            observaciones:
              observaciones ||
              null,

            movimientoGrupalId:
              null,
          }),
        },
      )

      setPending(null)
      setError('')

      await client.invalidateQueries(
        {
          queryKey: [
            'animals-map',
          ],
        },
      )

      await client.invalidateQueries(
        {
          queryKey: [
            'animals',
          ],
        },
      )
    } catch (moveError) {
      setError(
        moveError instanceof Error
          ? moveError.message
          : 'No se pudo mover el animal.',
      )
    }
  }

  const isLoading =
    animals.isLoading ||
    pastures.isLoading ||
    farms.isLoading

  const queryError =
    animals.error ||
    pastures.error ||
    farms.error

  return (
    <>
      <PageHeader
        eyebrow="Operación ganadera"
        title="Mapa de potreros"
        description="Visualiza la distribución de los animales, el destino productivo de cada potrero y realiza movimientos mediante arrastrar y soltar."
      />

      {isLoading && (
        <Card>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Cargando mapa de
            potreros…
          </p>
        </Card>
      )}

      {!isLoading &&
        queryError && (
          <Card>
            <p className="text-sm text-red-700 dark:text-red-300">
              {queryError instanceof
              Error
                ? queryError.message
                : 'No fue posible cargar el mapa de potreros.'}
            </p>
          </Card>
        )}

      {!isLoading &&
        !queryError &&
        pastureItems.length ===
          0 && (
          <Card>
            <div className="py-8 text-center">
              <h2 className="font-display text-lg font-bold">
                Mapa no disponible
              </h2>

              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Crea una finca y un
                potrero para activar
                el mapa.
              </p>
            </div>
          </Card>
        )}

      {!isLoading &&
        !queryError &&
        pastureItems.length >
          0 && (
          <DndContext
            onDragEnd={end}
          >
            <div className="grid gap-5">
              <Card>
                <div className="mb-4">
                  <h2 className="font-display text-lg font-bold">
                    Sin ubicación
                    asignada
                  </h2>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {
                      unassigned.length
                    }{' '}
                    animal
                    {unassigned.length ===
                    1
                      ? ''
                      : 'es'}{' '}
                    sin potrero
                  </p>
                </div>

                {unassigned.length >
                0 ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {unassigned.map(
                      animal => (
                        <AnimalCard
                          key={
                            animal.id
                          }
                          animal={
                            animal
                          }
                        />
                      ),
                    )}
                  </div>
                ) : (
                  <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    Todos los animales
                    tienen una ubicación
                    asignada.
                  </p>
                )}
              </Card>

              {farmItems.map(
                farm => {
                  const farmPastures =
                    pastureItems.filter(
                      pasture =>
                        pasture.fincaId ===
                        farm.id,
                    )

                  if (
                    farmPastures.length ===
                    0
                  ) {
                    return null
                  }

                  return (
                    <Card
                      key={farm.id}
                    >
                      <div className="mb-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-pine-600 dark:text-pine-300">
                          Finca{' '}
                          {farm.codigo}
                        </p>

                        <h2 className="mt-1 font-display text-xl font-bold">
                          {farm.nombre}
                        </h2>

                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {
                            farmPastures.length
                          }{' '}
                          potrero
                          {farmPastures.length ===
                          1
                            ? ''
                            : 's'}
                        </p>
                      </div>

                      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(270px,1fr))]">
                        {farmPastures.map(
                          pasture => (
                            <PastureColumn
                              key={
                                pasture.id
                              }
                              pasture={
                                pasture
                              }
                              farm={farm}
                              animals={animalItems.filter(
                                animal =>
                                  animal.potreroId ===
                                  pasture.id,
                              )}
                            />
                          ),
                        )}
                      </div>
                    </Card>
                  )
                },
              )}
            </div>
          </DndContext>
        )}

      {pending && (
        <MoveDialog
          pending={pending}
          farm={farmItems.find(
            farm =>
              farm.id ===
              pending.pasture
                .fincaId,
          )}
          error={error}
          onClose={() => {
            setPending(null)
            setError('')
          }}
          onConfirm={
            confirmMove
          }
        />
      )}
    </>
  )
}

function PastureColumn({
  pasture,
  farm,
  animals,
}: {
  pasture: PastureWithStatus
  farm: FarmWithStatus
  animals: Animal[]
}) {
  const {
    setNodeRef,
    isOver,
  } = useDroppable({
    id: pasture.id,
  })

  const overCapacity =
    Boolean(
      pasture.capacidadRecomendada,
    ) &&
    animals.length >
      Number(
        pasture.capacidadRecomendada,
      )

  const estado =
    String(pasture.estado)

  const destinoProductivo =
    pasture.destinoProductivo
      ?.trim() ?? ''

  const faltaDestino =
    estado === 'Disponible' &&
    !destinoProductivo

  const badgeTone =
    overCapacity
      ? 'danger'
      : estado === 'Disponible'
        ? 'success'
        : 'warning'

  return (
    <section
      ref={setNodeRef}
      className={`min-h-[360px] w-full min-w-0 rounded-2xl border p-3 transition ${
        isOver
          ? 'border-pine-500 bg-pine-50 ring-2 ring-pine-200 dark:bg-pine-950/30'
          : 'border-slate-200 bg-white/70 dark:border-slate-700 dark:bg-slate-900/70'
      }`}
    >
      <div className="mb-3 border-b border-slate-200 pb-3 dark:border-slate-700">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="break-words font-display font-bold">
              {pasture.codigo}
              {' · '}
              {pasture.nombre}
            </p>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {farm.nombre}
            </p>
          </div>

          <Badge tone={badgeTone}>
            {overCapacity
              ? 'Capacidad excedida'
              : obtenerEtiquetaEstado(
                  estado,
                )}
          </Badge>
        </div>

        {destinoProductivo && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 dark:border-emerald-900/70 dark:bg-emerald-950/30">
            <Target
              size={16}
              className="mt-0.5 shrink-0 text-emerald-700 dark:text-emerald-300"
            />

            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                {estado ===
                'Disponible'
                  ? 'Disponible para'
                  : 'Destino productivo'}
              </p>

              <p className="mt-0.5 break-words text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                {
                  destinoProductivo
                }
              </p>
            </div>
          </div>
        )}

        {faltaDestino && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-900/70 dark:bg-amber-950/30">
            <Target
              size={16}
              className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-300"
            />

            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                Destino pendiente
              </p>

              <p className="mt-0.5 text-sm text-amber-900 dark:text-amber-100">
                Sin destino productivo
                definido.
              </p>
            </div>
          </div>
        )}

        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          {animals.length}

          {pasture.capacidadRecomendada
            ? ` / ${pasture.capacidadRecomendada}`
            : ''}{' '}
          animal
          {animals.length === 1
            ? ''
            : 'es'}
        </p>
      </div>

      <div className="grid gap-3">
        {animals.map(animal => (
          <AnimalCard
            key={animal.id}
            animal={animal}
          />
        ))}

        {animals.length === 0 && (
          <div
            className={`grid min-h-28 place-items-center rounded-xl border border-dashed p-4 text-center text-sm ${
              isOver
                ? 'border-pine-500 text-pine-700 dark:text-pine-300'
                : 'border-slate-300 text-slate-400 dark:border-slate-700'
            }`}
          >
            Suelta aquí un animal
          </div>
        )}
      </div>
    </section>
  )
}

function AnimalCard({
  animal,
}: {
  animal: Animal
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: animal.id,
  })

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
  }

  const sexo =
    animal.sexo === 'Hembra'
      ? '♀'
      : animal.sexo === 'Macho'
        ? '♂'
        : '—'

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-950 ${
        isDragging
          ? 'z-50 opacity-60 shadow-xl'
          : ''
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="cursor-grab touch-none rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing dark:hover:bg-slate-800"
          {...listeners}
          {...attributes}
          aria-label={`Mover animal ${animal.codigoAnimal}`}
        >
          <GripVertical
            size={18}
          />
        </button>

        <div className="min-w-0 flex-1">
          <p className="break-words font-display font-bold">
            {animal.codigoAnimal}
          </p>

          <p className="mt-1 break-words text-xs text-slate-500 dark:text-slate-400">
            {animal.propietario ||
              'Sin propietario'}
          </p>

          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {animal.categoria ||
                'Sin categoría'}
            </span>

            <span className="text-lg font-semibold">
              {sexo}
            </span>
          </div>
        </div>
      </div>
    </article>
  )
}

function MoveDialog({
  pending,
  farm,
  error,
  onClose,
  onConfirm,
}: {
  pending: PendingMove
  farm: FarmWithStatus | undefined
  error: string
  onClose: () => void
  onConfirm: (
    date: string,
    reason: string,
    notes: string,
  ) => Promise<void>
}) {
  const [date, setDate] =
    useState(
      new Date()
        .toISOString()
        .slice(0, 16),
    )

  const [reason, setReason] =
    useState(
      'Cambio de potrero',
    )

  const [notes, setNotes] =
    useState('')

  const [saving, setSaving] =
    useState(false)

  const destinoProductivo =
    pending.pasture
      .destinoProductivo
      ?.trim() ?? ''

  const confirmar = async () => {
    if (
      !date ||
      !reason.trim()
    ) {
      return
    }

    setSaving(true)

    try {
      await onConfirm(
        date,
        reason,
        notes,
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm"
      onMouseDown={event => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose()
        }
      }}
    >
      <Card className="w-full max-w-lg !p-0">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-700">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-pine-600 dark:text-pine-300">
              Movimiento de animal
            </p>

            <h2 className="mt-1 font-display text-xl font-bold">
              Confirmar movimiento
            </h2>
          </div>

          <Button
            type="button"
            variant="ghost"
            className="!px-3"
            aria-label="Cerrar"
            onClick={onClose}
            disabled={saving}
          >
            <X size={18} />
          </Button>
        </div>

        <div className="grid gap-4 p-5">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Animal
              </p>

              <p className="break-words font-display font-bold">
                {
                  pending.animal
                    .codigoAnimal
                }
              </p>
            </div>

            <MoveRight
              className="shrink-0 text-pine-600"
              size={22}
            />

            <div className="min-w-0 flex-1 text-right">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Destino
              </p>

              <p className="break-words font-display font-bold">
                {farm?.codigo ??
                  'Finca'}
                {' / '}
                {
                  pending.pasture
                    .nombre
                }
              </p>
            </div>
          </div>

          <div
            className={`flex items-start gap-3 rounded-2xl border p-4 ${
              destinoProductivo
                ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/70 dark:bg-emerald-950/30'
                : 'border-amber-200 bg-amber-50 dark:border-amber-900/70 dark:bg-amber-950/30'
            }`}
          >
            <Target
              size={19}
              className={`mt-0.5 shrink-0 ${
                destinoProductivo
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-amber-700 dark:text-amber-300'
              }`}
            />

            <div className="min-w-0">
              <p
                className={`text-xs font-bold uppercase tracking-wider ${
                  destinoProductivo
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-amber-700 dark:text-amber-300'
                }`}
              >
                Disponible para
              </p>

              <p
                className={`mt-1 break-words text-sm font-semibold ${
                  destinoProductivo
                    ? 'text-emerald-900 dark:text-emerald-100'
                    : 'text-amber-900 dark:text-amber-100'
                }`}
              >
                {destinoProductivo ||
                  'Sin destino productivo definido'}
              </p>
            </div>
          </div>

          <Input
            label="Fecha y hora *"
            type="datetime-local"
            value={date}
            onChange={event =>
              setDate(
                event.target.value,
              )
            }
            required
          />

          <Input
            label="Motivo *"
            value={reason}
            onChange={event =>
              setReason(
                event.target.value,
              )
            }
            required
          />

          <Input
            label="Observaciones"
            value={notes}
            onChange={event =>
              setNotes(
                event.target.value,
              )
            }
          />

          {error && (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 p-5 dark:border-slate-700">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={() =>
              void confirmar()
            }
            disabled={
              saving ||
              !date ||
              !reason.trim()
            }
          >
            <MoveRight
              size={17}
            />

            {saving
              ? 'Moviendo…'
              : 'Confirmar movimiento'}
          </Button>
        </div>
      </Card>
    </div>
  )
}