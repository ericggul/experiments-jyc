import { defineControl, type Acting, type Rect as ControlRect } from '../../foundations/control/definition.ts';
import type { Display, PlanItem } from '../../foundations/surfaces/index.ts';
import { createDeck, drawEntry, type Entry } from './model/catalogue.ts';
import { createChain, draw } from './model/keywords.ts';
import { nudge, windowRect, zoomFor, type Rect } from './model/layout.ts';
import { between, chance, createRandom, pick, type Random } from './model/random.ts';
import { burst } from './model/rhythm.ts';
import { FLURRY, FLURRY_GAP, hop, MOST, RESHUFFLE, RETURN, SNAG, SNAG_DWELL, validateSettings, type Settings } from './model/settings.ts';

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
  let whole = false;
  const arrivals = times.map((at, index) => {
    const entry = drawEntry(deck, draw(chain, random), settings.clones, random);
    const rect = windowRect(display.visible, index, settings.size, random, !whole);
    whole ||= rect.width === display.visible.width && rect.height === display.visible.height;
    return { index, at, keyword: entry.keyword, entry, rect, zoom: settings.pages === 'scaled' ? zoomFor(rect.width) : 1, dark: chance(random, settings.dark / 100) };
  });
  return { items: arrivals.map(arrival => itemOf(origin, settings, arrival)), arrivals };
}

/** Ms between looks at whether a placed page has finished loading. */
const LOOK = 400;
/** Ms after placement by which a page counts as loaded even if it never says so. */
const SETTLE_LIMIT = 8000;
const TICK = 10;
/** Ms after the run starts by which the flicking seconds start counting even if fewer windows have loaded. */
const LOADING_LIMIT = 25000;
/** Chance an ordinary flick also scrolls the window it lands on a little. */
const SCROLL = 0.3;

/**
 * Flicking among the windows whose pages have loaded, from the second one
 * on, and for `duration` seconds once most have loaded, like one person's
 * attention: a window
 * stays in front for a dwell log-uniform from `pace`/3 to 2.2 × `pace` ms,
 * long enough to catch a headline; a flick in four goes back to the window
 * that was just in front; a flick in seven starts a flurry of three to six
 * flicks 45–75 ms apart; a flick in eight snags, staying half a second or
 * more while the page is scrolled; a small scroll now and then; in the
 * share asked for the window in front is dragged a little and perhaps
 * resized; and every several seconds two to four windows are rearranged
 * together. It never pauses. Pages are forced dark in the share asked for
 * and zoomed out in narrow windows when pages are scaled.
 */
function flick(settings: Settings, display: Display, move: (index: number, rect: ControlRect) => void, acting: Acting) {
  const { arrivals } = compose(settings, display, '');
  const random: Random = createRandom(settings.seed * 7919 + 17);
  const rects = new Map(arrivals.map(arrival => [arrival.index, arrival.rect]));
  let flurry = 0;
  const open = new Set<number>();
  const placedAt = new Map<number, number>();
  const looked = new Map<number, number>();
  const settled = new Set<number>();
  const styled = new Set<number>();
  const started = Date.now();
  let counting = false;
  let flickingSince = 0;
  let nextHop = 0;
  let nextReshuffle = 0;
  let front: number | undefined;
  let previous: number | undefined;

  function place(index: number, rect: Rect) {
    rects.set(index, rect);
    move(index, rect);
  }

  function style(index: number) {
    const arrival = arrivals[index];
    if (!arrival) return;
    if (arrival.zoom < 1 && arrival.entry.kind === 'real') void acting.evaluate?.(index, `document.documentElement.style.zoom = ${JSON.stringify(String(arrival.zoom))}`).catch(() => {});
    if (arrival.dark) acting.dark?.(index, true);
  }

  // A window joins the flicking once its page has loaded (asked every LOOK ms
  // through its DevTools session), or SETTLE_LIMIT after placement at the latest.
  function look(index: number, now: number) {
    looked.set(index, now);
    void acting.evaluate?.(index, 'document.readyState').then(state => { if (state === 'complete' && open.has(index)) settled.add(index); }).catch(() => {});
  }

  const timer = setInterval(() => {
    const now = Date.now();
    for (let index = 0; index < arrivals.length; index++) {
      const at = acting.opened?.(index);
      if (at !== undefined && !open.has(index)) { open.add(index); placedAt.set(index, at); }
      else if (at === undefined && open.has(index)) { open.delete(index); settled.delete(index); }
      if (!open.has(index) || settled.has(index)) continue;
      if (now - (placedAt.get(index) ?? now) >= SETTLE_LIMIT) settled.add(index);
      else if (now - (looked.get(index) ?? -Infinity) >= LOOK) look(index, now);
    }
    for (const index of settled) if (!styled.has(index)) { styled.add(index); style(index); }
    const ready = [...settled];
    if (!counting && ready.length && (ready.length >= Math.ceil(arrivals.length * MOST) || now - started > LOADING_LIMIT)) { counting = true; flickingSince = now; nextReshuffle = now + between(random, RESHUFFLE[0], RESHUFFLE[1]); }
    if (counting && now - flickingSince >= settings.duration * 1000) { clearInterval(timer); acting.done?.(); return; }
    if (counting && now >= nextReshuffle) {
      const few = [...ready].sort(() => random() - 0.5).slice(0, 2 + Math.floor(random() * 3));
      few.forEach(index => place(index, windowRect(display.visible, index, settings.size, random, false)));
      nextReshuffle = now + between(random, RESHUFFLE[0], RESHUFFLE[1]);
    }
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
    if (chance(random, settings.moves / 100)) place(target, nudge(display.visible, rects.get(target) ?? arrivals[target].rect, random));
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
  animate: (settings, _plan, display, move, acting) => flick(settings, display, move, acting),
});
