import { describe, expect, it } from "vitest";
import { formatearMotivoIncorporacion } from "./motivoIncorporacion";
describe("motivo de incorporación", () => { it("presenta los orígenes formales", () => {
  expect(formatearMotivoIncorporacion("CargaInicial")).toBe("Carga inicial");
  expect(formatearMotivoIncorporacion("Compra")).toBe("Compra");
  expect(formatearMotivoIncorporacion("Nacimiento")).toBe("Nacimiento");
  expect(formatearMotivoIncorporacion("TransferenciaRecibida")).toBe("Transferencia recibida");
}); });
