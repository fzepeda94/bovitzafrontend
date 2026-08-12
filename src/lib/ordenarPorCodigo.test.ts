import { describe, expect, it } from "vitest";
import { ordenarPorCodigo } from "./ordenarPorCodigo";
describe("orden natural por código", () => { it("ordena números y códigos con ceros", () => {
  expect(ordenarPorCodigo([{codigo:"10"},{codigo:"2"},{codigo:"1"}]).map(x=>x.codigo)).toEqual(["1","2","10"]);
  expect(ordenarPorCodigo([{codigo:"010"},{codigo:"002"},{codigo:"001"}]).map(x=>x.codigo)).toEqual(["001","002","010"]);
}); });
