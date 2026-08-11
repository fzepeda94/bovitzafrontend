import {
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
  PagedResult,
} from '../types'
import {
  Button,
  Card,
  EmptyState,
  IconButton,
  Input,
  Select,
} from '../components/ui'
import {
  ModalExportacion,
  type ColumnaExportacion,
} from '../components/ModalExportacion'
import { PageHeader } from '../components/Page'

type EntityWithStatus = Entity & {
  activo?: boolean
}

export function EntidadesPagina() {
  const [
    editing,
    setEditing,
  ] = useState<
    EntityWithStatus | null | undefined
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

  const [
    modalExportacionAbierto,
    setModalExportacionAbierto,
  ] = useState(false)

  const client = useQueryClient()

  const query = useQuery({
    queryKey: [
      'entities',
      search.trim(),
      incluirInactivos,
    ],

    queryFn: () => {
      const params =
        new URLSearchParams({
          page: '1',
          pageSize: '100',
          search: search.trim(),
          incluirInactivos:
            String(
              incluirInactivos,
            ),
        })

      return api<
        PagedResult<EntityWithStatus>
      >(
        `/entidades?${params.toString()}`,
      )
    },
  })

  const types = useQuery({
    queryKey: [
      'catalog',
      'tipos-entidad',
    ],
    queryFn: () =>
      api<CatalogItem[]>(
        '/catalogos/tipos-entidad',
      ),
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

  const entities =
    query.data?.items ?? []

  const tiposPorId = useMemo(
    () =>
      new Map(
        (types.data ?? []).map(
          item => [
            item.id,
            item.nombre,
          ],
        ),
      ),
    [types.data],
  )

  const paisesPorId = useMemo(
    () =>
      new Map(
        (countries.data ?? []).map(
          item => [
            item.id,
            item.nombre,
          ],
        ),
      ),
    [countries.data],
  )

  const departamentosPorId =
    useMemo(
      () =>
        new Map(
          (
            departments.data ?? []
          ).map(item => [
            item.id,
            item.nombre,
          ]),
        ),
      [departments.data],
    )

  const municipiosPorId =
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

  const obtenerTipoEntidad = (
    entity: EntityWithStatus,
  ) => {
    if (!entity.tipoEntidadId) {
      return entity.tipo
    }

    return (
      tiposPorId.get(
        entity.tipoEntidadId,
      ) ?? entity.tipo
    )
  }

  const obtenerPais = (
    entity: EntityWithStatus,
  ) => {
    if (!entity.paisId) {
      return ''
    }

    return (
      paisesPorId.get(
        entity.paisId,
      ) ?? ''
    )
  }

  const obtenerDepartamento = (
    entity: EntityWithStatus,
  ) => {
    if (!entity.departamentoId) {
      return ''
    }

    return (
      departamentosPorId.get(
        entity.departamentoId,
      ) ?? ''
    )
  }

  const obtenerMunicipio = (
    entity: EntityWithStatus,
  ) => {
    if (!entity.municipioId) {
      return ''
    }

    return (
      municipiosPorId.get(
        entity.municipioId,
      ) ?? ''
    )
  }

  const obtenerUbicacion = (
    entity: EntityWithStatus,
  ) => {
    const ubicacion = [
      obtenerMunicipio(entity),
      obtenerDepartamento(entity),
      obtenerPais(entity),
    ]
      .filter(Boolean)
      .join(', ')

    return (
      ubicacion ||
      'No especificada'
    )
  }

  const columnasExportacion =
    useMemo<
      ColumnaExportacion<EntityWithStatus>[]
    >(
      () => [
        {
          id: 'codigo',
          titulo: 'Código',
          seleccionadaPorDefecto:
            true,
          obtenerValor: entity =>
            entity.codigo,
        },
        {
          id: 'nombre',
          titulo:
            'Nombre o razón social',
          seleccionadaPorDefecto:
            true,
          obtenerValor: entity =>
            entity
              .nombreCompletoORazonSocial,
        },
        {
          id: 'nombreComercial',
          titulo:
            'Nombre comercial',
          seleccionadaPorDefecto:
            false,
          obtenerValor: entity =>
            entity.nombreComercial ??
            '',
        },
        {
          id: 'tipoEntidad',
          titulo:
            'Tipo de entidad',
          seleccionadaPorDefecto:
            true,
          obtenerValor: entity =>
            entity.tipoEntidadId
              ? tiposPorId.get(
                  entity.tipoEntidadId,
                ) ?? entity.tipo
              : entity.tipo,
        },
        {
          id: 'nit',
          titulo: 'NIT',
          seleccionadaPorDefecto:
            true,
          obtenerValor: entity =>
            entity.nit ?? '',
        },
        {
          id: 'dpi',
          titulo: 'DPI',
          seleccionadaPorDefecto:
            false,
          obtenerValor: entity =>
            entity.dpi ?? '',
        },
        {
          id: 'telefono',
          titulo: 'Teléfono',
          seleccionadaPorDefecto:
            true,
          obtenerValor: entity =>
            entity.telefono ?? '',
        },
        {
          id: 'correo',
          titulo: 'Correo',
          seleccionadaPorDefecto:
            false,
          obtenerValor: entity =>
            entity.correo ?? '',
        },
        {
          id: 'direccion',
          titulo: 'Dirección',
          seleccionadaPorDefecto:
            false,
          obtenerValor: entity =>
            entity.direccion ?? '',
        },
        {
          id: 'pais',
          titulo: 'País',
          seleccionadaPorDefecto:
            false,
          obtenerValor: entity =>
            entity.paisId
              ? paisesPorId.get(
                  entity.paisId,
                ) ?? ''
              : '',
        },
        {
          id: 'departamento',
          titulo: 'Departamento',
          seleccionadaPorDefecto:
            false,
          obtenerValor: entity =>
            entity.departamentoId
              ? departamentosPorId.get(
                  entity.departamentoId,
                ) ?? ''
              : '',
        },
        {
          id: 'municipio',
          titulo: 'Municipio',
          seleccionadaPorDefecto:
            false,
          obtenerValor: entity =>
            entity.municipioId
              ? municipiosPorId.get(
                  entity.municipioId,
                ) ?? ''
              : '',
        },
        {
          id: 'ubicacion',
          titulo:
            'Ubicación completa',
          seleccionadaPorDefecto:
            true,
          obtenerValor: entity => {
            const ubicacion = [
              entity.municipioId
                ? municipiosPorId.get(
                    entity.municipioId,
                  )
                : '',
              entity.departamentoId
                ? departamentosPorId.get(
                    entity.departamentoId,
                  )
                : '',
              entity.paisId
                ? paisesPorId.get(
                    entity.paisId,
                  )
                : '',
            ]
              .filter(Boolean)
              .join(', ')

            return (
              ubicacion ||
              'No especificada'
            )
          },
        },
        {
          id: 'observaciones',
          titulo: 'Observaciones',
          seleccionadaPorDefecto:
            false,
          obtenerValor: entity =>
            entity.observaciones ??
            '',
        },
        {
          id: 'estado',
          titulo: 'Estado',
          seleccionadaPorDefecto:
            true,
          obtenerValor: entity =>
            entity.activo !== false
              ? 'Activa'
              : 'Inactiva',
        },
      ],
      [
        tiposPorId,
        paisesPorId,
        departamentosPorId,
        municipiosPorId,
      ],
    )

  const descripcionFiltros =
    useMemo(() => {
      const filtros: string[] =
        []

      if (search.trim()) {
        filtros.push(
          `Búsqueda: ${search.trim()}`,
        )
      } else {
        filtros.push(
          'Búsqueda: todos los registros',
        )
      }

      filtros.push(
        incluirInactivos
          ? 'Estado: activos e inactivos'
          : 'Estado: solamente activos',
      )

      return filtros.join(' · ')
    }, [
      search,
      incluirInactivos,
    ])

  const open = (
    entity:
      | EntityWithStatus
      | null,
  ) => {
    setEditing(entity)
    setPaisId(
      entity?.paisId ?? '',
    )
    setDepartamentoId(
      entity?.departamentoId ??
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

    const typeId = String(
      form.get(
        'tipoEntidadId',
      ) || '',
    )

    const typeName =
      types.data
        ?.find(
          item =>
            item.id === typeId,
        )
        ?.nombre.toLowerCase() ??
      ''

    const legacyType =
      typeName.includes(
        'empresa',
      )
        ? 'Empresa'
        : typeName.includes(
              'asoci',
            )
          ? 'Asociacion'
          : typeName.includes(
                'coop',
              )
            ? 'Cooperativa'
            : typeName.includes(
                  'persona',
                )
              ? 'PersonaIndividual'
              : 'Otro'

    const payload = {
      tipo: legacyType,
      tipoEntidadId:
        typeId || null,
      nombres:
        form.get('nombre'),
      apellidos: null,

      nombreCompletoORazonSocial:
        form.get('nombre'),

      nombreComercial:
        form.get(
          'nombreComercial',
        ) || null,

      nit:
        form.get('nit') ||
        null,

      dpi:
        form.get('dpi') ||
        null,

      telefono:
        form.get('telefono') ||
        null,

      correo:
        form.get('correo') ||
        null,

      direccion:
        form.get('direccion') ||
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

      municipio: null,
      departamento: null,

      observaciones:
        form.get(
          'observaciones',
        ) || null,
    }

    try {
      await api(
        editing
          ? `/entidades/${editing.id}`
          : '/entidades',
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
          queryKey: [
            'entities',
          ],
        },
      )
    } catch {
      // La notificación global presenta el error.
    }
  }

  const cambiarEstado = async (
    entity: EntityWithStatus,
  ) => {
    const activo =
      entity.activo !== false

    try {
      await api(
        activo
          ? `/entidades/${entity.id}`
          : `/entidades/${entity.id}/reactivar`,
        {
          method: activo
            ? 'DELETE'
            : 'POST',
        },
      )

      if (
        editing?.id === entity.id
      ) {
        cancelarEdicion()
      }

      await client.invalidateQueries(
        {
          queryKey: [
            'entities',
          ],
        },
      )
    } catch {
      // La notificación global presenta el error.
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Datos maestros"
        title="Entidades"
        description="Personas, empresas o asociaciones que pueden ser propietarias, compradoras, vendedoras o procedencias."
        actions={
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={
                entities.length === 0
              }
              onClick={() =>
                setModalExportacionAbierto(
                  true,
                )
              }
            >
              <Download
                size={17}
              />
              Exportar
            </Button>

            <Button
              type="button"
              onClick={() =>
                open(null)
              }
            >
              <Plus size={17} />
              Nueva entidad
            </Button>
          </>
        }
      />

      <Card className="!p-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full max-w-lg">
            <Search
              className="pointer-events-none absolute left-3 top-3 text-slate-400"
              size={18}
            />

            <Input
              aria-label="Buscar entidades"
              placeholder="Código, nombre, NIT o DPI…"
              className="pl-10"
              value={search}
              onChange={event =>
                setSearch(
                  event.target
                    .value,
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
        <Card className="my-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold">
              {editing
                ? 'Editar entidad'
                : 'Nueva entidad'}
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
              label="Código de entidad"
              value={
                editing?.codigo ??
                'Se asigna al guardar'
              }
              disabled
            />

            <Input
              label="Nombre o razón social"
              name="nombre"
              required
              defaultValue={
                editing
                  ?.nombreCompletoORazonSocial ??
                ''
              }
            />

            <Select
              label="Tipo de entidad"
              name="tipoEntidadId"
              required
              defaultValue={
                editing
                  ?.tipoEntidadId ??
                ''
              }
            >
              <option value="">
                Seleccionar…
              </option>

              {types.data?.map(
                item => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {
                      item.nombre
                    }
                  </option>
                ),
              )}
            </Select>

            <Input
              label="Nombre comercial"
              name="nombreComercial"
              defaultValue={
                editing
                  ?.nombreComercial ??
                ''
              }
            />

            <Input
              label="NIT"
              name="nit"
              defaultValue={
                editing?.nit ?? ''
              }
            />

            <Input
              label="DPI"
              name="dpi"
              defaultValue={
                editing?.dpi ?? ''
              }
            />

            <Input
              label="Teléfono"
              name="telefono"
              defaultValue={
                editing?.telefono ??
                ''
              }
            />

            <Input
              label="Correo"
              name="correo"
              type="email"
              defaultValue={
                editing?.correo ??
                ''
              }
            />

            <Input
              label="Dirección"
              name="direccion"
              defaultValue={
                editing?.direccion ??
                ''
              }
            />

            <Select
              label="País"
              name="paisId"
              value={paisId}
              onChange={event =>
                cambiarPais(
                  event.target
                    .value,
                )
              }
            >
              <option value="">
                No especificado
              </option>

              {countries.data?.map(
                item => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {
                      item.nombre
                    }
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
                  event.target
                    .value,
                )
              }
            >
              <option value="">
                No especificado
              </option>

              {departments.data
                ?.filter(
                  item =>
                    item.catalogoPadreId ===
                    paisId,
                )
                .map(item => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {
                      item.nombre
                    }
                  </option>
                ))}
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
                  item =>
                    item.catalogoPadreId ===
                    departamentoId,
                )
                .map(item => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {
                      item.nombre
                    }
                  </option>
                ))}
            </Select>

            <Input
              label="Observaciones"
              name="observaciones"
              defaultValue={
                editing
                  ?.observaciones ??
                ''
              }
            />

            <div className="flex items-end gap-2">
              <Button type="submit">
                Guardar entidad
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

      {query.isLoading && (
        <Card className="mt-5">
          <p className="text-sm text-slate-500">
            Cargando entidades…
          </p>
        </Card>
      )}

      {query.isError && (
        <Card className="mt-5">
          <p className="text-sm text-red-700 dark:text-red-300">
            {query.error instanceof
            Error
              ? query.error
                  .message
              : 'No se pudieron cargar las entidades.'}
          </p>
        </Card>
      )}

      {!query.isLoading &&
        !query.isError && (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {entities.map(
              entity => {
                const activo =
                  entity.activo !==
                  false

                const inicial =
                  entity
                    .nombreCompletoORazonSocial
                    .trim()
                    .slice(0, 1)
                    .toUpperCase()

                return (
                  <Card
                    key={
                      entity.id
                    }
                    className={
                      activo
                        ? ''
                        : 'opacity-70'
                    }
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-pine-50 font-display font-bold text-pine-700 dark:bg-pine-900/40 dark:text-pine-200">
                        {inicial}
                      </span>

                      <div className="flex shrink-0 gap-2">
                        {activo && (
                          <IconButton
                            label={`Editar ${entity.nombreCompletoORazonSocial}`}
                            tone="edit"
                            onClick={() =>
                              open(
                                entity,
                              )
                            }
                          >
                            <Pencil
                              size={
                                17
                              }
                            />
                          </IconButton>
                        )}

                        <IconButton
                          label={
                            activo
                              ? `Desactivar ${entity.nombreCompletoORazonSocial}`
                              : `Reactivar ${entity.nombreCompletoORazonSocial}`
                          }
                          tone={
                            activo
                              ? 'danger'
                              : 'success'
                          }
                          onClick={() =>
                            void cambiarEstado(
                              entity,
                            )
                          }
                        >
                          {activo ? (
                            <Power
                              size={
                                17
                              }
                            />
                          ) : (
                            <RotateCcw
                              size={
                                17
                              }
                            />
                          )}
                        </IconButton>
                      </div>
                    </div>

                    <h2 className="mt-4 break-words font-display text-lg font-bold">
                      {
                        entity
                          .nombreCompletoORazonSocial
                      }
                    </h2>

                    <p className="mt-1 break-words text-sm text-slate-500 dark:text-slate-400">
                      {
                        entity.codigo
                      }
                      {' · '}
                      {obtenerTipoEntidad(
                        entity,
                      )}

                      {!activo &&
                        ' · Inactiva'}
                    </p>

                    <p className="mt-2 break-words text-xs text-slate-400">
                      {obtenerUbicacion(
                        entity,
                      )}
                    </p>
                  </Card>
                )
              },
            )}
          </div>
        )}

      {!query.isLoading &&
        !query.isError &&
        entities.length === 0 && (
          <div className="mt-5">
            <EmptyState
              title="Sin entidades encontradas"
              detail={
                search
                  ? 'No existen entidades que coincidan con la búsqueda.'
                  : 'Crea la primera entidad antes de registrar fincas, compras o bovinos.'
              }
            />
          </div>
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
        titulo="Exportar entidades"
        descripcion="Selecciona el formato y las columnas que deseas incluir en el archivo."
        tituloReporte="BovItzá · Catálogo de entidades"
        nombreArchivo="entidades"
        nombreHoja="Entidades"
        datos={entities}
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