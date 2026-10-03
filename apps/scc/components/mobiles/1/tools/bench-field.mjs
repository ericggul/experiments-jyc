import fs from "node:fs";
import path from "node:path";
const out = path.resolve(process.argv[2]);
const paths = JSON.parse(fs.readFileSync(path.join(out, "__paths.json"), "utf8"));
const { renderToStaticMarkup } = await import(paths.server);
const { createElement } = await import(paths.react);
const refresh = Number(process.argv[3] ?? 3);
const { PhoneView } = await import(out + "/phone/index.js");
const { createPopulation } = await import(out + "/model/population.js");
const { planDay } = await import(out + "/model/plan-day.js");
const { phoneMinute } = await import(out + "/model/time.js");
const owners = createPopulation(90, 1);
const plans = owners.map((o) => planDay(o, 2));
const render = (i, m) => renderToStaticMarkup(createElement(PhoneView, { owner: owners[i], plan: plans[i], minute: m, scale: 0.2 }));
for (let i = 0; i < 90; i++) render(i, 600); // warm
let worst = 0, total = 0, ticks = 0, maxNodes = 0, renders = 0;
for (let m = 1; m < 1440; m++) {
  const t0 = performance.now();
  let nodes = 0;
  for (let i = 0; i < 90; i++) {
    const now = phoneMinute(m, i, refresh), before = phoneMinute(m - 1, i, refresh);
    if (now === before) continue;
    const html = render(i, now);
    renders++;
    nodes += (html.match(/<[a-zA-Z]/g) || []).length;
  }
  const ms = performance.now() - t0;
  worst = Math.max(worst, ms); total += ms; ticks++;
  maxNodes = Math.max(maxNodes, nodes);
}
let fieldNodes = 0;
for (let i = 0; i < 90; i++) fieldNodes = Math.max(fieldNodes, 0) + (render(i, 600).match(/<[a-zA-Z]/g) || []).length;
console.log(`refresh ${refresh}: phone renders per tick ${(renders / ticks).toFixed(1)}, mean ${(total / ticks).toFixed(2)} ms/tick, worst ${worst.toFixed(1)} ms, field DOM at 10:00 ${fieldNodes} nodes`);
