import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Download, Plus, Search } from 'lucide-react'
import { api } from '../lib/api'
import { obtenerTodosLosRegistros } from '../lib/paginacion'
import type { Animal, PagedResult, TenantSettings } from '../types'
import { Badge, Button, Card, EmptyState, Input, Pagination } from '../components/ui'
import { PageHeader } from '../components/Page'
import { ModalExportacion, type ColumnaExportacion } from '../components/ModalExportacion'

const PAGE_SIZE = 10

export function AnimalsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [datosExportacion, setDatosExportacion] = useState<Animal[]>([])
  const [preparandoExportacion, setPreparandoExportacion] = useState(false)

  useEffect(() => setPage(1), [search])

  const query = useQuery({
    queryKey: ['animals', search, page],
    queryFn: () => api<PagedResult<Animal>>(`/animales?page=${page}&pageSize=${PAGE_SIZE}&search=${encodeURIComponent(search)}`),
  })
  const tenant = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: () => api<TenantSettings>('/configuracion/tenant'),
  })
  const animals = query.data?.items ?? []
  const totalItems = query.data?.total ?? 0
  const totalPages = query.data?.totalPages ?? 1

  const columnas = useMemo<ColumnaExportacion<Animal>[]>(() => [
    { id: 'codigo', titulo: 'Código', obtenerValor: animal => animal.codigoAnimal },
    { id: 'arete', titulo: 'Arete', obtenerValor: animal => animal.arete },
    { id: 'propietario', titulo: 'Propietario', obtenerValor: animal => animal.propietario },
    { id: 'sexo', titulo: 'Sexo', obtenerValor: animal => animal.sexo },
    { id: 'categoria', titulo: 'Categoría', obtenerValor: animal => animal.categoria },
    { id: 'nacimiento', titulo: 'Nacimiento', obtenerValor: animal => animal.fechaNacimiento },
    { id: 'estado', titulo: 'Estado', obtenerValor: animal => animal.estadoVida },
  ], [])

  const abrirExportacion = async () => {
    setPreparandoExportacion(true)
    try {
      const todos = await obtenerTodosLosRegistros<Animal>(pagina =>
        api<PagedResult<Animal>>(`/animales?page=${pagina}&pageSize=100&search=${encodeURIComponent(search)}`))
      setDatosExportacion(todos)
      setModalAbierto(true)
    } finally {
      setPreparandoExportacion(false)
    }
  }

  return <>
    <PageHeader eyebrow="Inventario actual" title="Animales" description="Aquí aparecen únicamente los bovinos activos. Cada entrada y salida queda respaldada por un proceso y un movimiento de inventario." actions={<>
      <Button variant="secondary" onClick={() => void abrirExportacion()} disabled={!totalItems || preparandoExportacion}><Download size={17}/> {preparandoExportacion ? 'Preparando…' : 'Exportar'}</Button>
      <Link to="/animales/nuevo"><Button><Plus size={17}/> Carga inicial</Button></Link>
    </>} />
    <Card className="!p-3"><div className="relative max-w-lg"><Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18}/><Input aria-label="Buscar animales" placeholder="Código, arete o referencia…" className="pl-10" value={search} onChange={event => setSearch(event.target.value)}/></div></Card>
    <Card className="mt-4 !p-0 overflow-hidden">
      {query.isLoading ? <div className="p-8 text-sm text-slate-500">Cargando inventario…</div> : query.isError ? <div className="p-8 text-sm text-red-700">{query.error.message}</div> : !animals.length ? <div className="p-5"><EmptyState title="No hay animales activos en el inventario" detail="Los animales ingresan mediante carga inicial, compras, nacimientos o transferencias recibidas."/></div> : <>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-800"><tr>{['Código','Arete','Propietario','Sexo','Categoría','Nacimiento','Estado'].map(x => <th key={x} className="px-5 py-3 font-semibold">{x}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{animals.map(animal => <tr key={animal.id} className="hover:bg-pine-50/50 dark:hover:bg-slate-800/60"><td className="px-5 py-4"><Link to={`/animales/${animal.id}`} className="font-display font-bold text-pine-700 hover:underline dark:text-emerald-300">{animal.codigoAnimal}</Link></td><td className="px-5 py-4">{animal.arete ?? <span className="text-slate-400">Sin arete</span>}</td><td className="px-5 py-4 font-medium">{animal.propietario}</td><td className="px-5 py-4">{animal.sexo}</td><td className="px-5 py-4">{animal.categoria}</td><td className="px-5 py-4">{animal.fechaNacimiento ? new Date(animal.fechaNacimiento).toLocaleDateString('es-GT') : <span className="text-slate-400">Desconocida</span>}</td><td className="px-5 py-4"><Badge tone={animal.estadoVida === 'Activo' ? 'success' : 'neutral'}>{animal.estadoVida}</Badge></td></tr>)}</tbody></table></div>
        <div className="px-5 pb-5"><Pagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={PAGE_SIZE} onPageChange={setPage} label="Paginación del inventario bovino"/></div>
      </>}
    </Card>
    <ModalExportacion abierto={modalAbierto} onCerrar={() => setModalAbierto(false)} titulo="Exportar inventario bovino" descripcion="Selecciona el formato y las columnas que deseas incluir." tituloReporte={`${tenant.data?.nombre ?? 'BovItzá'} · Inventario bovino`} nombreArchivo="inventario-bovino" nombreHoja="Inventario" datos={datosExportacion} columnas={columnas} descripcionFiltros={search ? `Búsqueda: ${search}` : 'Todos los animales activos'} />
  </>
}
