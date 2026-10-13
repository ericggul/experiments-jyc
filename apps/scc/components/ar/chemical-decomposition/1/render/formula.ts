// Typesetting of the catalogue's ASCII formulas: counts after an element or
// a closing bracket and a polymer's trailing n are subscripts, `^2+` is a
// charge, and a number at the start or after `·` is a coefficient.

export type Glyphs = { text: string; level: "base" | "sub" | "sup" };

export function typesetFormula(formula: string): Glyphs[] {
  const runs: Glyphs[] = [];
  const push = (text: string, level: Glyphs["level"]) => {
    const last = runs.at(-1);
    if (last && last.level === level) last.text += text;
    else runs.push({ text, level });
  };

  for (let index = 0; index < formula.length; index += 1) {
    const char = formula[index];
    if (char === "^") {
      push(formula.slice(index + 1).replace("-", "−"), "sup");
      break;
    }
    const previous = formula[index - 1];
    const afterAtom = previous !== undefined && /[A-Za-z)\]]/.test(previous);
    if (/\d/.test(char) && afterAtom) {
      push(char, "sub");
    } else if (/\d/.test(char) && /\d/.test(previous ?? "") && runs.at(-1)?.level === "sub") {
      push(char, "sub");
    } else if (char === "n" && previous === ")" && index === formula.length - 1) {
      push("n", "sub");
    } else {
      push(char, "base");
    }
  }
  return runs;
}
