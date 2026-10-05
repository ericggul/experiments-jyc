import { execFile } from "node:child_process";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const outputDirectory = path.join(root, "apps/scc/public/images/stock-4/cats");
const ledgerPath = path.join(
  root,
  "apps/scc/components/ui/dashboard/stock/4/model/cat-sources.json",
);
const userAgent = "SCC-Stock-4-Cat-Sequence/1.0 (local interface study)";
const queries = [
  "cute cat portrait",
  "cat wearing sunglasses",
  "funny domestic cat portrait",
  "cat wearing clothes",
];

await mkdir(outputDirectory, { recursive: true });

async function searchCommons(query) {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.search = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrnamespace: "6",
    gsrlimit: "30",
    gsrsearch: query,
    prop: "imageinfo",
    iiprop: "url|mime",
    iiurlwidth: "320",
  }).toString();

  const { stdout } = await execFileAsync("curl", [
    "--silent",
    "--show-error",
    "--fail",
    "--max-time",
    "90",
    "--retry",
    "4",
    "-H",
    `User-Agent: ${userAgent}`,
    url.toString(),
  ], { maxBuffer: 5_000_000 });
  const payload = JSON.parse(stdout);

  return Object.values(payload.query?.pages ?? {})
    .sort((a, b) => a.index - b.index)
    .flatMap((page) => {
      const info = page.imageinfo?.[0];
      if (!info?.thumburl || info.mime !== "image/jpeg") return [];
      return [{
        title: page.title.replace(/^File:/, ""),
        imageUrl: info.thumburl,
        sourceUrl: info.descriptionurl,
        searchTerm: query,
      }];
    });
}

const candidates = (await Promise.all(queries.map(searchCommons))).flat();
const excludedTitleTerms = ["watercolor", "painting", "drawing", "illustration", "statue", "sculpture"];
const uniqueCandidates = [...new Map(candidates.map((item) => [item.sourceUrl, item])).values()]
  .filter((item) => !excludedTitleTerms.some((term) => item.title.toLowerCase().includes(term)));
const records = [];

for (const candidate of uniqueCandidates) {
  if (records.length === 20) break;
  const number = String(records.length + 1).padStart(2, "0");
  const fileName = `${number}.jpg`;
  const targetPath = path.join(outputDirectory, fileName);

  try {
    await execFileAsync("curl", [
      "-L",
      "--silent",
      "--show-error",
      "--fail",
      "--max-time",
      "90",
      "--retry",
      "4",
      "-A",
      userAgent,
      "-o",
      targetPath,
      candidate.imageUrl,
    ]);
    if ((await stat(targetPath)).size < 4_000) {
      await unlink(targetPath);
      continue;
    }
    records.push({
      id: `stock-4-cat-${number}`,
      title: candidate.title.replace(/\.[^.]+$/, ""),
      imageUrl: `/images/stock-4/cats/${fileName}`,
      sourceUrl: candidate.sourceUrl,
      searchTerm: candidate.searchTerm,
    });
  } catch {
    await unlink(targetPath).catch(() => {});
  }
}

if (records.length !== 20) {
  throw new Error(`Expected 20 cat images, downloaded ${records.length}`);
}

await writeFile(ledgerPath, `${JSON.stringify(records, null, 2)}\n`);
process.stdout.write(`Downloaded ${records.length} cat images.\n`);
