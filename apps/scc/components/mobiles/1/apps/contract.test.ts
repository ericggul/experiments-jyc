import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { appIds, catalogue } from "../model/catalogue.ts";

// Clones are TSX, so this contract reads their sources instead of importing them.
const root = import.meta.dirname;
const source = (app: string) => readFileSync(path.join(root, app, "index.tsx"), "utf8");

test("every catalogue app has a registered clone", () => {
  const registry = readFileSync(path.join(root, "registry.ts"), "utf8");
  for (const app of appIds) {
    assert.ok(existsSync(path.join(root, app, "index.tsx")), `${app} has no clone`);
    assert.ok(registry.includes(`"./${app}"`), `${app} is not registered`);
  }
});

test("every catalogue view has a fixture", () => {
  for (const app of appIds) {
    const views = new Set([...source(app).matchAll(/view:\s*"([a-z-]+)"/g)].map(([, view]) => view));
    for (const view of catalogue[app].views) assert.ok(views.has(view), `${app}/${view} has no fixture`);
  }
});

test("clone screens stay pure", () => {
  for (const app of appIds) {
    assert.doesNotMatch(source(app), /Math\.random|Date\.now|useState|useEffect|setInterval|setTimeout/, app);
  }
});

test("clone motion follows simulated time, never fixed real-time durations", () => {
  for (const app of appIds) {
    const dir = path.join(root, app);
    for (const file of readdirSync(dir).filter((name) => name.endsWith(".css"))) {
      const css = readFileSync(path.join(dir, file), "utf8");
      assert.doesNotMatch(css, /(animation|transition)[^;{}]*\b\d+(\.\d+)?m?s\b/, `${app}/${file} hard-codes a duration`);
    }
    assert.doesNotMatch(source(app), /(animation|transition)(Duration)?:\s*["'`][^"'`]*\d+m?s/, `${app} hard-codes a duration`);
  }
});
