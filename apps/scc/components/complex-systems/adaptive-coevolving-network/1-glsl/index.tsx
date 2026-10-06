"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./coevolving-voter-glsl.module.css";
import {
  createFluidRenderer,
  MAX_TIES,
  MAX_VOTERS,
  TIE_FLOATS,
  VOTER_FLOATS,
  type Brush,
  type FluidRenderer,
  type TieStyle,
} from "./fluid";
import {
  createBodies,
  idealLength,
  relaxBodies,
  rescaleBodies,
  type Body,
  type Frame,
} from "./layout";
import {
  addVoter,
  createCoevolvingNetwork,
  DEFAULT_PARAMETERS,
  DEFAULT_VOTERS,
  MAX_VOTERS as MAX_POPULATION,
  plantOpinion,
  rarestOpinion,
  stepCoevolvingNetwork,
  type CoevolvingNetwork,
} from "./model";

type Rgb = readonly [number, number, number];

// Route 1's six hues (red, blue, yellow, green, purple, pink) as luminous
// but restrained tones: coral, azure, amber, jade, lavender, rose.
const OPINION_COLOURS: readonly Rgb[] = [
  [1, 0.42, 0.36],
  [0.32, 0.62, 1],
  [1, 0.74, 0.3],
  [0.3, 0.88, 0.68],
  [0.66, 0.52, 1],
  [1, 0.5, 0.74],
];
const UPDATES_PER_VOTER_PER_SECOND = 2;
const MARK_LIFETIME = 0.9;
/** A rewired tie reaches its new neighbour in the first third of its mark. */
const GROWTH_SHARE = 1 / 3;
const MAX_MARKS = 220;
/** Pointer travel that turns a tap (add a voter) into a drag (paint a view). */
const DRAG_THRESHOLD = 6;
const NEWCOMER_TIES = 2;
/** Frames are paced to at most 60 Hz on whole vsyncs, so 120 Hz screens draw every other one. */
const FRAME_INTERVAL = 1_000 / 60 - 3;
const MAX_PIXEL_RATIO = 2;
/**
 * Above this many voters the same picture is computed more cheaply: Barnes–Hut
 * repulsion, a shorter splat reach, a half-float field, and a pixel ratio
 * that steps down only while frames keep running late. At or below it the
 * exact path is untouched.
 */
const ECONOMY_ABOVE = 2_000;
const ECONOMY_RATIOS = [2, 1.5, 1.25] as const;
/** Smoothed frame interval (ms) that counts as late, or as comfortably on time. */
const LATE_FRAME = 21.5;
const EASY_FRAME = 17.5;
const MIN_POPULATION = 50;

// Two tie builds: the earlier fine, still ties, and the thicker ties with
// longer roots whose width breathes.
const TIE_STYLES = {
  thin: {
    label: "thin",
    renderer: { taper: [1.3, 1.2, 10_000, 1.6], alive: 0 },
    middle: (agree: boolean, thickness: number, length: number) =>
      ((agree ? 0.3 : 0.36) + 0.8 * thickness ** 3) * Math.min(1, Math.max(0.3, 30 / Math.max(length, 1))),
  },
  thick: {
    label: "thick",
    renderer: { taper: [1.9, 2, 8, 1.4], alive: 1 },
    middle: (agree: boolean, thickness: number, length: number) =>
      ((agree ? 0.55 : 0.62) + 1.15 * thickness ** 2) * Math.min(1, Math.max(0.45, 40 / Math.max(length, 1))),
  },
} as const satisfies Record<
  string,
  { label: string; renderer: TieStyle; middle: (agree: boolean, thickness: number, length: number) => number }
>;
type TieStyleId = keyof typeof TIE_STYLES;
const TIE_STYLE_IDS = Object.keys(TIE_STYLES) as TieStyleId[];

type Mark =
  | { kind: "rewire"; voter: number; from: number; to: number; tie: number; at: number }
  | { kind: "turn"; voter: number; opinion: number; at: number };

function colour(opinion: number): Rgb {
  return OPINION_COLOURS[opinion] ?? OPINION_COLOURS[0]!;
}

/** Stable 0–1 noise per index, so each voter and tie keeps its own build. */
function grain(index: number, salt: number) {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43_758.5453;
  return value - Math.floor(value);
}

/** Natural size spread: roughly log-normal, held between 0.55× and 2.2×. */
function build(index: number) {
  const gaussian = grain(index, 1) + grain(index, 2) + grain(index, 3) - 1.5;
  return Math.min(2.2, Math.max(0.55, Math.exp(gaussian * 0.75)));
}

function shade(hue: Rgb, amount: number): Rgb {
  return [hue[0] * amount, hue[1] * amount, hue[2] * amount];
}

/** Voters may use the whole screen; the options float over it. */
function layoutFrame(size: Frame): Frame {
  return size;
}

type Scratch = {
  readonly excitement: Float32Array;
  readonly radii: Float32Array;
  readonly growing: Map<number, { voter: number; reach: number }>;
};

/** Route 1's state, written straight into the renderer's instance buffers. */
function pack(
  renderer: FluidRenderer,
  scratch: Scratch,
  size: Frame,
  network: CoevolvingNetwork,
  bodies: readonly Body[],
  marks: readonly Mark[],
  time: number,
  style: TieStyleId,
) {
  const { opinions, ties } = network;
  const { excitement, radii, growing } = scratch;
  const base = Math.max(2.6, Math.min(5.5, idealLength(size, bodies.length) * 0.12));
  const voterCount = Math.min(bodies.length, MAX_VOTERS);
  excitement.fill(0, 0, voterCount);
  growing.clear();
  const tieData = renderer.ties;
  let tieCount = 0;

  const writeTie = (
    a: Body,
    b: Body,
    rootA: number,
    rootB: number,
    reach: number,
    phase: number,
    hueA: Rgb,
    pulse: number,
    hueB: Rgb,
    strength: number,
    sway: number,
    middle: number,
  ) => {
    if (tieCount >= MAX_TIES) return;
    let offset = tieCount * TIE_FLOATS;
    tieData[offset++] = a.x;
    tieData[offset++] = a.y;
    tieData[offset++] = b.x;
    tieData[offset++] = b.y;
    tieData[offset++] = rootA;
    tieData[offset++] = rootB;
    tieData[offset++] = reach;
    tieData[offset++] = phase;
    tieData[offset++] = hueA[0];
    tieData[offset++] = hueA[1];
    tieData[offset++] = hueA[2];
    tieData[offset++] = pulse;
    tieData[offset++] = hueB[0];
    tieData[offset++] = hueB[1];
    tieData[offset++] = hueB[2];
    tieData[offset++] = strength;
    tieData[offset++] = sway;
    tieData[offset++] = middle;
    tieCount += 1;
  };

  for (const mark of marks) {
    const progress = (time - mark.at) / MARK_LIFETIME;
    if (progress < 0 || progress >= 1 || mark.voter >= voterCount) continue;
    if (mark.kind === "turn") {
      excitement[mark.voter] = Math.max(excitement[mark.voter]!, 1 - progress);
    } else {
      growing.set(mark.tie, { voter: mark.voter, reach: Math.min(1, progress / GROWTH_SHARE) });
    }
  }

  for (let voter = 0; voter < voterCount; voter += 1) {
    const degree = network.incident[voter]!.length;
    radii[voter] =
      base * (0.5 + Math.sqrt(degree) * 0.2) * build(voter) * (1 + 0.45 * excitement[voter]!);
  }

  for (const mark of marks) {
    if (mark.kind !== "rewire") continue;
    const progress = (time - mark.at) / MARK_LIFETIME;
    if (progress < 0 || progress >= 1 || mark.voter >= voterCount || mark.from >= voterCount) continue;
    // The severed tie snaps: both halves withdraw into their voters.
    const fade = 1 - progress;
    const withdrawal = 0.5 * fade * fade;
    const voter = bodies[mark.voter]!;
    const from = bodies[mark.from]!;
    const voterHue = colour(opinions[mark.voter]!);
    const fromHue = colour(opinions[mark.from]!);
    writeTie(voter, from, radii[mark.voter]! * 0.9, 0, withdrawal, 0, voterHue, 0, voterHue, fade, 0, 0.4);
    writeTie(from, voter, radii[mark.from]! * 0.9, 0, withdrawal, 0, fromHue, 0, fromHue, fade, 0, 0.4);
  }

  for (const tie of ties) {
    if (tie.a >= voterCount || tie.b >= voterCount) continue;
    const growth = growing.get(tie.id);
    // A rewired tie grows out of the voter that moved it.
    const [start, end] = growth?.voter === tie.b ? [tie.b, tie.a] : [tie.a, tie.b];
    const a = bodies[start]!;
    const b = bodies[end]!;
    const startOpinion = opinions[start]!;
    const endOpinion = opinions[end]!;
    const agree = startOpinion === endOpinion;
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const thickness = grain(tie.id, 4);
    // Long ties are thinner and dimmer than short ones.
    const glow = 1 - 0.6 * Math.min(1, Math.max(0, (length - 30) / 140));
    const startHue = shade(colour(startOpinion), glow);
    const endHue = shade(colour(endOpinion), glow);
    // Agreeing ties are quiet flesh in their shared hue; ties across a
    // disagreement carry a travelling brightening, where the next event can happen.
    writeTie(
      a,
      b,
      radii[start]! * 0.92,
      radii[end]! * 0.92,
      growth?.reach ?? 1,
      grain(tie.id, 7) * Math.PI * 2,
      startHue,
      agree ? 0 : 1,
      endHue,
      1,
      Math.min(12, length * (0.06 + 0.12 * grain(tie.id, 8))) * (tie.id % 2 === 0 ? 1 : -1),
      TIE_STYLES[style].middle(agree, thickness, length),
    );
  }

  const voterData = renderer.voters;
  for (let voter = 0; voter < voterCount; voter += 1) {
    const body = bodies[voter]!;
    const hue = colour(opinions[voter]!);
    const offset = voter * VOTER_FLOATS;
    voterData[offset] = body.x;
    voterData[offset + 1] = body.y;
    voterData[offset + 2] = radii[voter]!;
    voterData[offset + 3] = excitement[voter]!;
    voterData[offset + 4] = hue[0];
    voterData[offset + 5] = hue[1];
    voterData[offset + 6] = hue[2];
  }

  return { tieCount, voterCount };
}

export default function CoevolvingVoterGlsl() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const networkRef = useRef<CoevolvingNetwork>(createCoevolvingNetwork());
  const bodiesRef = useRef<Body[] | null>(null);
  const sizeRef = useRef<Frame>({ width: 0, height: 0 });
  const marksRef = useRef<Mark[]>([]);
  const timeRef = useRef(0);
  const rewiringRef = useRef(DEFAULT_PARAMETERS.rewiring);
  const brushRef = useRef<{ x: number; y: number; radius: number; opinion: number } | null>(null);
  const [rewiring, setRewiring] = useState(DEFAULT_PARAMETERS.rewiring);
  const [tieStyle, setTieStyle] = useState<TieStyleId>("thin");
  const tieStyleRef = useRef<TieStyleId>("thin");
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [population, setPopulation] = useState(DEFAULT_VOTERS);
  const pressRef = useRef<{ x: number; y: number; painting: boolean } | null>(null);

  useEffect(() => {
    rewiringRef.current = rewiring;
  }, [rewiring]);

  useEffect(() => {
    tieStyleRef.current = tieStyle;
  }, [tieStyle]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = createFluidRenderer(canvas);
    if (!renderer) {
      console.warn("adaptive-coevolving-network/1-glsl needs WebGL2 with float render targets.");
      return;
    }
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const scratch: Scratch = {
      excitement: new Float32Array(MAX_VOTERS),
      radii: new Float32Array(MAX_VOTERS),
      growing: new Map(),
    };
    let frame = 0;
    let previous = performance.now();
    let pendingUpdates = 0;
    let motionTime = 0;
    let economy = false;
    let ratioStep = 0;
    let pace = 1_000 / 60;
    let lateFrames = 0;
    let easyFrames = 0;

    const pixelRatio = () =>
      Math.min(window.devicePixelRatio || 1, economy ? ECONOMY_RATIOS[ratioStep]! : MAX_PIXEL_RATIO);

    const resizeField = () => {
      renderer.resize(sizeRef.current.width, sizeRef.current.height, pixelRatio());
    };

    const sizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();
      const next = { width: bounds.width, height: bounds.height };
      renderer.resize(next.width, next.height, pixelRatio());
      if (bodiesRef.current) {
        rescaleBodies(bodiesRef.current, layoutFrame(sizeRef.current), layoutFrame(next));
      } else {
        bodiesRef.current = createBodies(networkRef.current.size, layoutFrame(next));
      }
      sizeRef.current = next;
    };

    const render = (now: number) => {
      frame = requestAnimationFrame(render);
      if (now - previous < FRAME_INTERVAL) return;
      const interval = now - previous;
      const delta = Math.min(interval / 1_000, 1 / 15);
      previous = now;
      const still = reduceMotion.matches;
      const tempo = still ? 0.3 : 1;
      timeRef.current += delta;
      if (!still) motionTime += delta;
      const network = networkRef.current;
      const bodies = bodiesRef.current;
      if (!bodies) return;
      const large = network.size > ECONOMY_ABOVE;
      if (large !== economy) {
        economy = large;
        ratioStep = 0;
        lateFrames = 0;
        easyFrames = 0;
        renderer.setEconomy(economy);
        resizeField();
      }
      // Only a large population may trade pixel ratio for a steady frame rate;
      // gaps from a hidden or paused tab are ignored.
      if (economy && interval < 100) {
        pace += (interval - pace) * 0.05;
        lateFrames = pace > LATE_FRAME ? lateFrames + 1 : 0;
        easyFrames = pace < EASY_FRAME ? easyFrames + 1 : 0;
        if (lateFrames > 45 && ratioStep < ECONOMY_RATIOS.length - 1) {
          ratioStep += 1;
          lateFrames = 0;
          pace = 1_000 / 60;
          resizeField();
        } else if (easyFrames > 360 && ratioStep > 0) {
          ratioStep -= 1;
          easyFrames = 0;
          resizeField();
        }
      }
      pendingUpdates += delta * tempo * network.size * UPDATES_PER_VOTER_PER_SECOND;
      const count = Math.floor(pendingUpdates);
      pendingUpdates -= count;
      const events = stepCoevolvingNetwork(network, count, {
        ...DEFAULT_PARAMETERS,
        rewiring: rewiringRef.current,
      });
      const marks = marksRef.current;
      if (!still) {
        for (const event of events) {
          marks.push(
            event.kind === "rewire"
              ? { kind: "rewire", voter: event.voter, from: event.from, to: event.to, tie: event.tie, at: timeRef.current }
              : { kind: "turn", voter: event.voter, opinion: event.opinion, at: timeRef.current },
          );
        }
      }
      // Drop expired marks in place, keeping only the newest MAX_MARKS.
      let kept = 0;
      for (const mark of marks) {
        if (timeRef.current - mark.at < MARK_LIFETIME) marks[kept++] = mark;
      }
      marks.length = kept;
      if (kept > MAX_MARKS) marks.splice(0, kept - MAX_MARKS);
      relaxBodies(bodies, network.ties, layoutFrame(sizeRef.current), delta * tempo, economy);
      const style = tieStyleRef.current;
      const counts = pack(renderer, scratch, sizeRef.current, network, bodies, marks, timeRef.current, style);
      const brush = brushRef.current;
      const ring: Brush | null = brush
        ? { x: brush.x, y: brush.y, radius: brush.radius, colour: colour(brush.opinion) }
        : null;
      renderer.render(counts.tieCount, counts.voterCount, motionTime, TIE_STYLES[style].renderer, ring);
    };

    sizeCanvas();
    const observer = new ResizeObserver(sizeCanvas);
    observer.observe(canvas);
    frame = requestAnimationFrame(render);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      renderer.dispose();
    };
  }, []);

  // A new population starts over: a fresh random network, fresh positions.
  const repopulate = useCallback((count: number) => {
    setPopulation(count);
    networkRef.current = createCoevolvingNetwork(count);
    bodiesRef.current = createBodies(count, layoutFrame(sizeRef.current));
    marksRef.current = [];
    brushRef.current = null;
  }, []);

  const plantAt = useCallback((x: number, y: number, opinion: number) => {
    const bodies = bodiesRef.current;
    if (!bodies) return;
    const radius = idealLength(sizeRef.current, bodies.length) * 1.1;
    brushRef.current = { x, y, radius, opinion };
    const reached: number[] = [];
    bodies.forEach((body, voter) => {
      if (Math.hypot(body.x - x, body.y - y) <= radius) reached.push(voter);
    });
    const changed = plantOpinion(networkRef.current, reached, opinion);
    for (const voter of changed) {
      marksRef.current.push({ kind: "turn", voter, opinion, at: timeRef.current });
    }
  }, []);

  // A newcomer appears where the field was tapped, tied to the nearest voters,
  // holding the least-held view.
  const addAt = useCallback((x: number, y: number) => {
    const bodies = bodiesRef.current;
    const network = networkRef.current;
    if (!bodies) return;
    const nearest = bodies
      .map((body, voter) => ({ voter, distance: Math.hypot(body.x - x, body.y - y) }))
      .sort((first, second) => first.distance - second.distance)
      .slice(0, NEWCOMER_TIES)
      .map((candidate) => candidate.voter);
    const opinion = rarestOpinion(network);
    const voter = addVoter(network, opinion, nearest);
    if (voter === null) return;
    bodies[voter] = { x, y, vx: 0, vy: 0 };
    marksRef.current.push({ kind: "turn", voter, opinion, at: timeRef.current });
  }, []);

  const pointFor = (target: HTMLCanvasElement, clientX: number, clientY: number) => {
    const bounds = target.getBoundingClientRect();
    return { x: clientX - bounds.left, y: clientY - bounds.top };
  };

  return (
    <main className={styles.page}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="application"
        tabIndex={0}
        aria-label="Coevolving voter network drawn as one flowing tissue. Each voter disagreeing with a tie either adopts that neighbour's view or cuts the tie and reconnects to someone who already agrees. Tap to add a voter holding the least-held view, tied to the two nearest voters; drag across voters to plant that view. Press N to add a voter at the centre, Enter to plant at the centre."
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          const point = pointFor(event.currentTarget, event.clientX, event.clientY);
          pressRef.current = { ...point, painting: false };
        }}
        onPointerMove={(event) => {
          const press = pressRef.current;
          if (!press || (event.buttons & 1) === 0) return;
          const point = pointFor(event.currentTarget, event.clientX, event.clientY);
          if (!press.painting) {
            if (Math.hypot(point.x - press.x, point.y - press.y) < DRAG_THRESHOLD) return;
            press.painting = true;
            plantAt(press.x, press.y, rarestOpinion(networkRef.current));
          }
          plantAt(point.x, point.y, brushRef.current?.opinion ?? rarestOpinion(networkRef.current));
        }}
        onPointerUp={() => {
          const press = pressRef.current;
          if (press && !press.painting) addAt(press.x, press.y);
          pressRef.current = null;
          brushRef.current = null;
        }}
        onPointerCancel={() => {
          pressRef.current = null;
          brushRef.current = null;
        }}
        onKeyDown={(event) => {
          const frame = layoutFrame(sizeRef.current);
          if (event.key === "n" || event.key === "N") {
            addAt(frame.width / 2, frame.height / 2);
            return;
          }
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          plantAt(frame.width / 2, frame.height / 2, rarestOpinion(networkRef.current));
          brushRef.current = null;
        }}
      />

      <div className={styles.control}>
        {optionsOpen && (
          <div id="coevolving-voter-glsl-options" className={styles.options}>
            <p className={styles.hint}>tap to add a voter, drag to plant a view</p>
            <div className={styles.styles} role="group" aria-label="Ties">
              {TIE_STYLE_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={styles.button}
                  aria-pressed={tieStyle === id}
                  onClick={() => setTieStyle(id)}
                >
                  {TIE_STYLES[id].label}
                </button>
              ))}
            </div>
            <label className={styles.balance}>
              <span>adopt</span>
              <input
                aria-label="When voters disagree: adopt the neighbour's view, or rewire to someone like-minded"
                aria-valuetext={`${Math.round(rewiring * 100)}% rewire, ${Math.round((1 - rewiring) * 100)}% adopt`}
                max="1"
                min="0"
                step="0.01"
                type="range"
                value={rewiring}
                onChange={(event) => setRewiring(Number(event.target.value))}
              />
              <span>rewire</span>
            </label>
            <label className={styles.balance}>
              <span>voters</span>
              <input
                aria-label="Number of voters; changing it starts the network over"
                aria-valuetext={`${population} voters`}
                max={MAX_POPULATION}
                min={MIN_POPULATION}
                step="10"
                type="range"
                value={population}
                onChange={(event) => repopulate(Number(event.target.value))}
              />
              <span className={styles.count}>{population}</span>
            </label>
          </div>
        )}
        <button
          type="button"
          className={`${styles.button} ${styles.toggle}`}
          aria-expanded={optionsOpen}
          aria-controls="coevolving-voter-glsl-options"
          onClick={() => setOptionsOpen((open) => !open)}
        >
          {optionsOpen ? "close" : "options"}
        </button>
      </div>
    </main>
  );
}
