import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { sccFamilyIndexes } from "./areas.ts";
import { getSccNavigationItems, sccExperiments } from "./experiments.ts";

const componentsRoot = path.resolve(import.meta.dirname, "../../components");
const keys = new Set(sccExperiments.map((experiment) => experiment.key));

function findRegistries(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const target = path.join(directory, name);
    if (statSync(target).isDirectory()) return findRegistries(target);
    return name === "experiments.ts" && directory !== import.meta.dirname
      ? [target]
      : [];
  });
}

test("every experiment has a unique key and an ISO creation date", () => {
  assert.equal(keys.size, sccExperiments.length);
  for (const experiment of sccExperiments) {
    assert.match(experiment.date, /^\d{4}-\d{2}-\d{2}$/, experiment.key);
    assert.ok(!Number.isNaN(Date.parse(experiment.date)), experiment.key);
  }
});

test("every slug in a family-root registry is dated in the navigation index", () => {
  const skipped = new Set(["mobile", "sns", "parametric-interface", "dj", "network-system"]);
  const missing: string[] = [];

  for (const registry of findRegistries(componentsRoot)) {
    const family = path.relative(componentsRoot, path.dirname(registry)).split(path.sep);
    // ui/sns and ui/dashboard keep their own catalogue areas.
    if (family[0] === "ui" && (family[1] === "sns" || family[1] === "dashboard")) family.shift();
    if (skipped.has(family[0])) continue;

    const source = readFileSync(registry, "utf8");
    // standalone/transportation groups several families under one route prefix.
    if (family[0] === "standalone" && family[1] === "transportation") family.shift();
    const prefix = family[0] === "ui" || family[0] === "dimensions" || family[0] === "desktop-collage" || family[0] === "transportation" ? family.join("/") : family.at(-1);
    const pattern = /\{\s*(?:family:\s*"([^"]+)",\s*)?slug:\s*"([^"]+)"/g;
    for (const [, group, slug] of source.matchAll(pattern)) {
      const key = [prefix, group, slug].filter(Boolean).join("/");
      if (!keys.has(key)) missing.push(key);
    }
  }

  assert.deepEqual(missing, []);
});

test("every alias names another family index and lists the canonical route", () => {
  for (const experiment of sccExperiments) {
    for (const alias of experiment.also ?? []) {
      assert.notEqual(alias.family, experiment.family, experiment.key);
      assert.ok(sccFamilyIndexes.has(alias.family), `${experiment.key} → ${alias.family}`);
      const listed = getSccNavigationItems({ family: alias.family }).find(
        (item) => item.routes[0]?.href === `/${experiment.key}`,
      );
      assert.equal(listed?.family, alias.family, experiment.key);
      assert.ok(listed?.key.startsWith(`${alias.family}/`), experiment.key);
      assert.equal(listed?.routes[0]?.href, `/${experiment.key}`, experiment.key);
    }
  }
  const all = getSccNavigationItems().map((item) => item.key);
  assert.equal(new Set(all).size, all.length);
});
