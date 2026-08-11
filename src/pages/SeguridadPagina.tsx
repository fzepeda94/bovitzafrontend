import { useEffect, useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { Button, Card, Input } from '../components/ui'
import { PageHeader } from '../components/Page'

interface Rol { id: string; nombre: string; activo: boolean }
interface Permiso { id: string; codigo: string; nombre: string; descripcion: string | null; activo: boolean }

export function SeguridadPagina() {
  const seccion = useParams().seccion ?? 'roles'
  if (seccion === 'roles-permisos') return <RolesPermisos />
  return seccion === 'permisos' ? <Permisos /> : <Roles />
}

function Roles() {
  const client = useQueryClient(); const [editing, setEditing] = useState<Rol | null>(null); const [message, setMessage] = useState('')
  const query = useQuery({ queryKey: ['security-roles'], queryFn: () => api<Rol[]>('/seguridad/roles?incluirInactivos=true') })
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = event.currentTarget; const name = String(new FormData(form).get('nombre')); try { await api(editing ? `/seguridad/roles/${editing.id}` : '/seguridad/roles', { method: editing ? 'PUT' : 'POST', body: JSON.stringify({ nombre: name }) }); setEditing(null); form.reset(); setMessage('Rol guardado.'); await client.invalidateQueries({ queryKey: ['security-roles'] }) } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo guardar.') } }
  const state = async (role: Rol) => { await api(role.activo ? `/seguridad/roles/${role.id}` : `/seguridad/roles/${role.id}/reactivar`, { method: role.activo ? 'DELETE' : 'POST' }); await client.invalidateQueries({ queryKey: ['security-roles'] }) }
  return <><PageHeader eyebrow="Seguridad" title="Roles" description="Un rol agrupa permisos. Desactivarlo no borra su historial ni sus asignaciones."/><div className="grid gap-5 lg:grid-cols-[360px_1fr]"><Card><h2 className="font-display text-lg font-bold">{editing ? 'Editar rol' : 'Nuevo rol'}</h2><form className="mt-4 grid gap-4" onSubmit={e => void submit(e)}><Input name="nombre" label="Nombre *" required defaultValue={editing?.nombre}/><div className="flex gap-2"><Button type="submit">Guardar</Button>{editing && <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>}</div>{message && <p className="text-sm text-pine-700">{message}</p>}</form></Card><Card><div className="grid gap-2">{query.data?.map(role => <div key={role.id} className={`flex items-center justify-between rounded-xl p-3 ${role.activo ? 'bg-slate-50 dark:bg-slate-800' : 'bg-slate-100 opacity-60 dark:bg-slate-900'}`}><div><p className="font-semibold">{role.nombre}</p><p className="text-xs text-slate-500">{role.activo ? 'Activo' : 'Inactivo'}</p></div><div className="flex gap-2"><Button variant="secondary" onClick={() => setEditing(role)}>Editar</Button><Button variant={role.activo ? 'danger' : 'secondary'} onClick={() => void state(role)}>{role.activo ? 'Desactivar' : 'Reactivar'}</Button></div></div>)}</div></Card></div></>
}

function Permisos() {
  const client = useQueryClient(); const [editing, setEditing] = useState<Permiso | null>(null); const [message, setMessage] = useState('')
  const query = useQuery({ queryKey: ['security-permissions'], queryFn: () => api<Permiso[]>('/seguridad/permisos?incluirInactivos=true') })
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const body = { codigo: String(data.get('codigo')), nombre: String(data.get('nombre')), descripcion: String(data.get('descripcion') || '') || null }; try { await api(editing ? `/seguridad/permisos/${editing.id}` : '/seguridad/permisos', { method: editing ? 'PUT' : 'POST', body: JSON.stringify(body) }); setEditing(null); form.reset(); setMessage('Permiso guardado.'); await client.invalidateQueries({ queryKey: ['security-permissions'] }) } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo guardar.') } }
  const disable = async (permission: Permiso) => { await api(`/seguridad/permisos/${permission.id}`, { method: 'DELETE' }); await client.invalidateQueries({ queryKey: ['security-permissions'] }) }
  return <><PageHeader eyebrow="Seguridad" title="Permisos" description="Los permisos representan acciones concretas y se asignan a roles."/><div className="grid gap-5 lg:grid-cols-[390px_1fr]"><Card><h2 className="font-display text-lg font-bold">{editing ? 'Editar permiso' : 'Nuevo permiso'}</h2><form className="mt-4 grid gap-4" onSubmit={e => void submit(e)}><Input name="codigo" label="Código *" placeholder="ANIMALES.EDITAR" required defaultValue={editing?.codigo}/><Input name="nombre" label="Nombre *" required defaultValue={editing?.nombre}/><Input name="descripcion" label="Descripción" defaultValue={editing?.descripcion ?? ''}/><div className="flex gap-2"><Button type="submit">Guardar</Button>{editing && <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>}</div>{message && <p className="text-sm text-pine-700">{message}</p>}</form></Card><Card><div className="grid gap-2">{query.data?.map(permission => <div key={permission.id} className={`flex items-center justify-between rounded-xl p-3 ${permission.activo ? 'bg-slate-50 dark:bg-slate-800' : 'bg-slate-100 opacity-60 dark:bg-slate-900'}`}><div><p className="font-semibold">{permission.nombre}</p><p className="text-xs text-slate-500">{permission.codigo}{!permission.activo ? ' · Inactivo' : ''}</p></div><div className="flex gap-2"><Button variant="secondary" onClick={() => setEditing(permission)}>Editar</Button>{permission.activo && <Button variant="danger" onClick={() => void disable(permission)}>Desactivar</Button>}</div></div>)}</div></Card></div></>
}

function RolesPermisos() {
  const [roleId, setRoleId] = useState(''); const [selected, setSelected] = useState<string[]>([]); const [message, setMessage] = useState('')
  const roles = useQuery({ queryKey: ['security-roles'], queryFn: () => api<Rol[]>('/seguridad/roles') })
  const permissions = useQuery({ queryKey: ['security-permissions'], queryFn: () => api<Permiso[]>('/seguridad/permisos') })
  const assigned = useQuery({ queryKey: ['role-permissions', roleId], enabled: !!roleId, queryFn: () => api<string[]>(`/seguridad/roles/${roleId}/permisos`) })
  useEffect(() => setSelected(assigned.data ?? []), [assigned.data])
  const save = async () => { if (!roleId) return; await api(`/seguridad/roles/${roleId}/permisos`, { method: 'PUT', body: JSON.stringify({ permisoIds: selected }) }); setMessage('Permisos del rol actualizados.') }
  return <><PageHeader eyebrow="Seguridad" title="Roles y permisos" description="Selecciona exactamente las acciones que podrá realizar cada rol."/><Card className="max-w-4xl"><label className="text-sm font-medium">Rol *</label><select className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-900" value={roleId} onChange={e => setRoleId(e.target.value)}><option value="">Seleccionar…</option>{roles.data?.map(role => <option key={role.id} value={role.id}>{role.nombre}</option>)}</select>{roleId && <div className="mt-5 grid gap-2 md:grid-cols-2">{permissions.data?.map(permission => <label key={permission.id} className="flex gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><input type="checkbox" checked={selected.includes(permission.id)} onChange={e => setSelected(current => e.target.checked ? [...current, permission.id] : current.filter(id => id !== permission.id))}/><span><span className="block font-semibold">{permission.nombre}</span><span className="text-xs text-slate-500">{permission.codigo}</span></span></label>)}</div>}<div className="mt-5"><Button onClick={() => void save()} disabled={!roleId}>Guardar asignación</Button>{message && <p className="mt-2 text-sm text-pine-700">{message}</p>}</div></Card></>
}
