import { useQuery } from '@tanstack/react-query'
import { api } from './api'
import type { TenantSettings } from '../types'

export function useMonedaTenant() {
  const query = useQuery({ queryKey: ['tenant-settings'], queryFn: () => api<TenantSettings>('/configuracion/tenant') })
  return { moneda: query.data?.moneda, cultura: query.data?.cultura }
}

export function formatearMoneda(valor: number, moneda?: string, cultura?: string) {
  if (!moneda) return new Intl.NumberFormat(cultura).format(valor)
  return new Intl.NumberFormat(cultura, { style: 'currency', currency: moneda, minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(valor)
}
