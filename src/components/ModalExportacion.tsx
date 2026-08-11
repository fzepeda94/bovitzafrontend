import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  Download,
  FileSpreadsheet,
  FileText,
  X,
} from 'lucide-react'

import {
  Button,
  IconButton,
} from './ui'

export type FormatoExportacion =
  | 'excel'
  | 'pdf'

export type ValorExportacion =
  | string
  | number
  | boolean
  | null
  | undefined

export type ColumnaExportacion<T> = {
  id: string
  titulo: string
  obtenerValor: (
    registro: T,
  ) => ValorExportacion
  seleccionadaPorDefecto?: boolean
}

type ModalExportacionProps<T> = {
  abierto: boolean
  onCerrar: () => void
  titulo: string
  descripcion?: string
  tituloReporte: string
  nombreArchivo: string
  nombreHoja?: string
  datos: T[]
  columnas: ColumnaExportacion<T>[]
  descripcionFiltros?: string
}

function normalizarValor(
  valor: ValorExportacion,
): string | number | boolean {
  if (
    valor === null ||
    valor === undefined
  ) {
    return ''
  }

  return valor
}

function normalizarNombreArchivo(
  nombre: string,
) {
  return nombre
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      '',
    )
    .replace(
      /[^a-z0-9-_]+/g,
      '-',
    )
    .replace(/^-+|-+$/g, '')
}

function normalizarNombreHoja(
  nombre: string,
) {
  const nombreLimpio = nombre
    .replace(
      /[:\\/?*\[\]]/g,
      '',
    )
    .trim()

  return (
    nombreLimpio.slice(0, 31) ||
    'Datos'
  )
}

export function ModalExportacion<T>({
  abierto,
  onCerrar,
  titulo,
  descripcion,
  tituloReporte,
  nombreArchivo,
  nombreHoja = 'Datos',
  datos,
  columnas,
  descripcionFiltros,
}: ModalExportacionProps<T>) {
  const [
    formato,
    setFormato,
  ] = useState<FormatoExportacion>(
    'excel',
  )

  const [
    columnasSeleccionadas,
    setColumnasSeleccionadas,
  ] = useState<string[]>([])

  const [
    exportando,
    setExportando,
  ] = useState(false)

  const [
    errorExportacion,
    setErrorExportacion,
  ] = useState('')

  const columnasPorDefecto =
    useMemo(
      () =>
        columnas
          .filter(
            columna =>
              columna
                .seleccionadaPorDefecto !==
              false,
          )
          .map(
            columna => columna.id,
          ),
      [columnas],
    )

  const columnasActivas =
    useMemo(
      () =>
        columnas.filter(
          columna =>
            columnasSeleccionadas.includes(
              columna.id,
            ),
        ),
      [
        columnas,
        columnasSeleccionadas,
      ],
    )

  const todasSeleccionadas =
    columnas.length > 0 &&
    columnasSeleccionadas.length ===
      columnas.length

  useEffect(() => {
    if (!abierto) {
      return
    }

    setFormato('excel')
    setColumnasSeleccionadas(
      columnasPorDefecto,
    )
    setErrorExportacion('')

    const overflowOriginal =
      document.body.style.overflow

    document.body.style.overflow =
      'hidden'

    const manejarTeclado = (
      event: KeyboardEvent,
    ) => {
      if (event.key === 'Escape') {
        onCerrar()
      }
    }

    window.addEventListener(
      'keydown',
      manejarTeclado,
    )

    return () => {
      document.body.style.overflow =
        overflowOriginal

      window.removeEventListener(
        'keydown',
        manejarTeclado,
      )
    }
  }, [
    abierto,
    columnasPorDefecto,
    onCerrar,
  ])

  const alternarColumna = (
    columnaId: string,
  ) => {
    setColumnasSeleccionadas(
      actuales =>
        actuales.includes(columnaId)
          ? actuales.filter(
              id => id !== columnaId,
            )
          : [
              ...actuales,
              columnaId,
            ],
    )
  }

  const seleccionarTodas = () => {
    setColumnasSeleccionadas(
      columnas.map(
        columna => columna.id,
      ),
    )
  }

  const quitarTodas = () => {
    setColumnasSeleccionadas([])
  }

  const exportarExcel =
    async () => {
      const XLSX =
        await import('xlsx')

      const encabezados =
        columnasActivas.map(
          columna =>
            columna.titulo,
        )

      const filas = datos.map(
        registro =>
          columnasActivas.map(
            columna =>
              normalizarValor(
                columna.obtenerValor(
                  registro,
                ),
              ),
          ),
      )

      const hoja =
        XLSX.utils.aoa_to_sheet([
          encabezados,
          ...filas,
        ])

      hoja['!cols'] =
        columnasActivas.map(
          (
            columna,
            indice,
          ) => {
            const longitudMaxima =
              Math.max(
                columna.titulo.length,
                ...filas.map(fila =>
                  String(
                    fila[indice] ?? '',
                  ).length,
                ),
              )

            return {
              wch: Math.min(
                45,
                Math.max(
                  12,
                  longitudMaxima + 2,
                ),
              ),
            }
          },
        )

      hoja['!freeze'] = {
        xSplit: 0,
        ySplit: 1,
      }

      const libro =
        XLSX.utils.book_new()

      XLSX.utils.book_append_sheet(
        libro,
        hoja,
        normalizarNombreHoja(
          nombreHoja,
        ),
      )

      const fecha = new Date()
        .toISOString()
        .slice(0, 10)

      XLSX.writeFile(
        libro,
        `${normalizarNombreArchivo(
          nombreArchivo,
        )}-${fecha}.xlsx`,
        {
          compression: true,
        },
      )
    }

  const exportarPdf = async () => {
    const [
      { jsPDF },
      { default: autoTable },
    ] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ])

    const usarHorizontal =
      columnasActivas.length > 6

    const documento = new jsPDF({
      orientation: usarHorizontal
        ? 'landscape'
        : 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const anchoPagina =
      documento.internal.pageSize
        .getWidth()

    const altoPagina =
      documento.internal.pageSize
        .getHeight()

    documento.setFont(
      'helvetica',
      'bold',
    )
    documento.setFontSize(17)

    documento.text(
      tituloReporte,
      12,
      16,
    )

    documento.setFont(
      'helvetica',
      'normal',
    )
    documento.setFontSize(9)

    documento.text(
      `Fecha de exportación: ${new Date().toLocaleDateString(
        'es-GT',
      )}`,
      12,
      23,
    )

    documento.text(
      `Registros exportados: ${datos.length}`,
      12,
      28,
    )

    if (descripcionFiltros) {
      documento.text(
        descripcionFiltros,
        12,
        33,
        {
          maxWidth:
            anchoPagina - 24,
        },
      )
    }

    const inicioTabla =
      descripcionFiltros
        ? 39
        : 34

    autoTable(documento, {
      startY: inicioTabla,

      head: [
        columnasActivas.map(
          columna =>
            columna.titulo,
        ),
      ],

      body: datos.map(
        registro =>
          columnasActivas.map(
            columna =>
              String(
                normalizarValor(
                  columna.obtenerValor(
                    registro,
                  ),
                ),
              ) || '—',
          ),
      ),

      margin: {
        left: 10,
        right: 10,
        bottom: 15,
      },

      styles: {
        fontSize:
          columnasActivas.length >
          9
            ? 6
            : columnasActivas.length >
                6
              ? 7
              : 8,

        cellPadding: 2,
        overflow: 'linebreak',
        valign: 'middle',
      },

      headStyles: {
        fillColor: [
          18,
          80,
          65,
        ],
        textColor: 255,
        fontStyle: 'bold',
      },

      alternateRowStyles: {
        fillColor: [
          245,
          247,
          244,
        ],
      },

      didDrawPage: data => {
        documento.setFontSize(8)
        documento.setTextColor(
          100,
        )

        documento.text(
          `Página ${data.pageNumber}`,
          anchoPagina - 27,
          altoPagina - 7,
        )
      },
    })

    const fecha = new Date()
      .toISOString()
      .slice(0, 10)

    documento.save(
      `${normalizarNombreArchivo(
        nombreArchivo,
      )}-${fecha}.pdf`,
    )
  }

  const exportar = async () => {
    if (
      columnasActivas.length === 0
    ) {
      setErrorExportacion(
        'Selecciona al menos una columna para exportar.',
      )

      return
    }

    if (datos.length === 0) {
      setErrorExportacion(
        'No existen registros para exportar.',
      )

      return
    }

    setErrorExportacion('')
    setExportando(true)

    try {
      if (formato === 'excel') {
        await exportarExcel()
      } else {
        await exportarPdf()
      }

      onCerrar()
    } catch (error) {
      setErrorExportacion(
        error instanceof Error
          ? error.message
          : 'No fue posible generar el archivo.',
      )
    } finally {
      setExportando(false)
    }
  }

  if (!abierto) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm"
      onMouseDown={event => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onCerrar()
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-modal-exportacion"
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-700">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-pine-600 dark:text-emerald-300">
              Exportación personalizada
            </p>

            <h2
              id="titulo-modal-exportacion"
              className="mt-1 font-display text-2xl font-extrabold"
            >
              {titulo}
            </h2>

            {descripcion && (
              <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                {descripcion}
              </p>
            )}
          </div>

          <IconButton
            label="Cerrar ventana de exportación"
            onClick={onCerrar}
          >
            <X size={19} />
          </IconButton>
        </header>

        <div className="overflow-y-auto px-6 py-5">
          <section>
            <h3 className="font-display text-base font-bold">
              Formato del archivo
            </h3>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                aria-pressed={
                  formato === 'excel'
                }
                onClick={() =>
                  setFormato('excel')
                }
                className={`flex items-center gap-4 rounded-2xl border p-4 text-left transition ${
                  formato === 'excel'
                    ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100 dark:border-emerald-500 dark:bg-emerald-950/40 dark:ring-emerald-900'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-800'
                }`}
              >
                <span
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
                    formato === 'excel'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  <FileSpreadsheet
                    size={21}
                  />
                </span>

                <span>
                  <span className="block font-semibold">
                    Excel
                  </span>

                  <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                    Archivo editable
                    con extensión .xlsx
                  </span>
                </span>
              </button>

              <button
                type="button"
                aria-pressed={
                  formato === 'pdf'
                }
                onClick={() =>
                  setFormato('pdf')
                }
                className={`flex items-center gap-4 rounded-2xl border p-4 text-left transition ${
                  formato === 'pdf'
                    ? 'border-red-500 bg-red-50 ring-2 ring-red-100 dark:border-red-500 dark:bg-red-950/30 dark:ring-red-900'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-800'
                }`}
              >
                <span
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
                    formato === 'pdf'
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  <FileText size={21} />
                </span>

                <span>
                  <span className="block font-semibold">
                    PDF
                  </span>

                  <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                    Documento listo
                    para imprimir
                  </span>
                </span>
              </button>
            </div>
          </section>

          <section className="mt-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-base font-bold">
                  Columnas a exportar
                </h3>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {
                    columnasSeleccionadas.length
                  }{' '}
                  de {columnas.length}{' '}
                  columnas seleccionadas
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={
                    seleccionarTodas
                  }
                  disabled={
                    todasSeleccionadas
                  }
                >
                  Seleccionar todas
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={quitarTodas}
                  disabled={
                    columnasSeleccionadas.length ===
                    0
                  }
                >
                  Quitar todas
                </Button>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {columnas.map(
                columna => {
                  const seleccionada =
                    columnasSeleccionadas.includes(
                      columna.id,
                    )

                  return (
                    <label
                      key={
                        columna.id
                      }
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${
                        seleccionada
                          ? 'border-pine-300 bg-pine-50 dark:border-emerald-800 dark:bg-emerald-950/30'
                          : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={
                          seleccionada
                        }
                        onChange={() =>
                          alternarColumna(
                            columna.id,
                          )
                        }
                        className="h-4 w-4 rounded border-slate-300 accent-emerald-700"
                      />

                      <span className="text-sm font-medium">
                        {
                          columna.titulo
                        }
                      </span>
                    </label>
                  )
                },
              )}
            </div>
          </section>

          <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm dark:bg-slate-800">
            <p className="font-semibold">
              Resumen de la exportación
            </p>

            <p className="mt-1 text-slate-500 dark:text-slate-400">
              Se exportarán{' '}
              <strong>
                {datos.length}
              </strong>{' '}
              registros en formato{' '}
              <strong>
                {formato === 'excel'
                  ? 'Excel'
                  : 'PDF'}
              </strong>
              .
            </p>

            {descripcionFiltros && (
              <p className="mt-1 text-xs text-slate-400">
                {descripcionFiltros}
              </p>
            )}
          </div>

          {errorExportacion && (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200"
            >
              {errorExportacion}
            </p>
          )}
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 px-6 py-5 sm:flex-row sm:justify-end dark:border-slate-700">
          <Button
            type="button"
            variant="ghost"
            onClick={onCerrar}
            disabled={exportando}
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={() =>
              void exportar()
            }
            disabled={
              exportando ||
              datos.length === 0 ||
              columnasActivas.length ===
                0
            }
          >
            <Download size={17} />

            {exportando
              ? 'Generando archivo…'
              : formato === 'excel'
                ? 'Exportar Excel'
                : 'Exportar PDF'}
          </Button>
        </footer>
      </section>
    </div>
  )
}