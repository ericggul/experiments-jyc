import { defineControl, type Acting } from '../../foundations/control/definition.ts';
import type { Display, PlanItem } from '../../foundations/surfaces/index.ts';
import { followExpression, readingScript, scriptLength, TYPING, type Step } from './agent/reader.ts';
import { createDeck, drawEntry, type Entry } from './model/catalogue.ts';
import { comments } from './model/corpus.ts';
import { createChain, decay, derivedKeywords, draw, mentioned, raise, type Chain } from './model/keywords.ts';
import { windowRect, type Rect } from './model/layout.ts';
import { between, createRandom, type Random } from './model/random.ts';
import { schedule } from './model/rhythm.ts';
import { validateSettings, type Settings } from './model/settings.ts';

export const WINDOW_PATH = '/desktop-collage/hype/1/window';

export type Arrival = { index: number; at: number; keyword: string; entry: Entry; rect: Rect };

export function cloneUrl(origin: string, entry: Entry, keyword: string, seed: number, sound: boolean) {
  const query = new URLSearchParams({ page: entry.page ?? 'article', k: keyword, s: String(seed) });
  if (entry.video) query.set('v', entry.video);
  if (sound) query.set('sound', '1');
  return `${origin}${WINDOW_PATH}?${query}`;
}

const itemOf = (origin: string, settings: Settings, arrival: Arrival): PlanItem => ({
  ...arrival.rect,
  at: arrival.at,
  rank: 1,
  color: '#ffffff',
  url: arrival.entry.kind === 'real' ? arrival.entry.url : cloneUrl(origin, arrival.entry, arrival.keyword, settings.seed * 131 + arrival.index, settings.sound === 'on'),
});

/**
 * The whole run from the seed: when each window opens, what it shows and
 * where it goes. Pure, so the control page previews what the Mac will do.
 */
export function compose(settings: Settings, display: Display, origin: string): { items: PlanItem[]; arrivals: Arrival[] } {
  const random = createRandom(settings.seed);
  const times = schedule(settings.count, settings.interval, settings.burst, random);
  const chain = createChain(settings.keyword);
  const deck = createDeck();
  const arrivals = times.map((at, index) => {
    const wanted = draw(chain, random);
    const entry = drawEntry(deck, wanted, settings.clones, random, settings.keyword);
    raise(chain, entry.keyword, 0.3);
    decay(chain, index ? (at - times[index - 1]) / 1000 : 0);
    return { index, at, keyword: entry.keyword, entry, rect: windowRect(display.visible, index, settings.size, random) };
  });
  return { items: arrivals.map(arrival => itemOf(origin, settings, arrival)), arrivals };
}

/** Ms after placement before a page is read; real pages need to load. */
const SETTLE = 2500;
const TICK = 150;

type Attention = { index: number; steps: Step[]; started: number; next: number; typing?: { text: string; pos: number; at: number }; waiting?: boolean };

/**
 * The reader: attends to the newest settled window, scrolls it, writes in
 * it when it is a clone, follows a link when it is real, and closes the
 * oldest windows above the limit. A followed keyword spawns a window.
 */
function read(settings: Settings, display: Display, origin: string, acting: Acting) {
  const { arrivals } = compose(settings, display, origin);
  const known = new Map<number, { entry: Entry; keyword: string }>(arrivals.map(arrival => [arrival.index, { entry: arrival.entry, keyword: arrival.keyword }]));
  const random: Random = createRandom(settings.seed * 7919 + 17);
  const chain: Chain = createChain(settings.keyword);
  const deck = createDeck();
  const open = new Set<number>();
  const order: number[] = [];
  const settled = new Map<number, number>();
  const finished = new Set<number>();
  const spawns: { at: number; keyword: string }[] = [];
  let attention: Attention | null = null;
  let total = arrivals.length;
  let last = Date.now();

  const evaluate = (index: number, expression: string) => acting.evaluate?.(index, expression).catch(() => undefined) ?? Promise.resolve(undefined);
  const words = () => [...derivedKeywords(chain)].sort((a, b) => (chain.weights.get(b) ?? 0) - (chain.weights.get(a) ?? 0)).concat(settings.keyword);

  function begin(index: number, now: number): Attention {
    const page = known.get(index);
    const keyword = page?.keyword ?? settings.keyword;
    const entry = page?.entry ?? { kind: 'real' as const };
    raise(chain, keyword);
    void evaluate(index, 'document.title').then(title => { if (typeof title === 'string') mentioned(chain, title).forEach(word => raise(chain, word, 0.3)); });
    return { index, steps: readingScript(entry, settings.agent, settings.links === 'follow', random, comments(keyword)), started: now, next: 0 };
  }

  function perform(current: Attention, step: Step, now: number) {
    const { index } = current;
    if (step.kind === 'scroll') acting.scroll?.(index, step.dy);
    else if (step.kind === 'focus') void evaluate(index, 'window.__hype && window.__hype.focus()');
    else if (step.kind === 'type') current.typing = { text: step.text, pos: 0, at: now };
    else if (step.kind === 'submit') void evaluate(index, 'window.__hype && window.__hype.submit()');
    else if (step.kind === 'act') void evaluate(index, `window.__hype && window.__hype.act(${JSON.stringify(step.name)})`);
    else if (step.kind === 'follow') {
      current.waiting = true;
      void evaluate(index, followExpression(words())).then(word => {
        current.waiting = false;
        if (typeof word !== 'string') return;
        raise(chain, word, 1);
        spawns.push({ at: Date.now() + between(random, 1500, 4000), keyword: word });
      });
    }
  }

  function spawn(keyword: string) {
    if (!acting.open) return;
    const entry = drawEntry(deck, keyword, settings.clones, random, settings.keyword);
    const arrival: Arrival = { index: total, at: 0, keyword: entry.keyword, entry, rect: windowRect(display.visible, total, settings.size, random) };
    const index = acting.open(itemOf(origin, settings, arrival));
    known.set(index, { entry, keyword: entry.keyword });
    total = Math.max(total, index + 1);
  }

  const timer = setInterval(() => {
    const now = Date.now();
    decay(chain, (now - last) / 1000);
    last = now;
    for (let index = 0; index < total; index++) {
      const at = acting.opened?.(index);
      if (at !== undefined && !open.has(index)) { open.add(index); order.push(index); settled.set(index, at + SETTLE); }
      else if (at === undefined && open.has(index)) open.delete(index);
    }
    while (order.filter(index => open.has(index)).length > settings.limit) {
      const oldest = order.find(index => open.has(index));
      if (oldest === undefined) break;
      acting.close?.(oldest);
      open.delete(oldest);
    }
    if (settings.agent !== 'none') {
      const newest = [...order].reverse().find(index => open.has(index) && (settled.get(index) ?? Infinity) <= now && !finished.has(index));
      if (newest !== undefined && attention?.index !== newest) attention = begin(newest, now);
      if (attention && !open.has(attention.index)) attention = null;
      if (attention) {
        const current = attention;
        const elapsed = now - current.started;
        if (current.typing) {
          const typing = current.typing;
          while (typing.pos < typing.text.length && typing.at <= now) {
            void evaluate(current.index, `window.__hype && window.__hype.type(${JSON.stringify(typing.text[typing.pos])})`);
            typing.pos += 1;
            typing.at += between(random, TYPING[0], TYPING[1]);
          }
          if (typing.pos >= typing.text.length) current.typing = undefined;
        } else if (!current.waiting) {
          while (current.next < current.steps.length && current.steps[current.next].at <= elapsed) {
            perform(current, current.steps[current.next], now);
            current.next += 1;
            if (current.typing) break;
          }
          if (current.next >= current.steps.length && elapsed >= scriptLength(current.steps) + 600) { finished.add(current.index); attention = null; }
        }
      }
    }
    for (let i = spawns.length - 1; i >= 0; i--) if (spawns[i].at <= now) spawn(spawns.splice(i, 1)[0].keyword);
  }, TICK);
  return () => clearInterval(timer);
}

export const definition = defineControl({
  validate: validateSettings,
  plan: (settings, display, origin) => ({
    surface: 'chrome-app',
    intervalMs: settings.interval * 1000,
    sound: settings.sound === 'on',
    items: compose(settings, display, origin).items,
  }),
  animate: (settings, plan, display, _move, acting) => {
    const first = plan.items.find(item => item.url?.includes(WINDOW_PATH))?.url;
    const origin = first ? new URL(first).origin : '';
    return read(settings, display, origin, acting);
  },
});
