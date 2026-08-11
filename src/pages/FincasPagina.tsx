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
  Entity,
  Farm,
  PagedResult,
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

const PAGE_SIZE = 6
const EXPORT_PAGE_SIZE = 1000

export function FincasPagina() {
  const [
    editing,
    setEditing,
  ] = useState<
    FarmWithStatus | null | undefined
  >(undefined)

  const [paisId, setPaisId] =
    useState('')

  const [
    departamentoId,
    setDepartamentoId,
  ] = useState('')

  const [search, setSearch] =
    useState('')

  const [
    incluirInactivos,
    setIncluirInactivos,
  ] = useState(false)

  const [page, setPage] =
    useState(1)

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
  ] = useState<FarmWithStatus[]>(
    [],
  )

  const client = useQueryClient()

  const farms = useQuery({
    queryKey: [
      'farms',
      page,
      search.trim(),
      incluirInactivos,
    ],

    queryFn: () => {
      const params =
        new URLSearchParams({
          page: String(page),
          pageSize:
            String(PAGE_SIZE),
          search: search.trim(),
          incluirInactivos:
            String(
              incluirInactivos,
            ),
        })

      return api<
        PagedResult<FarmWithStatus>
      >(
        `/fincas?${params.toString()}`,
      )
    },
  })

  const entities = useQuery({
    queryKey: [
      'entities',
      'fincas-selector',
    ],

    queryFn: () => {
      const params =
        new URLSearchParams({
          page: '1',
          pageSize: '200',
          search: '',
          incluirInactivos:
            'false',
        })

      return api<
        PagedResult<Entity>
      >(
        `/entidades?${params.toString()}`,
      )
    },
  })

  const countries = useQuery({
    queryKey: [
      'catalog',
      'paises',
    ],

    queryFn: () =>
      api<CatalogItem[]>(
        '/catalogos/paises',
      ),
  })

  const departments = useQuery({
    queryKey: [
      'catalog',
      'departamentos',
    ],

    queryFn: () =>
      api<CatalogItem[]>(
        '/catalogos/departamentos',
      ),
  })

  const municipalities = useQuery({
    queryKey: [
      'catalog',
      'municipios',
    ],

    queryFn: () =>
      api<CatalogItem[]>(
        '/catalogos/municipios',
      ),
  })

  const units = useQuery({
    queryKey: [
      'catalog',
      'unidades-medida',
    ],

    queryFn: () =>
      api<CatalogItem[]>(
        '/catalogos/unidades-medida',
      ),
  })

  const farmItems =
    farms.data?.items ?? []

  const totalItems =
    farms.data?.total ?? 0

  const totalPages = Math.max(
    1,
    Math.ceil(
      totalItems / PAGE_SIZE,
    ),
  )

  const entitiesById = useMemo(
    () =>
      new Map(
        (
          entities.data?.items ??
          []
        ).map(entity => [
          entity.id,
          entity
            .nombreCompletoORazonSocial,
        ]),
      ),
    [entities.data],
  )

  const countriesById = useMemo(
    () =>
      new Map(
        (
          countries.data ?? []
        ).map(item => [
          item.id,
          item.nombre,
        ]),
      ),
    [countries.data],
  )

  const departmentsById =
    useMemo(
      () =>
        new Map(
          (
            departments.data ??
            []
          ).map(item => [
            item.id,
            item.nombre,
          ]),
        ),
      [departments.data],
    )

  const municipalitiesById =
    useMemo(
      () =>
        new Map(
          (
            municipalities.data ??
            []
          ).map(item => [
            item.id,
            item.nombre,
          ]),
        ),
      [municipalities.data],
    )

  const unitsById = useMemo(
    () =>
      new Map(
        (
          units.data ?? []
        ).map(item => [
          item.id,
          item.nombre,
        ]),
      ),
    [units.data],
  )

  const obtenerPropietario = (
    farm: FarmWithStatus,
  ) => {
    if (!farm.propietarioFincaId) {
      return 'Sin entidad propietaria'
    }

    return (
      entitiesById.get(
        farm.propietarioFincaId,
      ) ?? 'Entidad no disponible'
    )
  }

  const obtenerPais = (
    farm: FarmWithStatus,
  ) => {
    if (!farm.paisId) {
      return ''
    }

    return (
      countriesById.get(
        farm.paisId,
      ) ?? ''
    )
  }

  const obtenerDepartamento = (
    farm: FarmWithStatus,
  ) => {
    if (!farm.departamentoId) {
      return ''
    }

    return (
      departmentsById.get(
        farm.departamentoId,
      ) ?? ''
    )
  }

  const obtenerMunicipio = (
    farm: FarmWithStatus,
  ) => {
    if (!farm.municipioId) {
      return ''
    }

    return (
      municipalitiesById.get(
        farm.municipioId,
      ) ?? ''
    )
  }

  const obtenerUbicacion = (
    farm: FarmWithStatus,
  ) => {
    const location = [
      obtenerMunicipio(farm),
      obtenerDepartamento(farm),
      obtenerPais(farm),
    ]
      .filter(Boolean)
      .join(', ')

    return (
      location ||
      'Ubicación no especificada'
    )
  }

  const obtenerUnidadArea = (
    farm: FarmWithStatus,
  ) => {
    if (farm.unidadAreaId) {
      return (
        unitsById.get(
          farm.unidadAreaId,
        ) ??
        farm.unidadArea ??
        ''
      )
    }

    return farm.unidadArea ?? ''
  }

  const columnasExportacion =
    useMemo<
      ColumnaExportacion<FarmWithStatus>[]
    >(
      () => [
        {
          id: 'codigo',
          titulo: 'Código',
          seleccionadaPorDefecto:
            true,
          obtenerValor: farm =>
            farm.codigo,
        },

        {
          id: 'nombre',
          titulo: 'Nombre',
          seleccionadaPorDefecto:
            true,
          obtenerValor: farm =>
            farm.nombre,
        },

        {
          id: 'propietario',
          titulo:
            'Entidad propietaria',
          seleccionadaPorDefecto:
            true,
          obtenerValor: farm =>
            farm.propietarioFincaId
              ? entitiesById.get(
                  farm.propietarioFincaId,
                ) ??
                'Entidad no disponible'
              : 'Sin entidad propietaria',
        },

        {
          id: 'pais',
          titulo: 'País',
          seleccionadaPorDefecto:
            false,
          obtenerValor: farm =>
            farm.paisId
              ? countriesById.get(
                  farm.paisId,
                ) ?? ''
              : '',
        },

        {
          id: 'departamento',
          titulo: 'Departamento',
          seleccionadaPorDefecto:
            false,
          obtenerValor: farm =>
            farm.departamentoId
              ? departmentsById.get(
                  farm.departamentoId,
                ) ?? ''
              : '',
        },

        {
          id: 'municipio',
          titulo: 'Municipio',
          seleccionadaPorDefecto:
            false,
          obtenerValor: farm =>
            farm.municipioId
              ? municipalitiesById.get(
                  farm.municipioId,
                ) ?? ''
              : '',
        },

        {
          id: 'ubicacion',
          titulo:
            'Ubicación completa',
          seleccionadaPorDefecto:
            true,
          obtenerValor: farm => {
            const location = [
              farm.municipioId
                ? municipalitiesById.get(
                    farm.municipioId,
                  )
                : '',
              farm.departamentoId
                ? departmentsById.get(
                    farm.departamentoId,
                  )
                : '',
              farm.paisId
                ? countriesById.get(
                    farm.paisId,
                  )
                : '',
            ]
              .filter(Boolean)
              .join(', ')

            return (
              location ||
              'Ubicación no especificada'
            )
          },
        },

        {
          id: 'direccion',
          titulo:
            'Dirección de referencia',
          seleccionadaPorDefecto:
            false,
          obtenerValor: farm =>
            farm.direccionReferencia ??
            '',
        },

        {
          id: 'areaTotal',
          titulo: 'Área total',
          seleccionadaPorDefecto:
            true,
          obtenerValor: farm =>
            farm.areaTotal ?? '',
        },

        {
          id: 'unidadArea',
          titulo:
            'Unidad de medida',
          seleccionadaPorDefecto:
            true,
          obtenerValor: farm =>
            farm.unidadAreaId
              ? unitsById.get(
                  farm.unidadAreaId,
                ) ??
                farm.unidadArea ??
                ''
              : farm.unidadArea ??
                '',
        },

        {
          id: 'latitud',
          titulo: 'Latitud',
          seleccionadaPorDefecto:
            false,
          obtenerValor: farm =>
            farm.latitud ?? '',
        },

        {
          id: 'longitud',
          titulo: 'Longitud',
          seleccionadaPorDefecto:
            false,
          obtenerValor: farm =>
            farm.longitud ?? '',
        },

        {
          id: 'observaciones',
          titulo: 'Observaciones',
          seleccionadaPorDefecto:
            false,
          obtenerValor: farm =>
            farm.observaciones ?? '',
        },

        {
          id: 'estado',
          titulo: 'Estado',
          seleccionadaPorDefecto:
            true,
          obtenerValor: farm =>
            farm.activo !== false
              ? 'Activa'
              : 'Inactiva',
        },
      ],
      [
        entitiesById,
        countriesById,
        departmentsById,
        municipalitiesById,
        unitsById,
      ],
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
        incluirInactivos
          ? 'Estado: activas e inactivas'
          : 'Estado: solamente activas',
      )

      return filters.join(' · ')
    }, [
      search,
      incluirInactivos,
    ])

  useEffect(() => {
    setPage(1)
  }, [
    search,
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
    farm:
      | FarmWithStatus
      | null,
  ) => {
    setEditing(farm)

    setPaisId(
      farm?.paisId ?? '',
    )

    setDepartamentoId(
      farm?.departamentoId ??
        '',
    )
  }

  const cancelarEdicion = () => {
    setEditing(undefined)
    setPaisId('')
    setDepartamentoId('')
  }

  const cambiarPais = (
    nuevoPaisId: string,
  ) => {
    setPaisId(nuevoPaisId)
    setDepartamentoId('')
  }

  const submit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    const formElement =
      event.currentTarget

    const form =
      new FormData(formElement)

    const unitId = String(
      form.get('unidadAreaId') ||
        '',
    )

    const payload = {
      nombre:
        form.get('nombre'),

      entidadPropietariaId:
        form.get('entidad') ||
        null,

      paisId:
        form.get('paisId') ||
        null,

      departamentoId:
        form.get(
          'departamentoId',
        ) || null,

      municipioId:
        form.get(
          'municipioId',
        ) || null,

      municipio:
        municipalitiesById.get(
          String(
            form.get(
              'municipioId',
            ) || '',
          ),
        ) || null,

      departamento:
        departmentsById.get(
          String(
            form.get(
              'departamentoId',
            ) || '',
          ),
        ) || null,

      direccionReferencia:
        form.get('direccion') ||
        null,

      areaTotal:
        form.get('area')
          ? Number(
              form.get('area'),
            )
          : null,

      unidadAreaId:
        unitId || null,

      unidadArea:
        unitsById.get(unitId) ||
        null,

      latitud:
        form.get('latitud')
          ? Number(
              form.get(
                'latitud',
              ),
            )
          : null,

      longitud:
        form.get('longitud')
          ? Number(
              form.get(
                'longitud',
              ),
            )
          : null,

      observaciones:
        form.get(
          'observaciones',
        ) || null,
    }

    try {
      await api(
        editing
          ? `/fincas/${editing.id}`
          : '/fincas',
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

      await client.invalidateQueries(
        {
          queryKey: ['farms'],
        },
      )
    } catch {
      // La notificación global presenta el error.
    }
  }

  const cambiarEstado = async (
    farm: FarmWithStatus,
  ) => {
    const active =
      farm.activo !== false

    try {
      await api(
        active
          ? `/fincas/${farm.id}`
          : `/fincas/${farm.id}/reactivar`,
        {
          method: active
            ? 'DELETE'
            : 'POST',
        },
      )

      if (
        editing?.id === farm.id
      ) {
        cancelarEdicion()
      }

      await client.invalidateQueries(
        {
          queryKey: ['farms'],
        },
      )
    } catch {
      // La notificación global presenta el error.
    }
  }

  const abrirModalExportacion =
    async () => {
      setPreparandoExportacion(
        true,
      )

      try {
        const params =
          new URLSearchParams({
            page: '1',
            pageSize: String(
              EXPORT_PAGE_SIZE,
            ),
            search: search.trim(),
            incluirInactivos:
              String(
                incluirInactivos,
              ),
          })

        const result =
          await client.fetchQuery({
            queryKey: [
              'farms-export',
              search.trim(),
              incluirInactivos,
            ],

            queryFn: () =>
              api<
                PagedResult<FarmWithStatus>
              >(
                `/fincas?${params.toString()}`,
              ),
          })

        setDatosExportacion(
          result.items,
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
        title="Fincas"
        description="Administra las propiedades ganaderas, su ubicación, propietario, extensión territorial y datos de referencia."
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
              onClick={() =>
                open(null)
              }
            >
              <Plus size={17} />
              Nueva finca
            </Button>
          </>
        }
      />

      <Card className="mb-5 !p-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full max-w-lg">
            <Search
              className="pointer-events-none absolute left-3 top-3 text-slate-400"
              size={18}
            />

            <Input
              aria-label="Buscar fincas"
              placeholder="Código, nombre, propietario o ubicación…"
              className="pl-10"
              value={search}
              onChange={event =>
                setSearch(
                  event.target.value,
                )
              }
            />
          </div>

          <label className="flex min-h-11 items-center gap-2 px-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={
                incluirInactivos
              }
              onChange={event =>
                setIncluirInactivos(
                  event.target.checked,
                )
              }
              className="h-4 w-4 rounded border-slate-300 accent-emerald-700"
            />

            Mostrar inactivas
          </label>
        </div>
      </Card>

      {editing !== undefined && (
        <Card className="mb-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold">
              {editing
                ? `Editar finca ${editing.codigo}`
                : 'Nueva finca'}
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

            <Input
              name="nombre"
              label="Nombre"
              required
              defaultValue={
                editing?.nombre ?? ''
              }
            />

            <Select
              name="entidad"
              label="Entidad propietaria"
              defaultValue={
                editing
                  ?.propietarioFincaId ??
                ''
              }
            >
              <option value="">
                Sin asignar
              </option>

              {entities.data?.items.map(
                entity => (
                  <option
                    key={entity.id}
                    value={entity.id}
                  >
                    {
                      entity
                        .nombreCompletoORazonSocial
                    }
                  </option>
                ),
              )}
            </Select>

            <Select
              label="País"
              name="paisId"
              value={paisId}
              onChange={event =>
                cambiarPais(
                  event.target.value,
                )
              }
            >
              <option value="">
                No especificado
              </option>

              {countries.data?.map(
                country => (
                  <option
                    key={country.id}
                    value={country.id}
                  >
                    {country.nombre}
                  </option>
                ),
              )}
            </Select>

            <Select
              label="Departamento"
              name="departamentoId"
              value={
                departamentoId
              }
              disabled={!paisId}
              onChange={event =>
                setDepartamentoId(
                  event.target.value,
                )
              }
            >
              <option value="">
                No especificado
              </option>

              {departments.data
                ?.filter(
                  department =>
                    department.catalogoPadreId ===
                    paisId,
                )
                .map(
                  department => (
                    <option
                      key={
                        department.id
                      }
                      value={
                        department.id
                      }
                    >
                      {
                        department.nombre
                      }
                    </option>
                  ),
                )}
            </Select>

            <Select
              key={`${editing?.id ?? 'new'}-${departamentoId}`}
              label="Municipio"
              name="municipioId"
              disabled={
                !departamentoId
              }
              defaultValue={
                editing
                  ?.departamentoId ===
                departamentoId
                  ? editing
                      ?.municipioId ??
                    ''
                  : ''
              }
            >
              <option value="">
                No especificado
              </option>

              {municipalities.data
                ?.filter(
                  municipality =>
                    municipality.catalogoPadreId ===
                    departamentoId,
                )
                .map(
                  municipality => (
                    <option
                      key={
                        municipality.id
                      }
                      value={
                        municipality.id
                      }
                    >
                      {
                        municipality.nombre
                      }
                    </option>
                  ),
                )}
            </Select>

            <Input
              name="direccion"
              label="Dirección de referencia"
              defaultValue={
                editing
                  ?.direccionReferencia ??
                ''
              }
            />

            <Input
              name="area"
              label="Área total (cantidad)"
              type="number"
              min="0"
              step="0.0001"
              defaultValue={
                editing?.areaTotal ??
                ''
              }
            />

            <Select
              name="unidadAreaId"
              label="Unidad de medida"
              defaultValue={
                editing
                  ?.unidadAreaId ??
                ''
              }
            >
              <option value="">
                No especificada
              </option>

              {units.data?.map(
                unit => (
                  <option
                    key={unit.id}
                    value={unit.id}
                  >
                    {unit.nombre}
                  </option>
                ),
              )}
            </Select>

            <Input
              name="latitud"
              label="Latitud"
              type="number"
              step="any"
              defaultValue={
                editing?.latitud ??
                ''
              }
            />

            <Input
              name="longitud"
              label="Longitud"
              type="number"
              step="any"
              defaultValue={
                editing?.longitud ??
                ''
              }
            />

            <Input
              name="observaciones"
              label="Observaciones"
              defaultValue={
                editing
                  ?.observaciones ??
                ''
              }
            />

            <div className="flex items-end gap-2">
              <Button type="submit">
                {editing
                  ? 'Guardar cambios'
                  : 'Guardar finca'}
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

      {farms.isLoading && (
        <Card>
          <p className="text-sm text-slate-500">
            Cargando fincas…
          </p>
        </Card>
      )}

      {farms.isError && (
        <Card>
          <p className="text-sm text-red-700 dark:text-red-300">
            {farms.error instanceof
            Error
              ? farms.error.message
              : 'No se pudieron cargar las fincas.'}
          </p>
        </Card>
      )}

      {!farms.isLoading &&
        !farms.isError && (
          <>
            <div className="grid gap-5 lg:grid-cols-2">
              {farmItems.map(
                farm => {
                  const active =
                    farm.activo !==
                    false

                  const unit =
                    obtenerUnidadArea(
                      farm,
                    )

                  return (
                    <Card
                      key={farm.id}
                      className={
                        active
                          ? ''
                          : 'opacity-70'
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold uppercase tracking-wider text-pine-600 dark:text-pine-300">
                            Finca{' '}
                            {farm.codigo}
                          </p>

                          <h2 className="mt-1 break-words font-display text-xl font-bold">
                            {farm.nombre}
                          </h2>
                        </div>

                        <div className="flex shrink-0 gap-2">
                          {active && (
                            <IconButton
                              label={`Editar finca ${farm.nombre}`}
                              tone="edit"
                              onClick={() =>
                                open(
                                  farm,
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
                                ? `Desactivar finca ${farm.nombre}`
                                : `Reactivar finca ${farm.nombre}`
                            }
                            tone={
                              active
                                ? 'danger'
                                : 'success'
                            }
                            onClick={() =>
                              void cambiarEstado(
                                farm,
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

                      <p className="mt-3 break-words text-sm text-slate-500 dark:text-slate-400">
                        {obtenerPropietario(
                          farm,
                        )}
                      </p>

                      <p className="mt-1 break-words text-sm text-slate-500 dark:text-slate-400">
                        {obtenerUbicacion(
                          farm,
                        )}
                      </p>

                      <p className="mt-1 break-words text-sm text-slate-500 dark:text-slate-400">
                        {farm.areaTotal ??
                          'Sin área'}

                        {unit
                          ? ` ${unit}`
                          : ''}
                      </p>

                      {!active && (
                        <p className="mt-3 inline-flex rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          Inactiva
                        </p>
                      )}
                    </Card>
                  )
                },
              )}
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              label="Paginación de fincas"
            />
          </>
        )}

      {!farms.isLoading &&
        !farms.isError &&
        farmItems.length === 0 && (
          <EmptyState
            title="Sin fincas encontradas"
            detail={
              search
                ? 'No existen fincas que coincidan con la búsqueda.'
                : incluirInactivos
                  ? 'No existen fincas activas ni inactivas registradas.'
                  : 'Crea una finca; el sistema asignará su código automáticamente.'
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
        titulo="Exportar fincas"
        descripcion="Selecciona el formato y las columnas que deseas incluir en el archivo."
        tituloReporte="BovItzá · Catálogo de fincas"
        nombreArchivo="fincas"
        nombreHoja="Fincas"
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