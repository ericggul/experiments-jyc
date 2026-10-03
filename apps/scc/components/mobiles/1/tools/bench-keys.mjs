import fs from "node:fs";
import path from "node:path";
const out = path.resolve(process.argv[2]);
const paths = JSON.parse(fs.readFileSync(path.join(out, "__paths.json"), "utf8"));
const { renderToStaticMarkup } = await import(paths.server);
const { createElement } = await import(paths.react);
const { PhoneView } = await import(out + "/phone/index.js");
const { createPopulation } = await import(out + "/model/population.js");
const { planDay, defaultPlanOptions } = await import(out + "/model/plan-day.js");
const found = new Map();
globalThis.__dupes = (parent, key) => { const k = "DUPKEY " + parent + " " + key; if (!found.has(k)) found.set(k, { msg: k, context, n: 0 }); found.get(k).n++; };
let context = "";
console.error = (...args) => { const msg = String(args[0]).replace(/%s/g, () => String(args.splice(1, 1)[0] ?? "")).slice(0, 160); const k = msg.slice(0, 90); if (!found.has(k)) found.set(k, { msg, context, n: 0 }); found.get(k).n++; };
for (const seed of [1, 2, 3, 4, 5, 6]) {
  const owners = createPopulation(90, seed);
  for (const day of [0, 1, 2, 3, 4]) {
    const plans = owners.map((o) => planDay(o, day, { ...defaultPlanOptions, seed }));
    for (let i = 0; i < 90; i++) {
      for (const scene of plans[i].scenes) {
        for (let m = scene.start; m < scene.end; m += 4) {
          context = `seed ${seed} day ${day} ${scene.app}/${scene.view} minute ${m}`;
          try { renderToStaticMarkup(createElement(PhoneView, { owner: owners[i], plan: plans[i], minute: m })); }
          catch (e) { const k = "THROW " + String(e.message).slice(0, 80); if (!found.has(k)) found.set(k, { msg: k, context, n: 0 }); found.get(k).n++; }
        }
      }
    }
  }
}
for (const { msg, context, n } of found.values()) console.log(n, "×", msg, "\n    at", context);
console.log("distinct problems:", found.size);
