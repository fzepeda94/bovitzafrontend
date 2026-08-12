export interface EntidadConCodigo { codigo: string }

export function ordenarEntidadesPorCodigo<T extends EntidadConCodigo>(entidades: readonly T[]): T[] {
  return [...entidades].sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true, sensitivity: "base" }));
}

export function normalizarFechaCompraFormulario(fecha: string | null | undefined): string {
  return fecha?.slice(0, 10) ?? "";
}
