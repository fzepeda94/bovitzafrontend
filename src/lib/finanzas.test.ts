import { describe, expect, it } from 'vitest'
import { calcularResumenFinanciero, calcularResumenPrincipal } from './finanzas'

describe('motor financiero', () => {
  it('separa resultado operativo de inversión y capital', () => {
    expect(calcularResumenFinanciero([{ naturaleza:'IngresoOperativo', monto:10000 },{ naturaleza:'GastoOperativo', monto:3000 },{ naturaleza:'Inversion', monto:5000 },{ naturaleza:'AporteCapital', monto:2000 }]).resultadoOperativo).toBe(7000)
  })
  it('calcula principal sin asignar con compras y otros destinos', () => {
    expect(calcularResumenPrincipal(300000, 200000, 100000)).toEqual({ principalAsignado:300000, principalSinAsignar:0 })
  })
})
