import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Entity, ManagedUser, PagedResult } from '../types'
import { Button, Card, Input } from '../components/ui'
import { PageHeader } from '../components/Page'

interface Rol {
  id: string
  nombre: string
  activo: boolean
}

export function UsuariosPagina() {
  const client = useQueryClient()
  const [status, setStatus] = useState('')
  const [editing, setEditing] = useState<ManagedUser | null>(null)
  const [incluirInactivos, setIncluirInactivos] = useState(false)
  const users = useQuery({ queryKey: ['users', incluirInactivos], queryFn: () => api<ManagedUser[]>(`/usuarios?incluirInactivos=${incluirInactivos}`) })
  const entities = useQuery({ queryKey: ['entities'], queryFn: () => api<PagedResult<Entity>>('/entidades?pageSize=100') })
  const roles = useQuery({ queryKey: ['security-roles'], queryFn: () => api<Rol[]>('/seguridad/roles') })

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const body = {
      nombre: String(form.get('nombre')),
      correo: String(form.get('correo')),
      contrasena: String(form.get('contrasena') || '') || null,
      rol: null,
      roles: form.getAll('roles').map(String),
      entidadIds: form.getAll('entidades').map(String),
    }

    try {
      await api(editing ? `/usuarios/${editing.id}` : '/usuarios', { method: editing ? 'PUT' : 'POST', body: JSON.stringify(body) })
      await client.invalidateQueries({ queryKey: ['users'] })
      setEditing(null)
      setStatus('Usuario guardado correctamente.')
      formElement.reset()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo guardar el usuario.')
    }
  }

  const state = async (user: ManagedUser) => {
    await api(user.activo ? `/usuarios/${user.id}` : `/usuarios/${user.id}/reactivar`, { method: user.activo ? 'DELETE' : 'POST' })
    await client.invalidateQueries({ queryKey: ['users'] })
  }

  return <>
    <PageHeader eyebrow="Seguridad" title="Usuarios" description="Crea usuarios, asigna varios roles y limita las entidades cuyo ganado pueden consultar." />
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
      <Card className="min-w-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-lg font-bold">Usuarios del tenant</h2>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={incluirInactivos} onChange={event => setIncluirInactivos(event.target.checked)} />
            Mostrar inactivos
          </label>
        </div>
        <div className="mt-4 min-w-0 divide-y divide-slate-100 dark:divide-slate-800">
          {users.data?.map(user => <div key={user.id} className={`flex min-w-0 flex-col items-start gap-3 py-4 sm:flex-row sm:items-center sm:justify-between ${user.activo ? '' : 'opacity-60'}`}>
            <div className="min-w-0">
              <p className="break-words font-semibold">{user.nombre}</p>
              <p className="break-words text-sm text-slate-500">{user.correo} · {user.roles.join(', ')}</p>
              <p className="break-words text-xs text-slate-400">{user.entidadIds.length ? `${user.entidadIds.length} entidad(es) asignada(s)` : 'Sin entidades asignadas'}{!user.activo ? ' · Inactivo' : ''}</p>
            </div>
            <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:flex-none">
              <Button className="flex-1 sm:flex-none" variant="secondary" onClick={() => setEditing(user)}>Editar</Button>
              <Button className="flex-1 sm:flex-none" variant={user.activo ? 'danger' : 'secondary'} onClick={() => void state(user)}>{user.activo ? 'Desactivar' : 'Reactivar'}</Button>
            </div>
          </div>)}
        </div>
      </Card>
      <Card className="min-w-0">
        <h2 className="font-display text-lg font-bold">{editing ? 'Editar usuario' : 'Nuevo usuario'}</h2>
        <form className="mt-4 grid min-w-0 gap-4" onSubmit={event => void submit(event)} key={editing?.id ?? 'new'}>
          <Input name="nombre" label="Nombre visible" required defaultValue={editing?.nombre} />
          <Input name="correo" label="Correo electrónico" type="email" required defaultValue={editing?.correo} />
          <Input name="contrasena" label={editing ? 'Nueva contraseña (opcional)' : 'Contraseña'} type="password" required={!editing} />
          <fieldset className="min-w-0">
            <legend className="text-sm font-medium">Roles *</legend>
            <div className="mt-2 grid gap-2">{roles.data?.map(role => <label key={role.id} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="roles" value={role.nombre} defaultChecked={editing?.roles.includes(role.nombre)} /><span className="break-words">{role.nombre}</span></label>)}</div>
          </fieldset>
          <fieldset className="min-w-0">
            <legend className="text-sm font-medium">Entidades asignadas</legend>
            <div className="mt-2 max-h-40 space-y-2 overflow-y-auto">{entities.data?.items.map(entity => <label key={entity.id} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="entidades" value={entity.id} defaultChecked={editing?.entidadIds.includes(entity.id)} /><span className="break-words">{entity.codigo} · {entity.nombreCompletoORazonSocial}</span></label>)}</div>
          </fieldset>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="w-full sm:w-auto" type="submit">Guardar usuario</Button>
            {editing && <Button className="w-full sm:w-auto" type="button" variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>}
          </div>
          {status && <p role="status" className="break-words text-sm text-pine-700">{status}</p>}
        </form>
      </Card>
    </div>
  </>
}
