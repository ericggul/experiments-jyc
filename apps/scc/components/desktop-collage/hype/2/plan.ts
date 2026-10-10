import { defineControl, type Acting, type Rect as ControlRect } from '../../foundations/control/definition.ts';
import type { Display, PlanItem } from '../../foundations/surfaces/index.ts';
import { createDeck, drawEntry, type Entry } from './model/catalogue.ts';
import { createChain, draw } from './model/keywords.ts';
import { windowRect, zoomFor, type Rect } from './model/layout.ts';
import { between, chance, createRandom, pick, type Random } from './model/random.ts';
import { burst } from './model/rhythm.ts';
import { ENOUGH, FLURRY, hop, RESHUFFLE, validateSettings, type Settings } from './model/settings.ts';

export const WINDOW_PATH = '/desktop-collage/hype/2/window';

export type Arrival = { index: number; at: number; keyword: string; entry: Entry; rect: Rect; zoom: number; dark: boolean };

export function cloneUrl(origin: string, entry: Entry, keyword: string, seed: number, sound: boolean, zoom: number) {
  const query = new URLSearchParams({ page: entry.page ?? 'article', k: keyword, s: String(seed) });
  if (entry.video) query.set('v', entry.video);
  if (entry.image !== undefined) query.set('img', String(entry.image));
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

/**
 * The whole run from the seed: every window opens at the start in a quick
 * burst; each has its page, place, zoom and light or dark ground. Pure, so
 * the control page previews what the Mac will do.
 */
export function compose(settings: Settings, display: Display, origin: string): { items: PlanItem[]; arrivals: Arrival[] } {
  const random = createRandom(settings.seed);
  const times = burst(settings.count, settings.gap, random);
  const chain = createChain(settings.keyword);
  const deck = createDeck();
  const arrivals = times.map((at, index) => {
    const entry = drawEntry(deck, draw(chain, random), settings.clones, random);
    const rect = windowRect(display.visible, index, settings.size, random);
    return { index, at, keyword: entry.keyword, entry, rect, zoom: settings.pages === 'scaled' ? zoomFor(rect.width) : 1, dark: chance(random, settings.dark / 100) };
  });
  return { items: arrivals.map(arrival => itemOf(origin, settings, arrival)), arrivals };
}

/** Ms after placement before a page counts as loaded. */
const SETTLE = 1200;
const TICK = 10;
/** Ms after the run starts by which flicking begins even if some windows never settled. */
const LOADING_LIMIT = 25000;
/** Chance a flick also scrolls the window it lands on. */
const SCROLL = 0.35;

/**
 * Flicking from the moment a few windows have settled (the rest join as
 * they arrive) for `duration` seconds: the front window changes at random
 * among the open windows with gaps log-uniform from `pace`/8 to `pace` ms
 * and flurries of flicks 20 ms apart, never pausing; a small scroll now and
 * then, a new place and size in the share asked for, and every few seconds
 * a reshuffle of several windows together. Pages are zoomed out in narrow
 * windows and forced dark in the share asked for.
 */
function flick(settings: Settings, display: Display, move: (index: number, rect: ControlRect) => void, acting: Acting) {
  const { arrivals } = compose(settings, display, '');
  const random: Random = createRandom(settings.seed * 7919 + 17);
  let flurry = 0;
  const open = new Set<number>();
  const settled = new Map<number, number>();
  const styled = new Set<number>();
  const started = Date.now();
  let phase: 'loading' | 'flicking' = 'loading';
  let flickingSince = 0;
  let nextHop = 0;
  let nextReshuffle = 0;
  let front: number | undefined;

  function style(index: number) {
    const arrival = arrivals[index];
    if (!arrival) return;
    if (arrival.zoom < 1 && arrival.entry.kind === 'real') void acting.evaluate?.(index, `document.documentElement.style.zoom = ${JSON.stringify(String(arrival.zoom))}`).catch(() => {});
    if (arrival.dark) acting.dark?.(index, true);
  }

  const timer = setInterval(() => {
    const now = Date.now();
    for (let index = 0; index < arrivals.length; index++) {
      const at = acting.opened?.(index);
      if (at !== undefined && !open.has(index)) { open.add(index); settled.set(index, at + SETTLE); }
      else if (at === undefined && open.has(index)) open.delete(index);
      if (open.has(index) && !styled.has(index) && (settled.get(index) ?? Infinity) <= now) { styled.add(index); style(index); }
    }
    const ready = [...open].filter(index => (settled.get(index) ?? Infinity) <= now);
    if (phase === 'loading') {
      if (ready.length >= Math.min(ENOUGH, arrivals.length) || (now - started > LOADING_LIMIT && ready.length)) { phase = 'flicking'; flickingSince = now; nextHop = now; nextReshuffle = now + between(random, RESHUFFLE[0], RESHUFFLE[1]); }
      return;
    }
    if (now - flickingSince >= settings.duration * 1000) { clearInterval(timer); acting.done?.(); return; }
    if (now >= nextReshuffle) {
      const few = [...ready].sort(() => random() - 0.5).slice(0, 3 + Math.floor(random() * 4));
      few.forEach(index => move(index, windowRect(display.visible, index, settings.size, random)));
      nextReshuffle = now + between(random, RESHUFFLE[0], RESHUFFLE[1]);
    }
    if (now < nextHop) return;
    const candidates = ready.filter(index => index !== front);
    if (candidates.length) {
      const target = pick(random, candidates);
      front = target;
      acting.front?.(target);
      if (chance(random, SCROLL)) acting.scroll?.(target, (chance(random, 0.3) ? -1 : 1) * between(random, 80, 480));
      if (chance(random, settings.moves / 100)) move(target, windowRect(display.visible, target, settings.size, random));
    }
    if (flurry > 0) { flurry -= 1; nextHop = now + between(random, 12, 30); }
    else if (chance(random, FLURRY)) { flurry = 2 + Math.floor(random() * 4); nextHop = now + between(random, 12, 30); }
    else nextHop = now + hop(settings.pace, random());
  }, TICK);
  return () => clearInterval(timer);
}

export const definition = defineControl({
  validate: validateSettings,
  plan: (settings, display, origin) => ({
    surface: 'chrome-app',
    intervalMs: settings.gap,
    sound: settings.sound === 'on',
    items: compose(settings, display, origin).items,
  }),
  animate: (settings, _plan, display, move, acting) => flick(settings, display, move, acting),
});
