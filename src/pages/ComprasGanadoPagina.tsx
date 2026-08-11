import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2 } from 'lucide-react'
import { api } from '../lib/api'
import { notify, requestConfirmation } from '../lib/feedback'
import type { CatalogItem, Entity, PagedResult } from '../types'
import { Button, Card, Input, Select } from '../components/ui'
import { PageHeader } from '../components/Page'

interface Compra { id: string; codigo: string; nombre: string; fechaCompra: string; cantidadEsperada: number; cantidadRegistrada: number; precioCompraOriginal: number; estado: string }

export function ComprasGanadoPagina() {
  const [cantidad, setCantidad] = useState(1)
  const client = useQueryClient()
  const entities = useQuery({ queryKey: ['entities'], queryFn: () => api<PagedResult<Entity>>('/entidades?pageSize=100') })
  const breeds = useQuery({ queryKey: ['catalog', 'razas'], queryFn: () => api<CatalogItem[]>('/catalogos/razas') })
  const colors = useQuery({ queryKey: ['catalog', 'colores'], queryFn: () => api<CatalogItem[]>('/catalogos/colores') })
  const purchases = useQuery({ queryKey: ['purchases'], queryFn: () => api<Compra[]>('/compras-ganado') })

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const animales = Array.from({ length: cantidad }, (_, index) => ({
      sexo: data.get(`sexo-${index}`), categoria: data.get(`categoria-${index}`), arete: String(data.get(`arete-${index}`) || '') || null,
      fechaNacimiento: String(data.get(`nacimiento-${index}`) || '') || null, razaId: String(data.get(`raza-${index}`) || '') || null,
      colorId: String(data.get(`color-${index}`) || '') || null, precioIndividual: data.get(`precio-${index}`) ? Number(data.get(`precio-${index}`)) : null,
    }))
    const body = { fechaCompra: data.get('fecha'), propietarioAdquirenteId: data.get('comprador'), vendedorId: data.get('vendedor') || null,
      nombreLote: data.get('nombre'), precioCompra: Number(data.get('precio')), gastosTransporte: Number(data.get('transporte') || 0),
      gastosVeterinarios: Number(data.get('veterinarios') || 0), otrosGastos: Number(data.get('otros') || 0), documento: data.get('documento') || null,
      observaciones: data.get('observaciones') || null, animales }
    try {
      await api('/compras-ganado', { method: 'POST', body: JSON.stringify(body) })
      notify({ tone: 'success', title: 'Borrador creado', message: 'La compra todavía no afecta el inventario. Revísala y confírmala cuando esté completa.' })
      form.reset(); setCantidad(1); await client.invalidateQueries({ queryKey: ['purchases'] })
    } catch (error) { notify({ tone: 'error', title: 'No se guardó la compra', message: error instanceof Error ? error.message : 'Ocurrió un error inesperado.' }) }
  }

  const confirmar = async (compra: Compra) => {
    if (!await requestConfirmation({ title: 'Confirmar compra', message: `Se crearán ${compra.cantidadEsperada} bovino(s) y sus entradas de inventario. Esta operación no se puede editar después.`, confirmLabel: 'Confirmar compra', cancelLabel: 'Volver' })) return
    try {
      await api(`/compras-ganado/${compra.id}/confirmar`, { method: 'POST' })
      notify({ tone: 'success', title: 'Compra confirmada', message: 'Los bovinos ingresaron correctamente al inventario.' })
      await Promise.all([client.invalidateQueries({ queryKey: ['purchases'] }), client.invalidateQueries({ queryKey: ['animals'] })])
    } catch (error) { notify({ tone: 'error', title: 'No se confirmó la compra', message: error instanceof Error ? error.message : 'Ocurrió un error inesperado.' }) }
  }

  return <>
    <PageHeader eyebrow="Entradas" title="Compras de ganado" description="Registra la compra como borrador. Los bovinos ingresan al inventario únicamente al confirmarla." />
    <Card><form onSubmit={event => void submit(event)} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-3"><Input name="fecha" label="Fecha de compra *" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /><Select name="comprador" label="Entidad adquirente *" required><option value="">Seleccionar…</option>{entities.data?.items.map(x => <option key={x.id} value={x.id}>{x.codigo} · {x.nombreCompletoORazonSocial}</option>)}</Select><Select name="vendedor" label="Entidad vendedora"><option value="">No especificada</option>{entities.data?.items.map(x => <option key={x.id} value={x.id}>{x.codigo} · {x.nombreCompletoORazonSocial}</option>)}</Select><Input name="nombre" label="Nombre de la compra *" required /><Input name="documento" label="Factura o documento" /><Input label="Cantidad de bovinos *" type="number" min="1" max="100" value={cantidad} onChange={e => setCantidad(Math.max(1, Math.min(100, Number(e.target.value))))} /><Input name="precio" label="Precio total del ganado (GTQ) *" type="number" min="0" step="0.01" required /><Input name="transporte" label="Transporte (GTQ)" type="number" min="0" step="0.01" /><Input name="veterinarios" label="Gastos veterinarios (GTQ)" type="number" min="0" step="0.01" /><Input name="otros" label="Otros gastos (GTQ)" type="number" min="0" step="0.01" /><Input name="observaciones" label="Observaciones" className="md:col-span-2" /></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-sm"><thead><tr className="text-left text-slate-500">{['#','Sexo *','Categoría *','Arete','Nacimiento','Raza','Color','Precio individual'].map(x => <th key={x} className="p-2">{x}</th>)}</tr></thead><tbody>{Array.from({ length: cantidad }, (_, index) => <tr key={index} className="border-t border-slate-200 dark:border-slate-700"><td className="p-2 font-semibold">{index + 1}</td><td className="p-2"><select name={`sexo-${index}`} required className="rounded-lg border bg-transparent p-2"><option>Hembra</option><option>Macho</option></select></td><td className="p-2"><select name={`categoria-${index}`} required className="rounded-lg border bg-transparent p-2"><option>Vaca</option><option>Novilla</option><option>Ternera</option><option>Ternero</option><option>Novillo</option><option>Toro</option></select></td><td className="p-2"><input name={`arete-${index}`} className="w-28 rounded-lg border bg-transparent p-2" /></td><td className="p-2"><input name={`nacimiento-${index}`} type="date" className="rounded-lg border bg-transparent p-2" /></td><td className="p-2"><select name={`raza-${index}`} className="rounded-lg border bg-transparent p-2"><option value="">No especificada</option>{breeds.data?.map(x => <option key={x.id} value={x.id}>{x.nombre}</option>)}</select></td><td className="p-2"><select name={`color-${index}`} className="rounded-lg border bg-transparent p-2"><option value="">No especificado</option>{colors.data?.map(x => <option key={x.id} value={x.id}>{x.nombre}</option>)}</select></td><td className="p-2"><input name={`precio-${index}`} type="number" min="0" step="0.01" className="w-32 rounded-lg border bg-transparent p-2" /></td></tr>)}</tbody></table></div>
      <div><Button type="submit">Guardar borrador</Button></div>
    </form></Card>
    <Card className="mt-5"><h2 className="font-display text-lg font-bold">Compras registradas</h2><div className="mt-3 grid gap-2">{purchases.data?.map(item => <div key={item.id} className="flex flex-col gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{item.codigo} · {item.nombre}</p><p className="text-xs text-slate-500">{new Date(item.fechaCompra).toLocaleDateString('es-GT')} · {item.cantidadEsperada} bovino(s) · {item.estado}</p></div><div className="flex items-center gap-3"><p className="font-semibold">Q {item.precioCompraOriginal.toFixed(2)}</p>{item.estado === 'Borrador' && <button type="button" onClick={() => void confirmar(item)} title="Confirmar compra" className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-500"><CheckCircle2 size={20} /></button>}</div></div>)}</div></Card>
  </>
}
