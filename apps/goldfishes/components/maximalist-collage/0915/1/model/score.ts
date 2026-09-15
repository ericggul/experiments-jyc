export const WIDTH = 1600;
export const HEIGHT = 1000;

export type FragmentKind =
  | 'youtube'
  | 'linkedin'
  | 'instagram'
  | 'search'
  | 'notification'
  | 'chat'
  | 'headline'
  | 'ticker'
  | 'eye';

export type Fragment = {
  id: string;
  kind: FragmentKind;
  x: number;
  y: number;
  width: number;
  height: number;
  source: number;
};

export type Stratum = {
  id: number;
  topic: number;
  fragments: Fragment[];
};

type Random = () => number;

function seededRandom(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function hash(id: number, x: number, y: number) {
  let value = (id ^ Math.imul(Math.round(x), 0x45d9f3b) ^ Math.imul(Math.round(y), 0x27d4eb2d)) >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d) >>> 0;
  value ^= value >>> 15;
  return value >>> 0;
}

function numberBetween(random: Random, minimum: number, maximum: number) {
  return Math.round(minimum + (maximum - minimum) * random());
}

function visiblePosition(random: Random, near: number, size: number, maximum: number, spread: number) {
  const unclamped = near + (random() * 2 - 1) * spread;
  return Math.round(Math.min(maximum - 56, Math.max(56 - size, unclamped)));
}

function dimensions(kind: FragmentKind, random: Random, hero: boolean): [number, number] {
  if (hero) {
    const width = numberBetween(random, 460, 720);
    return [width, numberBetween(random, Math.round(width * 0.46), Math.round(width * 0.72))];
  }
  if (kind === 'eye') {
    const width = numberBetween(random, 150, 350);
    return [width, numberBetween(random, Math.round(width * 0.48), Math.round(width * 0.76))];
  }
  const width = numberBetween(random, 250, 650);
  const ratios: Record<Exclude<FragmentKind, 'eye'>, [number, number]> = {
    youtube: [0.32, 0.58], linkedin: [0.2, 0.45], instagram: [0.55, 0.9],
    search: [0.16, 0.34], notification: [0.18, 0.42], chat: [0.26, 0.58],
    headline: [0.15, 0.34], ticker: [0.1, 0.22],
  };
  const [low, high] = ratios[kind];
  return [width, numberBetween(random, Math.round(width * low), Math.round(width * high))];
}

const kindCycle: readonly FragmentKind[] = [
  'youtube', 'linkedin', 'instagram', 'search', 'chat', 'headline', 'ticker', 'eye',
];

/**
 * One participant click becomes one complete, deterministic visual stratum.
 * A future approach-event may call this function; it must not add screen sync.
 */
export function createStratum(id: number, x: number, y: number): Stratum {
  const safeId = Number.isFinite(id) ? Math.trunc(id) : 0;
  const clickX = Number.isFinite(x) ? Math.min(WIDTH, Math.max(0, x)) : WIDTH / 2;
  const clickY = Number.isFinite(y) ? Math.min(HEIGHT, Math.max(0, y)) : HEIGHT / 2;
  const random = seededRandom(hash(safeId, clickX, clickY));
  const topic = ((safeId % 8) + 8) % 8;
  const heroKind = kindCycle[topic % 2];
  const omittedKind = kindCycle[(topic + 3) % kindCycle.length];
  const supportingKinds = kindCycle.filter((kind) => kind !== heroKind && kind !== omittedKind);
  const schedule: FragmentKind[] = [heroKind, supportingKinds[0]!, supportingKinds[1]!, supportingKinds[2]!, supportingKinds[3]!, supportingKinds[4]!, supportingKinds[5]!, 'notification', 'notification', 'notification'];
  const notificationAnchor = {
    x: clickX + (random() < 0.5 ? -1 : 1) * numberBetween(random, 260, 520),
    y: clickY + (random() < 0.5 ? -1 : 1) * numberBetween(random, 150, 300),
  };

  const fragments = schedule.map((kind, index) => {
    const hero = index === 0;
    const [width, height] = dimensions(kind, random, hero);
    const nearClick = index < 2;
    const notification = index >= 7;
    const anchorX = notification ? notificationAnchor.x : nearClick ? clickX : numberBetween(random, 0, WIDTH);
    const anchorY = notification ? notificationAnchor.y + (index - 8) * 44 : nearClick ? clickY : numberBetween(random, 0, HEIGHT);
    const spread = notification ? 112 : nearClick ? 96 : 390;
    return {
      id: `${safeId}:${index}:${kind}`,
      kind,
      x: visiblePosition(random, anchorX - (nearClick ? width / 2 : 0), width, WIDTH, spread),
      y: visiblePosition(random, anchorY - (nearClick ? height / 2 : 0), height, HEIGHT, spread),
      width,
      height,
      source: topic,
    };
  });

  return { id: safeId, topic, fragments };
}
