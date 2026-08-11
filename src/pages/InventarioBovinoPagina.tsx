import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Download, FileText, Plus, Search } from 'lucide-react'
import { api } from '../lib/api'
import type { Animal, PagedResult } from '../types'
import { Badge, Button, Card, EmptyState, Input } from '../components/ui'
import { PageHeader } from '../components/Page'

export function AnimalsPage() {
  const [search, setSearch] = useState('')
  const query = useQuery({ queryKey: ['animals', search], queryFn: () => api<PagedResult<Animal>>(`/animales?page=1&pageSize=100&search=${encodeURIComponent(search)}`) })
  const animals = query.data?.items ?? []
  const exportExcel = () => {
    const xmlEscape = (value: string) => value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')
    const rows = [['Código','Arete','Propietario','Sexo','Categoría','Estado','Nacimiento'], ...animals.map(x => [x.codigoAnimal,x.arete??'',x.propietario,x.sexo,x.categoria,x.estadoVida,x.fechaNacimiento??'Desconocida'])]
    const xml = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Inventario"><Table>${rows.map(row=>`<Row>${row.map(cell=>`<Cell><Data ss:Type="String">${xmlEscape(cell)}</Data></Cell>`).join('')}</Row>`).join('')}</Table></Worksheet></Workbook>`
    const url=URL.createObjectURL(new Blob([xml],{type:'application/vnd.ms-excel'}));const anchor=document.createElement('a');anchor.href=url;anchor.download=`inventario-${new Date().toISOString().slice(0,10)}.xls`;anchor.click();URL.revokeObjectURL(url)
  }
  const exportPdf = async () => {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
    const doc = new jsPDF(); doc.setFontSize(18); doc.text('BovItzá · Inventario actual', 14, 18); doc.setFontSize(9); doc.text(`Ganadería Familia Zepeda · ${new Date().toLocaleDateString('es-GT')}`, 14, 25)
    autoTable(doc, { startY: 31, head: [['Código','Arete','Propietario','Sexo','Categoría','Estado']], body: animals.map(x => [x.codigoAnimal, x.arete ?? '—', x.propietario, x.sexo, x.categoria, x.estadoVida]), didDrawPage: data => { doc.text(`Página ${data.pageNumber}`, 180, 290) } })
    doc.save(`inventario-${new Date().toISOString().slice(0,10)}.pdf`)
  }
  return <>
    <PageHeader eyebrow="Inventario actual" title="Animales" description="Aquí aparecen únicamente los bovinos activos. Cada entrada y salida queda respaldada por un proceso y un movimiento de inventario." actions={<><Button variant="secondary" onClick={exportExcel} disabled={!animals.length}><Download size={17}/> Excel</Button><Button variant="secondary" onClick={() => void exportPdf()} disabled={!animals.length}><FileText size={17}/> PDF</Button><Link to="/animales/nuevo"><Button><Plus size={17}/> Carga inicial</Button></Link></>} />
    <Card className="!p-3"><div className="relative max-w-lg"><Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18}/><Input aria-label="Buscar animales" placeholder="Código, arete o referencia…" className="pl-10" value={search} onChange={event => setSearch(event.target.value)}/></div></Card>
    <Card className="mt-4 !p-0 overflow-hidden">{query.isLoading ? <div className="p-8 text-sm text-slate-500">Cargando inventario…</div> : query.isError ? <div className="p-8 text-sm text-red-700">{query.error.message}</div> : !animals.length ? <div className="p-5"><EmptyState title="Aún no hay animales confirmados" detail="Los lotes ya están listos. Registra los animales manualmente para validar cada ficha."/></div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-800"><tr>{['Código','Arete','Propietario','Sexo','Categoría','Nacimiento','Estado'].map(x => <th key={x} className="px-5 py-3 font-semibold">{x}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{animals.map(animal => <tr key={animal.id} className="hover:bg-pine-50/50 dark:hover:bg-slate-800/60"><td className="px-5 py-4"><Link to={`/animales/${animal.id}`} className="font-display font-bold text-pine-700 hover:underline dark:text-emerald-300">{animal.codigoAnimal}</Link></td><td className="px-5 py-4">{animal.arete ?? <span className="text-slate-400">Sin arete</span>}</td><td className="px-5 py-4 font-medium">{animal.propietario}</td><td className="px-5 py-4">{animal.sexo}</td><td className="px-5 py-4">{animal.categoria}</td><td className="px-5 py-4">{animal.fechaNacimiento ? new Date(animal.fechaNacimiento).toLocaleDateString('es-GT') : <span className="text-slate-400">Desconocida</span>}</td><td className="px-5 py-4"><Badge tone={animal.estadoVida === 'Activo' ? 'success' : 'neutral'}>{animal.estadoVida}</Badge></td></tr>)}</tbody></table></div>}</Card>
  </>
}
