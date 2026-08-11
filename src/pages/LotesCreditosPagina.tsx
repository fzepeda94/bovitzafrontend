import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Lot } from '../types'
import { Card } from '../components/ui'
import { PageHeader } from '../components/Page'

interface Credit { id: string; principal: number; totalContractual: number; costoFinancieroContractual: number; plazoMeses: number; cantidadCuotas: number; estado: string }
const money = new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ', minimumFractionDigits: 2, maximumFractionDigits: 4 })

export function LotsPage() {
  const lots = useQuery({ queryKey: ['lots'], queryFn: () => api<Lot[]>('/lotes') })
  const credits = useQuery({ queryKey: ['credits'], queryFn: () => api<Credit[]>('/creditos') })
  return <><PageHeader eyebrow="Compras y valoración" title="Lotes y crédito" description="El precio histórico y la base administrativa se conservan separados; nunca se suman dos veces."/><div className="grid gap-5 lg:grid-cols-3">{lots.data?.map(lot => <Card key={lot.id}><div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold">{lot.nombre}</h2><span className="text-xs font-semibold text-pine-600">{lot.estado}</span></div><p className="mt-5 text-3xl font-extrabold">{lot.cantidadRegistrada}<span className="text-base font-medium text-slate-400"> / {lot.cantidadEsperada}</span></p><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-pine-500" style={{ width: `${lot.cantidadEsperada ? lot.cantidadRegistrada / lot.cantidadEsperada * 100 : 0}%` }}/></div><dl className="mt-5 grid gap-2 text-sm"><div className="flex justify-between"><dt className="text-slate-500">Precio original</dt><dd className="font-semibold">{money.format(lot.precioCompraOriginal)}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Base administrativa</dt><dd className="font-semibold">{money.format(lot.costoAdministrativoAtribuido)}</dd></div></dl></Card>)}</div>{credits.data?.map(credit => <Card key={credit.id} className="mt-5"><h2 className="font-display text-lg font-bold">Crédito relacionado con lote 2</h2><div className="mt-5 grid gap-4 sm:grid-cols-3"><Metric label="Principal" value={money.format(credit.principal)}/><Metric label="Total contractual" value={money.format(credit.totalContractual)}/><Metric label="Costo financiero" value={money.format(credit.costoFinancieroContractual)}/></div><p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">La distribución entre capital e interés de cada cuota permanece pendiente hasta ingresar el plan real; el sistema no inventa una tasa.</p></Card>)}</>
}
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800"><p className="text-xs uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 font-display text-xl font-bold">{value}</p></div> }

