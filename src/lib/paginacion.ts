import type { PagedResult } from '../types'

export async function obtenerTodosLosRegistros<T>(
  obtenerPagina: (pagina: number) => Promise<PagedResult<T>>,
): Promise<T[]> {
  const registros: T[] = []
  let pagina = 1
  let total = 0
  do {
    const resultado = await obtenerPagina(pagina)
    registros.push(...resultado.items)
    total = resultado.total
    if (resultado.items.length === 0) break
    pagina += 1
  } while (registros.length < total)
  return registros
}
