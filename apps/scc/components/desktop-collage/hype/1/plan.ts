import { defineControl, type Acting } from '../../foundations/control/definition.ts';
import type { Display, PlanItem } from '../../foundations/surfaces/index.ts';
import { followExpression, readingScript, scriptLength, TYPING, type Step } from './agent/reader.ts';
import { createDeck, drawEntry, type Entry } from './model/catalogue.ts';
import { comments } from './model/corpus.ts';
import { createChain, decay, derivedKeywords, draw, mentioned, raise, type Chain } from './model/keywords.ts';
import { revisitWeight, windowRect, zoomFor, type Rect } from './model/layout.ts';
import { between, chance, createRandom, weighted, type Random } from './model/random.ts';
import { schedule } from './model/rhythm.ts';
import { validateSettings, type Settings } from './model/settings.ts';

export const WINDOW_PATH = '/desktop-collage/hype/1/window';

export type Arrival = { index: number; at: number; keyword: string; entry: Entry; rect: Rect; zoom: number; dark: boolean };

export function cloneUrl(origin: string, entry: Entry, keyword: string, seed: number, sound: boolean, zoom: number) {
  const query = new URLSearchParams({ page: entry.page ?? 'article', k: keyword, s: String(seed) });
  if (entry.video) query.set('v', entry.video);
  if (sound) query.set('sound', '1');
  if (zoom < 1) query.set('z', String(zoom));
  return `${origin}${WINDOW_PATH}?${query}`;
}

const itemOf = (origin: string, settings: Settings, arrival: Arrival): PlanItem => ({
  ...arrival.rect,
  at: arrival.at,
  rank: 1,
  color: '#ffffff',
  url: arrival.entry.kind === 'real' ? arrival.entry.url : cloneUrl(origin, arrival.entry, arrival.keyword, settings.seed * 131 + arrival.index, settings.sound === 'on', arrival.zoom),
});

const zoomOf = (settings: Settings, rect: Rect) => (settings.pages === 'scaled' ? zoomFor(rect.width) : 1);

/** How likely a real page's script ends by following a link. */
export const followChance = (settings: Settings) => (settings.links === 'follow' && settings.spawn > 0 ? Math.min(0.95, 0.2 + 0.75 * (settings.spawn / 100)) : 0);

/**
 * The whole run from the seed: when each window opens, what it shows, where
 * it goes, how far its page is zoomed out and whether it is dark. Pure, so
 * the control page previews what the Mac will do.
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
    const rect = windowRect(display.visible, index, settings.size, random);
    return { index, at, keyword: entry.keyword, entry, rect, zoom: zoomOf(settings, rect), dark: chance(random, settings.dark / 100) };
  });
  return { items: arrivals.map(arrival => itemOf(origin, settings, arrival)), arrivals };
}

/** Ms after placement before a page is read; real pages need to load. */
const SETTLE = 2500;
const TICK = 150;
/** Ms after a followed link before the new page is zoomed and themed again. */
const RESTYLE = 2500;
/** Ms between flicks when restless. */
const HOP = [250, 1000] as const;
/** Chance per flick that a real page under the reader is left through a link, at full spawn. */
const HOP_FOLLOW = 0.06;

type Page = { entry: Entry; keyword: string; zoom: number; dark: boolean };
type Attention = { index: number; steps: Step[]; started: number; next: number; typing?: { text: string; pos: number; at: number }; waiting?: boolean };

/**
 * The reader: attends to each new window once it has settled, scrolls it,
 * writes in it when it is a clone, follows a link when it is real, and
 * closes the oldest windows above the limit. A followed keyword spawns one
 * or two windows. When restless, it also flicks between the open windows
 * under a second apart, bringing each to the front with a small scroll and
 * now and then leaving a real one through a link. Pages are zoomed out in
 * narrow windows and forced dark in the share asked for.
 */
function read(settings: Settings, display: Display, origin: string, acting: Acting) {
  const { arrivals } = compose(settings, display, origin);
  const known = new Map<number, Page>(arrivals.map(arrival => [arrival.index, { entry: arrival.entry, keyword: arrival.keyword, zoom: arrival.zoom, dark: arrival.dark }]));
  const random: Random = createRandom(settings.seed * 7919 + 17);
  const chain: Chain = createChain(settings.keyword);
  const deck = createDeck();
  const open = new Set<number>();
  const order: number[] = [];
  const settled = new Map<number, number>();
  const seen = new Set<number>();
  const written = new Set<number>();
  const styled = new Set<number>();
  const spawns: { at: number; keyword: string }[] = [];
  const restyles: { at: number; index: number }[] = [];
  const follow = followChance(settings);
  let attention: Attention | null = null;
  let nextHop = 0;
  let front: number | undefined;
  let total = arrivals.length;
  let last = Date.now();

  const evaluate = (index: number, expression: string) => acting.evaluate?.(index, expression).catch(() => undefined) ?? Promise.resolve(undefined);
  const words = () => [...derivedKeywords(chain)].sort((a, b) => (chain.weights.get(b) ?? 0) - (chain.weights.get(a) ?? 0)).concat(settings.keyword);
  const pageOf = (index: number): Page => known.get(index) ?? { entry: { id: 'unknown', keyword: settings.keyword, kind: 'real', type: 'news', title: '' }, keyword: settings.keyword, zoom: 1, dark: false };

  /** Zoom (real pages; clones zoom themselves from their URL) and dark mode. */
  function style(index: number) {
    const page = pageOf(index);
    if (page.zoom < 1 && page.entry.kind === 'real') void evaluate(index, `document.documentElement.style.zoom = ${JSON.stringify(String(page.zoom))}`);
    if (page.dark) acting.dark?.(index, true);
  }

  /** Leaves a real page through a link to a chain keyword, and lets that keyword spawn windows. */
  function leave(index: number, onDone?: () => void) {
    void evaluate(index, followExpression(words())).then(word => {
      onDone?.();
      if (typeof word !== 'string') return;
      raise(chain, word, 1);
      restyles.push({ at: Date.now() + RESTYLE, index });
      const count = settings.spawn > 0 ? 1 + (chance(random, settings.spawn / 100) ? 1 : 0) : 0;
      for (let i = 0; i < count; i++) spawns.push({ at: Date.now() + between(random, 1500, 4000) + i * between(random, 1000, 3000), keyword: word });
    });
  }

  function begin(index: number, now: number): Attention {
    const { entry, keyword } = pageOf(index);
    seen.add(index);
    raise(chain, keyword);
    void evaluate(index, 'document.title').then(title => { if (typeof title === 'string') mentioned(chain, title).forEach(word => raise(chain, word, 0.3)); });
    const texts = written.has(index) ? [] : comments(keyword);
    return { index, steps: readingScript(entry, settings.agent, follow, random, texts), started: now, next: 0 };
  }

  function perform(current: Attention, step: Step, now: number) {
    const { index } = current;
    if (step.kind === 'scroll') acting.scroll?.(index, step.dy);
    else if (step.kind === 'focus') void evaluate(index, 'window.__hype && window.__hype.focus()');
    else if (step.kind === 'type') current.typing = { text: step.text, pos: 0, at: now };
    else if (step.kind === 'submit') { written.add(index); void evaluate(index, 'window.__hype && window.__hype.submit()'); }
    else if (step.kind === 'act') void evaluate(index, `window.__hype && window.__hype.act(${JSON.stringify(step.name)})`);
    else if (step.kind === 'follow') { current.waiting = true; leave(index, () => { current.waiting = false; }); }
  }

  function spawn(keyword: string) {
    if (!acting.open) return;
    const entry = drawEntry(deck, keyword, settings.clones, random, settings.keyword);
    const rect = windowRect(display.visible, total, settings.size, random);
    const arrival: Arrival = { index: total, at: 0, keyword: entry.keyword, entry, rect, zoom: zoomOf(settings, rect), dark: chance(random, settings.dark / 100) };
    const index = acting.open(itemOf(origin, settings, arrival));
    known.set(index, { entry, keyword: entry.keyword, zoom: arrival.zoom, dark: arrival.dark });
    total = Math.max(total, index + 1);
  }

  /** Another settled window to flick to, newer ones more likely. */
  function elsewhere(except: number | undefined) {
    const candidates = [...order].reverse().filter(index => open.has(index) && index !== except && (settled.get(index) ?? Infinity) <= Date.now());
    if (!candidates.length) return undefined;
    return weighted(random, candidates, index => revisitWeight(candidates.indexOf(index)));
  }

  const timer = setInterval(() => {
    const now = Date.now();
    decay(chain, (now - last) / 1000);
    last = now;
    for (let index = 0; index < total; index++) {
      const at = acting.opened?.(index);
      if (at !== undefined && !open.has(index)) { open.add(index); order.push(index); settled.set(index, at + SETTLE); }
      else if (at === undefined && open.has(index)) open.delete(index);
      if (open.has(index) && !styled.has(index) && (settled.get(index) ?? Infinity) <= now) { styled.add(index); style(index); }
    }
    while (order.filter(index => open.has(index)).length > settings.limit) {
      const oldest = order.find(index => open.has(index));
      if (oldest === undefined) break;
      acting.close?.(oldest);
      open.delete(oldest);
    }
    for (let i = restyles.length - 1; i >= 0; i--) if (restyles[i].at <= now) style(restyles.splice(i, 1)[0].index);
    if (settings.agent !== 'none') {
      const newest = [...order].reverse().find(index => open.has(index) && (settled.get(index) ?? Infinity) <= now && !seen.has(index));
      if (newest !== undefined && attention?.index !== newest) { attention = begin(newest, now); front = newest; }
      if (attention && !open.has(attention.index)) attention = null;
      if (settings.attention === 'restless' && now >= nextHop) {
        const target = elsewhere(front);
        if (target !== undefined) {
          front = target;
          acting.front?.(target);
          acting.scroll?.(target, (chance(random, 0.25) ? -1 : 1) * between(random, 100, 420));
          if (pageOf(target).entry.kind === 'real' && follow > 0 && chance(random, HOP_FOLLOW * (settings.spawn / 100))) leave(target);
        }
        nextHop = now + between(random, HOP[0], HOP[1]);
      }
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
          if (current.next >= current.steps.length && elapsed >= scriptLength(current.steps) + 600) attention = null;
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
