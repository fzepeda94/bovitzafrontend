import { describe, expect, it, vi } from 'vitest'
import { obtenerTodosLosRegistros } from './paginacion'

describe('obtenerTodosLosRegistros', () => {
  it('recorre todas las páginas y conserva todos los registros filtrados', async () => {
    const obtenerPagina = vi.fn(async (pagina: number) => ({
      items: pagina === 1 ? [1, 2] : [3],
      page: pagina,
      pageSize: 2,
      total: 3,
      totalPages: 2,
    }))
    await expect(obtenerTodosLosRegistros(obtenerPagina)).resolves.toEqual([1, 2, 3])
    expect(obtenerPagina).toHaveBeenCalledTimes(2)
  })
})
