import { formatGenerated } from "./clock";
import { languages } from "./languages";

/** `entries[i] = [source, ...one literal translation per language, in languages order]`. */
export type LexiconFile = { languages: string[]; entries: string[][] };

const loaders: Record<string, () => Promise<{ default: LexiconFile }>> = {
  "1": () => import("./lexicon/1.json"),
  "2": () => import("./lexicon/2.json"),
  "3": () => import("./lexicon/3.json"),
  "4": () => import("./lexicon/4.json"),
  "5": () => import("./lexicon/5.json"),
  "6": () => import("./lexicon/6.json"),
  "7": () => import("./lexicon/7.json"),
  "8": () => import("./lexicon/8.json"),
  "9": () => import("./lexicon/9.json"),
  "10": () => import("./lexicon/10.json"),
  "11": () => import("./lexicon/11.json"),
  "12": () => import("./lexicon/12.json"),
  "13": () => import("./lexicon/13.json"),
};

export const normalize = (text: string) => text.replace(/\s+/g, " ").trim();

export type Lexicon = { resolve: (text: string) => readonly string[] | null };

/**
 * Exact strings resolve directly. Template sources such as "{0}개 상품" become
 * anchored patterns; each captured hole is itself resolved per language when
 * it is known (a name, a place), otherwise it is kept as written (a number).
 */
export async function loadLexicon(clone: string): Promise<Lexicon | null> {
  const loader = loaders[clone];
  if (!loader) return null;
  const file = (await loader()).default;
  const columns = languages.map(({ code }) => file.languages.indexOf(code));
  const exact = new Map<string, string[]>();
  const patterns: { expression: RegExp; holes: number[]; row: string[] }[] = [];

  for (const [source, ...translations] of file.entries) {
    const row = columns.map((column) => (column >= 0 ? translations[column] : undefined) || source);
    if (!/\{\d+\}/.test(source)) {
      exact.set(normalize(source), row);
      continue;
    }
    const holes: number[] = [];
    const body = source.split(/(\{\d+\})/).map((part) => {
      const hole = /^\{(\d+)\}$/.exec(part);
      if (!hole) return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      holes.push(Number(hole[1]));
      return "(.+?)";
    }).join("");
    patterns.push({ expression: new RegExp(`^${body}$`), holes, row });
  }
  // Longer literal frames first, so "{0} delivery fee" wins over "{0} {1}".
  patterns.sort((a, b) => b.expression.source.replace(/\(\.\+\?\)/g, "").length - a.expression.source.replace(/\(\.\+\?\)/g, "").length);

  const cache = new Map<string, readonly string[] | null>();
  const resolve = (raw: string, depth = 0): readonly string[] | null => {
    const text = normalize(raw);
    if (!text) return null;
    const cached = cache.get(text);
    if (cached !== undefined) return cached;
    let result: readonly string[] | null = exact.get(text) ?? formatGenerated(text);
    if (!result && depth < 2 && /\p{L}/u.test(text)) {
      for (const pattern of patterns) {
        const match = pattern.expression.exec(text);
        if (!match) continue;
        const captures = pattern.holes.map((_, index) => {
          const value = match[index + 1];
          return { value, row: resolve(value, depth + 1) };
        });
        result = pattern.row.map((template, language) =>
          template.replace(/\{(\d+)\}/g, (_, hole: string) => {
            const capture = captures[pattern.holes.indexOf(Number(hole))];
            return capture ? capture.row?.[language] ?? capture.value : "";
          }));
        break;
      }
    }
    cache.set(text, result);
    return result;
  };

  return { resolve: (text) => resolve(text) };
}
