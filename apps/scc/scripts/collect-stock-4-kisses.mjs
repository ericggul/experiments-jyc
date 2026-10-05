import { execFile } from "node:child_process";
import { mkdir, readdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const outputDirectory = path.join(root, "apps/scc/public/images/stock-4/kisses");
const ledgerPath = path.join(
  root,
  "apps/scc/components/ui/dashboard/stock/4/model/kiss-sources.json",
);
const userAgent = "SCC-Stock-4-Kiss-Sequence/1.0 (local interface study)";
const targetCount = 32;
const queries = [
  "passionate adult couple kissing photograph",
  "sensual adult kiss photograph",
  "intimate couple kissing cinematic photograph",
  "French kiss adults photograph",
  "erotic kiss couple photograph",
  "couple making out nightclub photograph",
  "couple kissing in nightclub flash photograph",
  "couple kissing at bar cinematic photograph",
  "couple kissing while smoking cigarette photograph",
  "smoky bar passionate kiss photograph",
  "couple making out at party flash photograph",
  "couple kissing in alley at night photograph",
  "noir couple kissing cigarette photograph",
  "BDSM couple kissing photograph",
  "S&M couple kissing nightclub photograph",
  "sadomasochism couple kiss photograph",
  "fetish club couple kissing photograph",
  "leather club couple kissing photograph",
  "dominant submissive couple kiss photograph",
  "passionate kiss street night photograph",
  "couple kissing party photograph",
  "couple kissing beach photograph",
  "couple kissing train station photograph",
  "public display affection kissing couple photograph",
];
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

await mkdir(outputDirectory, { recursive: true });
for (const fileName of await readdir(outputDirectory)) {
  if (/^\d+\.jpg$/.test(fileName)) {
    await unlink(path.join(outputDirectory, fileName));
  }
}

async function browseKissingCategory() {
  const { stdout } = await execFileAsync("curl", [
    "-L",
    "--silent",
    "--show-error",
    "--fail",
    "-A",
    userAgent,
    "https://commons.wikimedia.org/wiki/Category:People_kissing_people",
  ], { maxBuffer: 8_000_000 });
  const hrefs = [...stdout.matchAll(/href="(\/wiki\/File:[^"]+)"/g)].map((match) => match[1]);

  return [...new Set(hrefs)].flatMap((href) => {
    try {
      const title = decodeURIComponent(href.replace("/wiki/File:", "")).replaceAll("_", " ");
      if (!/\.(jpe?g)$/i.test(title)) return [];
      return [{
        title,
        imageUrl: `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(title)}?width=320`,
        sourceUrl: `https://commons.wikimedia.org${href}`,
        searchTerm: queries.join(" | "),
      }];
    } catch {
      return [];
    }
  });
}

const excludedTitleTerms = [
  "painting",
  "drawing",
  "illustration",
  "sculpture",
  "statue",
  "poster",
  "cartoon",
  "child",
  "children",
  "boy",
  "girl",
  "wedding",
  "bride",
  "groom",
  "newlywed",
  "marriage",
  "print",
  "artwork",
  "temple",
  "museum",
  "dance",
  "bouguereau",
  "ingres",
];
const candidates = await browseKissingCategory();
const uniqueCandidates = [...new Map(candidates.map((item) => [item.sourceUrl, item])).values()]
  .filter((item) => !excludedTitleTerms.some((term) => item.title.toLowerCase().includes(term)))
  .sort((a, b) => {
    const moodTerms = ["erotik", "kiss", "kissing", "besos", "beij", "couple", "love", "bdsm", "s&m", "sadism", "fetish", "leather", "dominant", "submissive", "emo", "french", "sensacional", "club", "party", "smok"];
    const score = (title) => moodTerms.reduce((total, term) => total + (title.toLowerCase().includes(term) ? 1 : 0), 0);
    return score(b.title) - score(a.title);
  });
const records = [];

for (const candidate of uniqueCandidates) {
  if (records.length === targetCount) break;
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
      id: `stock-4-kiss-${number}`,
      title: candidate.title.replace(/\.[^.]+$/, ""),
      imageUrl: `/images/stock-4/kisses/${fileName}`,
      sourceUrl: candidate.sourceUrl,
      searchTerm: candidate.searchTerm,
    });
    await wait(350);
  } catch {
    await unlink(targetPath).catch(() => {});
  }
}

if (records.length !== targetCount) {
  throw new Error(`Expected ${targetCount} kissing images, downloaded ${records.length}`);
}

await writeFile(ledgerPath, `${JSON.stringify(records, null, 2)}\n`);
process.stdout.write(`Downloaded ${records.length} kissing images.\n`);
