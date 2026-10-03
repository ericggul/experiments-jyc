import assert from "node:assert/strict";
import test from "node:test";
import { fitPhoneGrid, mobilesConfig } from "./layout.ts";

test("the phone grid fits inside the viewport", () => {
  for (const [width, height] of [[1440, 900], [1920, 1080], [800, 1200], [390, 844]]) {
    const { columns, width: phoneWidth, height: phoneHeight, gap } = fitPhoneGrid(width, height);
    const rows = Math.ceil(mobilesConfig.phoneCount / columns);
    assert.ok(columns * phoneWidth + (columns - 1) * gap <= width + 1e-6);
    assert.ok(rows * phoneHeight + (rows - 1) * gap <= height + 1e-6);
    assert.ok(phoneWidth > 0);
  }
});

test("an empty viewport yields no phone size", () => {
  assert.equal(fitPhoneGrid(0, 0).width, 0);
});
