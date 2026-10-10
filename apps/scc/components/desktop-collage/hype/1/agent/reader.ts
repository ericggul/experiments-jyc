import type { Entry } from '../model/catalogue.ts';
import { between, chance, pick, type Random } from '../model/random.ts';

// What the reader does in one window: a timed script. Real pages are only
// read (scrolled) and, when allowed, left through a link to a derived
// keyword. Writing (focus, type, submit, act) happens only in cloned pages.

export type Step = { at: number } & (
  | { kind: 'scroll'; dy: number }
  | { kind: 'focus' }
  | { kind: 'type'; text: string }
  | { kind: 'submit' }
  | { kind: 'act'; name: string }
  | { kind: 'follow' }
);

export type Level = 'none' | 'passive' | 'active';

/** Milliseconds per typed character, between these. */
export const TYPING = [55, 120] as const;

/**
 * `follow` is the chance that a real page's script ends by following a link
 * (0 never). A brief visit is a return to a window already read: fewer
 * scrolls, writing and following only sometimes.
 */
export function readingScript(entry: Pick<Entry, 'kind' | 'page'>, level: Level, follow: number, random: Random, texts: readonly string[], brief = false): Step[] {
  if (level === 'none') return [];
  const steps: Step[] = [];
  let t = between(random, brief ? 500 : 900, brief ? 1200 : 1800);
  const scrolls = brief ? 1 + Math.floor(random() * 2) : 2 + Math.floor(random() * 4);
  for (let i = 0; i < scrolls; i++) {
    const back = i > 0 && chance(random, 0.2);
    steps.push({ at: Math.round(t), kind: 'scroll', dy: back ? -between(random, 160, 320) : between(random, 240, 620) });
    t += between(random, 1400, 3200);
  }
  if (entry.kind === 'clone' && level === 'active' && texts.length && (!brief || chance(random, 0.5))) {
    const text = pick(random, texts);
    t += between(random, 400, 1200);
    steps.push({ at: Math.round(t), kind: 'focus' });
    t += between(random, 500, 900);
    steps.push({ at: Math.round(t), kind: 'type', text });
    t += text.length * TYPING[1] + between(random, 500, 1200);
    steps.push({ at: Math.round(t), kind: 'submit' });
    if (chance(random, 0.6)) {
      t += between(random, 900, 1800);
      steps.push({ at: Math.round(t), kind: 'act', name: 'like' });
    }
  }
  if (entry.kind === 'real' && follow > 0 && chance(random, brief ? follow * 0.5 : follow)) {
    t += between(random, 800, 2000);
    steps.push({ at: Math.round(t), kind: 'follow' });
  }
  return steps;
}

/** Total time a script takes, ms. */
export const scriptLength = (steps: Step[]) => (steps.length ? steps[steps.length - 1].at : 0);

/**
 * Finds a visible link whose text mentions one of the words, in order, and
 * follows it in the same window; evaluates to the word, or null.
 */
export function followExpression(words: readonly string[]) {
  return `(() => {
  const words = ${JSON.stringify(words)};
  const anchors = Array.from(document.querySelectorAll('a[href]')).filter(a => {
    const r = a.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && /^https?:/.test(a.href) && !a.href.includes('#') && a.href !== location.href;
  });
  for (const w of words) {
    const a = anchors.find(a => (a.textContent || '').trim().toLowerCase().includes(w.toLowerCase()));
    if (a) { a.target = '_self'; a.scrollIntoView({ block: 'center', behavior: 'smooth' }); setTimeout(() => a.click(), 900); return w; }
  }
  return null;
})()`;
}
