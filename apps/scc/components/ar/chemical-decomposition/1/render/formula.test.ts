import assert from "node:assert/strict";
import test from "node:test";
import { typesetFormula } from "./formula.ts";

const show = (formula: string) =>
  typesetFormula(formula).map(({ text, level }) => (level === "base" ? text : `${level === "sub" ? "_" : "^"}{${text}}`)).join("");

test("counts are subscripts, coefficients and charges are not", () => {
  assert.equal(show("H2O"), "H_{2}O");
  assert.equal(show("C55H72O5N4Mg"), "C_{55}H_{72}O_{5}N_{4}Mg");
  assert.equal(show("(C6H10O5)n"), "(C_{6}H_{10}O_{5})_{n}");
  assert.equal(show("CaSO4·2H2O"), "CaSO_{4}·2H_{2}O");
  assert.equal(show("3CaO·2SiO2·3H2O"), "3CaO·2SiO_{2}·3H_{2}O");
  assert.equal(show("Ca10(PO4)6(OH)2"), "Ca_{10}(PO_{4})_{6}(OH)_{2}");
  assert.equal(show("SO4^2-"), "SO_{4}^{2−}");
  assert.equal(show("Na^+"), "Na^{+}");
  assert.equal(show("Y3Al5O12:Ce"), "Y_{3}Al_{5}O_{12}:Ce");
});
