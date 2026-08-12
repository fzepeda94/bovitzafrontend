import { describe, expect, it } from "vitest";
import { normalizarFechaCompraFormulario, ordenarEntidadesPorCodigo } from "./comprasGanado";

describe("compras de ganado", () => {
  it("ordena las entidades por código sin modificar el arreglo original", () => {
    const entidades = [{ codigo: "003" }, { codigo: "002" }, { codigo: "004" }, { codigo: "001" }];
    expect(ordenarEntidadesPorCodigo(entidades).map((x) => x.codigo)).toEqual(["001", "002", "003", "004"]);
    expect(entidades.map((x) => x.codigo)).toEqual(["003", "002", "004", "001"]);
  });

  it("normaliza las fechas del backend sin aplicar zona horaria", () => {
    expect(normalizarFechaCompraFormulario("2026-01-30T00:00:00")).toBe("2026-01-30");
    expect(normalizarFechaCompraFormulario(null)).toBe("");
  });
});
