// Renders every clone fixture in hands-on mode (InteractionContext), reporting
// render errors, duplicate keys and how many tap targets the first page offers.
import fs from "node:fs";
import path from "node:path";
const out = path.resolve(process.argv[2]);
const paths = JSON.parse(fs.readFileSync(path.join(out, "__paths.json"), "utf8"));
const { renderToStaticMarkup } = await import(paths.server);
const { createElement } = await import(paths.react);
const { registry } = await import(path.join(out, "apps/registry.js"));
const { InteractionContext } = await import(path.join(out, "ios/playback.js"));
const { sampleOwner } = await import(path.join(out, "model/sample-owner.js"));
const problems = new Map();
let context = "";
const note = (msg) => { const k = msg.slice(0, 100); if (!problems.has(k)) problems.set(k, { msg, context, n: 0 }); problems.get(k).n++; };
globalThis.__dupes = (parent, key) => note(`DUPKEY ${parent} ${key}`);
console.error = (...args) => note(String(args[0]).slice(0, 160));
const interaction = { onExhausted() {}, register() {} };
const rows = [];
for (const [app, def] of Object.entries(registry)) {
  let spots = 0, renders = 0;
  for (const [index, fixture] of def.fixtures.entries()) {
    for (const seed of [1, 2, 3, 5, 8]) {
      context = `${app}/${fixture.view} fixture ${index} seed ${seed}`;
      try {
        const html = renderToStaticMarkup(createElement(InteractionContext, { value: interaction }, createElement(def.Screen, {
          view: fixture.view, seed: (fixture.seed ?? 11) * seed, elapsed: 0, duration: Math.max(fixture.duration ?? 20, 12),
          clock: fixture.clock ?? 600, day: 2, weekday: 2, owner: sampleOwner, pushes: fixture.pushes ?? [],
        })));
        spots += (html.match(/aria-label="Open /g) || []).length;
        renders++;
      } catch (error) { note(`THROW ${String(error?.message).slice(0, 100)}`); }
    }
  }
  rows.push([app, renders, (spots / Math.max(1, renders)).toFixed(1)]);
}
for (const [app, renders, spots] of rows) console.log(app.padEnd(16), String(renders).padStart(3), "renders", spots.padStart(5), "tap targets on the opening page");
for (const { msg, context, n } of problems.values()) console.log(n, "×", msg, "\n    at", context);
console.log("distinct problems:", problems.size);
