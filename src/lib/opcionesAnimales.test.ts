import { describe, expect, it } from "vitest";
import { OPCIONES_CATEGORIA_ZOOTECNICA, OPCIONES_SEXO_ANIMAL } from "./opcionesAnimales";

describe("opciones de animales", () => {
  it("expone los códigos de dominio de sexo", () => {
    expect(OPCIONES_SEXO_ANIMAL.map((x) => x.value)).toEqual(["Hembra", "Macho", "Desconocido"]);
  });
  it("expone los códigos de dominio de categoría", () => {
    expect(OPCIONES_CATEGORIA_ZOOTECNICA.map((x) => x.value)).toEqual(["Ternera", "Novilla", "Vaca", "Ternero", "Novillo", "Toro", "Otra"]);
    expect(OPCIONES_CATEGORIA_ZOOTECNICA.every((x) => !x.value.includes("-"))).toBe(true);
  });
});
