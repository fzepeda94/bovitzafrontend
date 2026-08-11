export function animalCode(value: number): string {
  if (!Number.isInteger(value) || value < 1 || value > 999_999) throw new RangeError('Correlativo fuera de rango')
  return value.toString().padStart(6, '0')
}

export function pounds(value: number, unit: 'lb' | 'kg'): number {
  if (value <= 0) throw new RangeError('Peso inválido')
  return unit === 'lb' ? value : Math.round(value * 2.2046226218 * 10_000) / 10_000
}

export function birthLabel(date: string | null, precision: string): string {
  if (!date || precision === 'Desconocida') return 'Desconocida'
  return new Intl.DateTimeFormat('es-GT', { timeZone: 'UTC' }).format(new Date(date))
}

