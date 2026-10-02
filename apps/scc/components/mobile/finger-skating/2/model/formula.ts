import type { Fit } from "./fit.ts";

// A formula is a flat run of typographic pieces: italic variables, upright
// numbers and function names, operators, and raised exponents. Each piece's id
// is its slot in the formula, so React keys never come from the displayed text.
export type FormulaPiece = Readonly<{
  id: string;
  text: string;
  role: "variable" | "number" | "operator" | "function";
  raised?: boolean;
}>;

const minus = "−";

export function formatNumber(value: number): string {
  const rounded = Number(value.toFixed(4));
  const text = Math.abs(rounded).toString();
  return rounded < 0 ? `${minus}${text}` : text;
}

class Writer {
  pieces: FormulaPiece[] = [];
  private raised = false;

  private push(text: string, role: FormulaPiece["role"]) {
    this.pieces.push({ id: `p${this.pieces.length}`, text, role, ...(this.raised ? { raised: true } : {}) });
  }

  variable(name: string) { this.push(name, "variable"); return this; }
  number(value: number) { this.push(Math.abs(value).toString(), "number"); return this; }
  operator(text: string) { this.push(text, "operator"); return this; }
  function(name: string) { this.push(name, "function"); return this; }

  raise(write: (writer: Writer) => void) {
    this.raised = true;
    write(this);
    this.raised = false;
    return this;
  }

  /** Coefficient × body; 1 and −1 leave only the sign. */
  scaled(value: number, first: boolean, body: (writer: Writer) => void) {
    this.sign(value, first);
    if (Math.abs(value) !== 1) this.number(clean(value));
    body(this);
    return this;
  }

  /** Leading terms take a bare minus; later terms take spaced + or −. */
  sign(value: number, first: boolean) {
    if (first) {
      if (value < 0) this.operator(minus);
    } else {
      this.operator(value < 0 ? ` ${minus} ` : " + ");
    }
    return this;
  }

  /** `x − h`, `x + h` or `x`. */
  shifted(name: string, shift: number) {
    this.variable(name);
    if (shift !== 0) this.operator(shift > 0 ? ` ${minus} ` : " + ").number(clean(shift));
    return this;
  }

  /** Trailing `+ c`, omitted when c is zero. */
  constant(value: number) {
    if (value !== 0) this.sign(value, false).number(clean(value));
    return this;
  }
}

const clean = (value: number) => Number(value.toFixed(4));

function powerSeries(writer: Writer, coefficients: readonly number[], name: string) {
  let first = true;
  for (let power = coefficients.length - 1; power >= 0; power -= 1) {
    const coefficient = clean(coefficients[power]!);
    if (coefficient === 0) continue;
    if (power === 0) {
      writer.sign(coefficient, first).number(coefficient);
    } else {
      writer.scaled(coefficient, first, (term) => {
        term.variable(name);
        if (power > 1) term.raise((exponent) => exponent.number(power));
      });
    }
    first = false;
  }
  if (first) writer.number(0);
}

export function formatFit(fit: Fit): FormulaPiece[] {
  const writer = new Writer();
  const p = fit.params.map(clean);
  switch (fit.kind) {
    case "polynomial":
      writer.variable("y").operator(" = ");
      powerSeries(writer, p, "x");
      break;
    case "sideways":
      writer.variable("x").operator(" = ");
      powerSeries(writer, p, "y");
      break;
    case "sine": {
      const [amplitude, frequency, phase, offset] = p as [number, number, number, number];
      writer.variable("y").operator(" = ").scaled(amplitude, true, (term) => {
        term.function("sin").operator("(");
        if (frequency !== 1) term.number(frequency);
        term.variable("x");
        if (phase !== 0) term.sign(phase, false).number(phase);
        term.operator(")");
      }).constant(offset);
      break;
    }
    case "exponential": {
      const [scale, rate, offset] = p as [number, number, number];
      writer.variable("y").operator(" = ").scaled(scale, true, (term) => {
        term.function("e").raise((exponent) => {
          if (rate < 0) exponent.operator(minus);
          if (Math.abs(rate) !== 1) exponent.number(rate);
          exponent.variable("x");
        });
      }).constant(offset);
      break;
    }
    case "absolute": {
      const [slope, h, k] = p as [number, number, number];
      writer.variable("y").operator(" = ").scaled(slope, true, (term) => {
        term.operator("|").shifted("x", h).operator("|");
      }).constant(k);
      break;
    }
    case "reciprocal": {
      const [scale, h, k] = p as [number, number, number];
      writer.variable("y").operator(" = ").sign(scale, true).number(scale).operator(" / ");
      if (h === 0) writer.variable("x");
      else writer.operator("(").shifted("x", h).operator(")");
      writer.constant(k);
      break;
    }
    case "circle": {
      const [h, k, r] = p as [number, number, number];
      const square = (term: Writer) => term.raise((exponent) => exponent.number(2));
      if (h === 0) square(writer.variable("x"));
      else square(writer.operator("(").shifted("x", h).operator(")"));
      writer.operator(" + ");
      if (k === 0) square(writer.variable("y"));
      else square(writer.operator("(").shifted("y", k).operator(")"));
      writer.operator(" = ").number(r);
      square(writer);
      break;
    }
  }
  return writer.pieces;
}

/** Plain-text reading of the pieces, with exponents as `^`, for assistive technology and tests. */
export function formulaText(pieces: readonly FormulaPiece[]): string {
  let text = "";
  let raised = false;
  for (const piece of pieces) {
    if (piece.raised && !raised) text += "^";
    raised = Boolean(piece.raised);
    text += piece.text;
  }
  return text;
}
