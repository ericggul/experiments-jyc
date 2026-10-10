// Generates the 기술 surface: one documentary-style image per tech keyword,
// the hype's physical backstage rather than a glossy product render.
// Run from the workspace root with OPENAI_API_KEY in .env:
//   node apps/scc/components/complex-systems/bubble/3/media/sources/generate-tech-keywords.mjs [--only AI,GPU] [--out <dir>]
// Writes <out>/<KEYWORD>.jpg (default apps/scc/public/images/1011/tech-keywords) and a ledger.json beside them.
import fs from "node:fs";
import path from "node:path";

const MODEL = "gpt-image-2";
const SIZE = "1024x1024";
const QUALITY = "medium";
const CONCURRENCY = 4;

const STYLE =
  "Candid documentary press photograph, 35 mm, direct on-camera flash, slight film grain, muted natural colours, " +
  "dark surroundings falling off into shadow, square framing. No text, no letters, no numbers, no logos, no watermark, " +
  "no recognisable faces (people turned away, cropped or out of focus).";

/** Keyword order is tech-eyes/1's; each scene is the keyword's material reality. */
export const SCENES = [
  ["AI", "an aisle of a hyperscale data centre, rows of server racks with status lights, cold blue-white light, a maintenance worker seen from behind"],
  ["ML", "a whiteboard dense with hand-drawn curves, boxes and arrows in dry-erase marker (abstract scribbles, no readable words), a hand holding a marker, office at night"],
  ["DL", "a dense cluster of GPU servers with tangled orange and blue cables and blinking LEDs, a cramped hot aisle"],
  ["AGI", "an empty keynote stage with a lone podium under a single spotlight, a huge dark screen behind, rows of empty chairs"],
  ["GPT", "a person in a dark bedroom at 3 a.m. lit only by a phone screen, seen from the side, face mostly in shadow"],
  ["LLM", "a wall of server cabinets behind a glass door, reflections of fluorescent lights, cooling pipes overhead"],
  ["NLP", "an open-plan call centre after hours, rows of headsets on empty desks, screens asleep"],
  ["RAG", "stacks of document boxes beside a flatbed scanner in a fluorescent-lit archive room"],
  ["CPU", "a silicon wafer held in a gloved hand under the yellow light of a clean room, rainbow reflections"],
  ["GPU", "a bare graphics card with three fans on a cluttered workbench, a tube of thermal paste, a screwdriver, harsh flash"],
  ["NPU", "a macro of a phone mainboard with tiny chips and gold traces on an anti-static mat"],
  ["RAM", "memory modules in anti-static bags piled in a cardboard box on warehouse shelving"],
  ["OS", "a laptop alone on an empty desk at night showing a blank progress bar on a blue screen (no readable text)"],
  ["PC", "a pile of discarded beige desktop towers and bulky monitors at an electronic waste yard"],
  ["IoT", "a kitchen counter at night with a smart speaker, a smart plug and a router with blinking lights"],
  ["AR", "a person wearing smart glasses on a crowded crosswalk, city lights reflected in the lenses, seen from the side"],
  ["VR", "a trade-show visitor in a virtual-reality headset reaching into empty air, blurred crowd, carpeted expo hall"],
  ["XR", "an expo booth demo with a motion-tracking rig, cameras on tripods and taped floor markers"],
  ["UI", "a finger touching a glossy self-service kiosk screen of coloured tiles (no readable text), fast-food restaurant"],
  ["UX", "a glass wall covered in colourful sticky notes joined by arrows, a startup office, people blurred behind"],
  ["HCI", "a university lab with an eye-tracking monitor, a chin rest and cables under fluorescent light"],
  ["MVP", "a cramped startup office at midnight, pizza boxes, laptops, a whiteboard, a sleeping bag under a desk"],
  ["API", "a network patch panel with hundreds of colour-coded cables marked with bits of tape (no readable text)"],
  ["SDK", "a developer's sticker-covered laptop on a café table, cables, a half-finished coffee"],
  ["IDE", "a dark monitor filled with colourful syntax-highlighted code seen out of focus, a keyboard in the foreground"],
  ["OOP", "a meeting-room whiteboard with boxes connected by arrows (no readable words), marker smudges"],
  ["QA", "a device-testing lab with dozens of smartphones mounted on racks, every screen lit, cables everywhere"],
  ["DB", "a tape library's robot arm among racks of data cartridges in a dim vault"],
  ["SQL", "a raised-floor server room with one floor tile lifted, bundles of cables beneath, a torch beam"],
  ["CDN", "a submarine cable landing station, a thick armoured cable emerging from concrete on a grey beach"],
  ["DNS", "a wall of network switches with thousands of blinking green link lights in a dark room"],
  ["URL", "a QR-code poster peeling off a street lamp post at night, wet pavement (no readable text)"],
  ["VPN", "an airport lounge at night, a person on a laptop seen from behind, aircraft outside the window"],
  ["VM", "rows of industrial cooling fans and chillers on the roof of a data centre, steam, dusk"],
  ["NFT", "a crypto-art auction room with screens of pixelated images, a crowd of lanyards, champagne glasses"],
  ["DAO", "a conference afterparty, people with lanyards in a dark bar lit by phone screens, blurred"],
];

function loadKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  const env = fs.readFileSync(path.resolve(".env"), "utf8");
  const line = env.split("\n").find((entry) => entry.startsWith("OPENAI_API_KEY="));
  if (!line) throw new Error("OPENAI_API_KEY not found");
  return line.slice("OPENAI_API_KEY=".length).trim().replace(/^"|"$/g, "");
}

const args = process.argv.slice(2);
const only = args.includes("--only") ? new Set(args[args.indexOf("--only") + 1].split(",")) : null;
const out = args.includes("--out") ? path.resolve(args[args.indexOf("--out") + 1]) : path.resolve("apps/scc/public/images/1011/tech-keywords");
fs.mkdirSync(out, { recursive: true });
const key = loadKey();

async function generate([keyword, scene]) {
  const target = path.join(out, `${keyword}.jpg`);
  const prompt = `${scene}. ${STYLE}`;
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, prompt, size: SIZE, quality: QUALITY, n: 1, output_format: "jpeg", output_compression: 88 }),
  });
  if (!response.ok) throw new Error(`${keyword}: ${response.status} ${await response.text()}`);
  const body = await response.json();
  const image = body.data?.[0]?.b64_json;
  if (!image) throw new Error(`${keyword}: no image in response`);
  fs.writeFileSync(target, Buffer.from(image, "base64"));
  return { keyword, file: path.relative(out, target), prompt, model: MODEL, size: SIZE, quality: QUALITY, bytes: fs.statSync(target).size, usage: body.usage ?? null };
}

const queue = SCENES.filter(([keyword]) => !only || only.has(keyword));
const ledgerPath = path.join(out, "ledger.json");
const ledger = fs.existsSync(ledgerPath) ? JSON.parse(fs.readFileSync(ledgerPath, "utf8")) : { generatedAt: null, style: STYLE, images: {} };
let next = 0;
const failures = [];
await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
  while (next < queue.length) {
    const scene = queue[next];
    next += 1;
    try {
      const entry = await generate(scene);
      ledger.images[entry.keyword] = entry;
      console.log(`ok ${entry.keyword} ${entry.bytes} B`);
    } catch (error) {
      failures.push(String(error));
      console.error(String(error));
    }
  }
}));
ledger.generatedAt = new Date().toISOString();
ledger.style = STYLE;
fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
console.log(`${queue.length - failures.length}/${queue.length} written to ${out}`);
if (failures.length) process.exit(1);
