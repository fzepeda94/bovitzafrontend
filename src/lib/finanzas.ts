export interface ResumenFinancieroEntrada { naturaleza: string; monto: number }

export function calcularResumenFinanciero(movimientos: readonly ResumenFinancieroEntrada[]) {
  const sumar = (naturaleza: string) => movimientos.filter(x => x.naturaleza === naturaleza).reduce((total, x) => total + x.monto, 0)
  const ingresosOperativos = sumar('IngresoOperativo')
  const gastosOperativos = sumar('GastoOperativo')
  const gastosFinancieros = sumar('GastoFinanciero')
  return { ingresosOperativos, gastosOperativos, gastosFinancieros, resultadoOperativo: ingresosOperativos - gastosOperativos, resultadoDespuesFinanciero: ingresosOperativos - gastosOperativos - gastosFinancieros }
}

export function calcularResumenPrincipal(principal: number, compras: number, otrosDestinos: number) {
  const principalAsignado = compras + otrosDestinos
  return { principalAsignado, principalSinAsignar: principal - principalAsignado }
}
