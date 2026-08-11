import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import {
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  Download,
  Pencil,
  Plus,
  Power,
  RotateCcw,
  Search,
  X,
} from 'lucide-react'

import { api } from '../lib/api'
import type {
  CatalogItem,
  Farm,
  PagedResult,
  Pasture,
} from '../types'
import {
  Button,
  Card,
  EmptyState,
  IconButton,
  Input,
  Pagination,
  Select,
} from '../components/ui'
import {
  ModalExportacion,
  type ColumnaExportacion,
} from '../components/ModalExportacion'
import { PageHeader } from '../components/Page'

type FarmWithStatus = Farm & {
  activo?: boolean
}

type PastureWithStatus = Pasture & {
  activo?: boolean
  destinoProductivo?: string | null
}

const PAGE_SIZE = 6
const EXPORT_PAGE_SIZE = 500

const estadosPotrero = [
  {
    valor: 'Disponible',
    etiqueta: 'Disponible',
  },
  {
    valor: 'Ocupado',
    etiqueta: 'Ocupado',
  },
  {
    valor: 'Descanso',
    etiqueta: 'Descanso',
  },
  {
    valor: 'Mantenimiento',
    etiqueta: 'Mantenimiento',
  },
  {
    valor: 'Cuarentena',
    etiqueta: 'Cuarentena',
  },
  {
    valor: 'NoDisponible',
    etiqueta: 'No disponible',
  },
] as const

function obtenerEtiquetaEstado(
  estado: string,
) {
  return (
    estadosPotrero.find(
      item =>
        item.valor === estado,
    )?.etiqueta ?? estado
  )
}

export function PasturesPage() {
  const [
    editing,
    setEditing,
  ] = useState<
    | PastureWithStatus
    | null
    | undefined
  >(undefined)

  const [search, setSearch] =
    useState('')

  const [
    fincaFiltroId,
    setFincaFiltroId,
  ] = useState('')

  const [
    incluirInactivos,
    setIncluirInactivos,
  ] = useState(false)

  const [page, setPage] =
    useState(1)

  const [
    estadoFormulario,
    setEstadoFormulario,
  ] = useState('Disponible')

  const [
    destinoSeleccionado,
    setDestinoSeleccionado,
  ] = useState('')

  const [
    tieneAguaFormulario,
    setTieneAguaFormulario,
  ] = useState(false)

  const [
    modalExportacionAbierto,
    setModalExportacionAbierto,
  ] = useState(false)

  const [
    preparandoExportacion,
    setPreparandoExportacion,
  ] = useState(false)

  const [
    datosExportacion,
    setDatosExportacion,
  ] = useState<
    PastureWithStatus[]
  >([])

  const client =
    useQueryClient()

  const farms = useQuery({
    queryKey: [
      'farms',
      'pastures-catalog',
    ],

    queryFn: () => {
      const params =
        new URLSearchParams({
          page: '1',
          pageSize: '1000',
          search: '',
          incluirInactivos:
            'true',
        })

      return api<
        PagedResult<FarmWithStatus>
      >(
        `/fincas?${params.toString()}`,
      )
    },
  })

  const units = useQuery({
    queryKey: [
      'catalog',
      'unidades-medida',
      'pastures-form',
    ],

    queryFn: () =>
      api<CatalogItem[]>(
        '/catalogos/unidades-medida',
      ),
  })

  /*
   * Esta consulta reemplaza completamente
   * el arreglo hardcoding anterior.
   */
  const destinations = useQuery({
    queryKey: [
      'catalog',
      'destinos-productivos',
      'pastures-form',
    ],

    queryFn: () =>
      api<CatalogItem[]>(
        '/catalogos/destinos-productivos',
      ),
  })

  const pastures = useQuery({
    queryKey: [
      'pastures-all',
      page,
      search.trim(),
      incluirInactivos,
      fincaFiltroId,
    ],

    queryFn: () => {
      const params =
        new URLSearchParams({
          page: String(page),

          pageSize:
            String(PAGE_SIZE),

          search:
            search.trim(),

          incluirInactivos:
            String(
              incluirInactivos,
            ),
        })

      if (fincaFiltroId) {
        params.set(
          'fincaId',
          fincaFiltroId,
        )
      }

      return api<
        PagedResult<PastureWithStatus>
      >(
        `/potreros?${params.toString()}`,
      )
    },
  })

  const farmItems =
    farms.data?.items ?? []

  const activeFarms =
    farmItems.filter(
      farm =>
        farm.activo !== false,
    )

  const pastureItems =
    pastures.data?.items ?? []

  const destinationItems =
    destinations.data ?? []

  const destinationNames =
    useMemo(
      () =>
        destinationItems.map(
          item => item.nombre,
        ),
      [destinationItems],
    )

  const totalItems =
    pastures.data?.total ?? 0

  const totalPages = Math.max(
    1,
    Math.ceil(
      totalItems / PAGE_SIZE,
    ),
  )

  const farmsById = useMemo(
    () =>
      new Map(
        farmItems.map(farm => [
          farm.id,
          `${farm.codigo} · ${farm.nombre}`,
        ]),
      ),
    [farmItems],
  )

  const farmNamesById = useMemo(
    () =>
      new Map(
        farmItems.map(farm => [
          farm.id,
          farm.nombre,
        ]),
      ),
    [farmItems],
  )

  const unitNames = useMemo(
    () =>
      (units.data ?? []).map(
        unit => unit.nombre,
      ),
    [units.data],
  )

  const obtenerFinca = (
    pasture: PastureWithStatus,
  ) => {
    return (
      farmsById.get(
        pasture.fincaId,
      ) ?? 'Finca no disponible'
    )
  }

  const columnasExportacion =
    useMemo<
      ColumnaExportacion<PastureWithStatus>[]
    >(
      () => [
        {
          id: 'codigo',
          titulo: 'Código',
          seleccionadaPorDefecto:
            true,
          obtenerValor: pasture =>
            pasture.codigo,
        },
        {
          id: 'nombre',
          titulo: 'Nombre',
          seleccionadaPorDefecto:
            true,
          obtenerValor: pasture =>
            pasture.nombre,
        },
        {
          id: 'finca',
          titulo: 'Finca',
          seleccionadaPorDefecto:
            true,
          obtenerValor: pasture =>
            farmsById.get(
              pasture.fincaId,
            ) ??
            'Finca no disponible',
        },
        {
          id: 'area',
          titulo: 'Área',
          seleccionadaPorDefecto:
            true,
          obtenerValor: pasture =>
            pasture.area ?? '',
        },
        {
          id: 'unidadArea',
          titulo:
            'Unidad de medida',
          seleccionadaPorDefecto:
            true,
          obtenerValor: pasture =>
            pasture.unidadArea ?? '',
        },
        {
          id: 'capacidad',
          titulo:
            'Capacidad recomendada',
          seleccionadaPorDefecto:
            true,
          obtenerValor: pasture =>
            pasture
              .capacidadRecomendada ??
            '',
        },
        {
          id: 'tipoPasto',
          titulo: 'Tipo de pasto',
          seleccionadaPorDefecto:
            false,
          obtenerValor: pasture =>
            pasture.tipoPasto ?? '',
        },
        {
          id: 'tieneAgua',
          titulo: 'Tiene agua',
          seleccionadaPorDefecto:
            true,
          obtenerValor: pasture =>
            pasture.tieneAgua
              ? 'Sí'
              : 'No',
        },
        {
          id: 'fuenteAgua',
          titulo:
            'Fuente de agua',
          seleccionadaPorDefecto:
            false,
          obtenerValor: pasture =>
            pasture.tipoFuenteAgua ??
            '',
        },
        {
          id: 'estadoPotrero',
          titulo:
            'Estado operativo',
          seleccionadaPorDefecto:
            true,
          obtenerValor: pasture =>
            obtenerEtiquetaEstado(
              String(
                pasture.estado,
              ),
            ),
        },
        {
          id: 'destinoProductivo',
          titulo:
            'Destino productivo',
          seleccionadaPorDefecto:
            true,
          obtenerValor: pasture =>
            pasture
              .destinoProductivo ??
            '',
        },
        {
          id: 'observaciones',
          titulo: 'Observaciones',
          seleccionadaPorDefecto:
            false,
          obtenerValor: pasture =>
            pasture.observaciones ??
            '',
        },
        {
          id: 'estadoRegistro',
          titulo:
            'Estado del registro',
          seleccionadaPorDefecto:
            true,
          obtenerValor: pasture =>
            pasture.activo !== false
              ? 'Activo'
              : 'Inactivo',
        },
      ],
      [farmsById],
    )

  const descripcionFiltros =
    useMemo(() => {
      const filters: string[] =
        []

      filters.push(
        search.trim()
          ? `Búsqueda: ${search.trim()}`
          : 'Búsqueda: todos los registros',
      )

      filters.push(
        fincaFiltroId
          ? `Finca: ${
              farmNamesById.get(
                fincaFiltroId,
              ) ??
              'Finca seleccionada'
            }`
          : 'Finca: todas',
      )

      filters.push(
        incluirInactivos
          ? 'Estado: activos e inactivos'
          : 'Estado: solamente activos',
      )

      return filters.join(' · ')
    }, [
      search,
      fincaFiltroId,
      incluirInactivos,
      farmNamesById,
    ])

  useEffect(() => {
    setPage(1)
  }, [
    search,
    fincaFiltroId,
    incluirInactivos,
  ])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [
    page,
    totalPages,
  ])

  const open = (
    pasture:
      | PastureWithStatus
      | null,
  ) => {
    setEditing(pasture)

    setEstadoFormulario(
      String(
        pasture?.estado ??
          'Disponible',
      ),
    )

    setDestinoSeleccionado(
      pasture?.destinoProductivo ??
        '',
    )

    setTieneAguaFormulario(
      pasture?.tieneAgua ??
        false,
    )
  }

  const cancelarEdicion = () => {
    setEditing(undefined)
    setEstadoFormulario(
      'Disponible',
    )
    setDestinoSeleccionado('')
    setTieneAguaFormulario(false)
  }

  const cambiarEstadoOperativo = (
    nuevoEstado: string,
  ) => {
    setEstadoFormulario(
      nuevoEstado,
    )

    if (
      nuevoEstado !==
      'Disponible'
    ) {
      setDestinoSeleccionado('')
    }
  }

  const submit = async (
    event:
      FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    const form =
      new FormData(
        event.currentTarget,
      )

    const fincaId = String(
      form.get('finca') || '',
    )

    const destinoProductivo =
      estadoFormulario ===
      'Disponible'
        ? destinoSeleccionado
            .trim() || null
        : null

    const payload = {
      fincaId,

      nombre: String(
        form.get('nombre') || '',
      ).trim(),

      area:
        form.get('area')
          ? Number(
              form.get('area'),
            )
          : null,

      unidadArea:
        form.get('unidadArea') ||
        null,

      capacidadRecomendada:
        form.get('capacidad')
          ? Number(
              form.get(
                'capacidad',
              ),
            )
          : null,

      tipoPasto:
        form.get('pasto') ||
        null,

      tieneAgua:
        tieneAguaFormulario,

      tipoFuenteAgua:
        tieneAguaFormulario
          ? form.get(
              'fuenteAgua',
            ) || null
          : null,

      estado:
        estadoFormulario,

      destinoProductivo,

      observaciones:
        form.get(
          'observaciones',
        ) || null,
    }

    try {
      await api(
        editing
          ? `/potreros/${editing.id}`
          : '/potreros',
        {
          method: editing
            ? 'PUT'
            : 'POST',

          body:
            JSON.stringify(
              payload,
            ),
        },
      )

      cancelarEdicion()

      await client
        .invalidateQueries({
          queryKey: [
            'pastures-all',
          ],
        })

      await client
        .invalidateQueries({
          queryKey: [
            'pastures-map',
          ],
        })
    } catch {
      // La notificación global presenta el error.
    }
  }

  const cambiarEstado = async (
    pasture: PastureWithStatus,
  ) => {
    const active =
      pasture.activo !== false

    try {
      await api(
        active
          ? `/potreros/${pasture.id}`
          : `/potreros/${pasture.id}/reactivar`,
        {
          method: active
            ? 'DELETE'
            : 'POST',
        },
      )

      if (
        editing?.id ===
        pasture.id
      ) {
        cancelarEdicion()
      }

      await client
        .invalidateQueries({
          queryKey: [
            'pastures-all',
          ],
        })

      await client
        .invalidateQueries({
          queryKey: [
            'pastures-map',
          ],
        })

      await client
        .invalidateQueries({
          queryKey: ['farms'],
        })
    } catch {
      // La notificación global presenta el error.
    }
  }

  const construirParametros = (
    pageNumber: number,
    pageSize: number,
  ) => {
    const params =
      new URLSearchParams({
        page: String(pageNumber),
        pageSize:
          String(pageSize),
        search: search.trim(),
        incluirInactivos:
          String(
            incluirInactivos,
          ),
      })

    if (fincaFiltroId) {
      params.set(
        'fincaId',
        fincaFiltroId,
      )
    }

    return params
  }

  const cargarTodosParaExportar =
    async () => {
      const firstResult =
        await api<
          PagedResult<PastureWithStatus>
        >(
          `/potreros?${construirParametros(
            1,
            EXPORT_PAGE_SIZE,
          ).toString()}`,
        )

      const pages = Math.max(
        1,
        Math.ceil(
          firstResult.total /
            EXPORT_PAGE_SIZE,
        ),
      )

      if (pages === 1) {
        return firstResult.items
      }

      const remainingResults =
        await Promise.all(
          Array.from(
            {
              length:
                pages - 1,
            },
            (_, index) =>
              api<
                PagedResult<PastureWithStatus>
              >(
                `/potreros?${construirParametros(
                  index + 2,
                  EXPORT_PAGE_SIZE,
                ).toString()}`,
              ),
          ),
        )

      return [
        ...firstResult.items,
        ...remainingResults.flatMap(
          result =>
            result.items,
        ),
      ]
    }

  const abrirModalExportacion =
    async () => {
      setPreparandoExportacion(
        true,
      )

      try {
        const allItems =
          await cargarTodosParaExportar()

        setDatosExportacion(
          allItems,
        )

        setModalExportacionAbierto(
          true,
        )
      } catch {
        // La notificación global presenta el error.
      } finally {
        setPreparandoExportacion(
          false,
        )
      }
    }

  return (
    <>
      <PageHeader
        eyebrow="Datos maestros"
        title="Potreros"
        description="Administra las áreas internas de cada finca, su capacidad, disponibilidad y el destino productivo configurado desde el catálogo."
        actions={
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={
                totalItems === 0 ||
                preparandoExportacion
              }
              onClick={() =>
                void abrirModalExportacion()
              }
            >
              <Download size={17} />

              {preparandoExportacion
                ? 'Preparando…'
                : 'Exportar'}
            </Button>

            <Button
              type="button"
              disabled={
                activeFarms.length ===
                0
              }
              onClick={() =>
                open(null)
              }
            >
              <Plus size={17} />
              Nuevo potrero
            </Button>
          </>
        }
      />

      <Card className="mb-5 !p-3">
        <div className="grid gap-3 lg:grid-cols-[1fr_280px_auto] lg:items-center">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-3 text-slate-400"
              size={18}
            />

            <Input
              aria-label="Buscar potreros"
              placeholder="Código, nombre, finca, destino, pasto o estado…"
              className="pl-10"
              value={search}
              onChange={event =>
                setSearch(
                  event.target.value,
                )
              }
            />
          </div>

          <Select
            aria-label="Filtrar por finca"
            value={fincaFiltroId}
            onChange={event =>
              setFincaFiltroId(
                event.target.value,
              )
            }
          >
            <option value="">
              Todas las fincas
            </option>

            {farmItems.map(
              farm => (
                <option
                  key={farm.id}
                  value={farm.id}
                >
                  {farm.codigo} ·{' '}
                  {farm.nombre}

                  {farm.activo ===
                  false
                    ? ' (Inactiva)'
                    : ''}
                </option>
              ),
            )}
          </Select>

          <label className="flex min-h-11 items-center gap-2 px-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={
                incluirInactivos
              }
              onChange={event =>
                setIncluirInactivos(
                  event.target
                    .checked,
                )
              }
              className="h-4 w-4 rounded border-slate-300 accent-emerald-700"
            />

            Mostrar inactivos
          </label>
        </div>
      </Card>

      {editing !== undefined && (
        <Card className="mb-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold">
              {editing
                ? `Editar potrero ${editing.codigo}`
                : 'Nuevo potrero'}
            </h2>

            <Button
              type="button"
              variant="ghost"
              aria-label="Cerrar formulario"
              onClick={
                cancelarEdicion
              }
            >
              <X size={18} />
            </Button>
          </div>

          <form
            key={
              editing?.id ??
              'new'
            }
            onSubmit={event =>
              void submit(event)
            }
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
          >
            <Input
              label="Código"
              value={
                editing?.codigo ??
                'Se asigna al guardar'
              }
              disabled
            />

            <div>
              {editing ? (
                <>
                  <input
                    type="hidden"
                    name="finca"
                    value={
                      editing.fincaId
                    }
                  />

                  <Select
                    label="Finca"
                    disabled
                    value={
                      editing.fincaId
                    }
                    onChange={() =>
                      undefined
                    }
                  >
                    {activeFarms.map(
                      farm => (
                        <option
                          key={
                            farm.id
                          }
                          value={
                            farm.id
                          }
                        >
                          {
                            farm.codigo
                          }{' '}
                          ·{' '}
                          {
                            farm.nombre
                          }
                        </option>
                      ),
                    )}
                  </Select>
                </>
              ) : (
                <Select
                  name="finca"
                  label="Finca"
                  required
                  defaultValue=""
                >
                  <option value="">
                    Seleccionar…
                  </option>

                  {activeFarms.map(
                    farm => (
                      <option
                        key={farm.id}
                        value={farm.id}
                      >
                        {farm.codigo} ·{' '}
                        {farm.nombre}
                      </option>
                    ),
                  )}
                </Select>
              )}
            </div>

            <Input
              name="nombre"
              label="Nombre"
              required
              defaultValue={
                editing?.nombre ??
                ''
              }
            />

            <Input
              name="area"
              label="Área (cantidad)"
              type="number"
              min="0"
              step="0.0001"
              defaultValue={
                editing?.area ?? ''
              }
            />

            <Select
              name="unidadArea"
              label="Unidad de medida"
              defaultValue={
                editing?.unidadArea ??
                ''
              }
            >
              <option value="">
                No especificada
              </option>

              {unitNames.map(
                unitName => (
                  <option
                    key={unitName}
                    value={unitName}
                  >
                    {unitName}
                  </option>
                ),
              )}
            </Select>

            <Input
              name="capacidad"
              label="Capacidad recomendada"
              type="number"
              min="0"
              step="1"
              defaultValue={
                editing
                  ?.capacidadRecomendada ??
                ''
              }
            />

            <Input
              name="pasto"
              label="Tipo de pasto"
              defaultValue={
                editing?.tipoPasto ??
                ''
              }
            />

            <Input
              name="fuenteAgua"
              label="Fuente de agua"
              disabled={
                !tieneAguaFormulario
              }
              defaultValue={
                editing
                  ?.tipoFuenteAgua ??
                ''
              }
            />

            <Select
              name="estado"
              label="Estado operativo"
              value={
                estadoFormulario
              }
              onChange={event =>
                cambiarEstadoOperativo(
                  event.target.value,
                )
              }
            >
              {estadosPotrero.map(
                state => (
                  <option
                    key={
                      state.valor
                    }
                    value={
                      state.valor
                    }
                  >
                    {
                      state.etiqueta
                    }
                  </option>
                ),
              )}
            </Select>

            {estadoFormulario ===
              'Disponible' && (
              <div className="grid gap-2">
                <Select
                  label="Destino productivo"
                  value={
                    destinoSeleccionado
                  }
                  onChange={event =>
                    setDestinoSeleccionado(
                      event.target.value,
                    )
                  }
                  disabled={
                    destinations
                      .isLoading
                  }
                  required
                >
                  <option value="">
                    {destinations
                      .isLoading
                      ? 'Cargando destinos…'
                      : 'Seleccionar…'}
                  </option>

                  {destinoSeleccionado &&
                    !destinationNames.includes(
                      destinoSeleccionado,
                    ) && (
                      <option
                        value={
                          destinoSeleccionado
                        }
                      >
                        {
                          destinoSeleccionado
                        }{' '}
                        (valor actual)
                      </option>
                    )}

                  {destinationItems.map(
                    destination => (
                      <option
                        key={
                          destination.id
                        }
                        value={
                          destination.nombre
                        }
                      >
                        {
                          destination.nombre
                        }
                      </option>
                    ),
                  )}
                </Select>

                {!destinations
                  .isLoading &&
                  destinationItems.length ===
                    0 && (
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      No hay destinos
                      productivos activos.
                      Regístralos desde
                      Datos maestros →
                      Agrícola → Destinos
                      productivos.
                    </p>
                  )}
              </div>
            )}

            <Input
              name="observaciones"
              label="Observaciones"
              defaultValue={
                editing
                  ?.observaciones ??
                ''
              }
            />

            <label className="flex min-h-11 items-center gap-2 self-end text-sm font-medium text-slate-700 dark:text-slate-200">
              <input
                name="agua"
                type="checkbox"
                checked={
                  tieneAguaFormulario
                }
                onChange={event =>
                  setTieneAguaFormulario(
                    event.target
                      .checked,
                  )
                }
                className="h-4 w-4 rounded border-slate-300 accent-emerald-700"
              />

              Tiene agua
            </label>

            <div className="flex items-end gap-2">
              <Button
                type="submit"
                disabled={
                  estadoFormulario ===
                    'Disponible' &&
                  (
                    !destinoSeleccionado ||
                    destinationItems
                      .length === 0
                  )
                }
              >
                {editing
                  ? 'Guardar cambios'
                  : 'Guardar potrero'}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={
                  cancelarEdicion
                }
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      {pastures.isLoading && (
        <Card>
          <p className="text-sm text-slate-500">
            Cargando potreros…
          </p>
        </Card>
      )}

      {pastures.isError && (
        <Card>
          <p className="text-sm text-red-700 dark:text-red-300">
            {pastures.error instanceof
            Error
              ? pastures.error
                  .message
              : 'No se pudieron cargar los potreros.'}
          </p>
        </Card>
      )}

      {!pastures.isLoading &&
        !pastures.isError && (
          <>
            <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
              {pastureItems.map(
                pasture => {
                  const active =
                    pasture.activo !==
                    false

                  const state =
                    obtenerEtiquetaEstado(
                      String(
                        pasture.estado,
                      ),
                    )

                  return (
                    <Card
                      key={pasture.id}
                      className={
                        active
                          ? ''
                          : 'opacity-70'
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold uppercase tracking-wider text-pine-600 dark:text-pine-300">
                            Potrero{' '}
                            {
                              pasture.codigo
                            }
                          </p>

                          <h2 className="mt-1 break-words font-display text-xl font-bold">
                            {
                              pasture.nombre
                            }
                          </h2>
                        </div>

                        <div className="flex shrink-0 gap-2">
                          {active && (
                            <IconButton
                              label={`Editar potrero ${pasture.nombre}`}
                              tone="edit"
                              onClick={() =>
                                open(
                                  pasture,
                                )
                              }
                            >
                              <Pencil
                                size={17}
                              />
                            </IconButton>
                          )}

                          <IconButton
                            label={
                              active
                                ? `Desactivar potrero ${pasture.nombre}`
                                : `Reactivar potrero ${pasture.nombre}`
                            }
                            tone={
                              active
                                ? 'danger'
                                : 'success'
                            }
                            onClick={() =>
                              void cambiarEstado(
                                pasture,
                              )
                            }
                          >
                            {active ? (
                              <Power
                                size={17}
                              />
                            ) : (
                              <RotateCcw
                                size={17}
                              />
                            )}
                          </IconButton>
                        </div>
                      </div>

                      <p className="mt-3 break-words text-sm font-medium text-slate-600 dark:text-slate-300">
                        {obtenerFinca(
                          pasture,
                        )}
                      </p>

                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Estado: {state}
                      </p>

                      {pasture
                        .destinoProductivo && (
                        <p className="mt-1 break-words text-sm font-medium text-pine-700 dark:text-pine-300">
                          Destino
                          productivo:{' '}
                          {
                            pasture
                              .destinoProductivo
                          }
                        </p>
                      )}

                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Área:{' '}
                        {pasture.area ??
                          'No especificada'}

                        {pasture.unidadArea
                          ? ` ${pasture.unidadArea}`
                          : ''}
                      </p>

                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Agua:{' '}
                        {pasture.tieneAgua
                          ? pasture
                              .tipoFuenteAgua
                            ? `Sí · ${pasture.tipoFuenteAgua}`
                            : 'Sí'
                          : 'No'}
                      </p>

                      {!active && (
                        <p className="mt-3 inline-flex rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          Inactivo
                        </p>
                      )}
                    </Card>
                  )
                },
              )}
            </div>

            <Pagination
              page={page}
              totalPages={
                totalPages
              }
              totalItems={
                totalItems
              }
              pageSize={
                PAGE_SIZE
              }
              onPageChange={
                setPage
              }
              label="Paginación de potreros"
            />
          </>
        )}

      {!pastures.isLoading &&
        !pastures.isError &&
        pastureItems.length ===
          0 && (
          <EmptyState
            title="Sin potreros encontrados"
            detail={
              search ||
              fincaFiltroId
                ? 'No existen potreros que coincidan con los filtros seleccionados.'
                : incluirInactivos
                  ? 'No existen potreros activos ni inactivos registrados.'
                  : 'Crea el primer potrero dentro de una finca; su código será automático.'
            }
          />
        )}

      <ModalExportacion
        abierto={
          modalExportacionAbierto
        }
        onCerrar={() =>
          setModalExportacionAbierto(
            false,
          )
        }
        titulo="Exportar potreros"
        descripcion="Selecciona el formato y las columnas que deseas incluir en el archivo."
        tituloReporte="BovItzá · Catálogo de potreros"
        nombreArchivo="potreros"
        nombreHoja="Potreros"
        datos={datosExportacion}
        columnas={
          columnasExportacion
        }
        descripcionFiltros={
          descripcionFiltros
        }
      />
    </>
  )
}