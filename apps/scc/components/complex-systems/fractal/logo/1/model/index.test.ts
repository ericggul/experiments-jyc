import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { fractalLogos, logoGeometry } from "../logos.ts";
import {
  MAX_DEPTH,
  MAX_RATIO,
  MAX_VISIBLE_LOGOS,
  MIN_RATIO,
  backTips,
  boxShape,
  createLogoLayout,
  layoutLogoFractal,
  rootHalfForViewport,
} from "./index.ts";

const publicRoot = new URL("../../../../../../public", import.meta.url);
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

test("the whole fractal is centred and holds half-size copies at the root tips", () => {
  const layout = layoutLogoFractal(createLogoLayout(), 1440, 900);
  const rootHalf = rootHalfForViewport(1440, 900);
  assert.equal(rootHalf, 900 * 0.23);
  assert.deepEqual([layout.x[0], layout.y[0], layout.half[0]], [720, 450, rootHalf]);
  [[1, 0], [0, 1], [-1, 0], [0, -1]].forEach(([dx, dy], tip) => {
    assert.ok(near(layout.x[tip + 1]! - 720, dx! * rootHalf));
    assert.ok(near(layout.y[tip + 1]! - 450, dy! * rootHalf));
    assert.equal(layout.half[tip + 1], rootHalf / 2);
  });
  // Non-root copies skip the tip pointing back into their parent.
  assert.equal(layout.count, 1 + 4 + 12 + 36 + 108 + 324 + 972 + 2916);
});

test("tips follow a logo's content box when it is not square", () => {
  const layout = layoutLogoFractal(createLogoLayout(), 1000, 1000, { shape: boxShape([1, 0.5]) });
  const half = layout.half[0]!;
  assert.ok(near(layout.x[1]! - 500, half));
  assert.ok(near(layout.y[2]! - 500, half / 2));
});

test("depth limits levels and all tips adds the back branch", () => {
  assert.equal(layoutLogoFractal(createLogoLayout(), 1440, 900, { depth: 0 }).count, 1);
  assert.equal(layoutLogoFractal(createLogoLayout(), 1440, 900, { depth: 2 }).count, 17);
  assert.equal(
    layoutLogoFractal(createLogoLayout(), 1440, 900, { depth: 2, allTips: true }).count,
    21,
  );
});

test("symmetric logos branch along their own tips: ChatGPT six, Qwen three", () => {
  const chatgpt = logoGeometry(fractalLogos.find((logo) => logo.id === "chatgpt")!);
  assert.equal(chatgpt.shape.tips.length, 6);
  assert.deepEqual(backTips(chatgpt.shape.tips), [3, 4, 5, 0, 1, 2]);
  const six = layoutLogoFractal(createLogoLayout(), 1440, 900, { shape: chatgpt.shape, depth: 2 });
  assert.equal(six.count, 1 + 6 + 30);
  const angles = [1, 2, 3, 4, 5, 6].map((index) =>
    (Math.atan2(six.y[index]! - 450, six.x[index]! - 720) * 180) / Math.PI,
  );
  angles.forEach((angle, index) =>
    assert.ok(Math.abs(((angle - 13.25 - 60 * index + 540) % 360) - 180) < 1e-6),
  );

  const qwen = logoGeometry(fractalLogos.find((logo) => logo.id === "qwen")!);
  assert.deepEqual(backTips(qwen.shape.tips), [-1, -1, -1]);
  assert.equal(
    layoutLogoFractal(createLogoLayout(), 1440, 900, { shape: qwen.shape, depth: 2 }).count,
    1 + 3 + 9,
  );
});

test("mix keeps the four-tip frame and changes the logo from parent and siblings", () => {
  const layout = layoutLogoFractal(createLogoLayout(), 1440, 900, {
    variants: fractalLogos.length,
    depth: 1,
  });
  const children = [1, 2, 3, 4].map((index) => layout.variant[index]);
  assert.equal(layout.variant[0], 0);
  assert.equal(new Set([layout.variant[0], ...children]).size, 5);
});

test("every copy stays inside the viewport and the sprite budget", () => {
  for (const logo of fractalLogos) {
    for (const boxed of [false, true]) {
      const { shape } = logoGeometry(logo, boxed);
      for (const ratio of [MIN_RATIO, 0.45, MAX_RATIO]) {
        for (const allTips of [false, true]) {
          for (const [width, height] of [[1440, 900], [390, 844], [3840, 2160]] as const) {
            const layout = layoutLogoFractal(createLogoLayout(), width, height, {
              ratio,
              allTips,
              shape,
              depth: MAX_DEPTH,
            });
            assert.ok(layout.count > 0 && layout.count <= MAX_VISIBLE_LOGOS);
            const [bx, by] = shape.body;
            for (let index = 0; index < layout.count; index += 1) {
              const h = layout.half[index]!;
              assert.ok(layout.x[index]! - bx * h >= -1e-6, logo.id);
              assert.ok(layout.x[index]! + bx * h <= width + 1e-6, logo.id);
              assert.ok(layout.y[index]! - by * h >= -1e-6, logo.id);
              assert.ok(layout.y[index]! + by * h <= height + 1e-6, logo.id);
            }
          }
        }
      }
    }
  }
});

test("each logo asset exists with the registered viewBox and a box inside it", () => {
  const ids = new Set<string>();
  for (const logo of fractalLogos) {
    assert.ok(!ids.has(logo.id));
    ids.add(logo.id);
    const file = new URL(`.${logo.src}`, `${publicRoot.href}/`);
    assert.ok(existsSync(file), logo.src);
    const viewBox = readFileSync(file, "utf8").match(/viewBox="([^"]+)"/)?.[1];
    assert.equal(viewBox?.split(/[\s,]+/).map(Number).join(" "), logo.viewBox.join(" "));
    const [x0, y0, x1, y1] = logo.box;
    assert.ok(x0 >= logo.viewBox[0] && y0 >= logo.viewBox[1] && x1 > x0 && y1 > y0);
    assert.ok(x1 <= logo.viewBox[0] + logo.viewBox[2] && y1 <= logo.viewBox[1] + logo.viewBox[3]);
  }
});
