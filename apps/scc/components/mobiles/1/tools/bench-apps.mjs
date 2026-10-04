// Renders every view of every clone across many seeds, lengths and moments,
// reporting duplicate keys and render errors. Faster than bench-keys.
import fs from "node:fs";
import path from "node:path";
const out = path.resolve(process.argv[2]);
const paths = JSON.parse(fs.readFileSync(path.join(out, "__paths.json"), "utf8"));
const { renderToStaticMarkup } = await import(paths.server);
const { createElement } = await import(paths.react);
const { registry } = await import(path.join(out, "apps/registry.js"));
const { catalogue } = await import(path.join(out, "model/catalogue.js"));
const { createPopulation } = await import(path.join(out, "model/population.js"));
const owners = createPopulation(24, 7);
const found = new Map();
let context = "";
const note = (msg) => { const k = msg.slice(0, 100); if (!found.has(k)) found.set(k, { msg, context, n: 0 }); found.get(k).n++; };
globalThis.__dupes = (parent, key) => note(`DUPKEY ${parent} ${key}`);
console.error = (...args) => note(String(args[0]).slice(0, 160));
let renders = 0;
for (const [app, def] of Object.entries(registry)) {
  for (const view of catalogue[app].views) {
    for (let seed = 0; seed < 60; seed++) {
      for (const duration of [3, 9, 18, 34, 58]) {
        for (const elapsed of [0, Math.floor(duration / 2), duration - 1]) {
          const owner = owners[seed % owners.length];
          context = `${app}/${view} seed ${seed} duration ${duration} elapsed ${elapsed}`;
          try {
            renderToStaticMarkup(createElement(def.Screen, { view, seed: seed * 7919 + 13, elapsed, duration, clock: (seed * 97) % 1440, day: seed % 5, weekday: seed % 5, owner, pushes: [] }));
            renders++;
          } catch (error) { note(`THROW ${String(error?.message).slice(0, 100)}`); }
        }
      }
    }
  }
}
for (const { msg, context, n } of found.values()) console.log(n, "×", msg, "\n    at", context);
console.log(`renders: ${renders}, distinct problems: ${found.size}`);
