/**
 * Where the poles stand and how each one differs, as pure data. A layout places
 * the poles; variations then alter them. Each entry declares its own parameters,
 * so the option panel is generated from these registries: a new experiment is a
 * new entry here, not new interface code.
 */

/** One pole: its base on the ground (x, z), its facing, and how much taller it is than the model. */
export type PoleSpec = {
  x: number;
  z: number;
  /** Rotation about the vertical, radians; 0 sends the arm toward -x with heads facing +z. */
  heading: number;
  /** Metres the arm is raised above the model (negative is lower). */
  rise: number;
  /** Whether this pole draws its own base and shaft; poles sharing one spot share one trunk. */
  trunk?: boolean;
  /** Metres added to the shaft, when it must reach past this pole's own arm; defaults to `rise`. */
  shaft?: number;
  /** Speed of this pole's signal clock (2 runs its cycle in half the time); defaults to 1. */
  rate?: number;
  /** Where this pole's clock starts, as a fraction of the cycle; defaults to 0. */
  phase?: number;
};

export type ChoiceParameter = {
  kind: "choice";
  id: string;
  label: string;
  choices: readonly { id: string; label: string }[];
  initial: string;
};

export type RangeParameter = {
  kind: "range";
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  initial: number;
};

export type Parameter = ChoiceParameter | RangeParameter;
export type ParameterValues = Record<string, string | number>;

const choiceOf = (values: ParameterValues, id: string) => String(values[id]);
const numberOf = (values: ParameterValues, id: string) => Number(values[id]);

/** Seeded generator (mulberry32): the same seed always gives the same arrangement. */
export function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal sample by Box–Muller. */
function normal(random: () => number) {
  const u = Math.max(random(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random());
}

export type Layout = {
  id: string;
  label: string;
  parameters: readonly Parameter[];
  /** Whether poles are spread along a path, so the spacing applies. */
  usesSpacing: boolean;
  /** Whether every arm springs from one shared pole, drawn once. */
  sharedTrunk?: boolean;
  /** Places the layout's poles (`spacing` metres apart, where it applies); the layout sets their number. */
  place: (spacing: number, values: ParameterValues) => PoleSpec[];
};

/** Poles in the line and arms on the circle. */
export const POLE_COUNT = 50;

export const LAYOUTS: readonly Layout[] = [
  {
    id: "line",
    label: "직선",
    parameters: [],
    usesSpacing: true,
    // Down one straight road, receding along -z.
    place: (spacing) => Array.from({ length: POLE_COUNT }, (_, index) => ({ x: 0, z: -index * spacing, heading: 0, rise: 0 })),
  },
  {
    id: "circle",
    label: "원형",
    parameters: [
      { kind: "range", id: "sweep", label: "펼침 각도", min: 30, max: 360, step: 5, unit: "°", initial: 360 },
    ],
    usesSpacing: false,
    sharedTrunk: true,
    // One pole stays where it stands; its arms fan out around it, evenly over the sweep,
    // the first arm in the model's direction.
    place: (_spacing, values) => {
      const count = POLE_COUNT;
      const sweep = (numberOf(values, "sweep") * Math.PI) / 180;
      // A full turn spaces arms evenly without doubling the first; a partial fan spans both ends.
      const step = sweep >= Math.PI * 2 - 1e-6 ? sweep / count : sweep / Math.max(1, count - 1);
      return Array.from({ length: count }, (_, index) => ({ x: 0, z: 0, heading: index * step, rise: 0 }));
    },
  },
  {
    id: "grid",
    label: "격자",
    parameters: [
      { kind: "range", id: "rows", label: "행", min: 1, max: 20, step: 1, unit: "", initial: 10 },
      { kind: "range", id: "columns", label: "열", min: 1, max: 20, step: 1, unit: "", initial: 10 },
    ],
    usesSpacing: true,
    // Rows recede along -z and columns run across x, `spacing` apart both ways, centred
    // across; every pole faces the viewer. Arms longer than the spacing reach past the
    // next pole in the row.
    place: (spacing, values) => {
      const rows = numberOf(values, "rows");
      const columns = numberOf(values, "columns");
      return Array.from({ length: rows * columns }, (_, index) => {
        const row = Math.floor(index / columns);
        const column = index % columns;
        return { x: (column - (columns - 1) / 2) * spacing, z: -row * spacing, heading: 0, rise: 0 };
      });
    },
  },
];

export type Variation = {
  id: string;
  label: string;
  /** Whether the variation draws random numbers, so the panel offers a reshuffle. */
  stochastic: boolean;
  parameters: readonly Parameter[];
  apply: (poles: PoleSpec[], values: ParameterValues, random: () => number) => PoleSpec[];
};

/** Lowest rise allowed: the arm stays above the pole-mounted head and its heads above 4 m. */
export const MIN_RISE = -1;

export const VARIATIONS: readonly Variation[] = [
  {
    id: "height",
    label: "높이",
    stochastic: true,
    parameters: [
      {
        kind: "choice",
        id: "distribution",
        label: "높이 분포",
        choices: [
          { id: "none", label: "같음" },
          { id: "normal", label: "정규" },
          { id: "uniform", label: "균등" },
          { id: "lognormal", label: "로그정규" },
        ],
        initial: "none",
      },
      { kind: "range", id: "spread", label: "높이 편차", min: 0, max: 6, step: 0.1, unit: "m", initial: 1.5 },
    ],
    // Each pole's rise is drawn independently; `spread` is the standard deviation
    // (normal), the half-range (uniform), or the scale of the right-skewed tail (lognormal).
    apply: (poles, values, random) => {
      const distribution = choiceOf(values, "distribution");
      const spread = numberOf(values, "spread");
      if (distribution === "none" || spread === 0) return poles;
      return poles.map((pole) => {
        const sample = distribution === "uniform"
          ? (random() * 2 - 1) * spread
          : distribution === "lognormal"
            ? spread * (Math.exp(0.6 * normal(random)) - 1)
            : spread * normal(random);
        return { ...pole, rise: Math.max(MIN_RISE, pole.rise + sample) };
      });
    },
  },
  {
    id: "timing",
    label: "신호 동기",
    stochastic: true,
    parameters: [
      {
        kind: "choice",
        id: "sync",
        label: "신호 동기",
        choices: [
          { id: "together", label: "맞춤" },
          { id: "apart", label: "어긋남" },
        ],
        initial: "together",
      },
    ],
    // Apart: every pole runs the same cycle at the same speed, from its own start point,
    // drawn uniformly over the cycle.
    apply: (poles, values, random) => {
      if (choiceOf(values, "sync") !== "apart") return poles;
      return poles.map((pole) => ({ ...pole, phase: random() }));
    },
  },
];

export type ArrangementState = {
  layout: string;
  spacing: number;
  seed: number;
  /** Parameter values keyed `${owner}.${parameter}`. */
  values: ParameterValues;
};

/** Initial values for every layout and variation parameter. */
export function initialValues(): ParameterValues {
  const values: ParameterValues = {};
  for (const owner of [...LAYOUTS, ...VARIATIONS]) {
    for (const parameter of owner.parameters) values[`${owner.id}.${parameter.id}`] = parameter.initial;
  }
  return values;
}

const scoped = (values: ParameterValues, owner: string) => {
  const result: ParameterValues = {};
  for (const [key, value] of Object.entries(values)) {
    if (key.startsWith(`${owner}.`)) result[key.slice(owner.length + 1)] = value;
  }
  return result;
};

/** Every pole for a state: the layout's placement, then each variation in order, from one seed. */
export function arrangePoles(state: ArrangementState): PoleSpec[] {
  const layout = LAYOUTS.find(({ id }) => id === state.layout) ?? LAYOUTS[0];
  let poles = layout.place(state.spacing, scoped(state.values, layout.id));
  VARIATIONS.forEach((variation, index) => {
    // Each variation has its own stream, so changing one does not reshuffle another.
    const random = seededRandom(state.seed * 7919 + index * 104729);
    poles = variation.apply(poles, scoped(state.values, variation.id), random);
  });
  if (layout.sharedTrunk) {
    // One trunk for the shared spot, tall enough to carry the highest arm.
    const highest = Math.max(...poles.map(({ rise }) => rise));
    poles = poles.map((pole, index) => (index === 0 ? { ...pole, trunk: true, shaft: highest } : { ...pole, trunk: false }));
  }
  return poles;
}

export const layoutOf = (id: string) => LAYOUTS.find((layout) => layout.id === id) ?? LAYOUTS[0];
