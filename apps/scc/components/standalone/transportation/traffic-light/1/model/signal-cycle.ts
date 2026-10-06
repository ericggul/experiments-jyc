export type SignalLamp = "red" | "yellow" | "arrow" | "green";

/**
 * Korean vehicle head layouts: left to right when horizontal, top to bottom
 * when vertical. The four-colour head sets the green left-turn arrow between
 * amber and green.
 */
export const HEAD_LAMPS = {
  three: ["red", "yellow", "green"],
  four: ["red", "yellow", "arrow", "green"],
} as const satisfies Record<string, readonly SignalLamp[]>;

export type HeadKind = keyof typeof HEAD_LAMPS;

export type SignalPhase = { lit: readonly SignalLamp[]; seconds: number };

const RED: readonly SignalLamp[] = ["red"];
// Straight-and-left together (직좌 동시신호): a four-colour head adds the arrow to green.
const GO: readonly SignalLamp[] = ["green", "arrow"];
const AMBER: readonly SignalLamp[] = ["yellow"];

/**
 * Timing plans for this approach, starting at the onset of red. Amber is a
 * fixed 3 s clearance in every plan; red covers the other phases plus all-red.
 */
export const SIGNAL_PLANS = [
  {
    // Time-compressed two-phase junction: red 10 s = all-red 1 + cross green 5
    // + cross amber 3 + all-red 1.
    id: "short",
    label: "적색 10초",
    // Both directions of a two-phase junction run together.
    opposingOffset: 0,
    phases: [
      { lit: RED, seconds: 10 },
      { lit: GO, seconds: 8 },
      { lit: AMBER, seconds: 3 },
    ],
  },
  {
    // Real-time two-phase junction, 90 s cycle.
    id: "two-phase",
    label: "2현시 90초",
    opposingOffset: 0,
    phases: [
      { lit: RED, seconds: 47 },
      { lit: GO, seconds: 40 },
      { lit: AMBER, seconds: 3 },
    ],
  },
  {
    // Real-time four-phase arterial junction, 160 s cycle; this approach holds one phase.
    id: "four-phase",
    label: "4현시 160초",
    // The opposing approach holds the next phase: 35 s green + 3 s amber + 2 s all-red later.
    opposingOffset: -40,
    phases: [
      { lit: RED, seconds: 122 },
      { lit: GO, seconds: 35 },
      { lit: AMBER, seconds: 3 },
    ],
  },
] as const satisfies readonly { id: string; label: string; opposingOffset: number; phases: readonly SignalPhase[] }[];

export type SignalPlanId = (typeof SIGNAL_PLANS)[number]["id"];

/** Lit lamps and seconds until they change, for elapsed time since the plan began. */
export function signalAt(phases: readonly SignalPhase[], elapsedSeconds: number) {
  const cycle = phases.reduce((sum, phase) => sum + phase.seconds, 0);
  let t = ((elapsedSeconds % cycle) + cycle) % cycle;
  for (const phase of phases) {
    if (t < phase.seconds) return { lit: phase.lit, remaining: phase.seconds - t };
    t -= phase.seconds;
  }
  return { lit: phases[0].lit, remaining: phases[0].seconds };
}

export type HeadCount = 1 | 2 | 3;
export const HEAD_COUNTS: readonly HeadCount[] = [1, 2, 3];

/** Centre-to-centre spacing of heads on one arm, the police manual's 2.4 m minimum. */
const HEAD_SPACING = 2.4;
/** Distance from the arm flange to the head nearest the pole. */
const FIRST_HEAD = 4.2;

export type ArmLayout = { kinds: readonly HeadKind[]; positions: readonly number[] };

/**
 * Heads along the arm, nearest the pole first; one head alone sits farther out.
 * Every head on an approach repeats the same indication, so with a left turn
 * all of them are four-colour.
 */
export function armLayout(count: HeadCount, leftTurn: boolean): ArmLayout {
  const positions = count === 1 ? [5.3] : Array.from({ length: count }, (_, index) => FIRST_HEAD + index * HEAD_SPACING);
  const kinds = positions.map((): HeadKind => (leftTurn ? "four" : "three"));
  return { kinds, positions };
}
