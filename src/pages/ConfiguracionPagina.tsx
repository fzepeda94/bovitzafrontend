import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Download, RefreshCw } from 'lucide-react'
import { api } from '../lib/api'
import type { TenantSettings } from '../types'
import { Button, Card, Input } from '../components/ui'
import { PageHeader } from '../components/Page'

export function SettingsPage() {
  const { needRefresh, updateServiceWorker } = useRegisterSW()
  const [status, setStatus] = useState('')
  const client = useQueryClient()
  const settings = useQuery({ queryKey: ['tenant-settings'], queryFn: () => api<TenantSettings>('/configuracion/tenant') })

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    await api<TenantSettings>('/configuracion/tenant', { method: 'PUT', body: JSON.stringify({
      nombre: form.get('nombre'), moneda: form.get('moneda'), cultura: form.get('cultura'),
      unidadPesoPredeterminada: form.get('unidadPeso'), zonaHoraria: form.get('zonaHoraria')
    }) })
    await client.invalidateQueries({ queryKey: ['tenant-settings'] })
    setStatus('Configuración guardada.')
  }

  return <>
    <PageHeader eyebrow="Preferencias" title="Configuración" description="Configura los datos de tu ganadería; el sistema no impone nombres particulares."/>
    <div className="grid gap-5 lg:grid-cols-2">
      <Card><h2 className="font-display text-lg font-bold">Datos de la ganadería</h2>{settings.data && <form key={settings.data.id} onSubmit={event => void submit(event)} className="mt-4 grid gap-4">
        <Input name="nombre" label="Nombre" required defaultValue={settings.data.nombre}/>
        <div className="grid gap-4 sm:grid-cols-2"><Input name="moneda" label="Moneda" required defaultValue={settings.data.moneda}/><Input name="cultura" label="Cultura" required defaultValue={settings.data.cultura}/></div>
        <Input name="unidadPeso" label="Unidad de peso" required defaultValue={settings.data.unidadPesoPredeterminada}/>
        <Input name="zonaHoraria" label="Zona horaria" required defaultValue={settings.data.zonaHoraria}/>
        <div><Button type="submit">Guardar configuración</Button></div>{status && <p role="status" className="text-sm text-emerald-700">{status}</p>}
      </form>}</Card>
      <Card><Download className="text-pine-600"/><h2 className="mt-3 font-display text-lg font-bold">Aplicación instalable</h2><p className="mt-2 text-sm text-slate-500">Usa la opción “Instalar aplicación” del navegador para acceso rápido. Los datos sincronizados y borradores permanecen disponibles sin conexión.</p>{needRefresh[0]&&<Button className="mt-5" onClick={()=>void updateServiceWorker(true)}><RefreshCw size={17}/> Aplicar actualización</Button>}</Card>
    </div>
  </>
}
