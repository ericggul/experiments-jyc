import fs from "node:fs";
import path from "node:path";
const out = path.resolve(process.argv[2]);
const paths = JSON.parse(fs.readFileSync(path.join(out, "__paths.json"), "utf8"));
const { renderToStaticMarkup } = await import(paths.server);
const { createElement } = await import(paths.react);
const { registry } = await import(out + "/apps/registry.js");
const owner = { id: "s", archetype: "office-commuter", firstName: "Alex", lastName: "Morgan", home: "Bushwick", work: "Midtown", alarm: 420, seed: 20261005 };
const rows = [];
for (const [app, def] of Object.entries(registry)) {
  for (const f of def.fixtures) {
    const props = { view: f.view, seed: f.seed ?? 7, elapsed: 2, duration: f.duration ?? 6, clock: f.clock ?? 540, day: 2, weekday: 2, owner, pushes: f.pushes ?? [] };
    let html = renderToStaticMarkup(createElement(def.Screen, props));
    const t0 = performance.now();
    for (let i = 0; i < 20; i++) html = renderToStaticMarkup(createElement(def.Screen, { ...props, elapsed: i }));
    const ms = (performance.now() - t0) / 20;
    rows.push([`${app}/${f.view}`, (html.match(/<[a-zA-Z]/g) || []).length, ms.toFixed(2), Math.round(html.length / 1024)]);
  }
}
rows.sort((a, b) => b[1] - a[1]);
for (const r of rows) console.log(r[0].padEnd(34), String(r[1]).padStart(5), "nodes", r[2].padStart(6), "ms", String(r[3]).padStart(4), "KB");
