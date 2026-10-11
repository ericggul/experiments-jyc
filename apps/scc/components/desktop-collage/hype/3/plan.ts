import { defineControl, type Acting } from '../../foundations/control/definition.ts';
import type { Display, PlanItem } from '../../foundations/surfaces/index.ts';
import { createDeck, drawEntry, type Entry } from './model/catalogue.ts';
import { createChain, draw } from './model/keywords.ts';
import { windowRect, type Rect } from './model/layout.ts';
import { between, chance, createRandom, pick, type Random } from './model/random.ts';
import { burst } from './model/rhythm.ts';
import { FLURRY, FLURRY_GAP, hop, MOST, RETURN, SNAG, SNAG_DWELL, validateSettings, type Settings } from './model/settings.ts';

export const WINDOW_PATH = '/desktop-collage/hype/3/window';

export type Arrival = { index: number; at: number; keyword: string; entry: Entry; rect: Rect; dark: boolean };

export function cloneUrl(origin: string, entry: Entry, keyword: string, seed: number, sound: boolean) {
  const query = new URLSearchParams({ page: entry.page ?? 'article', k: keyword, s: String(seed) });
  if (entry.video) query.set('v', entry.video);
  if (entry.image !== undefined) query.set('img', String(entry.image));
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
 * The whole run from the seed: every window opens at the start in a quick
 * burst, each the same phone at a random place, with its page and light or dark
 * ground. Pure, so the control page previews what the Mac will do.
 */
export function compose(settings: Settings, display: Display, origin: string): { items: PlanItem[]; arrivals: Arrival[] } {
  const random = createRandom(settings.seed);
  const times = burst(settings.count, settings.gap, random);
  const chain = createChain(settings.keyword);
  const deck = createDeck();
  const allowed = new Set(settings.sites);
  const arrivals = times.map((at, index) => {
    const entry = drawEntry(deck, draw(chain, random), settings.clones, random, allowed);
    const rect = windowRect(display.visible, index, settings.height, random);
    return { index, at, keyword: entry.keyword, entry, rect, dark: chance(random, settings.dark / 100) };
  });
  return { items: arrivals.map(arrival => itemOf(origin, settings, arrival)), arrivals };
}

/** Ms between looks at whether a placed page has finished loading. */
const LOOK = 400;
/** Ms after the mobile reload was asked for before the page's state is read, so the old page's "complete" is not taken for the new one's. */
const RELOAD_GRACE = 800;
/** Ms after placement by which a page counts as loaded even if it never says so. */
const SETTLE_LIMIT = 12000;
const TICK = 10;
/** Ms after the run starts by which the flicking seconds start counting even if fewer windows have loaded. */
const LOADING_LIMIT = 30000;
/** Chance an ordinary flick also scrolls the window it lands on a little. */
const SCROLL = 0.3;

/**
 * Each window is rendered as a phone as soon as it is placed (mobile user
 * agent, touch, viewport; the page reloads so the site serves its phone
 * version). Flicking among the windows whose pages have loaded, from the
 * second one on, and for `duration` seconds once most have loaded, like one
 * person's attention: a window stays in front for a dwell log-uniform from
 * `pace`/3 to 2.2 × `pace` ms; a flick in four goes back to the window that
 * was just in front; a flick in seven starts a flurry of three to six flicks
 * 45–75 ms apart; a flick in eight snags, staying half a second or more
 * while the page is scrolled; a small scroll now and then. Windows never
 * move. Pages are forced dark in the share asked for.
 */
function flick(settings: Settings, display: Display, acting: Acting) {
  const { arrivals } = compose(settings, display, '');
  const random: Random = createRandom(settings.seed * 7919 + 17);
  let flurry = 0;
  const open = new Set<number>();
  const placedAt = new Map<number, number>();
  const preparedAt = new Map<number, number>();
  const looked = new Map<number, number>();
  const settled = new Set<number>();
  const styled = new Set<number>();
  const started = Date.now();
  let counting = false;
  let flickingSince = 0;
  let nextHop = 0;
  let front: number | undefined;
  let previous: number | undefined;

  function prepare(index: number) {
    const mobile = acting.mobile?.(index) ?? Promise.resolve();
    void mobile.finally(() => preparedAt.set(index, Date.now()));
  }
  function style(index: number) {
    if (arrivals[index]?.dark) acting.dark?.(index, true);
  }
  function look(index: number, now: number) {
    looked.set(index, now);
    void acting.evaluate?.(index, 'document.readyState').then(state => { if (state === 'complete' && open.has(index)) settled.add(index); }).catch(() => {});
  }

  const timer = setInterval(() => {
    const now = Date.now();
    for (let index = 0; index < arrivals.length; index++) {
      const at = acting.opened?.(index);
      if (at !== undefined && !open.has(index)) { open.add(index); placedAt.set(index, at); prepare(index); }
      else if (at === undefined && open.has(index)) { open.delete(index); settled.delete(index); }
      if (!open.has(index) || settled.has(index)) continue;
      const prepared = preparedAt.get(index);
      if (now - (placedAt.get(index) ?? now) >= SETTLE_LIMIT) settled.add(index);
      else if (prepared !== undefined && now - prepared >= RELOAD_GRACE && now - (looked.get(index) ?? -Infinity) >= LOOK) look(index, now);
    }
    for (const index of settled) if (!styled.has(index)) { styled.add(index); style(index); }
    const ready = [...settled];
    if (!counting && ready.length && (ready.length >= Math.ceil(arrivals.length * MOST) || now - started > LOADING_LIMIT)) { counting = true; flickingSince = now; }
    if (counting && now - flickingSince >= settings.duration * 1000) { clearInterval(timer); acting.done?.(); return; }
    if (now < nextHop) return;
    const candidates = ready.filter(index => index !== front);
    if (!candidates.length) return;
    const back = previous !== undefined && previous !== front && candidates.includes(previous) && chance(random, RETURN);
    const target = back ? previous! : pick(random, candidates);
    previous = front;
    front = target;
    acting.front?.(target);
    const snag = flurry === 0 && chance(random, SNAG);
    if (snag || chance(random, SCROLL)) acting.scroll?.(target, (chance(random, 0.3) ? -1 : 1) * between(random, snag ? 240 : 80, snag ? 720 : 480));
    if (snag) nextHop = now + between(random, SNAG_DWELL[0], SNAG_DWELL[1]);
    else if (flurry > 0) { flurry -= 1; nextHop = now + between(random, FLURRY_GAP[0], FLURRY_GAP[1]); }
    else if (chance(random, FLURRY)) { flurry = 2 + Math.floor(random() * 4); nextHop = now + between(random, FLURRY_GAP[0], FLURRY_GAP[1]); }
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
  animate: (settings, _plan, display, _move, acting) => flick(settings, display, acting),
});
