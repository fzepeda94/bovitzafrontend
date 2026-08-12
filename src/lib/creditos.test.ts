import { describe, expect, it } from 'vitest'
import { calcularCostoFinanciero, calcularMaximoFinanciable, calcularPrincipalDisponible, endpointsCredito, normalizarFechaFormulario } from './creditos'
describe('créditos', () => { it('calcula el escenario contractual y usa los endpoints financieros', () => {
  expect(calcularCostoFinanciero(300000, 459293.585)).toBeCloseTo(159293.585, 6)
  expect(calcularPrincipalDisponible(300000, 200000)).toBe(100000)
  expect(calcularMaximoFinanciable(100000, 50000)).toBe(50000)
  expect(endpointsCredito.crear).toBe('/creditos'); expect(endpointsCredito.confirmar('1')).toBe('/creditos/1/confirmar'); expect(endpointsCredito.aplicar('1')).toBe('/creditos/1/financiamientos/compras')
}); it('conserva la fecha de primera cuota al preparar una edición', () => {
  expect(normalizarFechaFormulario('2026-09-15T00:00:00')).toBe('2026-09-15')
  expect(normalizarFechaFormulario(null)).toBe('')
}) })
