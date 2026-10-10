"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./bubble-three.module.css";
import { bodyAt, groupAnchors, relaxBodies, rescaleBodies, type Body, type Frame } from "./layout";
import {
  addCandidate,
  attend,
  addPage,
  candidate,
  concentration,
  createRankedWeb,
  DAMPING_RANGE,
  DEFAULT_PAGES,
  DEFAULT_DAMPING,
  DEFAULT_DIVERSITY,
  DEFAULT_PARAMETERS,
  fadeCandidate,
  FLOOR_RANGE,
  GROWTH_RANGE,
  leader,
  MAX_GROUPS,
  MAX_PAGES,
  setDamping,
  stepRankedWeb,
  VOLATILITY_RANGE,
  type RankedWeb,
} from "./model";
import { iterate, transit } from "./iteration";
import { BUBBLE_FLOATS, createFoamRenderer, LOOK_DEFAULTS, MAX_BUBBLES, MEDIA_FLOATS, mediaTileSize, type Colour, type FoamRenderer, type Look } from "./foam";
import { DEFAULT_KEYWORD_STYLE, DEFAULT_SURFACE, KEYWORD_FONTS, KEYWORD_SIZE_RANGE, SURFACES, surfaceItems, type KeywordStyle, type SurfaceId } from "./media/catalogue";
import { loadMediaTiles, type MediaLoad } from "./media/loader";
import {
  assignPage,
  BOREDOM_RANGE,
  CHURN_RANGE,
  createMediaField,
  FADE_RANGE,
  follow as followTrend,
  MEDIA_DEFAULTS,
  resetField,
  stepMedia,
  TREND_INTERVAL_RANGE,
  type MediaMode,
  type MediaParameters,
} from "./media/model";
import { LINK_VISIBILITY, viewTargets, VIEWS, type ViewId } from "./views";
import { FISH_DEFAULTS, FISH_PALETTES, GoldfishSchool, MAX_FISH, type FishPaletteId, type FishParameters } from "./goldfish";
import type { GoldfishScene } from "./goldfish-scene";

/** Share of the field's area that all pages together cover; area = displayed rank × this. */
const AREA_BUDGET = 0.3;
const MIN_RADIUS = 5;
/** Weight a link drawn by hand starts with; it then follows appeal like any other. */
const HAND_LINK_WEIGHT = 0.5;
/** The display relaxes toward one power-iteration step with this time constant, seconds. */
const STEP_SECONDS = 1.1;
/** Each link sends its portion round on its own period (seconds), from quickest to slowest. */
const PERIOD = [1.3, 3.2] as const;
/** Within its own cycle a portion necks off until this phase and is taken in from that one. */
const DETACHED = 0.35;
const TAKEN_IN = 0.62;
/** A portion's path bows aside by this share of its length (at most BOW_LIMIT px), so crossing flows part. */
const BOW = 0.08;
const BOW_LIMIT = 36;
/** Portions carrying less than this share of the mean flow are not drawn (they would read as specks). */
const LEAST_PORTION = 0.5;
const MIN_PORTION_RADIUS = 1.5;
const TRANSITION_SECONDS = 0.9;
/** Displayed pools follow the layout slowly, so packing jitter never reaches the surface. */
const FOLLOW_RATE = 4;
const DRAG_THRESHOLD = 6;
const HIT_SLOP = 6;
/** Frames are paced to at most 60 Hz on whole vsyncs, so 120 Hz screens draw every other one. */
const FRAME_INTERVAL = 1_000 / 60 - 3;
const MAX_PIXEL_RATIO = 2;
const MIN_PAGES = 20;
/** createRankedWeb's default seed. */
const DEFAULT_SEED = 0x2545f491;
/**
 * Log quality one fish-second of watching gives a page, divided by the school
 * (at least FISH_AUDIENCE fish), so all fish on one page for a second give it
 * ATTENTION_GAIN × influence; quality reverts at 0.08 per second.
 */
const ATTENTION_GAIN = 0.25;
const FISH_AUDIENCE = 30;
const DEFAULT_INFLUENCE = 0.2;
/** Unlike bubble/2 (no fish), the school is there from the start (user, 2026-10-11). */
const DEFAULT_FISH_COUNT = 250;
const DEFAULT_FISH_PALETTE: FishPaletteId = "instagram";
/**
 * 닿을 때만: a page's picture appears while a fish touches it and goes when
 * none does, each over 바뀜 부드럽게 (the media fade; 0 is instant) — user, 2026-10-11.
 */
const DEFAULT_ON_TOUCH = true;
/** Two echo chambers from the start (user, 2026-10-11); bubble/2 starts with one web. */
const DEFAULT_GROUPS = 2;

/** Goldfish sliders: key, label, range, step. Count 0 (no fish) is the default. */
const FISH_CONTROLS: readonly { key: keyof FishParameters; label: string; min: number; max: number; step: number }[] = [
  { key: "scale", label: "크기", min: 0.4, max: 2, step: 0.05 },
  { key: "speed", label: "속도", min: 0.25, max: 3, step: 0.05 },
  { key: "follow", label: "링크를 따라 헤엄칠 확률", min: 0, max: 1, step: 0.01 },
  { key: "novelty", label: "새 페이지에 끌림", min: 0, max: 3, step: 0.05 },
  { key: "habituation", label: "싫증", min: 0, max: 3, step: 0.05 },
  { key: "span", label: "주의 지속 (초)", min: 0.5, max: 8, step: 0.1 },
  { key: "schooling", label: "무리 짓기", min: 0, max: 2, step: 0.05 },
  { key: "patrol", label: "가장자리 오가기", min: 0, max: 2, step: 0.05 },
];

/** How an image sits on a bubble (foam.ts mediaMode 1–4); 0 is bubble/2's bare film. */
const MAPPINGS = [
  { mode: 1, label: "평면" },
  { mode: 2, label: "조각" },
  { mode: 3, label: "구면" },
  { mode: 4, label: "결" },
] as const;
const DEFAULT_MAPPING = 3;

const MEDIA_MODES: readonly { id: MediaMode; label: string }[] = [
  { id: "fixed", label: "고정" },
  { id: "churn", label: "제각각" },
  { id: "trend", label: "유행 따라가기" },
];

/** The picture's own look, apart from the film's: part of `Look`, kept out of the visual panel's reset. */
type MediaLook = Pick<Look, "mediaSaturation" | "mediaBrightness" | "mediaZoom" | "mediaDrift" | "filmOverMedia">;

const MEDIA_LOOK_DEFAULTS: MediaLook = {
  mediaSaturation: LOOK_DEFAULTS.mediaSaturation,
  mediaBrightness: LOOK_DEFAULTS.mediaBrightness,
  mediaZoom: LOOK_DEFAULTS.mediaZoom,
  mediaDrift: LOOK_DEFAULTS.mediaDrift,
  filmOverMedia: LOOK_DEFAULTS.filmOverMedia,
};

const MEDIA_LOOK_CONTROLS: readonly { key: keyof MediaLook; label: string; min: number; max: number; step: number }[] = [
  { key: "mediaSaturation", label: "채도", min: 0, max: 1.2, step: 0.01 },
  { key: "mediaBrightness", label: "밝기", min: 0.2, max: 2, step: 0.01 },
  { key: "filmOverMedia", label: "막 비침", min: 0, max: 1, step: 0.01 },
  { key: "mediaZoom", label: "확대", min: 1, max: 2.5, step: 0.01 },
  { key: "mediaDrift", label: "흐름", min: 0, max: 4, step: 0.05 },
];

/** Frame cost is measured only when the URL asks for it (?measure). */
const MEASURE = typeof window !== "undefined" && window.location.search.includes("measure");

type Press = { x: number; y: number; source: number | null; dragging: boolean; pointerX: number; pointerY: number };

type Transition = { from: Float64Array; linksFrom: number; startedAt: number };

type WeightedLink = { from: number; to: number; weight: number };

/** The group whose raft gathers nearest (x, y). */
function nearestGroup(groups: number, field: Frame, x: number, y: number) {
  const anchors = new Float64Array(MAX_GROUPS * 2);
  groupAnchors(groups, field, anchors);
  let best = 0;
  for (let group = 1; group < groups; group += 1) {
    if (Math.hypot(anchors[group * 2]! - x, anchors[group * 2 + 1]! - y) < Math.hypot(anchors[best * 2]! - x, anchors[best * 2 + 1]! - y)) best = group;
  }
  return best;
}

/** Disc area is exactly proportional to rank: πr² = rank × budget. */
function radiusFor(rank: number, field: Frame, area = AREA_BUDGET) {
  return Math.max(MIN_RADIUS, Math.sqrt((rank * area * field.width * field.height) / Math.PI));
}

/** Everything the visual panel adjusts: the renderer's look plus the raft's own scale and flow. */
type Visual = Look & { area: number; portions: number };

const VISUAL_DEFAULTS: Visual = { ...LOOK_DEFAULTS, area: AREA_BUDGET, portions: LEAST_PORTION };

/** Visual sliders: key, label, range, step. Defaults reproduce bubble/1. */
type NumericKey = { [K in keyof Visual]: Visual[K] extends number ? K : never }[keyof Visual];

const VISUAL_CONTROLS: readonly { key: Exclude<NumericKey, "envMode">; label: string; min: number; max: number; step: number }[] = [
  { key: "sphere", label: "반사 곡면 (0 납작 · 1 구)", min: 0, max: 1, step: 0.01 },
  { key: "envContrast", label: "환경 선명도·대비", min: 0, max: 1, step: 0.01 },
  { key: "reflectionTint", label: "반사에 간섭색 입히기", min: 0, max: 1, step: 0.01 },
  { key: "backReflection", label: "뒷면 반사", min: 0, max: 1, step: 0.01 },
  { key: "area", label: "버블 면적", min: 0.1, max: 0.6, step: 0.01 },
  { key: "portions", label: "흐름 버블 (적을수록 많이)", min: 0, max: 3, step: 0.05 },
  { key: "filmThickness", label: "막 두께 (nm)", min: 200, max: 2000, step: 10 },
  { key: "colourAmount", label: "간섭색", min: 0, max: 1, step: 0.01 },
  { key: "flowSpeed", label: "막 흐름 속도", min: 0, max: 4, step: 0.05 },
  { key: "swirl", label: "소용돌이", min: 0, max: 3, step: 0.05 },
  { key: "domeDepth", label: "돔 깊이", min: 0.05, max: 1.2, step: 0.01 },
  { key: "fresnelGain", label: "가장자리 반사", min: 0, max: 2, step: 0.01 },
  { key: "wallGain", label: "벽 밝기", min: 0, max: 1.5, step: 0.01 },
  { key: "windowGain", label: "반사 세기", min: 0, max: 2, step: 0.01 },
  { key: "ambient", label: "주변광", min: 0, max: 0.4, step: 0.005 },
  { key: "exposure", label: "노출", min: 0.3, max: 2.5, step: 0.01 },
];

/** What the films reflect; 0 is bubble/1's window. */
const ENVIRONMENTS = [
  { mode: 0, label: "창" },
  { mode: 1, label: "흐린 하늘" },
  { mode: 2, label: "스튜디오" },
  { mode: 3, label: "밤 도시" },
  { mode: 4, label: "나뭇잎 빛" },
  { mode: 5, label: "물빛" },
] as const;

/** Colour palettes: light, film, background. The first is bubble/1. */
const PALETTES = [
  { id: "plain", label: "무채", lightColour: "#ffffff", filmTint: "#ffffff", background: "#000000" },
  { id: "dawn", label: "새벽", lightColour: "#dde5ff", filmTint: "#f4f6ff", background: "#080b12" },
  { id: "amber", label: "호박", lightColour: "#ffe0b5", filmTint: "#fff1dc", background: "#110b05" },
  { id: "moss", label: "이끼", lightColour: "#e4efd4", filmTint: "#eef4e6", background: "#060905" },
  { id: "paper", label: "종이", lightColour: "#ffffff", filmTint: "#d9d9d9", background: "#cfccc5" },
] as const;

const COLOUR_CONTROLS = [
  { key: "lightColour", label: "빛" },
  { key: "filmTint", label: "막" },
  { key: "background", label: "배경" },
] as const;

function toHex(colour: Colour) {
  return `#${colour.map((value) => Math.round(Math.min(1, Math.max(0, value)) * 255).toString(16).padStart(2, "0")).join("")}`;
}

function fromHex(hex: string): Colour {
  const value = Number.parseInt(hex.slice(1), 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

function percent(rank: number) {
  return `${(rank * 100).toFixed(rank >= 0.1 ? 0 : 1)}%`;
}

function distanceToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / length));
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

function smooth(from: number, to: number, value: number) {
  const t = Math.min(1, Math.max(0, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
}

/** A stable value in [0, 1) per pair. */
function hashOf(a: number, b: number) {
  const value = Math.sin(a * 12.9898 + b * 78.233) * 43_758.5453;
  return value - Math.floor(value);
}

function easeInOut(value: number) {
  return value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;
}

export default function RankedWebIteration() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const webRef = useRef<RankedWeb>(createRankedWeb(DEFAULT_PAGES, DEFAULT_SEED, DEFAULT_GROUPS, DEFAULT_DIVERSITY));
  const bodiesRef = useRef<Body[]>([]);
  const radiiRef = useRef(new Float64Array(MAX_PAGES));
  const spacingRef = useRef(new Float64Array(MAX_PAGES));
  const pointsRef = useRef(new Float64Array(MAX_PAGES * 2));
  const targetsRef = useRef(new Float64Array(MAX_PAGES * 2));
  const sizeRef = useRef<Frame>({ width: 0, height: 0 });
  const pendingPagesRef = useRef({ value: 0 });
  const timeRef = useRef(0);
  const pressRef = useRef<Press | null>(null);
  const focusRef = useRef<number | null>(null);
  const viewRef = useRef<ViewId>("network");
  const linkVisibilityRef = useRef(LINK_VISIBILITY.network);
  const transitionRef = useRef<Transition | null>(null);
  const parametersRef = useRef(DEFAULT_PARAMETERS);
  const randomRef = useRef(0x9e3779b9);
  const [growth, setGrowth] = useState(DEFAULT_PARAMETERS.growth);
  const [volatility, setVolatility] = useState(DEFAULT_PARAMETERS.volatility);
  const [floor, setFloor] = useState(DEFAULT_PARAMETERS.floor);
  const [damping, setDampingValue] = useState(DEFAULT_DAMPING);
  const dampingRef = useRef(DEFAULT_DAMPING);
  const [population, setPopulation] = useState(DEFAULT_PAGES);
  /** Disconnected groups; 1 (one web) is the default. Changing it starts the web over. */
  const [groups, setGroups] = useState(DEFAULT_GROUPS);
  const groupsRef = useRef(DEFAULT_GROUPS);
  /** How far the groups' sizes and characters spread around the panel's parameters. */
  const [diversity, setDiversity] = useState(DEFAULT_DIVERSITY);
  const diversityRef = useRef(DEFAULT_DIVERSITY);
  /** The default web's seed; 다시 섞기 draws other groups. */
  const seedRef = useRef(DEFAULT_SEED);
  /** A requested page count; the frame loop starts the web over with it. */
  const repopulateRef = useRef<number | null>(null);
  const [view, setView] = useState<ViewId>("network");
  const [panel, setPanel] = useState<"network" | "visual" | "fish" | "media" | null>(null);
  const [surface, setSurface] = useState<SurfaceId>(DEFAULT_SURFACE);
  const [keywordStyle, setKeywordStyle] = useState<KeywordStyle>(DEFAULT_KEYWORD_STYLE);
  const [mapping, setMapping] = useState<number>(DEFAULT_MAPPING);
  const mappingRef = useRef(DEFAULT_MAPPING);
  const [media, setMedia] = useState<MediaParameters>(MEDIA_DEFAULTS);
  const mediaRef = useRef<MediaParameters>(MEDIA_DEFAULTS);
  const [mediaLook, setMediaLook] = useState<MediaLook>(MEDIA_LOOK_DEFAULTS);
  const mediaLookRef = useRef<MediaLook>(MEDIA_LOOK_DEFAULTS);
  /** Travelling portions show their source page's image. */
  const [carry, setCarry] = useState(true);
  const carryRef = useRef(true);
  /** Pictures shown always, or only on bubbles a goldfish is touching. */
  const [onTouch, setOnTouch] = useState(DEFAULT_ON_TOUCH);
  const onTouchRef = useRef(DEFAULT_ON_TOUCH);
  /** Set by the frame loop: loads a surface's images into the renderer. */
  const applySurfaceRef = useRef<((surface: SurfaceId, keywords: KeywordStyle) => void) | null>(null);
  const [frameCost, setFrameCost] = useState("");
  const [fishCount, setFishCount] = useState(DEFAULT_FISH_COUNT);
  const fishCountRef = useRef(DEFAULT_FISH_COUNT);
  const [fish, setFish] = useState<FishParameters>(FISH_DEFAULTS);
  const fishRef = useRef<FishParameters>(FISH_DEFAULTS);
  const [fishPalette, setFishPalette] = useState<FishPaletteId>(DEFAULT_FISH_PALETTE);
  const fishPaletteRef = useRef<FishPaletteId>(DEFAULT_FISH_PALETTE);
  const [influence, setInfluence] = useState(DEFAULT_INFLUENCE);
  const influenceRef = useRef(DEFAULT_INFLUENCE);
  const fishCanvasRef = useRef<HTMLCanvasElement>(null);
  const [visual, setVisual] = useState<Visual>(VISUAL_DEFAULTS);
  const visualRef = useRef<Visual>(VISUAL_DEFAULTS);
  const rendererRef = useRef<FoamRenderer | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  useEffect(() => {
    visualRef.current = visual;
  }, [visual]);
  useEffect(() => {
    mappingRef.current = mapping;
    mediaRef.current = media;
    mediaLookRef.current = mediaLook;
    carryRef.current = carry;
    onTouchRef.current = onTouch;
  }, [mapping, media, mediaLook, carry, onTouch]);
  useEffect(() => {
    applySurfaceRef.current?.(surface, keywordStyle);
  }, [surface, keywordStyle]);
  useEffect(() => {
    fishCountRef.current = fishCount;
    fishRef.current = fish;
    fishPaletteRef.current = fishPalette;
    influenceRef.current = influence;
  }, [fishCount, fish, fishPalette, influence]);
  const [summary, setSummary] = useState("");

  useEffect(() => {
    parametersRef.current = { ...DEFAULT_PARAMETERS, growth, volatility, floor };
  }, [growth, volatility, floor]);

  /** Presentation-only randomness (layout seeds); never touches the model. */
  const random = useCallback(() => {
    let state = randomRef.current;
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    randomRef.current = state >>> 0 || 1;
    return randomRef.current / 4_294_967_296;
  }, []);

  /** Gives page `page` a body and a position at (x, y); it grows in from nothing. */
  const placePage = useCallback((page: number, x: number, y: number) => {
    bodiesRef.current[page] = { x, y, vx: 0, vy: 0 };
    pointsRef.current[page * 2] = x;
    pointsRef.current[page * 2 + 1] = y;
    radiiRef.current[page] = 0;
    const transition = transitionRef.current;
    if (transition && transition.from.length < (page + 1) * 2) {
      const from = new Float64Array((page + 1) * 2);
      from.set(transition.from);
      from[page * 2] = x;
      from[page * 2 + 1] = y;
      transition.from = from;
    }
  }, []);

  const changeView = useCallback((next: ViewId) => {
    setView(next);
    if (next === viewRef.current) return;
    transitionRef.current = {
      from: pointsRef.current.slice(0, webRef.current.size * 2),
      linksFrom: linkVisibilityRef.current,
      startedAt: timeRef.current,
    };
    viewRef.current = next;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = createFoamRenderer(canvas);
    if (!renderer) {
      console.warn("bubble/1 needs WebGL2 with float render targets.");
      return;
    }
    rendererRef.current = renderer;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pulling: WeightedLink[] = [];
    const presence = new Float64Array(MAX_PAGES);
    let frame = 0;
    let previous = performance.now();
    let sinceSummary = 2;
    // The displayed distribution: it starts uniform and relaxes, without
    // beats, toward one power-iteration step of itself, so it converges to
    // PageRank continuously and again whenever the web changes.
    const shown = new Float64Array(MAX_PAGES);
    const stepped = new Float64Array(MAX_PAGES);
    const pools = new Float64Array(MAX_PAGES);
    let motionTime = 0;
    let mediaKnown = 0;
    // Goldfish: the school and its renderer exist only once fish are asked for.
    let school: GoldfishSchool | null = null;
    let schoolWeb: RankedWeb | null = null;
    let knownPages = 0;
    let scene: GoldfishScene | null = null;
    let sceneLoading = false;
    let disposed = false;
    const attention = new Float64Array(MAX_PAGES);
    const revealField = new Float32Array(MAX_PAGES);
    const fishCanvas = fishCanvasRef.current;
    // Media: which image each page shows, and the images themselves.
    const mediaField = createMediaField(MAX_PAGES);
    let mediaLoad: MediaLoad | null = null;
    let mediaLayers = 0;
    const applySurface = (next: SurfaceId, keywords: KeywordStyle) => {
      mediaLoad?.cancel();
      const items = surfaceItems(next);
      mediaLayers = items.length;
      renderer.setMediaLayerCount(mediaLayers);
      resetField(mediaField, webRef.current.size, mediaLayers, motionTime, mediaRef.current, random);
      mediaLoad = mediaLayers === 0
        ? null
        : loadMediaTiles(items, (index, tile) => renderer.setMediaLayer(index, tile), () => renderer.commitMedia(), keywords, mediaTileSize(items.length));
    };
    applySurfaceRef.current = applySurface;
    const restart = () => {
      const web = webRef.current;
      shown.fill(0);
      shown.fill(1 / Math.max(1, web.size), 0, web.size);
      resetField(mediaField, web.size, mediaLayers, motionTime, mediaRef.current, random);
    };
    restart();
    applySurface(DEFAULT_SURFACE, DEFAULT_KEYWORD_STYLE);
    // Frame cost, when asked for: CPU work plus the GPU, synchronised by a 1-pixel read.
    const costs = new Float64Array(120);
    let costCount = 0;

    const groupPoints = new Float64Array(MAX_GROUPS * 2);
    const anchors = new Float64Array(MAX_PAGES * 2);
    const seedPages = (field: Frame) => {
      const web = webRef.current;
      bodiesRef.current = [];
      groupAnchors(web.groups, field, groupPoints);
      for (let page = 0; page < web.size; page += 1) {
        const body = bodyAt(field, random);
        if (web.groups > 1) {
          // Each group starts gathered round its own place, a third the size of one raft.
          const group = web.group[page]!;
          body.x = groupPoints[group * 2]! + (body.x - field.width / 2) * 0.45;
          body.y = groupPoints[group * 2 + 1]! + (body.y - field.height / 2) * 0.45;
        }
        bodiesRef.current[page] = body;
        pointsRef.current[page * 2] = body.x;
        pointsRef.current[page * 2 + 1] = body.y;
        radiiRef.current[page] = radiusFor(web.rank[page]!, field);
      }
    };

    const sizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();
      const next = { width: bounds.width, height: bounds.height };
      const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
      renderer.resize(next.width, next.height, ratio);
      school?.resize(next.width, next.height);
      scene?.setSize(next.width, next.height);
      if (bodiesRef.current.length === 0) seedPages(next);
      else rescaleBodies(bodiesRef.current, sizeRef.current, next);
      sizeRef.current = next;
    };

    const render = (now: number) => {
      frame = requestAnimationFrame(render);
      if (now - previous < FRAME_INTERVAL) return;
      const delta = Math.min((now - previous) / 1_000, 1 / 15);
      previous = now;
      const frameStart = MEASURE ? performance.now() : 0;
      const still = reduceMotion.matches;
      timeRef.current += delta;
      if (!still) motionTime += delta;
      const requested = repopulateRef.current;
      if (requested !== null) {
        // A new page count starts the web, and the display, over from uniform.
        repopulateRef.current = null;
        const fresh = createRankedWeb(requested, seedRef.current, groupsRef.current, diversityRef.current);
        setDamping(fresh, dampingRef.current);
        webRef.current = fresh;
        pendingPagesRef.current = { value: 0 };
        transitionRef.current = null;
        focusRef.current = null;
        seedPages(sizeRef.current);
        restart();
        mediaKnown = fresh.size;
      }
      const web = webRef.current;
      const field = sizeRef.current;
      const tempo = still ? 0.3 : 1;

      const events = stepRankedWeb(web, delta * tempo, parametersRef.current, pendingPagesRef.current);
      for (const event of events) {
        // A new page appears beside the first page it links to, with its own image.
        assignPage(mediaField, event.page, motionTime, mediaRef.current, random);
        const anchor = bodiesRef.current[event.targets[0] ?? 0];
        const angle = random() * Math.PI * 2;
        placePage(
          event.page,
          (anchor?.x ?? field.width / 2) + Math.cos(angle) * 24,
          (anchor?.y ?? field.height / 2) + Math.sin(angle) * 24,
        );
      }

      // Pages made by hand arrive outside the events: give them their image too.
      while (mediaKnown < web.size) {
        if (mediaField.next[mediaKnown] === 0 && mediaField.since[mediaKnown] === 0) assignPage(mediaField, mediaKnown, motionTime, mediaRef.current, random);
        mediaKnown += 1;
      }
      stepMedia(mediaField, web, motionTime, delta * tempo, mediaRef.current, random);

      // Continuous power iteration on the web as it is now.
      iterate(web, shown, stepped);
      const relax = Math.min(1, (delta * tempo) / STEP_SECONDS);
      for (let page = 0; page < web.size; page += 1) shown[page] = shown[page]! + (stepped[page]! - shown[page]!) * relax;

      // Radii follow the displayed rank; small pages may cluster (as in 7-glsl-3).
      const radii = radiiRef.current;
      const grow = 1 - Math.exp(-8 * delta);
      const spacing = spacingRef.current;
      for (let page = 0; page < web.size; page += 1) {
        radii[page] = radii[page]! + (radiusFor(shown[page]!, field, visualRef.current.area) - radii[page]!) * grow;
        presence[page] = Math.min(1, Math.max(0.35, Math.sqrt((web.rank[page]! * web.size) / 4)));
        // Bubbles rest at their contact distance (see layout.ts).
        spacing[page] = radii[page]!;
      }

      // The layout pulls on links that matter.
      pulling.length = 0;
      for (let from = 0; from < web.size; from += 1) {
        for (const entry of web.out[from]!) {
          if (entry.weight > 0.08) pulling.push({ from, to: entry.target, weight: entry.weight });
        }
      }
      if (web.groups > 1) {
        // Each group's gravity pulls toward its own place, so disconnected groups float apart.
        groupAnchors(web.groups, field, groupPoints);
        for (let page = 0; page < web.size; page += 1) {
          const group = web.group[page]!;
          anchors[page * 2] = groupPoints[group * 2]!;
          anchors[page * 2 + 1] = groupPoints[group * 2 + 1]!;
        }
        relaxBodies(bodiesRef.current, pulling, spacing, field, delta * tempo, presence, anchors);
      } else {
        relaxBodies(bodiesRef.current, pulling, spacing, field, delta * tempo, presence);
      }

      const current = viewRef.current;
      const points = pointsRef.current;
      const targets = targetsRef.current;
      viewTargets(current, bodiesRef.current, spacing, web.rank, web.size, field, targets);
      const transition = transitionRef.current;
      const progress = transition
        ? Math.min(1, (timeRef.current - transition.startedAt) / (still ? 0.01 : TRANSITION_SECONDS))
        : 1;
      const eased = easeInOut(progress);
      const follow = 1 - Math.exp(-FOLLOW_RATE * delta);
      for (let index = 0; index < web.size * 2; index += 1) {
        points[index] = transition && progress < 1
          ? transition.from[index]! + (targets[index]! - transition.from[index]!) * eased
          : points[index]! + (targets[index]! - points[index]!) * follow;
      }
      const linksFrom = transition?.linksFrom ?? LINK_VISIBILITY[current];
      linkVisibilityRef.current = linksFrom + (LINK_VISIBILITY[current] - linksFrom) * eased;
      if (transition && progress >= 1) transitionRef.current = null;

      // Nothing but rank's mass. Each page is a pool of its displayed rank.
      // Every link keeps sending its share, d · x(from) · w / W, round on its
      // own period and phase: a portion necks off the source pool, travels
      // and merges into the target pool, then the next begins. Links never
      // beat together and are seen only in where the mass goes. Mass is
      // conserved at every moment: a portion is taken from its source as it
      // necks off and given to its target as it merges, against the steady
      // flow that both pools carry on average.
      const visibility = linkVisibilityRef.current;
      const focus = focusRef.current;
      const pageCount = Math.min(web.size, MAX_PAGES);
      const flowing = visibility >= 0.5;
      for (let page = 0; page < pageCount; page += 1) pools[page] = shown[page]!;
      const bubbles = renderer.bubbles;
      const bubbleMedia = renderer.media;
      const bubbleReveal = renderer.reveal;
      let bubbleCount = 0;
      /** `page` is the page whose image the bubble shows; −1 shows the bare film. */
      const put = (x: number, y: number, radius: number, seed: number, page: number) => {
        if (bubbleCount >= MAX_BUBBLES) return;
        const at = bubbleCount * BUBBLE_FLOATS;
        bubbles[at] = x;
        bubbles[at + 1] = y;
        bubbles[at + 2] = radius;
        bubbles[at + 3] = seed;
        bubbleReveal[bubbleCount] = page >= 0 ? revealField[page]! : 0;
        const m = bubbleCount * MEDIA_FLOATS;
        if (page >= 0) {
          bubbleMedia[m] = mediaField.layer[page]!;
          bubbleMedia[m + 1] = mediaField.next[page]!;
          bubbleMedia[m + 2] = mediaField.blend[page]!;
          bubbleMedia[m + 3] = mediaField.phase[page]!;
        } else {
          bubbleMedia[m] = -1;
          bubbleMedia[m + 1] = -1;
          bubbleMedia[m + 2] = 0;
          bubbleMedia[m + 3] = 0;
        }
        bubbleCount += 1;
      };
      const mediaParameters = mediaRef.current;
      const trending = mediaParameters.mode === "trend" && mediaLayers > 1;
      const carrying = carryRef.current;
      const before = motionTime - delta * tempo;

      if (flowing) {
        let linkCount = 0;
        for (let from = 0; from < pageCount; from += 1) linkCount += web.out[from]!.length;
        const meanFlow = linkCount > 0 ? web.damping / linkCount : 1;
        for (let from = 0; from < pageCount; from += 1) {
          for (const entry of web.out[from]!) {
            const to = entry.target;
            if (to >= pageCount) continue;
            const flow = transit(web, shown, from, entry.weight);
            const period = PERIOD[0] + (PERIOD[1] - PERIOD[0]) * hashOf(from, to);
            const cycle = (motionTime / period + hashOf(to, from)) % 1;
            // As its portion is taken in, the sender may take up the receiver's image.
            if (trending && (before / period + hashOf(to, from)) % 1 < TAKEN_IN && cycle >= TAKEN_IN) followTrend(mediaField, web, from, to, motionTime, mediaParameters, random);
            const detach = smooth(0, DETACHED, cycle);
            const takeIn = smooth(TAKEN_IN, 1, cycle);
            pools[from] = pools[from]! - flow * (detach - cycle);
            pools[to] = pools[to]! + flow * (takeIn - cycle);
            const involved = focus !== null && (from === focus || to === focus);
            if (flow < visualRef.current.portions * meanFlow && !involved) continue;
            const portion = flow * (detach - takeIn);
            const radius = Math.sqrt((Math.max(portion, 0) * visualRef.current.area * field.width * field.height) / Math.PI);
            if (radius < MIN_PORTION_RADIUS) continue;
            const travel = smooth(0.04, 0.96, cycle);
            const ax = points[from * 2]!;
            const ay = points[from * 2 + 1]!;
            const dx = points[to * 2]! - ax;
            const dy = points[to * 2 + 1]! - ay;
            const length = Math.hypot(dx, dy) || 1;
            const bow = Math.sin(Math.PI * travel) * Math.min(BOW_LIMIT, BOW * length) * (hashOf(from + 7, to) < 0.5 ? -1 : 1);
            put(ax + dx * travel - (dy / length) * bow, ay + dy * travel + (dx / length) * bow, radius, hashOf(from, to + 5), carrying ? from : -1);
          }
        }
      } else if (trending) {
        // No portions drawn (rank view): arrivals still carry the trend on the same clocks.
        for (let from = 0; from < pageCount; from += 1) {
          for (const entry of web.out[from]!) {
            const to = entry.target;
            if (to >= pageCount) continue;
            const period = PERIOD[0] + (PERIOD[1] - PERIOD[0]) * hashOf(from, to);
            const cycle = (motionTime / period + hashOf(to, from)) % 1;
            if ((before / period + hashOf(to, from)) % 1 < TAKEN_IN && cycle >= TAKEN_IN) followTrend(mediaField, web, from, to, motionTime, mediaParameters, random);
          }
        }
      }

      // Pages: one bubble each, as large as its rank, pressed into its neighbours.
      const pageStart = bubbleCount;
      for (let page = 0; page < pageCount; page += 1) {
        const r = radiusFor(Math.max(pools[page]!, 0), field, visualRef.current.area);
        put(points[page * 2]!, points[page * 2 + 1]!, r, hashOf(page, 3), page);
      }

      // Goldfish swim around exactly these discs, and their watching feeds back into quality.
      const wanted = fishCountRef.current;
      if (wanted > 0 && !school) {
        school = new GoldfishSchool(field.width, field.height);
        schoolWeb = web;
        knownPages = web.size;
      }
      if (school) {
        if (schoolWeb !== web) {
          school.forgetPages();
          schoolWeb = web;
          knownPages = web.size;
        }
        if (web.size > knownPages) school.notePages(knownPages, web.size);
        knownPages = web.size;
        school.setCount(wanted);
        const parameters = fishRef.current;
        const drawnPages = bubbleCount - pageStart;
        school.step(delta * tempo, web, shown, bubbles, bubbleCount, pageStart, drawnPages, parameters);
        school.drainContact(drawnPages, attention);
        // A page's picture comes while a fish touches it and goes when none does, over the media fade
        // (read next frame, one frame behind the contact).
        const fade = mediaRef.current.fade;
        const step = fade > 0 ? delta / fade : 1;
        for (let page = 0; page < drawnPages; page += 1) {
          const target = attention[page]! > 0 ? 1 : 0;
          const current = revealField[page]!;
          revealField[page] = current < target ? Math.min(target, current + step) : Math.max(target, current - step);
        }
        const strength = influenceRef.current * ATTENTION_GAIN / Math.max(FISH_AUDIENCE, school.fish.length);
        if (strength > 0) for (let page = 0; page < drawnPages; page += 1) attend(web, page, attention[page]! * strength);
        if (!scene && !sceneLoading && school.fish.length > 0 && fishCanvas) {
          sceneLoading = true;
          void import("./goldfish-scene").then(({ GoldfishScene: Scene }) => {
            if (disposed) return;
            scene = new Scene(fishCanvas);
            const size = sizeRef.current;
            scene.setSize(size.width, size.height);
          }, (error: unknown) => {
            console.warn("bubble/3 goldfish renderer failed to load.", error);
          });
        }
        scene?.render(school.fish, motionTime, delta * tempo, parameters.scale, fishPaletteRef.current);
      }

      const { area: _area, portions: _portions, ...look } = visualRef.current;
      void _area;
      void _portions;
      renderer.render(bubbleCount, motionTime, { ...look, ...mediaLookRef.current, mediaMode: mediaLayers > 0 ? mappingRef.current : 0, mediaReveal: onTouchRef.current ? 1 : 0 });
      if (MEASURE) {
        renderer.sync();
        costs[costCount % costs.length] = performance.now() - frameStart;
        costCount += 1;
        if (costCount % 60 === 0) {
          const sorted = Array.from(costs.subarray(0, Math.min(costCount, costs.length))).sort((a, b) => a - b);
          const at = (share: number) => sorted[Math.min(sorted.length - 1, Math.floor(share * sorted.length))]!;
          setFrameCost(`${at(0.5).toFixed(1)} / ${at(0.95).toFixed(1)}`);
        }
      }

      sinceSummary += delta;
      if (sinceSummary > 2) {
        sinceSummary = 0;
        const share = concentration(web);
        setSummary(`${web.size} pages. The leading page, number ${leader(web) + 1}, holds ${percent(share.top)} of PageRank; the top tenth of pages hold ${percent(share.topTenth)}.`);
      }
    };

    sizeCanvas();
    const observer = new ResizeObserver(sizeCanvas);
    observer.observe(canvas);
    frame = requestAnimationFrame(render);
    return () => {
      disposed = true;
      applySurfaceRef.current = null;
      mediaLoad?.cancel();
      observer.disconnect();
      cancelAnimationFrame(frame);
      rendererRef.current = null;
      renderer.dispose();
      scene?.dispose();
    };
  }, [random, placePage]);

  const pageAt = useCallback((x: number, y: number) => {
    const web = webRef.current;
    const points = pointsRef.current;
    let best: number | null = null;
    let bestDistance = Infinity;
    for (let page = 0; page < web.size; page += 1) {
      const distance = Math.hypot(points[page * 2]! - x, points[page * 2 + 1]! - y);
      if (distance <= radiiRef.current[page]! + HIT_SLOP && distance < bestDistance) {
        best = page;
        bestDistance = distance;
      }
    }
    return best;
  }, []);

  const linkAt = useCallback((x: number, y: number) => {
    const web = webRef.current;
    const points = pointsRef.current;
    for (let from = 0; from < web.size; from += 1) {
      for (const entry of web.out[from]!) {
        if (entry.fading || entry.weight < 0.05) continue;
        const to = entry.target;
        const d = distanceToSegment(x, y, points[from * 2]!, points[from * 2 + 1]!, points[to * 2]!, points[to * 2 + 1]!);
        if (d <= HIT_SLOP) return { from, to };
      }
    }
    return null;
  }, []);

  const pointFor = (target: HTMLCanvasElement, clientX: number, clientY: number) => {
    const bounds = target.getBoundingClientRect();
    return { x: clientX - bounds.left, y: clientY - bounds.top };
  };

  const createPage = useCallback((x: number, y: number, linkedFrom: number | null) => {
    const web = webRef.current;
    // A page made by hand joins the group it is linked from, or the group it is placed nearest.
    const group = linkedFrom !== null ? web.group[linkedFrom]! : nearestGroup(web.groups, sizeRef.current, x, y);
    const page = addPage(web, 0, group);
    if (page === null) return null;
    if (linkedFrom !== null) addCandidate(web, linkedFrom, page, HAND_LINK_WEIGHT);
    placePage(page, x, y);
    return page;
  }, [placePage]);

  return (
    <main className={styles.page}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="application"
        tabIndex={0}
        aria-describedby="bubble-three-summary"
        data-frame-cost={frameCost || undefined}
        aria-label="A living web of pages ranked by PageRank, shown as a raft of foam performing the power iteration. Every page is a bubble as large as its displayed rank, pressed against its neighbours; along every link, each on its own rhythm, a small bubble of rank buds off its source, squeezes between the others and coalesces into the bubble it feeds, so the display converges to PageRank and settles again whenever the web changes. Tap empty space to add a page; drag from one page to another to add a link or let it fade; drag from a page to empty space to create a page it links to; tap between two pages to let their link fade; tap a page to highlight its links. Press N to add a page linked from the leader, Escape to clear focus."
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          const point = pointFor(event.currentTarget, event.clientX, event.clientY);
          pressRef.current = { ...point, source: pageAt(point.x, point.y), dragging: false, pointerX: point.x, pointerY: point.y };
        }}
        onPointerMove={(event) => {
          const press = pressRef.current;
          if (!press || (event.buttons & 1) === 0) return;
          const point = pointFor(event.currentTarget, event.clientX, event.clientY);
          press.pointerX = point.x;
          press.pointerY = point.y;
          if (!press.dragging && Math.hypot(point.x - press.x, point.y - press.y) >= DRAG_THRESHOLD) press.dragging = true;
        }}
        onPointerUp={(event) => {
          const press = pressRef.current;
          pressRef.current = null;
          if (!press) return;
          const point = pointFor(event.currentTarget, event.clientX, event.clientY);
          const web = webRef.current;
          if (press.source !== null && press.dragging) {
            const target = pageAt(point.x, point.y);
            if (target === null) {
              createPage(point.x, point.y, press.source);
            } else if (target !== press.source) {
              const existing = candidate(web, press.source, target);
              if (existing && !existing.fading) fadeCandidate(web, press.source, target);
              else addCandidate(web, press.source, target, HAND_LINK_WEIGHT);
            }
            return;
          }
          if (press.source !== null) {
            focusRef.current = focusRef.current === press.source ? null : press.source;
            return;
          }
          if (press.dragging) return;
          const link = linkAt(point.x, point.y);
          if (link) {
            fadeCandidate(web, link.from, link.to);
            return;
          }
          createPage(point.x, point.y, null);
        }}
        onPointerCancel={() => {
          pressRef.current = null;
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") focusRef.current = null;
          if (event.key !== "n" && event.key !== "N") return;
          const web = webRef.current;
          const top = leader(web);
          const anchor = bodiesRef.current[top];
          createPage((anchor?.x ?? 0) + 30, (anchor?.y ?? 0) + 30, top);
        }}
      />
      <canvas ref={fishCanvasRef} className={styles.fish} aria-hidden="true" />
      <p id="bubble-three-summary" className={styles.screenReaderOnly}>
        {summary}
      </p>

      <div className={styles.control}>
        {panel === "network" && (
          <div id="bubble-three-network" className={styles.panel} role="group" aria-label="네트워크">
            <p className={styles.heading}>네트워크</p>
            <p className={styles.note}>크기가 곧 PageRank · 빈 곳을 누르면 새 페이지, 페이지에서 페이지로 끌면 링크</p>
            <div className={styles.views} role="group" aria-label="보기">
              {VIEWS.map((option) => (
                <button key={option.id} type="button" aria-pressed={view === option.id} onClick={() => changeView(option.id)}>
                  {option.label}
                </button>
              ))}
            </div>
            <label className={styles.row}>
              <span>품질 요동 <output>{volatility.toFixed(2)}</output></span>
              <input
                aria-label="페이지 품질이 오르내리는 정도"
                max={VOLATILITY_RANGE[1]}
                min={VOLATILITY_RANGE[0]}
                step="0.05"
                type="range"
                value={volatility}
                onChange={(event) => setVolatility(Number(event.target.value))}
              />
            </label>
            <label className={styles.row}>
              <span>순위 쏠림</span>
              <input
                aria-label="관심이 순위 높은 페이지로 쏠리는 정도"
                max="1"
                min="0"
                step="0.01"
                type="range"
                value={1 - Math.log(floor / FLOOR_RANGE[0]) / Math.log(FLOOR_RANGE[1] / FLOOR_RANGE[0])}
                onChange={(event) => {
                  const position = Number(event.target.value);
                  setFloor(FLOOR_RANGE[0] * (FLOOR_RANGE[1] / FLOOR_RANGE[0]) ** (1 - position));
                }}
              />
            </label>
            <label className={styles.row}>
              <span>새 페이지 <output>초당 {growth.toFixed(2)}</output></span>
              <input
                aria-label="새 페이지가 생기는 속도"
                max={GROWTH_RANGE[1]}
                min={GROWTH_RANGE[0]}
                step="0.05"
                type="range"
                value={growth}
                onChange={(event) => setGrowth(Number(event.target.value))}
              />
            </label>
            <label className={styles.row}>
              <span>링크를 따를 확률 d <output>{damping.toFixed(2)}</output></span>
              <input
                aria-label="링크를 따라갈 확률 d"
                max={DAMPING_RANGE[1]}
                min={DAMPING_RANGE[0]}
                step="0.01"
                type="range"
                value={damping}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setDampingValue(value);
                  dampingRef.current = value;
                  setDamping(webRef.current, value);
                }}
              />
            </label>
            <label className={styles.row}>
              <span>페이지 수 <output>{population}</output></span>
              <input
                aria-label="페이지 수; 바꾸면 웹이 처음부터 다시 시작됩니다"
                max={MAX_PAGES}
                min={MIN_PAGES}
                step="10"
                type="range"
                value={population}
                onChange={(event) => {
                  const count = Number(event.target.value);
                  setPopulation(count);
                  repopulateRef.current = count;
                }}
              />
            </label>
            <p className={styles.note}>그룹 · 서로 링크되지 않는 버블 무리 (바꾸면 처음부터)</p>
            <div className={styles.chips} role="group" aria-label="서로 링크되지 않는 그룹 수">
              {Array.from({ length: MAX_GROUPS }, (_, index) => index + 1).map((count) => (
                <button
                  key={count}
                  type="button"
                  aria-pressed={groups === count}
                  onClick={() => {
                    setGroups(count);
                    groupsRef.current = count;
                    // One group is always the default web.
                    if (count === 1) seedRef.current = DEFAULT_SEED;
                    repopulateRef.current = population;
                  }}
                >
                  {count}
                </button>
              ))}
            </div>
            {groups > 1 && (
              <>
                <label className={styles.row}>
                  <span>그룹 다양성 <output>{diversity.toFixed(2)}</output></span>
                  <input
                    aria-label="그룹마다 크기와 성격이 다른 정도; 바꾸면 처음부터"
                    max="1"
                    min="0"
                    step="0.05"
                    type="range"
                    value={diversity}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      setDiversity(value);
                      diversityRef.current = value;
                      repopulateRef.current = population;
                    }}
                  />
                </label>
                <button
                  type="button"
                  className={styles.reset}
                  onClick={() => {
                    seedRef.current = (Math.random() * 4_294_967_296) >>> 0 || 1;
                    repopulateRef.current = population;
                  }}
                >
                  다시 섞기
                </button>
              </>
            )}
          </div>
        )}
        {panel === "visual" && (
          <div id="bubble-three-visual" className={styles.panel} role="group" aria-label="비주얼">
            <p className={styles.heading}>비주얼</p>
            <p className={styles.note}>반사되는 환경</p>
            <div className={styles.chips} role="group" aria-label="반사되는 환경">
              {ENVIRONMENTS.map((option) => (
                <button
                  key={option.mode}
                  type="button"
                  aria-pressed={visual.envMode === option.mode}
                  onClick={() => setVisual((current) => ({ ...current, envMode: option.mode }))}
                >
                  {option.label}
                </button>
              ))}
              <label className={styles.file} aria-pressed={visual.envMode === 6}>
                {imageName ?? "이미지…"}
                <input
                  accept="image/*"
                  type="file"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file || !rendererRef.current) return;
                    const image = await createImageBitmap(file);
                    rendererRef.current.setEnvironmentImage(image);
                    image.close();
                    setImageName(file.name);
                    setVisual((current) => ({ ...current, envMode: 6 }));
                  }}
                />
              </label>
            </div>
            <p className={styles.note}>팔레트</p>
            <div className={styles.chips} role="group" aria-label="팔레트">
              {PALETTES.map((palette) => (
                <button
                  key={palette.id}
                  type="button"
                  aria-pressed={COLOUR_CONTROLS.every(({ key }) => toHex(visual[key]) === palette[key])}
                  onClick={() =>
                    setVisual((current) => ({
                      ...current,
                      lightColour: fromHex(palette.lightColour),
                      filmTint: fromHex(palette.filmTint),
                      background: fromHex(palette.background),
                    }))
                  }
                >
                  {palette.label}
                </button>
              ))}
            </div>
            <div className={styles.colours}>
              {COLOUR_CONTROLS.map((control) => (
                <label key={control.key}>
                  <input
                    aria-label={`${control.label} 색`}
                    type="color"
                    value={toHex(visual[control.key])}
                    onChange={(event) => {
                      const colour = fromHex(event.target.value);
                      setVisual((current) => ({ ...current, [control.key]: colour }));
                    }}
                  />
                  {control.label}
                </label>
              ))}
            </div>
            {VISUAL_CONTROLS.map((control) => (
              <label key={control.key} className={styles.row}>
                <span>
                  {control.label} <output>{visual[control.key].toFixed(control.step < 0.05 ? 2 : control.step < 1 ? 2 : 0)}</output>
                </span>
                <input
                  aria-label={control.label}
                  max={control.max}
                  min={control.min}
                  step={control.step}
                  type="range"
                  value={visual[control.key]}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setVisual((current) => ({ ...current, [control.key]: value }));
                  }}
                />
              </label>
            ))}
            <button type="button" className={styles.reset} onClick={() => setVisual(VISUAL_DEFAULTS)}>
              bubble/1 값으로
            </button>
          </div>
        )}
        {panel === "fish" && (
          <div id="bubble-three-fish" className={styles.panel} role="group" aria-label="금붕어">
            <p className={styles.heading}>금붕어</p>
            <p className={styles.note}>버블 가장자리를 오가며 링크를 따라 옮겨 다니고, 오래 머문 페이지의 품질을 올립니다</p>
            <label className={styles.row}>
              <span>수 <output>{fishCount}</output></span>
              <input
                aria-label="금붕어 수; 0이면 없음"
                max={MAX_FISH}
                min="0"
                step="10"
                type="range"
                value={fishCount}
                onChange={(event) => setFishCount(Number(event.target.value))}
              />
            </label>
            <p className={styles.note}>색</p>
            <div className={styles.chips} role="group" aria-label="금붕어 색">
              {(Object.keys(FISH_PALETTES) as FishPaletteId[]).map((id) => (
                <button key={id} type="button" aria-pressed={fishPalette === id} onClick={() => setFishPalette(id)}>
                  {FISH_PALETTES[id].label}
                </button>
              ))}
            </div>
            {FISH_CONTROLS.map((control) => (
              <label key={control.key} className={styles.row}>
                <span>
                  {control.label} <output>{fish[control.key].toFixed(2)}</output>
                </span>
                <input
                  aria-label={control.label}
                  max={control.max}
                  min={control.min}
                  step={control.step}
                  type="range"
                  value={fish[control.key]}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setFish((current) => ({ ...current, [control.key]: value }));
                  }}
                />
              </label>
            ))}
            <label className={styles.row}>
              <span>품질에 주는 영향 <output>{influence.toFixed(2)}</output></span>
              <input
                aria-label="금붕어가 머문 페이지의 품질을 올리는 정도"
                max="1"
                min="0"
                step="0.01"
                type="range"
                value={influence}
                onChange={(event) => setInfluence(Number(event.target.value))}
              />
            </label>
            <button
              type="button"
              className={styles.reset}
              onClick={() => {
                setFish(FISH_DEFAULTS);
                setInfluence(DEFAULT_INFLUENCE);
              }}
            >
              기본값으로
            </button>
          </div>
        )}
        {panel === "media" && (
          <div id="bubble-three-media" className={styles.panel} role="group" aria-label="미디어">
            <p className={styles.heading}>미디어</p>
            <p className={styles.note}>막 아래 비치는 것</p>
            <div className={styles.chips} role="group" aria-label="표면">
              {SURFACES.map((option) => (
                <button key={option.id} type="button" aria-pressed={surface === option.id} onClick={() => setSurface(option.id)}>
                  {option.label}
                </button>
              ))}
            </div>
            {(surface === "keyword" || surface === "mix") && (
              <>
                <p className={styles.note}>키워드 글꼴</p>
                <div className={styles.chips} role="group" aria-label="키워드 글꼴">
                  {KEYWORD_FONTS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={keywordStyle.font === option.id}
                      onClick={() => setKeywordStyle((current) => ({ ...current, font: option.id }))}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <label className={styles.row}>
                  <span>글자 크기 <output>{keywordStyle.size.toFixed(2)}</output></span>
                  <input
                    aria-label="키워드 글자 크기; 기본 0.5"
                    max={KEYWORD_SIZE_RANGE[1]}
                    min={KEYWORD_SIZE_RANGE[0]}
                    step="0.05"
                    type="range"
                    value={keywordStyle.size}
                    onChange={(event) => {
                      const size = Number(event.target.value);
                      setKeywordStyle((current) => ({ ...current, size }));
                    }}
                  />
                </label>
                <label className={styles.row}>
                  <span>글자 불투명도 <output>{keywordStyle.opacity.toFixed(2)}</output></span>
                  <input
                    aria-label="키워드 글자의 불투명도; 1이면 흰색"
                    max="1"
                    min="0"
                    step="0.01"
                    type="range"
                    value={keywordStyle.opacity}
                    onChange={(event) => {
                      const opacity = Number(event.target.value);
                      setKeywordStyle((current) => ({ ...current, opacity }));
                    }}
                  />
                </label>
              </>
            )}
            <p className={styles.note}>보임</p>
            <div className={styles.chips} role="group" aria-label="보임">
              <button type="button" aria-pressed={!onTouch} onClick={() => setOnTouch(false)}>
                항상
              </button>
              <button type="button" aria-pressed={onTouch} onClick={() => setOnTouch(true)}>
                금붕어가 닿을 때만
              </button>
            </div>
            <p className={styles.note}>입히기</p>
            <div className={styles.chips} role="group" aria-label="입히기">
              {MAPPINGS.map((option) => (
                <button key={option.mode} type="button" aria-pressed={mapping === option.mode} onClick={() => setMapping(option.mode)}>
                  {option.label}
                </button>
              ))}
            </div>
            <p className={styles.note}>바뀜</p>
            <div className={styles.chips} role="group" aria-label="바뀜">
              {MEDIA_MODES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={media.mode === option.id}
                  onClick={() => setMedia((current) => ({ ...current, mode: option.id }))}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {media.mode === "churn" && (
              <label className={styles.row}>
                <span>초당 바뀜 수 <output>{media.churnRate.toFixed(1)}</output></span>
                <input
                  aria-label="한 버블의 이미지가 초당 바뀌는 횟수"
                  max={CHURN_RANGE[1]}
                  min={CHURN_RANGE[0]}
                  step="0.1"
                  type="range"
                  value={media.churnRate}
                  onChange={(event) => {
                    const churnRate = Number(event.target.value);
                    setMedia((current) => ({ ...current, churnRate }));
                  }}
                />
              </label>
            )}
            {media.mode === "trend" && (
              <>
                <label className={styles.row}>
                  <span>새 유행 주기 (초) <output>{media.trendInterval.toFixed(0)}</output></span>
                  <input
                    aria-label="각 그룹의 선두 페이지가 새 이미지를 집어 드는 주기"
                    max={TREND_INTERVAL_RANGE[1]}
                    min={TREND_INTERVAL_RANGE[0]}
                    step="1"
                    type="range"
                    value={media.trendInterval}
                    onChange={(event) => {
                      const trendInterval = Number(event.target.value);
                      setMedia((current) => ({ ...current, trendInterval }));
                    }}
                  />
                </label>
                <label className={styles.row}>
                  <span>따라갈 확률 <output>{media.follow.toFixed(2)}</output></span>
                  <input
                    aria-label="몫이 도착할 때 보내는 페이지가 더 높은 페이지의 이미지를 베낄 확률"
                    max="1"
                    min="0"
                    step="0.01"
                    type="range"
                    value={media.follow}
                    onChange={(event) => {
                      const follow = Number(event.target.value);
                      setMedia((current) => ({ ...current, follow }));
                    }}
                  />
                </label>
                <label className={styles.row}>
                  <span>싫증 (초) <output>{media.boredom === 0 ? "없음" : media.boredom.toFixed(0)}</output></span>
                  <input
                    aria-label="한 이미지를 이만큼 본 페이지가 다른 것을 찾는 시간; 0이면 없음"
                    max={BOREDOM_RANGE[1]}
                    min={BOREDOM_RANGE[0]}
                    step="1"
                    type="range"
                    value={media.boredom}
                    onChange={(event) => {
                      const boredom = Number(event.target.value);
                      setMedia((current) => ({ ...current, boredom }));
                    }}
                  />
                </label>
              </>
            )}
            {(media.mode !== "fixed" || onTouch) && (
              <label className={styles.row}>
                <span>바뀜 부드럽게 (초) <output>{media.fade.toFixed(2)}</output></span>
                <input
                  aria-label="이미지가 바뀌는 데 걸리는 시간"
                  max={FADE_RANGE[1]}
                  min={FADE_RANGE[0]}
                  step="0.05"
                  type="range"
                  value={media.fade}
                  onChange={(event) => {
                    const fade = Number(event.target.value);
                    setMedia((current) => ({ ...current, fade }));
                  }}
                />
              </label>
            )}
            {MEDIA_LOOK_CONTROLS.map((control) => (
              <label key={control.key} className={styles.row}>
                <span>
                  {control.label} <output>{mediaLook[control.key].toFixed(2)}</output>
                </span>
                <input
                  aria-label={control.label}
                  max={control.max}
                  min={control.min}
                  step={control.step}
                  type="range"
                  value={mediaLook[control.key]}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setMediaLook((current) => ({ ...current, [control.key]: value }));
                  }}
                />
              </label>
            ))}
            <div className={styles.chips} role="group" aria-label="흐름 버블">
              <button type="button" aria-pressed={carry} onClick={() => setCarry((current) => !current)}>
                흐름 버블에도
              </button>
            </div>
            <button
              type="button"
              className={styles.reset}
              onClick={() => {
                setSurface(DEFAULT_SURFACE);
                setKeywordStyle(DEFAULT_KEYWORD_STYLE);
                setMapping(DEFAULT_MAPPING);
                setMedia(MEDIA_DEFAULTS);
                setMediaLook(MEDIA_LOOK_DEFAULTS);
                setCarry(true);
                setOnTouch(DEFAULT_ON_TOUCH);
              }}
            >
              기본값으로
            </button>
          </div>
        )}
        <div className={styles.triggers}>
          <button
            type="button"
            className={styles.trigger}
            aria-label="네트워크 옵션"
            aria-expanded={panel === "network"}
            aria-controls="bubble-three-network"
            onClick={() => setPanel((current) => (current === "network" ? null : "network"))}
          >
            <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
              <path d="M5 6l10 3M5 6l3 9M15 9l-7 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              <circle cx="5" cy="6" r="2" fill="#171717" stroke="currentColor" strokeWidth="1.4" />
              <circle cx="15" cy="9" r="2" fill="#171717" stroke="currentColor" strokeWidth="1.4" />
              <circle cx="8" cy="15" r="2" fill="#171717" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </button>
          <button
            type="button"
            className={styles.trigger}
            aria-label="비주얼 옵션"
            aria-expanded={panel === "visual"}
            aria-controls="bubble-three-visual"
            onClick={() => setPanel((current) => (current === "visual" ? null : "visual"))}
          >
            <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
              <path d="M3 6h14M3 14h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="7" cy="6" r="2.2" fill="#171717" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="13" cy="14" r="2.2" fill="#171717" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </button>
          <button
            type="button"
            className={styles.trigger}
            aria-label="금붕어 옵션"
            aria-expanded={panel === "fish"}
            aria-controls="bubble-three-fish"
            onClick={() => setPanel((current) => (current === "fish" ? null : "fish"))}
          >
            <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
              <path d="M13.5 10c0 2-2.6 3.6-5.6 3.6S3 12 3 10s1.9-3.6 4.9-3.6 5.6 1.6 5.6 3.6z" fill="none" stroke="currentColor" strokeWidth="1.4" />
              <path d="M13.5 10l3.5-3v6z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
              <circle cx="6" cy="9.4" r="0.9" fill="currentColor" />
            </svg>
          </button>
          <button
            type="button"
            className={styles.trigger}
            aria-label="미디어 옵션"
            aria-expanded={panel === "media"}
            aria-controls="bubble-three-media"
            onClick={() => setPanel((current) => (current === "media" ? null : "media"))}
          >
            <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
              <rect x="3" y="4" width="14" height="12" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
              <path d="M3.5 14l4-4.5 3 3 2-2 4 3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
              <circle cx="13" cy="7.5" r="1.2" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>
    </main>
  );
}
