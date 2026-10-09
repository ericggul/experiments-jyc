// iOS 27 basic Calculator: the whole expression is typed on one line and evaluated with precedence on "=".
export type Operator = "+" | "−" | "×" | "÷";
export type Key =
  | { type: "digit"; digit: string }
  | { type: "decimal" }
  | { type: "operator"; operator: Operator }
  | { type: "equals" }
  | { type: "percent" }
  | { type: "negate" }
  | { type: "delete" }
  | { type: "clear" }
  | { type: "allClear" };

type NumberToken = { kind: "number"; raw: string; negative: boolean; percent: boolean; result: boolean };
type OperatorToken = { kind: "operator"; operator: Operator };
type Token = NumberToken | OperatorToken;

export type CalculatorState = {
  tokens: Token[];
  evaluated: { expression: string; value: number } | null;
  repeat: { operator: Operator; operand: number; percent: boolean } | null;
};

export const initialCalculatorState: CalculatorState = { tokens: [], evaluated: null, repeat: null };

const MAX_DIGITS = 9;

const entry = (raw: string, negative = false): NumberToken => ({ kind: "number", raw, negative, percent: false, result: false });
const fromValue = (value: number): NumberToken => ({ kind: "number", raw: String(Math.abs(value)), negative: value < 0, percent: false, result: true });

function groupInteger(integer: string) {
  return integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function formatValue(value: number) {
  if (!Number.isFinite(value)) return "Error";
  if (value === 0) return "0";
  const magnitude = Math.abs(value);
  if (magnitude >= 1e9 || magnitude < 1e-8) {
    const [mantissa, exponent] = value.toExponential(MAX_DIGITS - 1).split("e");
    return `${mantissa.replace(/\.?0+$/, "")}e${Number(exponent)}`;
  }
  return value.toLocaleString("en-US", { maximumSignificantDigits: MAX_DIGITS });
}

function numberText(token: NumberToken) {
  const body = token.result ? formatValue(Math.abs(Number(token.raw))) : (() => {
    const [integer, fraction] = token.raw.split(".");
    return fraction === undefined ? groupInteger(integer) : `${groupInteger(integer)}.${fraction}`;
  })();
  return `${token.negative ? "-" : ""}${body}${token.percent ? "%" : ""}`;
}

function expressionText(tokens: Token[]) {
  return tokens
    .map((token, index) => {
      if (token.kind === "operator") return token.operator;
      const text = numberText(token);
      return token.negative && index > 0 ? `(${text})` : text;
    })
    .join("");
}

const signed = (token: NumberToken) => (token.negative ? -1 : 1) * Number(token.raw || "0");

function apply(left: number, operator: Operator, right: number) {
  if (operator === "+") return left + right;
  if (operator === "−") return left - right;
  if (operator === "×") return left * right;
  return right === 0 ? Number.NaN : left / right;
}

// "a + b%" adds b percent of the running total; elsewhere "b%" is b / 100.
function evaluate(tokens: Token[]) {
  let total = 0;
  let additive: Operator = "+";
  let term: number | null = null;
  let factor: Operator = "×";
  for (const token of tokens) {
    if (token.kind === "operator") {
      if (token.operator === "×" || token.operator === "÷") {
        factor = token.operator;
      } else {
        total = apply(total, additive, term ?? 0);
        additive = token.operator;
        term = null;
      }
      continue;
    }
    const value = signed(token);
    if (term === null) {
      term = token.percent ? (tokens[0] === token ? value / 100 : (total * value) / 100) : value;
    } else {
      term = apply(term, factor, token.percent ? value / 100 : value);
    }
  }
  const value = apply(total, additive, term ?? 0);
  return Number.isFinite(value) ? Number(value.toPrecision(15)) : Number.NaN;
}

function lastOf(tokens: Token[]) {
  return tokens[tokens.length - 1];
}

function replaceLast(tokens: Token[], token: Token | null) {
  return token ? [...tokens.slice(0, -1), token] : tokens.slice(0, -1);
}

// Repeating "=" reapplies the last operator and operand, including "+ b%".
function repeated({ operator, operand, percent }: NonNullable<CalculatorState["repeat"]>): Token[] {
  return [{ kind: "operator", operator }, { ...fromValue(operand), percent }];
}

function equals(state: CalculatorState): CalculatorState {
  if (state.evaluated) {
    if (!state.repeat || !Number.isFinite(state.evaluated.value)) return state;
    const tokens: Token[] = [fromValue(state.evaluated.value), ...repeated(state.repeat)];
    return { ...state, evaluated: { expression: expressionText(tokens), value: evaluate(tokens) } };
  }
  let tokens = state.tokens;
  while (tokens.length && lastOf(tokens).kind === "operator") tokens = tokens.slice(0, -1);
  if (!tokens.length) return state;
  const operators = tokens.filter((token): token is OperatorToken => token.kind === "operator");
  if (!operators.length) {
    if (!state.repeat) return state;
    tokens = [...tokens, ...repeated(state.repeat)];
    return { tokens: [], evaluated: { expression: expressionText(tokens), value: evaluate(tokens) }, repeat: state.repeat };
  }
  const last = lastOf(tokens) as NumberToken;
  return {
    tokens: [],
    evaluated: { expression: expressionText(tokens), value: evaluate(tokens) },
    repeat: { operator: operators[operators.length - 1].operator, operand: signed(last), percent: last.percent },
  };
}

export function press(state: CalculatorState, key: Key): CalculatorState {
  if (key.type === "allClear") return initialCalculatorState;
  if (key.type === "equals") return equals(state);

  // After "=", digits start a new expression; operators, % and ± continue from the result.
  if (state.evaluated) {
    const { value } = state.evaluated;
    if (key.type === "digit" || key.type === "decimal") return press({ ...initialCalculatorState, repeat: state.repeat }, key);
    if (!Number.isFinite(value) || key.type === "delete" || key.type === "clear") return initialCalculatorState;
    return press({ tokens: [fromValue(value)], evaluated: null, repeat: null }, key);
  }

  const { tokens } = state;
  const last = lastOf(tokens);
  const next = (updated: Token[]): CalculatorState => ({ ...state, tokens: updated });

  switch (key.type) {
    case "digit": {
      if (last?.kind !== "number") return next([...tokens, entry(key.digit)]);
      if (last.result) return next(replaceLast(tokens, entry(key.digit, last.negative)));
      if (last.percent || last.raw.replace(".", "").length >= MAX_DIGITS) return state;
      return next(replaceLast(tokens, { ...last, raw: last.raw === "0" ? key.digit : last.raw + key.digit }));
    }
    case "decimal": {
      if (last?.kind !== "number") return next([...tokens, entry("0.")]);
      if (last.result) return next(replaceLast(tokens, entry("0.", last.negative)));
      if (last.percent || last.raw.includes(".")) return state;
      return next(replaceLast(tokens, { ...last, raw: last.raw + "." }));
    }
    case "operator": {
      const operator: OperatorToken = { kind: "operator", operator: key.operator };
      if (!last) return next([entry("0"), operator]);
      if (last.kind === "operator") return next(replaceLast(tokens, operator));
      return next([...tokens, operator]);
    }
    case "percent":
      return last?.kind === "number" && !last.percent ? next(replaceLast(tokens, { ...last, percent: true })) : state;
    case "negate":
      if (last?.kind !== "number") return next([...tokens, entry("0", true)]);
      return next(replaceLast(tokens, { ...last, negative: !last.negative }));
    case "delete": {
      if (!last) return state;
      if (last.kind === "operator" || last.result) return next(replaceLast(tokens, null));
      if (last.percent) return next(replaceLast(tokens, { ...last, percent: false }));
      const raw = last.raw.slice(0, -1);
      return next(replaceLast(tokens, raw ? { ...last, raw } : null));
    }
    case "clear":
      return last?.kind === "number" ? next(replaceLast(tokens, null)) : initialCalculatorState;
  }
}

export function clearLabel(state: CalculatorState) {
  return !state.evaluated && lastOf(state.tokens)?.kind === "number" ? "C" : "AC";
}

export function display(state: CalculatorState) {
  if (state.evaluated) return { expression: state.evaluated.expression, main: formatValue(state.evaluated.value) };
  return { expression: "", main: state.tokens.length ? expressionText(state.tokens) : "0" };
}
