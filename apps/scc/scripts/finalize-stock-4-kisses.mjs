import { copyFile, mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const candidateDirectory = path.join(root, ".tmp/stock-4-kiss-candidates");
const candidateLedgerPath = path.join(candidateDirectory, "candidates.json");
const outputDirectory = path.join(root, "apps/scc/public/images/stock-4/kisses");
const outputLedgerPath = path.join(
  root,
  "apps/scc/components/ui/dashboard/stock/4/model/kiss-sources.json",
);

// Hand-selected from the local 299-image contact-sheet review. The set favors
// intimate kissing, indoor fetish/BDSM, boudoir, and solo adult nude imagery.
// Public events, weddings, children, and near-duplicate sessions are excluded.
const selectedCandidateIds = [
  "006", "009", "010", "014", "015", "016", "017", "018", "025", "026",
  "029", "030", "031", "036", "039", "054", "059", "060", "067", "074",
  "075", "082", "083", "086", "089", "102", "105", "107", "110", "115",
  "118", "119", "126", "128", "129", "130", "132", "134", "136", "137",
  "139", "142", "144", "146", "147", "148", "149", "150", "151", "152",
  "153", "154", "156", "158", "159", "161", "164", "166", "168", "169",
  "171", "173",
];

const candidates = JSON.parse(await readFile(candidateLedgerPath, "utf8"));
const candidatesById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
const selectedCandidates = selectedCandidateIds.map((id) => {
  const candidate = candidatesById.get(id);
  if (!candidate) throw new Error(`Missing reviewed candidate ${id}`);
  return candidate;
});

await mkdir(outputDirectory, { recursive: true });
for (const fileName of await readdir(outputDirectory)) {
  if (/^\d+\.jpg$/.test(fileName)) {
    await unlink(path.join(outputDirectory, fileName));
  }
}

const records = [];
for (const [index, candidate] of selectedCandidates.entries()) {
  const number = String(index + 1).padStart(2, "0");
  const fileName = `${number}.jpg`;
  await copyFile(path.join(candidateDirectory, `${candidate.id}.jpg`), path.join(outputDirectory, fileName));
  records.push({
    id: `stock-4-kiss-${number}`,
    title: candidate.title.replace(/\.jpe?g$/i, ""),
    imageUrl: `/images/stock-4/kisses/${fileName}`,
    sourceUrl: candidate.sourceUrl,
    searchTerm: candidate.category === "People_kissing_people"
      ? "intimate adult kissing photograph"
      : candidate.category === "BDSM"
        ? "adult BDSM and fetish photograph"
        : "adult erotic and nude photography",
  });
}

await writeFile(outputLedgerPath, `${JSON.stringify(records, null, 2)}\n`);
process.stdout.write(`Finalized ${records.length} reviewed stock/4 images.\n`);
