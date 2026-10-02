import assert from "node:assert/strict";
import test from "node:test";
import { curvePolylines, fitStroke, isGraphOfX } from "./fit.ts";
import { formatFit, formulaText } from "./formula.ts";

// A hand-like stroke: dense samples along a curve plus bounded, smooth jitter.
function stroke(map, from, to, count = 240, jitter = 0.03) {
  return Array.from({ length: count }, (_, index) => {
    const t = from + (to - from) * index / (count - 1);
    const point = map(t);
    return { x: point.x + jitter * Math.sin(index * 1.7), y: point.y + jitter * Math.cos(index * 2.3) };
  });
}

const noise = 0.04;
const read = (points) => {
  const fit = fitStroke(points, { noise });
  assert.ok(fit);
  return { fit, text: formulaText(formatFit(fit)) };
};

test("a drawn parabola reads as a rounded quadratic", () => {
  const { fit, text } = read(stroke((x) => ({ x, y: 0.5 * x * x - 2 }), -3, 3));
  assert.equal(fit.kind, "polynomial");
  assert.equal(text, "y = 0.5x^2 − 2");
});

test("a straight stroke reads as a line, not a higher polynomial", () => {
  const { text } = read(stroke((x) => ({ x, y: 2 * x + 1 }), -2, 2));
  assert.equal(text, "y = 2x + 1");
});

test("a wave reads as a sine with its frequency and offset", () => {
  const { fit, text } = read(stroke((x) => ({ x, y: 2 * Math.sin(1.5 * x) + 1 }), -4, 4, 320));
  assert.equal(fit.kind, "sine");
  assert.equal(text, "y = 2sin(1.5x) + 1");
});

test("growth reads as an exponential", () => {
  const { fit, text } = read(stroke((x) => ({ x, y: Math.exp(x) - 3 }), -3, 2.2));
  assert.equal(fit.kind, "exponential");
  assert.equal(text, "y = e^x − 3");
});

test("a V reads as an absolute value", () => {
  const { fit, text } = read(stroke((x) => ({ x, y: 2 * Math.abs(x - 1) - 3 }), -2, 4));
  assert.equal(fit.kind, "absolute");
  assert.equal(text, "y = 2|x − 1| − 3");
});

test("a hyperbola branch reads as a reciprocal", () => {
  const { fit, text } = read(stroke((x) => ({ x, y: 2 / (x + 1) + 1 }), -0.6, 5));
  assert.equal(fit.kind, "reciprocal");
  assert.equal(text, "y = 2 / (x + 1) + 1");
});

test("a stroke that turns back in x becomes a circle or a function of y", () => {
  const loop = stroke((t) => ({ x: 1 + 3 * Math.cos(t), y: -2 + 3 * Math.sin(t) }), 0.2, 2 * Math.PI);
  assert.equal(isGraphOfX(loop, noise), false);
  const { fit, text } = read(loop);
  assert.equal(fit.kind, "circle");
  assert.equal(text, "(x − 1)^2 + (y + 2)^2 = 3^2");
  const sideways = read(stroke((y) => ({ x: y * y - 2, y }), -2, 2)).text;
  assert.equal(sideways, "x = y^2 − 2");
});

test("the plotted curve breaks at a vertical asymptote", () => {
  const fit = { kind: "reciprocal", params: [1, 0, 0], rms: 0, score: 0 };
  const lines = curvePolylines(fit, { minX: -5, maxX: 5, minY: -10, maxY: 10 }, 0.05);
  assert.equal(lines.length, 2);
  assert.ok(lines[0].every((point) => point.x < 0) && lines[1].every((point) => point.x > 0));
});

test("too short a stroke gives no formula", () => {
  assert.equal(fitStroke([{ x: 0, y: 0 }, { x: 0.05, y: 0.02 }], { noise }), null);
});

// Real strokes deviate systematically (slow wobble of a few percent of their
// size), hook at landing and lifting, and are quantised to pixels. A fitter
// that treats those as independent noise picks quintics and circles.
function handDrawn(curve, from, to, seed, wobble = 0.04) {
  let state = seed;
  const random = () => (state = (state * 16807) % 2147483647) / 2147483647;
  const unit = 39;
  const raw = Array.from({ length: 120 }, (_, index) => curve(from + (to - from) * index / 119));
  const xs = raw.map((point) => point.x);
  const ys = raw.map((point) => point.y);
  const size = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const waves = [1, 2, 3].map((frequency) => ({ frequency, amplitude: (random() * 2 - 1) / frequency, x: random() * 7, y: random() * 7 }));
  const points = raw.map((point, index) => {
    const u = index / 119;
    let dx = 0;
    let dy = 0;
    for (const wave of waves) {
      dx += wave.amplitude * Math.sin(2 * Math.PI * wave.frequency * u + wave.x);
      dy += wave.amplitude * Math.sin(2 * Math.PI * wave.frequency * u + wave.y);
    }
    return { x: point.x + wobble * size * dx * 0.5, y: point.y + wobble * size * dy * 0.5 };
  });
  const end = points.at(-1);
  points.push({ x: end.x + 0.03 * size, y: end.y - 0.03 * size });
  return points.map((point) => ({ x: Math.round(point.x * unit) / unit, y: Math.round(point.y * unit) / unit }));
}

test("hand-drawn strokes read as the intended simple formulas", () => {
  const cases = [
    ["y = x^2", (x) => ({ x, y: x * x }), -2, 2],
    ["y = 0.5x^2 − 2", (x) => ({ x, y: 0.5 * x * x - 2 }), -3, 3],
    ["y = 2x + 1", (x) => ({ x, y: 2 * x + 1 }), -2, 2],
    ["y = −x + 1", (x) => ({ x, y: 1 - x }), -4, 4],
    ["y = 2sin(x)", (x) => ({ x, y: 2 * Math.sin(x) }), -4.5, 4.5],
    ["y = |x|", (x) => ({ x, y: Math.abs(x) }), -3, 3],
  ];
  for (const [expected, curve, from, to] of cases) {
    for (const seed of [3, 17, 101]) {
      const fit = fitStroke(handDrawn(curve, from, to, seed), { noise });
      assert.equal(formulaText(formatFit(fit)), expected, `seed ${seed}`);
    }
  }
});

test("a hand-drawn growth curve reads as an exponential", () => {
  // Under a few percent wobble, e^x and 1.5e^(0.8x) are equally faithful readings; only the family is fixed.
  for (const seed of [3, 17, 101]) {
    assert.equal(fitStroke(handDrawn((x) => ({ x, y: Math.exp(x) }), -3, 2, seed), { noise }).kind, "exponential");
  }
});

test("a hooked stroke still counts as a graph of x", () => {
  const hooked = handDrawn((x) => ({ x, y: x * x }), -2, 2, 5);
  assert.equal(isGraphOfX(hooked, noise), true);
});
