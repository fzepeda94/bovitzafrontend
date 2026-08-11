import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, CheckCircle2, History, Warehouse } from 'lucide-react'
import { api } from '../lib/api'
import { Badge, Card } from '../components/ui'
import { PageHeader } from '../components/Page'

interface MovimientoResumen { direccion:'Entrada'|'Salida'; tipo:string; cantidad:number }
interface Inconsistencia { animalId:string; codigoAnimal:string; descripcion:string }
interface MovimientoReciente { id:string; fecha:string; direccion:'Entrada'|'Salida'; tipo:string; procesoOrigen:string; codigoAnimal:string; arete:string|null }
interface ResumenInventario { inventarioActual:number; totalAnimalesHistoricos:number; totalEntradas:number; totalSalidas:number; movimientos:MovimientoResumen[]; esConsistente:boolean; inconsistencias:Inconsistencia[]; movimientosRecientes:MovimientoReciente[] }

export function ReporteInventarioPagina(){
  const query=useQuery({queryKey:['reporte-inventario'],queryFn:()=>api<ResumenInventario>('/inventario/resumen')})
  const data=query.data
  return <><PageHeader eyebrow="Análisis y reportes" title="Conciliación de inventario" description="Inventario inicial más entradas reales, menos salidas reales, debe coincidir siempre con el inventario actual."/>
    {query.isLoading&&<Card>Cargando conciliación…</Card>}{query.isError&&<Card><p className="text-red-600">{query.error.message}</p></Card>}
    {data&&<><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metrica icon={Warehouse} label="Inventario actual" value={data.inventarioActual}/><Metrica icon={ArrowDownToLine} label="Entradas" value={data.totalEntradas}/><Metrica icon={ArrowUpFromLine} label="Salidas" value={data.totalSalidas}/><Metrica icon={History} label="Animales históricos" value={data.totalAnimalesHistoricos}/></div>
      <Card className="mt-5"><div className="flex items-center gap-3">{data.esConsistente?<CheckCircle2 className="text-emerald-600"/>:<AlertTriangle className="text-red-600"/>}<div><h2 className="font-display text-lg font-bold">{data.esConsistente?'Inventario conciliado':'Se detectaron inconsistencias'}</h2><p className="text-sm text-slate-500">{data.esConsistente?'Cada animal activo está respaldado por sus movimientos de entrada y salida.':`${data.inconsistencias.length} diferencia(s) requieren revisión administrativa.`}</p></div></div>{data.inconsistencias.length>0&&<div className="mt-4 grid gap-2">{data.inconsistencias.map(x=><div key={`${x.animalId}-${x.descripcion}`} className="rounded-xl bg-red-50 p-3 text-sm text-red-900 dark:bg-red-950 dark:text-red-100"><b>{x.codigoAnimal}</b> · {x.descripcion}</div>)}</div>}</Card>
      <div className="mt-5 grid gap-5 lg:grid-cols-2"><Card><h2 className="font-display text-lg font-bold">Movimientos por origen</h2><div className="mt-4 grid gap-2">{data.movimientos.map(x=><div key={`${x.direccion}-${x.tipo}`} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><span><Badge tone={x.direccion==='Entrada'?'success':'neutral'}>{x.direccion}</Badge> <span className="ml-2 font-medium">{x.tipo}</span></span><b>{x.cantidad}</b></div>)}</div></Card><Card><h2 className="font-display text-lg font-bold">Movimientos recientes</h2><div className="mt-4 grid gap-2">{data.movimientosRecientes.map(x=><div key={x.id} className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800"><div className="flex justify-between gap-3"><b>{x.codigoAnimal}{x.arete?` · Arete ${x.arete}`:''}</b><Badge tone={x.direccion==='Entrada'?'success':'neutral'}>{x.direccion}</Badge></div><p className="mt-1 text-xs text-slate-500">{new Date(x.fecha).toLocaleDateString('es-GT')} · {x.tipo} · {x.procesoOrigen}</p></div>)}</div></Card></div></>}
  </>
}

function Metrica({icon:Icon,label,value}:{icon:typeof Warehouse;label:string;value:number}){return <Card><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-pine-50 text-pine-700 dark:bg-emerald-950 dark:text-emerald-300"><Icon size={22}/></span><div><p className="text-sm text-slate-500">{label}</p><p className="font-display text-2xl font-extrabold">{value}</p></div></div></Card>}
