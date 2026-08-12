export function ordenarPorCodigo<T extends { codigo: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.codigo.localeCompare(b.codigo, "es", { numeric: true, sensitivity: "base" }));
}
