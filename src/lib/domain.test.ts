import { describe, expect, it } from 'vitest'
import { animalCode, birthLabel, pounds } from './domain'

describe('reglas del dominio en cliente', () => {
  it('muestra el correlativo con seis dígitos', () => expect(animalCode(1)).toBe('000001'))
  it('no inventa una fecha desconocida', () => expect(birthLabel(null, 'Desconocida')).toBe('Desconocida'))
  it('convierte kilogramos a libras con cuatro decimales', () => expect(pounds(100, 'kg')).toBe(220.4623))
})
