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
import { useParams } from 'react-router-dom'
import {
  Download,
  Plus,
  Pencil,
  Power,
  RotateCcw,
  Search,
  X,
} from 'lucide-react'

import { api } from '../lib/api'
import type { CatalogItem } from '../types'
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
import { ordenarPorCodigo } from '../lib/ordenarPorCodigo'

const configuracion = {
  'tipos-entidad': {
    titulo: 'Tipos de entidad',
    singular: 'tipo de entidad',
    descripcion:
      'Clasificaciones utilizadas para identificar la naturaleza de personas, empresas, asociaciones, proveedores y demás entidades.',
    accionNuevo: 'Nuevo tipo de entidad',
  },

  paises: {
    accionNuevo: 'Nuevo país',
    titulo: 'Países',
    singular: 'país',
    descripcion:
      'Países utilizados para registrar la ubicación geográfica de entidades, fincas y operaciones.',
  },

  departamentos: {
    accionNuevo: 'Nuevo departamento',
    titulo: 'Departamentos',
    singular: 'departamento',
    padre: 'paises',
    etiquetaPadre: 'País',
    descripcion:
      'Departamentos vinculados a un país para organizar la ubicación geográfica del sistema.',
  },

  municipios: {
    accionNuevo: 'Nuevo municipio',
    titulo: 'Municipios',
    singular: 'municipio',
    padre: 'departamentos',
    etiquetaPadre: 'Departamento',
    descripcion:
      'Municipios vinculados a un departamento para precisar la ubicación de entidades y fincas.',
  },

  'unidades-medida': {
    accionNuevo: 'Nueva unidad de medida',
    titulo: 'Unidades de medida',
    singular: 'unidad de medida',
    descripcion:
      'Unidades utilizadas para registrar áreas, pesos, volúmenes, cantidades, dosis y demás mediciones.',
  },

  'destinos-productivos': {
    accionNuevo: 'Nuevo destino productivo',
    titulo: 'Destinos productivos',
    singular: 'destino productivo',
    descripcion:
      'Grupos de animales o finalidades productivas para los que puede habilitarse un potrero.',
  },

  razas: {
    accionNuevo: 'Nueva raza',
    titulo: 'Razas',
    singular: 'raza',
    descripcion:
      'Razas bovinas utilizadas para identificar la composición genética y orientación productiva de los animales.',
  },

  colores: {
    accionNuevo: 'Nuevo color',
    titulo: 'Colores',
    singular: 'color',
    descripcion:
      'Colores y patrones de pelaje utilizados para describir e identificar visualmente a los bovinos.',
  },

  'tipos-parto': {
    accionNuevo: 'Nuevo tipo de parto',
    titulo: 'Tipos de parto',
    singular: 'tipo de parto',
    descripcion:
      'Clasificaciones utilizadas para registrar cómo ocurrió el parto, su dificultad y la asistencia brindada.',
  },
} as const

type TipoCatalogo =
  keyof typeof configuracion

const PAGE_SIZE = 6

export function CatalogosMaestrosPagina() {
  const tipoParametro =
    useParams().tipo as
      | TipoCatalogo
      | undefined

  const tipo =
    tipoParametro &&
    tipoParametro in configuracion
      ? tipoParametro
      : 'razas'

  const cfg =
    configuracion[tipo]

  const [
    editing,
    setEditing,
  ] = useState<CatalogItem | null | undefined>(
    undefined,
  )

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

  const client =
    useQueryClient()

  const query = useQuery({
    queryKey: [
      'catalog',
      tipo,
      incluirInactivos,
    ],

    queryFn: () => {
      const params =
        new URLSearchParams({
          incluirInactivos:
            String(
              incluirInactivos,
            ),
        })

      return api<CatalogItem[]>(
        `/catalogos/${tipo}?${params.toString()}`,
      )
    },
  })

  const hasParent =
    'padre' in cfg

  const parentType =
    hasParent
      ? cfg.padre
      : 'paises'

  const parentLabel =
    hasParent
      ? cfg.etiquetaPadre
      : ''

  const parents = useQuery({
    queryKey: [
      'catalog-parent',
      parentType,
    ],

    enabled: hasParent,

    queryFn: () =>
      api<CatalogItem[]>(
        `/catalogos/${parentType}`,
      ),
  })

  const parentNames =
    useMemo(
      () =>
        new Map(
          (
            parents.data ?? []
          ).map(item => [
            item.id,
            item.nombre,
          ]),
        ),
      [parents.data],
    )

  const items = useMemo(() => ordenarPorCodigo(query.data ?? []), [query.data])
  const parentItems = useMemo(() => ordenarPorCodigo(parents.data ?? []), [parents.data])

  const filteredItems =
    useMemo(() => {
      const term =
        search
          .trim()
          .toLocaleLowerCase(
            'es-GT',
          )

      if (!term) {
        return items
      }

      return items.filter(item => {
        const parentName =
          item.catalogoPadreId
            ? parentNames.get(
                item.catalogoPadreId,
              ) ?? ''
            : ''

        return [
          item.codigo,
          item.nombre,
          item.descripcion ?? '',
          parentName,
          item.activo
            ? 'activo'
            : 'inactivo',
        ].some(value =>
          value
            .toLocaleLowerCase(
              'es-GT',
            )
            .includes(term),
        )
      })
    }, [
      items,
      search,
      parentNames,
    ])

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredItems.length /
        PAGE_SIZE,
    ),
  )

  const currentPage = Math.min(
    page,
    totalPages,
  )

  const visibleItems =
    filteredItems.slice(
      (currentPage - 1) *
        PAGE_SIZE,
      currentPage * PAGE_SIZE,
    )

  const columnasExportacion =
    useMemo<
      ColumnaExportacion<CatalogItem>[]
    >(
      () => [
        {
          id: 'codigo',
          titulo: 'Código',
          seleccionadaPorDefecto:
            true,
          obtenerValor: item =>
            item.codigo,
        },

        {
          id: 'nombre',
          titulo: 'Nombre',
          seleccionadaPorDefecto:
            true,
          obtenerValor: item =>
            item.nombre,
        },

        {
          id: 'descripcion',
          titulo: 'Descripción',
          seleccionadaPorDefecto:
            true,
          obtenerValor: item =>
            item.descripcion ?? '',
        },

        {
          id: 'padre',
          titulo:
            parentLabel ||
            'Catálogo padre',
          seleccionadaPorDefecto:
            hasParent,
          obtenerValor: item =>
            item.catalogoPadreId
              ? parentNames.get(
                  item.catalogoPadreId,
                ) ?? ''
              : '',
        },

        {
          id: 'estado',
          titulo: 'Estado',
          seleccionadaPorDefecto:
            true,
          obtenerValor: item =>
            item.activo
              ? 'Activo'
              : 'Inactivo',
        },
      ],
      [
        hasParent,
        parentLabel,
        parentNames,
      ],
    )

  useEffect(() => {
    setPage(1)
    setEditing(undefined)
    setSearch('')
  }, [
    tipo,
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

  const submit = async (
    event:
      FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    const form =
      event.currentTarget

    const data =
      new FormData(form)

    const body = {
      nombre: String(
        data.get('nombre') ||
          '',
      ).trim(),

      descripcion:
        String(
          data.get(
            'descripcion',
          ) || '',
        ).trim() || null,

      catalogoPadreId:
        String(
          data.get('padre') ||
            '',
        ) || null,
    }

    try {
      await api(
        editing
          ? `/catalogos/${tipo}/${editing.id}`
          : `/catalogos/${tipo}`,
        {
          method: editing
            ? 'PUT'
            : 'POST',

          body:
            JSON.stringify(body),
        },
      )

      setEditing(undefined)
      form.reset()

      await client
        .invalidateQueries({
          queryKey: [
            'catalog',
          ],
        })
    } catch {
      // La notificación global presenta el error.
    }
  }

  const cambiarEstado = async (
    item: CatalogItem,
  ) => {
    try {
      await api(
        item.activo
          ? `/catalogos/${tipo}/${item.id}`
          : `/catalogos/${tipo}/${item.id}/reactivar`,
        {
          method: item.activo
            ? 'DELETE'
            : 'POST',
        },
      )

      if (
        editing?.id === item.id
      ) {
        setEditing(undefined)
      }

      await client
        .invalidateQueries({
          queryKey: [
            'catalog',
          ],
        })
    } catch {
      // La notificación global presenta el error.
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Datos maestros"
        title={cfg.titulo}
        description={
          cfg.descripcion
        }
        actions={<div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={
              filteredItems.length ===
              0
            }
            onClick={() =>
              setModalExportacionAbierto(
                true,
              )
            }
          >
            <Download size={17} />
            Exportar
          </Button>
          <Button type="button" onClick={() => setEditing(null)}><Plus size={17}/>{cfg.accionNuevo}</Button>
        </div>}
      />

      <div className="grid gap-5">
        {editing !== undefined && <Card>
          <div className="flex items-start justify-between gap-3"><h2 className="font-display text-lg font-bold">
            {editing ? `Editar ${cfg.singular} ${editing.codigo}` : cfg.accionNuevo}
          </h2><IconButton label="Cerrar formulario" onClick={() => setEditing(undefined)}><X size={18}/></IconButton></div>

          <form
            key={
              editing?.id ??
              `new-${tipo}`
            }
            onSubmit={event =>
              void submit(event)
            }
            className="mt-4 grid gap-4"
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
              label="Nombre"
              name="nombre"
              defaultValue={
                editing?.nombre ??
                ''
              }
              required
            />

            {hasParent && (
              <Select
                label={
                  parentLabel
                }
                name="padre"
                defaultValue={
                  editing
                    ?.catalogoPadreId ??
                  ''
                }
                required
              >
                <option value="">
                  Seleccionar…
                </option>

                {parentItems.map(
                  item => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.codigo} · {item.nombre}
                    </option>
                  ),
                )}
              </Select>
            )}

            <Input
              label="Descripción"
              name="descripcion"
              defaultValue={
                editing
                  ?.descripcion ??
                ''
              }
            />

            <div className="flex gap-2">
              <Button type="submit">
                {editing
                  ? 'Guardar cambios'
                  : 'Guardar'}
              </Button>

              <Button type="button" variant="ghost" onClick={() => setEditing(undefined)}>Cancelar</Button>
            </div>
          </form>
        </Card>}

        <div className="grid content-start gap-4">
          <Card className="!p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full max-w-lg">
                <Search
                  className="pointer-events-none absolute left-3 top-3 text-slate-400"
                  size={18}
                />

                <Input
                  aria-label={`Buscar ${cfg.titulo}`}
                  placeholder="Código, nombre o descripción…"
                  className="pl-10"
                  value={search}
                  onChange={event =>
                    setSearch(
                      event.target.value,
                    )
                  }
                />
              </div>

              <label className="flex min-h-11 shrink-0 items-center gap-2 px-2 text-sm text-slate-600 dark:text-slate-300">
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

          {query.isLoading && (
            <Card>
              <p className="text-sm text-slate-500">
                Cargando catálogo…
              </p>
            </Card>
          )}

          {query.isError && (
            <Card>
              <p className="text-sm text-red-700 dark:text-red-300">
                {query.error instanceof
                Error
                  ? query.error
                      .message
                  : 'No se pudo cargar el catálogo.'}
              </p>
            </Card>
          )}

          {!query.isLoading &&
            !query.isError &&
            visibleItems.map(
              item => (
                <Card
                  key={item.id}
                  className={
                    item.activo
                      ? ''
                      : 'opacity-70'
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wider text-pine-600 dark:text-pine-300">
                        Código{' '}
                        {item.codigo}
                      </p>

                      <h2 className="mt-1 break-words font-display text-lg font-bold">
                        {item.nombre}
                      </h2>

                      {item.descripcion && (
                        <p className="mt-2 break-words text-sm text-slate-500 dark:text-slate-400">
                          {
                            item.descripcion
                          }
                        </p>
                      )}

                      {item.catalogoPadreId && (
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {parentLabel}:{' '}
                          {parentNames.get(
                            item.catalogoPadreId,
                          ) ??
                            'No disponible'}
                        </p>
                      )}

                      {!item.activo && (
                        <p className="mt-3 inline-flex rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          Inactivo
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 gap-2">
                      {item.activo && (
                        <IconButton
                          label={`Editar ${item.nombre}`}
                          tone="edit"
                          onClick={() =>
                            setEditing(
                              item,
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
                          item.activo
                            ? `Desactivar ${item.nombre}`
                            : `Reactivar ${item.nombre}`
                        }
                        tone={
                          item.activo
                            ? 'danger'
                            : 'success'
                        }
                        onClick={() =>
                          void cambiarEstado(
                            item,
                          )
                        }
                      >
                        {item.activo ? (
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
                </Card>
              ),
            )}

          {!query.isLoading &&
            !query.isError &&
            filteredItems.length ===
              0 && (
              <Card>
                <EmptyState
                  title={`Sin ${cfg.titulo.toLowerCase()}`}
                  detail={
                    search
                      ? 'No existen registros que coincidan con la búsqueda.'
                      : 'Agrega el primer registro de este catálogo.'
                  }
                />
              </Card>
            )}

          {!query.isLoading &&
            !query.isError &&
            filteredItems.length >
              0 && (
              <Pagination
                page={currentPage}
                totalPages={
                  totalPages
                }
                totalItems={
                  filteredItems.length
                }
                pageSize={
                  PAGE_SIZE
                }
                onPageChange={
                  setPage
                }
                label={`Paginación de ${cfg.titulo}`}
              />
            )}
        </div>
      </div>

      <ModalExportacion
        abierto={
          modalExportacionAbierto
        }
        onCerrar={() =>
          setModalExportacionAbierto(
            false,
          )
        }
        titulo={`Exportar ${cfg.titulo.toLowerCase()}`}
        descripcion="Selecciona el formato y las columnas que deseas incluir."
        tituloReporte={`BovItzá · ${cfg.titulo}`}
        nombreArchivo={tipo}
        nombreHoja={
          cfg.titulo.slice(0, 31)
        }
        datos={filteredItems}
        columnas={
          columnasExportacion
        }
        descripcionFiltros={
          search.trim()
            ? `Búsqueda: ${search.trim()}`
            : incluirInactivos
              ? 'Estado: activos e inactivos'
              : 'Estado: solamente activos'
        }
      />
    </>
  )
}
