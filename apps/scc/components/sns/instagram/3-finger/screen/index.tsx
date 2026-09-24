"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  activateStory,
  createStorySystem,
  stepStorySystem,
} from "../model/social-stories";
import { connectStoryActivation } from "../model/temporal-edges";
import type { StoryActivation, StoryEdge } from "../model/types";
import { instagramStoryRows } from "../../1/model/data";
import styles from "./story-tray.module.css";

const REFERENCE_STORY_SIZE = 93;
const DEFAULT_ICON_SIZE = 40;
const DEFAULT_STORY_GAP = 26;
const SIMULATION_STEP_MILLISECONDS = 210;

type GridSize = {
  columns: number;
  rows: number;
};

type StageSize = { width: number; height: number };
type ActivePointer = { x: number; y: number; history: StoryActivation[] };
type EdgeGeometry = StoryEdge & { path: string; startX: number; startY: number; endX: number; endY: number };

type StorySurface = "empty" | "white" | "face" | "hangul" | "hanja" | "numbers" | "hieroglyph" | "logo" | "colour" | "paris" | "techMono" | "tech";

type ParisLine = Readonly<{
  label: string;
  color: string;
  textColor: string;
}>;

type StoryRingPalette = Readonly<{
  id: "instagram" | "rose" | "sunset" | "lilac" | "ocean" | "forest" | "citrus" | "ember" | "dusk" | "monochrome";
  name: string;
  gradient: string;
  edgeStart: string;
  edgeMiddle: string;
  edgeEnd: string;
}>;

type TechPaletteGroup = Readonly<{
  paletteId: StoryRingPalette["id"];
  terms: readonly string[];
}>;

const humanFaceImages = instagramStoryRows.flat().map((story) => story.image);
const hangulGlyphs = [
  "한", "병", "책", "밤", "봄", "숲", "빛", "달", "별", "물", "집", "길",
  "꿈", "눈", "말", "손", "방", "문", "창", "틈", "섬", "꽃", "잔", "술",
  "차", "옷", "숨", "벽", "밥", "바", "개", "돌", "파", "선", "점", "면",
  "결", "잎", "콩", "강", "산", "새", "달", "불", "비", "낮", "밤", "집",
] as const;
const hanjaGlyphs = [
  // Ethical and philosophical concepts.
  "德", "禮", "樂", "靜", "覺", "靈", "觀", "識", "護", "鑑", "願", "變",
  "續", "緣", "論", "轉", "歸", "濟", "懷", "蘊", "禪", "釋", "讓", "遷",
  // Cultural symbols and figurative motifs.
  "藝", "醫", "藍", "蘭", "龍", "龜", "鶴", "鐘", "鐵", "鏡", "寶", "織",
  "歷", "顧", "邊", "遺", "關", "讀", "齋", "翼", "麗", "穩", "鵬", "薰",
] as const;
const numberGlyphs = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;
const hieroglyphs = [
  "𓀀", "𓀁", "𓀂", "𓀃", "𓀅", "𓀇", "𓀉", "𓀊", "𓀋", "𓀍", "𓀏", "𓀑",
  "𓀓", "𓀕", "𓀗", "𓀙", "𓀛", "𓀝", "𓀟", "𓀡", "𓀣", "𓀥", "𓀧", "𓀩",
  "𓂀", "𓂁", "𓂂", "𓂃", "𓂅", "𓂇", "𓂉", "𓂋", "𓂍", "𓂏", "𓂑", "𓂓",
  "𓃀", "𓃁", "𓃂", "𓃃", "𓃅", "𓃇", "𓃉", "𓃋", "𓃍", "𓃏", "𓃑", "𓃓",
] as const;
const generatedLogoPalette = ["#ef5b43", "#f2ba35", "#35b89d", "#3578e5", "#7957cc", "#1b1d20"] as const;
const parisLines: readonly ParisLine[] = [
  { label: "1", color: "#ffcd00", textColor: "#1a1d20" },
  { label: "2", color: "#003ca6", textColor: "#fff" },
  { label: "3", color: "#837902", textColor: "#fff" },
  { label: "4", color: "#cf009e", textColor: "#fff" },
  { label: "5", color: "#ff7e2e", textColor: "#1a1d20" },
  { label: "6", color: "#6eca97", textColor: "#1a1d20" },
  { label: "7", color: "#fa9aba", textColor: "#1a1d20" },
  { label: "8", color: "#e19bdf", textColor: "#1a1d20" },
  { label: "9", color: "#b6bd00", textColor: "#1a1d20" },
  { label: "10", color: "#c9910d", textColor: "#1a1d20" },
  { label: "11", color: "#704b1c", textColor: "#fff" },
  { label: "12", color: "#007852", textColor: "#fff" },
  { label: "13", color: "#6ec4e8", textColor: "#1a1d20" },
  { label: "14", color: "#62259d", textColor: "#fff" },
  { label: "A", color: "#e3051c", textColor: "#fff" },
  { label: "B", color: "#5291ce", textColor: "#fff" },
  { label: "C", color: "#ffce00", textColor: "#1a1d20" },
  { label: "D", color: "#00a88f", textColor: "#fff" },
  { label: "E", color: "#c04191", textColor: "#fff" },
] as const;
const techTerms = [
  "AI", "AR", "AX", "BI", "BT", "CD", "CI", "CM", "CR", "CS", "CV", "CX",
  "DB", "DC", "DL", "DM", "DR", "DS", "DT", "DX", "EC", "EM", "FE", "FI",
  "FX", "GC", "GD", "HR", "IA", "IC", "ID", "IM", "IP", "IR", "IS", "IT",
  "KB", "KR", "MA", "MB", "ML", "MR", "NC", "NG", "NL", "OA", "OK", "OM",
  "OO", "OP", "OS", "OT", "PC", "PE", "PI", "PL", "PM", "PO", "PR", "PS",
  "QA", "QC", "RD", "RE", "RF", "RL", "RM", "SA", "SC", "SD", "SE", "SI",
  "SM", "SO", "SP", "SR", "SS", "ST", "SW", "TA", "TC", "TD", "TF", "TM",
  "TP", "TS", "UI", "UX", "VC", "VM", "VR", "XR",
] as const;
const storyRingPalettes: readonly StoryRingPalette[] = [
  { id: "instagram", name: "Instagram", gradient: "conic-gradient(from 205deg, #fed044, #ff264f 30%, #ed0e9b 58%, #ff5e29 80%, #fed044)", edgeStart: "#ffbd5b", edgeMiddle: "#fa4aa5", edgeEnd: "#ffd06a" },
  { id: "rose", name: "Rose", gradient: "conic-gradient(from 205deg, #ffc990, #f45b99 30%, #bd4ab9 58%, #ee8a74 80%, #ffc990)", edgeStart: "#ffc49a", edgeMiddle: "#e95f9d", edgeEnd: "#ef9dbe" },
  { id: "sunset", name: "Sunset", gradient: "conic-gradient(from 205deg, #ffe179, #ff993f 30%, #ef5551 58%, #bb4e8a 80%, #ffe179)", edgeStart: "#ffd66f", edgeMiddle: "#f46a4f", edgeEnd: "#ca5793" },
  { id: "lilac", name: "Lilac", gradient: "conic-gradient(from 205deg, #f3b7ff, #c952e8 30%, #7355df 58%, #648de8 80%, #f3b7ff)", edgeStart: "#e6b4ff", edgeMiddle: "#a653e2", edgeEnd: "#6d8ff0" },
  { id: "ocean", name: "Ocean", gradient: "conic-gradient(from 205deg, #87efd5, #2eb7d4 30%, #3f72e4 58%, #776ce7 80%, #87efd5)", edgeStart: "#87efd5", edgeMiddle: "#32a8d6", edgeEnd: "#7473ec" },
  { id: "forest", name: "Forest", gradient: "conic-gradient(from 205deg, #d9ef73, #75c76b 30%, #168c76 58%, #2eaa92 80%, #d9ef73)", edgeStart: "#d1e97c", edgeMiddle: "#54bd7a", edgeEnd: "#2aa991" },
  { id: "citrus", name: "Citrus", gradient: "conic-gradient(from 205deg, #fff36d, #c9e64b 30%, #56bc76 58%, #f2bd43 80%, #fff36d)", edgeStart: "#fff06a", edgeMiddle: "#91d05f", edgeEnd: "#f6c24e" },
  { id: "ember", name: "Ember", gradient: "conic-gradient(from 205deg, #ffc45a, #f86e35 30%, #d94545 58%, #a94d71 80%, #ffc45a)", edgeStart: "#ffbf59", edgeMiddle: "#ed593f", edgeEnd: "#b55075" },
  { id: "dusk", name: "Dusk", gradient: "conic-gradient(from 205deg, #edbb85, #cb688a 30%, #704da7 58%, #426eae 80%, #edbb85)", edgeStart: "#e9b78c", edgeMiddle: "#a8589e", edgeEnd: "#4e72b2" },
  { id: "monochrome", name: "Monochrome", gradient: "conic-gradient(from 205deg, #f3f5f6, #9199a0 30%, #4c555e 58%, #aeb5bb 80%, #f3f5f6)", edgeStart: "#d8dde0", edgeMiddle: "#8b949b", edgeEnd: "#f3f5f6" },
];
const techPaletteGroups: readonly TechPaletteGroup[] = [
  { paletteId: "instagram", terms: ["AX", "DX", "GD", "NG"] },
  { paletteId: "lilac", terms: ["AI", "ML", "DL", "RL", "CV", "NL"] },
  { paletteId: "ocean", terms: ["AR", "BI", "DB", "DC", "DM", "DS", "DT", "KB", "MR", "VR", "XR"] },
  { paletteId: "forest", terms: ["CD", "CI", "CM", "CR", "QA", "QC", "RD", "RE", "SD", "SE", "SI", "SW"] },
  { paletteId: "citrus", terms: ["FE", "IA", "IC", "ID", "IM", "IS", "IT", "NC", "OA", "OO", "OS", "OT", "PC", "UI", "UX"] },
  { paletteId: "rose", terms: ["CS", "CX", "EM", "HR", "PR", "PS", "SA"] },
  { paletteId: "sunset", terms: ["OM", "OP", "PL", "PM", "PO", "SM", "SO", "SP", "TA", "TC", "TD", "TM", "TP", "TS"] },
  { paletteId: "dusk", terms: ["EC", "FI", "FX", "IR", "MA", "PE", "PI", "VC"] },
  { paletteId: "ember", terms: ["BT", "DR", "GC", "IP", "RF", "SC", "SS", "ST", "TF", "VM"] },
  { paletteId: "monochrome", terms: ["KR", "MB", "OK", "RM", "SR"] },
];

function getGridSize(
  width: number,
  height: number,
  storySize: number,
  storyRowHeight: number,
  storyGap: number,
): GridSize {
  return {
    columns: Math.max(1, Math.floor((width + storyGap) / (storySize + storyGap))),
    rows: Math.max(1, Math.floor((height + storyGap) / (storyRowHeight + storyGap))),
  };
}

function colourUnit(index: number, seed: number, salt: number) {
  const value = Math.sin((index + 1) * (seed + salt * 19.73)) * 43758.5453123;
  return value - Math.floor(value);
}

function colourFor(index: number, seed: number) {
  const hue = Math.round(colourUnit(index, seed, 1) * 360);
  const saturation = Math.round(52 + colourUnit(index, seed, 2) * 43);
  const lightness = Math.round(33 + colourUnit(index, seed, 3) * 42);
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

function storyRingPaletteById(id: StoryRingPalette["id"]) {
  return storyRingPalettes.find((palette) => palette.id === id) ?? storyRingPalettes[0]!;
}

function techPaletteForTerm(term: string) {
  const group = techPaletteGroups.find((candidate) => candidate.terms.includes(term));
  return storyRingPaletteById(group?.paletteId ?? "instagram");
}

function techPaletteForIndex(index: number) {
  return techPaletteForTerm(techTerms[index % techTerms.length]!);
}

function getSurfaceStyle(surface: StorySurface, index: number, colourSeed: number): CSSProperties {
  if (surface === "empty" || surface === "hangul" || surface === "hanja" || surface === "numbers" || surface === "hieroglyph" || surface === "techMono" || surface === "tech") return { backgroundColor: "#242a2f" };
  if (surface === "face") {
    return {
      backgroundColor: "#d7cec2",
      backgroundImage: `url("${humanFaceImages[index % humanFaceImages.length]}")`,
      backgroundSize: "cover",
    };
  }
  if (surface === "logo") return { backgroundColor: "#f7f5ef" };
  if (surface === "colour") {
    return { backgroundColor: colourFor(index, colourSeed) };
  }
  if (surface === "paris") return { backgroundColor: parisLines[index % parisLines.length]!.color };
  return { backgroundColor: "#fff" };
}

function isCharacterSurface(surface: StorySurface): surface is "hangul" | "hanja" | "numbers" | "hieroglyph" {
  return surface === "hangul" || surface === "hanja" || surface === "numbers" || surface === "hieroglyph";
}

function getCharacterGlyph(surface: "hangul" | "hanja" | "numbers" | "hieroglyph", index: number) {
  if (surface === "hangul") return hangulGlyphs[(index * 17 + 11) % hangulGlyphs.length]!;
  if (surface === "hanja") return hanjaGlyphs[(index * 23 + 7) % hanjaGlyphs.length]!;
  if (surface === "hieroglyph") return hieroglyphs[(index * 29 + 3) % hieroglyphs.length]!;
  return numberGlyphs[index % numberGlyphs.length]!;
}

function GeneratedLogo({ index }: { index: number }) {
  return (
    <svg aria-hidden="true" className={styles.generatedLogo} viewBox="0 0 100 100">
      {Array.from({ length: 5 }, (_, column) => {
        const segmentCount = 2 + ((index * 7 + column * 5) % 3);
        const offset = 10 + ((index * 11 + column * 3) % 4) * 4;

        return Array.from({ length: segmentCount }, (_, segment) => {
          const height = 12 + ((index + column * 2 + segment * 3) % 2) * 6;
          const y = Math.min(78 - height, offset + segment * 20);
          const color = generatedLogoPalette[(index * 13 + column * 3 + segment) % generatedLogoPalette.length]!;

          return <rect fill={color} height={height} key={`logo-${column}-${segment}`} width="10" x={17 + column * 16} y={y} />;
        });
      })}
    </svg>
  );
}

function HieroglyphMark({ glyph }: { glyph: string }) {
  return (
    <svg aria-hidden="true" className={styles.hieroglyphMark} viewBox="0 0 100 100">
      <text dominantBaseline="central" textAnchor="middle" x="50" y="50">{glyph}</text>
    </svg>
  );
}

function NumberMark({ glyph }: { glyph: string }) {
  return (
    <svg aria-hidden="true" className={styles.numberMark} viewBox="0 0 100 100">
      <text dominantBaseline="central" textAnchor="middle" x="50" y="50">{glyph}</text>
    </svg>
  );
}

function ParisLineMark({ line }: { line: ParisLine }) {
  return (
    <svg aria-hidden="true" className={styles.parisLineMark} viewBox="0 0 100 100">
      <text className={line.label.length > 1 ? styles.parisDoubleDigit : undefined} dominantBaseline="central" fill={line.textColor} textAnchor="middle" x="50" y="50">{line.label}</text>
    </svg>
  );
}

function TechMark({ term }: { term: string }) {
  return (
    <svg aria-hidden="true" className={styles.techMark} viewBox="0 0 100 100">
      <text dominantBaseline="central" textAnchor="middle" x="50" y="50">{term}</text>
    </svg>
  );
}

function edgeGeometry(edge: StoryEdge, stage: StageSize, grid: GridSize, iconSize: number, gap: number): EdgeGeometry {
  const gridWidth = grid.columns * iconSize + (grid.columns - 1) * gap;
  const gridHeight = grid.rows * iconSize + (grid.rows - 1) * gap;
  const center = (index: number) => ({
    x: (stage.width - gridWidth) / 2 + iconSize / 2 + (index % grid.columns) * (iconSize + gap),
    y: (stage.height - gridHeight) / 2 + iconSize / 2 + Math.floor(index / grid.columns) * (iconSize + gap),
  });
  const source = center(edge.source);
  const target = center(edge.target);
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const distance = Math.hypot(dx, dy);
  const unitX = dx / distance;
  const unitY = dy / distance;
  const inset = Math.min(iconSize * 0.48, distance * 0.28);
  const startX = source.x + unitX * inset;
  const startY = source.y + unitY * inset;
  const endX = target.x - unitX * inset;
  const endY = target.y - unitY * inset;
  const bend = Math.min(18, distance * 0.16) * ((edge.source * 17 + edge.target * 13) % 2 === 0 ? 1 : -1);
  const controlX = (startX + endX) / 2 - unitY * bend;
  const controlY = (startY + endY) / 2 + unitX * bend;
  return {
    ...edge,
    path: `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`,
    startX, startY, endX, endY,
  };
}

export function InstagramFingerStoryTray() {
  const gridRef = useRef<HTMLUListElement>(null);
  const activePointers = useRef(new Map<number, ActivePointer>());
  const systemRef = useRef(createStorySystem(1, 1));
  const edgesRef = useRef<StoryEdge[]>([]);
  const nextEdgeId = useRef(0);
  const [gridSize, setGridSize] = useState<GridSize>({ columns: 1, rows: 1 });
  const [stageSize, setStageSize] = useState<StageSize>({ width: 0, height: 0 });
  const [system, setSystem] = useState(() => createStorySystem(1, 1));
  const [edges, setEdges] = useState<StoryEdge[]>([]);
  const [colourSeed] = useState(() => Math.random() * 100000);
  const testSurface = "empty" as StorySurface;
  const iconSize = DEFAULT_ICON_SIZE;
  const storyGap = DEFAULT_STORY_GAP;
  const showLabels = false;
  const storyRowHeight = iconSize;
  const selectedRingPalette = storyRingPalettes[0]!;

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const updateGridSize = () => {
      const nextStage = { width: grid.clientWidth, height: grid.clientHeight };
      const nextGrid = getGridSize(nextStage.width, nextStage.height, iconSize, storyRowHeight, storyGap);
      setStageSize((current) => (
        current.width === nextStage.width && current.height === nextStage.height ? current : nextStage
      ));
      setGridSize((current) => (
        current.columns === nextGrid.columns && current.rows === nextGrid.rows ? current : nextGrid
      ));
    };
    updateGridSize();
    const observer = new ResizeObserver(updateGridSize);
    observer.observe(grid);
    return () => observer.disconnect();
  }, [iconSize, storyGap, storyRowHeight]);

  useEffect(() => {
    activePointers.current.clear();
    systemRef.current = createStorySystem(gridSize.columns, gridSize.rows);
    setSystem(systemRef.current);
    edgesRef.current = [];
    setEdges([]);
  }, [gridSize]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      const next = stepStorySystem(systemRef.current, Date.now());
      if (next !== systemRef.current) {
        systemRef.current = next;
        setSystem(next);
      }
      const visible = edgesRef.current.filter((edge) => edge.expiresAt > Date.now());
      if (visible.length !== edgesRef.current.length) {
        edgesRef.current = visible;
        setEdges(visible);
      }
    }, SIMULATION_STEP_MILLISECONDS);
    return () => window.clearInterval(timer);
  }, []);

  function activateAlongSegment(pointerId: number, from: { x: number; y: number }, to: { x: number; y: number }) {
    const grid = gridRef.current;
    const pointer = activePointers.current.get(pointerId);
    if (!grid || !pointer) return;
    const rect = grid.getBoundingClientRect();
    const gridWidth = gridSize.columns * iconSize + (gridSize.columns - 1) * storyGap;
    const gridHeight = gridSize.rows * storyRowHeight + (gridSize.rows - 1) * storyGap;
    const left = rect.left + (rect.width - gridWidth) / 2;
    const top = rect.top + (rect.height - gridHeight) / 2;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const lengthSquared = dx * dx + dy * dy;
    let next = systemRef.current;
    const now = Date.now();

    const crossed: { index: number; position: number }[] = [];
    for (const node of next.nodes) {
      if (next.states[node.index]?.status !== "empty") continue;
      const centerX = left + iconSize / 2 + (node.index % gridSize.columns) * (iconSize + storyGap);
      const centerY = top + iconSize / 2 + Math.floor(node.index / gridSize.columns) * (storyRowHeight + storyGap);
      const projection = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1,
        ((centerX - from.x) * dx + (centerY - from.y) * dy) / lengthSquared,
      ));
      const closestX = from.x + dx * projection;
      const closestY = from.y + dy * projection;
      if (Math.hypot(centerX - closestX, centerY - closestY) < iconSize / 2) {
        crossed.push({ index: node.index, position: projection });
      }
    }
    crossed.sort((a, b) => a.position - b.position);
    let history = pointer.history;
    const addedEdges: StoryEdge[] = [];
    for (const crossing of crossed) {
      next = activateStory(next, crossing.index, now);
      const connection = connectStoryActivation(history, crossing.index, now, (source) => (
        `finger-${pointerId}-${source}-${crossing.index}-${nextEdgeId.current++}`
      ));
      history = connection.history;
      addedEdges.push(...connection.edges);
    }
    pointer.history = history;
    if (next !== systemRef.current) {
      systemRef.current = next;
      setSystem(next);
    }
    if (addedEdges.length > 0) {
      edgesRef.current = [...edgesRef.current, ...addedEdges];
      setEdges(edgesRef.current);
    }
  }

  function movePointer(event: ReactPointerEvent<HTMLElement>) {
    const previous = activePointers.current.get(event.pointerId);
    if (!previous) return;
    const samples = event.nativeEvent.getCoalescedEvents?.() ?? [event.nativeEvent];
    let from: { x: number; y: number } = previous;
    for (const sample of samples) {
      const to = { x: sample.clientX, y: sample.clientY };
      activateAlongSegment(event.pointerId, from, to);
      from = to;
    }
    const final = { x: event.clientX, y: event.clientY };
    activateAlongSegment(event.pointerId, from, final);
    const pointer = activePointers.current.get(event.pointerId);
    if (pointer) activePointers.current.set(event.pointerId, { ...pointer, ...final });
  }

  function releasePointer(event: ReactPointerEvent<HTMLElement>, cancelled = false) {
    if (!cancelled) movePointer(event);
    activePointers.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  const gridStyle = {
    "--grid-columns": gridSize.columns,
    "--grid-rows": gridSize.rows,
    "--story-size": `${iconSize}px`,
    "--story-row-height": `${storyRowHeight}px`,
    "--story-gap": `${storyGap}px`,
    "--story-ring-padding": `${(iconSize / REFERENCE_STORY_SIZE) * 3.5}px`,
    "--story-separator": `${(iconSize / REFERENCE_STORY_SIZE) * 3.5}px`,
    "--story-ring-gradient": selectedRingPalette.gradient,
  } as CSSProperties;
  const edgePaths = useMemo(() => edges.map((edge) => (
    edgeGeometry(edge, stageSize, gridSize, iconSize, storyGap)
  )), [edges, stageSize, gridSize, iconSize, storyGap]);

  return (
    <main
      aria-label="Finger-skated Instagram stories"
      className={styles.screen}
      onPointerDown={(event) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        const point = { x: event.clientX, y: event.clientY };
        activePointers.current.set(event.pointerId, { ...point, history: [] });
        activateAlongSegment(event.pointerId, point, point);
      }}
      onPointerMove={movePointer}
      onPointerUp={(event) => releasePointer(event)}
      onPointerCancel={(event) => releasePointer(event, true)}
      onLostPointerCapture={(event) => activePointers.current.delete(event.pointerId)}
    >
      <section className={styles.gridStage}>
        {stageSize.width > 0 && stageSize.height > 0 ? (
          <svg aria-hidden="true" className={styles.influenceLayer} viewBox={`0 0 ${stageSize.width} ${stageSize.height}`}>
            <defs>
              {edgePaths.map((edge) => (
                <linearGradient gradientUnits="userSpaceOnUse" id={`temporal-${edge.id}`} key={edge.id} x1={edge.startX} x2={edge.endX} y1={edge.startY} y2={edge.endY}>
                  <stop offset="0%" stopColor={selectedRingPalette.edgeStart} stopOpacity="0.16" />
                  <stop offset="62%" stopColor={selectedRingPalette.edgeMiddle} stopOpacity="0.76" />
                  <stop offset="100%" stopColor={selectedRingPalette.edgeEnd} stopOpacity="1" />
                </linearGradient>
              ))}
            </defs>
            {edgePaths.map((edge) => (
              <path className={styles.influencePath} d={edge.path} key={edge.id} stroke={`url(#temporal-${edge.id})`} />
            ))}
          </svg>
        ) : null}
        <ul className={styles.storyGrid} ref={gridRef} style={gridStyle}>
          {system.nodes.map((story) => {
            const storyState = system.states[story.index];
            const isEmpty = storyState?.status === "empty";
            const isNew = storyState?.status === "new";
            const isViewing = storyState?.status === "viewing";
            const isLeaving = storyState?.status === "leaving";

            return (
              <li className={styles.gridItem} key={story.id}>
                <span className={`${styles.story} ${isEmpty ? styles.storyEmpty : isLeaving ? styles.storyLeaving : ""}`}>
                  <span className={`${styles.storyRing} ${isNew ? styles.storyRingNew : isViewing ? styles.storyRingViewing : styles.storyRingPlain}`} style={testSurface === "tech" ? { "--story-ring-gradient": techPaletteForIndex(story.index).gradient } as CSSProperties : undefined}>
                    <span
                      aria-hidden="true"
                      className={`${styles.logoSurface} ${isCharacterSurface(testSurface) || testSurface === "logo" || testSurface === "paris" || testSurface === "techMono" || testSurface === "tech" ? styles.centeredSurface : ""} ${testSurface === "face" ? styles.monochromeFace : ""}`}
                      style={getSurfaceStyle(testSurface, story.index, colourSeed)}
                    >
                      {testSurface === "logo" ? <GeneratedLogo index={story.index} /> : null}
                      {testSurface === "hieroglyph" ? <HieroglyphMark glyph={getCharacterGlyph(testSurface, story.index)} /> : null}
                      {testSurface === "numbers" ? <NumberMark glyph={getCharacterGlyph(testSurface, story.index)} /> : null}
                      {testSurface === "paris" ? <ParisLineMark line={parisLines[story.index % parisLines.length]!} /> : null}
                      {testSurface === "techMono" || testSurface === "tech" ? <TechMark term={techTerms[story.index % techTerms.length]!} /> : null}
                      {isCharacterSurface(testSurface) && testSurface !== "hieroglyph" && testSurface !== "numbers" ? <span className={`${styles.characterGlyph} ${testSurface === "hanja" ? styles.hanjaGlyph : ""}`}>{getCharacterGlyph(testSurface, story.index)}</span> : null}
                    </span>
                  </span>
                  {showLabels ? <span className={styles.storyLabel}>{story.handle}</span> : null}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

    </main>
  );
}
