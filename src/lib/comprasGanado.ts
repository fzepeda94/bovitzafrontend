export interface EntidadConCodigo { codigo: string }

export function ordenarEntidadesPorCodigo<T extends EntidadConCodigo>(entidades: readonly T[]): T[] {
  return [...entidades].sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true, sensitivity: "base" }));
}
