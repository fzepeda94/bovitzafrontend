import { describe, expect, it } from 'vitest'
import { endpointAntecedentesReproductivos, MENSAJE_ANTECEDENTE_REPRODUCTIVO } from './antecedentesReproductivos'

describe('antecedentes reproductivos', () => {
  it('usa un endpoint distinto al parto operativo y advierte que no modifica inventario', () => {
    const endpoint = endpointAntecedentesReproductivos('animal-1')
    expect(endpoint).toBe('/animales/animal-1/expediente/antecedentes-partos')
    expect(endpoint).not.toBe('/animales/animal-1/expediente/partos')
    expect(MENSAJE_ANTECEDENTE_REPRODUCTIVO).toContain('No creará crías ni modificará el inventario')
  })
})
