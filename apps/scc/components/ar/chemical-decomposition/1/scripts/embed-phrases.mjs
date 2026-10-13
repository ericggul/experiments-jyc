// Embeds the catalogue's material phrases with MobileCLIP-S0's text tower so
// the browser only needs the image tower. Rerun after editing `catalog.ts`:
//   node components/ar/chemical-decomposition/1/scripts/embed-phrases.mjs
// Writes unit vectors as int8 (×127) plus the phrase list the worker checks.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { AutoTokenizer, CLIPTextModelWithProjection } from "@huggingface/transformers";
import { catalogPhrases } from "../model/catalog.ts";

const MODEL = "Xenova/mobileclip_s0";
const output = path.resolve(import.meta.dirname, "../../../../../public/ar/chemical-decomposition/1");
const phrases = catalogPhrases();
const tokenizer = await AutoTokenizer.from_pretrained(MODEL);
const model = await CLIPTextModelWithProjection.from_pretrained(MODEL, { dtype: "fp32" });

let dim = 0;
const vectors = [];
for (let start = 0; start < phrases.length; start += 32) {
  const batch = phrases.slice(start, start + 32).map((phrase) => `a photo of ${phrase}`);
  const inputs = tokenizer(batch, { padding: "max_length", truncation: true });
  const { text_embeds } = await model(inputs);
  dim = text_embeds.dims[1];
  for (let row = 0; row < batch.length; row += 1) {
    const vector = text_embeds.data.slice(row * dim, (row + 1) * dim);
    const norm = Math.hypot(...vector);
    vectors.push(Int8Array.from(vector, (value) => Math.round((value / norm) * 127)));
  }
}

const bytes = new Int8Array(vectors.length * dim);
vectors.forEach((vector, index) => bytes.set(vector, index * dim));
mkdirSync(output, { recursive: true });
writeFileSync(path.join(output, "phrases.bin"), bytes);
writeFileSync(path.join(output, "phrases.json"), `${JSON.stringify({ model: MODEL, dim, phrases })}\n`);
console.log(`${phrases.length} phrases × ${dim} → ${output}`);
