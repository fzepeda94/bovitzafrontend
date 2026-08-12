export const calcularCostoFinanciero = (principal: number, totalContractual: number) => totalContractual - principal
export const calcularPrincipalDisponible = (principal: number, aplicado: number) => principal - aplicado
export const calcularMaximoFinanciable = (disponibleCredito: number, disponibleCompra: number) => Math.min(disponibleCredito, disponibleCompra)
export const endpointsCredito = {
  crear: '/creditos', detalle: (id: string) => `/creditos/${id}`, confirmar: (id: string) => `/creditos/${id}/confirmar`,
  anular: (id: string) => `/creditos/${id}/anular`, financiamientos: (id: string) => `/creditos/${id}/financiamientos`,
  aplicar: (id: string) => `/creditos/${id}/financiamientos/compras`, financiamiento: (id: string, relacion: string) => `/creditos/${id}/financiamientos/${relacion}`,
}
