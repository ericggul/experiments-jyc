import { structuralCategories, type Categorize } from "./category";
import { collectActiveInterface, type Atom } from "./collect";
import { forwardInput } from "./forward";
import { layoutBins } from "./layout";
import { easeOut, poseAlong, poseTransform, routeLayers, type Pose, type Route, type RouteShape } from "./pose";
import { pathTo, resolvePath, snapshotAtom } from "./snapshot";

export type DecompositionMode = "original" | "decomposition";
export type DecompositionOptions = {
  /** Elements never decomposed, such as the page's own controls. */
  exclude?: string;
  /** How atoms are sorted into categories. Structural by default. */
  categorize?: Categorize;
};
export type Decomposition = ReturnType<typeof createDecomposition>;

const HIDDEN = "data-decomposition-source";
const PIECE = "data-decomposition-piece";
const OVERLAY = "data-decomposition-overlay";
const SVG = "http://www.w3.org/2000/svg";
const DURATION = 760;
const EASING = "cubic-bezier(0.22, 0.8, 0.12, 1)";
const PADDING = 12;

type Piece = {
  id: string;
  atom: Atom;
  wrapper: HTMLDivElement;
  copy: HTMLElement | null;
  width: number;
  height: number;
  key: string;
  dirty: boolean;
  /** Where the atom sits in the live page, in stage coordinates; null when it has no box. */
  home: Pose | null;
  /** Where the atom sits in the decomposition. */
  place: Pose | null;
  /** How far along its route the piece is now: 0 home, 1 place. */
  t: number;
  tween: Tween | null;
  /** Re-layout glide when its poses change while the piece is at rest. */
  motion: Animation | null;
  fade: Animation | null;
};

type Tween = { from: number; to: number; start: number; delay: number; length: number };

/** How pieces reach their resting pose after a sync. */
type Motion = "enter" | "follow" | "none";

const rgbaOf = (color: string) => {
  const parts = color.match(/rgba?\(([^)]+)\)/)?.[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  if (!parts) return color === "transparent" ? [0, 0, 0, 0] : [255, 255, 255, 1];
  return [parts[0], parts[1], parts[2], parts.length > 3 ? parts[3] : 1];
};

const luminance = (color: string) => {
  const [r, g, b] = rgbaOf(color).map((channel, index) => {
    if (index > 2) return channel;
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};

const opaqueBackground = (from: Element | null) => {
  for (let element = from; element; element = element.parentElement) {
    const color = window.getComputedStyle(element).backgroundColor;
    if (rgbaOf(color)[3] >= 0.98) return color;
  }
  return "rgb(255, 255, 255)";
};

const hash = (text: string) => {
  let value = 5381;
  for (let index = 0; index < text.length; index++) value = (value * 33) ^ text.charCodeAt(index);
  return (value >>> 0).toString(36);
};

/** An icon is identified by its drawing, so every heart gathers with every heart. */
const shapeOf = (svg: Element) =>
  svg.getAttribute("data-icon") ??
  hash(Array.from(svg.querySelectorAll("*"), (part) => part.getAttribute("d") ?? part.getAttribute("points") ?? part.tagName).join("|"));

const settled = (animation: Animation | null) =>
  animation ? animation.finished.then(() => undefined, () => undefined) : Promise.resolve();

/**
 * Takes the interface in front apart into atoms (text runs, icons, images,
 * fields, and the fills and borders of boxes) and sorts the copies by
 * category. Every piece has two poses, its place in the live page and its
 * place in the decomposition, and rests at `progress` along the straight path
 * between them (0 original, 1 decomposed); the paths can be drawn. The page
 * stays live underneath: input on a copy is replayed on its source, and any
 * DOM change re-sorts the copies, so a newly opened screen or modal is
 * decomposed in turn. Works on any page.
 */
export function createDecomposition({ exclude: ownControls = "[data-decomposition-ui]", categorize = structuralCategories }: DecompositionOptions = {}) {
  const exclude = `[${OVERLAY}], ${ownControls}, script, style, noscript, template, nextjs-portal`;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const pieces = new Map<Node, Piece>();
  const byWrapper = new WeakMap<Element, Piece>();
  const observer = new MutationObserver(onMutations);
  let overlay: HTMLDivElement | null = null;
  let backdrop: HTMLDivElement | null = null;
  let stage: HTMLDivElement | null = null;
  let lines: SVGSVGElement | null = null;
  /** One dark and one light path per line thickness, created as thicknesses appear. */
  const routePaths = new Map<string, SVGPathElement>();
  let routeInk = "rgb(0, 0, 0)";
  let tweenFrame = 0;
  let idleWaiters: (() => void)[] = [];
  let detachInput: (() => void) | null = null;
  let layer: Element | null = null;
  let progress = 0;
  let linesVisible = false;
  let shape: RouteShape = "line";
  let layoutHeight = 0;
  let generation = 0;
  let nextId = 0;
  let syncTimer = 0;
  let applyFrame = 0;
  let watching = false;
  let prepared = false;

  const duration = () => (reducedMotion.matches ? 0 : DURATION);

  /**
   * Where an element is now, mid-flight included, so a reversal stays continuous.
   * Read for every piece before any write: interleaving reads with writes would
   * force one layout per piece.
   */
  function current(element: HTMLElement, property: "transform" | "opacity", previous: Animation | null) {
    return previous?.playState === "running" || !element.style.getPropertyValue(property)
      ? window.getComputedStyle(element).getPropertyValue(property)
      : element.style.getPropertyValue(property);
  }

  function play(element: HTMLElement, property: "transform" | "opacity", from: string, to: string, previous: Animation | null, delay = 0, length = duration()) {
    previous?.cancel();
    element.style.setProperty(property, to);
    if (!length || from === to) return null;
    return element.animate([{ [property]: from }, { [property]: to }], { duration: length, delay, easing: EASING, fill: "backwards" });
  }

  /** Every visible part of the page is an atom, so the page itself is hidden while its copies are shown. */
  function hidePage() {
    for (const child of Array.from(document.body.children)) {
      if (child !== overlay && !child.matches(exclude) && !child.hasAttribute(HIDDEN)) child.setAttribute(HIDDEN, "");
    }
  }

  function showPage() {
    for (const element of Array.from(document.querySelectorAll(`[${HIDDEN}]`))) element.removeAttribute(HIDDEN);
  }

  const pieceOf = (target: Element) => {
    const wrapper = target.closest(`[${PIECE}]`);
    return wrapper ? byWrapper.get(wrapper) : undefined;
  };
  /** The live element a point on a copy stands for. */
  const originalOf = (target: Element) => {
    const piece = pieceOf(target);
    if (!piece) return null;
    return piece.atom.kind !== "text" && piece.atom.kind !== "box" && piece.copy?.contains(target)
      ? resolvePath(piece.atom.anchor, pathTo(piece.copy, target))
      : piece.atom.anchor;
  };

  function ensureOverlay() {
    if (overlay && backdrop && stage) return { overlay, backdrop, stage };
    overlay = document.createElement("div");
    overlay.setAttribute(OVERLAY, "");
    overlay.className = "decomposition-overlay";
    backdrop = document.createElement("div");
    backdrop.className = "decomposition-backdrop";
    stage = document.createElement("div");
    stage.className = "decomposition-stage";
    lines = document.createElementNS(SVG, "svg");
    lines.setAttribute("class", "decomposition-lines");
    lines.setAttribute("aria-hidden", "true");
    overlay.append(backdrop, stage);
    stage.append(lines);
    detachInput = forwardInput(overlay, originalOf);
    document.body.append(overlay);
    return { overlay, backdrop, stage };
  }

  type Copy = { node: HTMLElement; width: number; height: number; tile: string };

  /** Reads only: the copy is built detached, so building many causes no layout. */
  function copyOf(atom: Atom, ground: string): Copy | null {
    const { node, width, height } = snapshotAtom(atom);
    if (!width || !height) return null;
    // Ink that would vanish on the backdrop keeps the colour it sat on (white text from a blue chip);
    // ink that sat on a photograph gets the opposite neutral.
    const ink = atom.kind === "text" || atom.anchor instanceof SVGSVGElement ? window.getComputedStyle(atom.anchor).color : null;
    let tile = "";
    if (ink && rgbaOf(ink)[3] > 0.2 && contrast(ink, ground) < 1.6) {
      const sat = opaqueBackground(atom.anchor);
      tile = contrast(ink, sat) >= 1.6 ? sat : luminance(ink) > 0.5 ? "rgb(23, 23, 23)" : "rgb(255, 255, 255)";
    }
    return { node, width, height, tile };
  }

  function mount(piece: Piece, copy: Copy) {
    piece.copy?.remove();
    piece.copy = copy.node;
    piece.width = copy.width;
    piece.height = copy.height;
    piece.wrapper.append(copy.node);
    piece.wrapper.style.width = `${copy.width}px`;
    piece.wrapper.style.height = `${copy.height}px`;
    piece.wrapper.style.backgroundColor = copy.tile;
  }

  function release(piece: Piece, opacity: string) {
    piece.motion?.cancel();
    piece.fade = play(piece.wrapper, "opacity", opacity, "0", piece.fade, 0, duration() * 0.3);
    void settled(piece.fade).then(() => {
      if (pieces.get(piece.atom.node) !== piece) piece.wrapper.remove();
    });
  }

  function sourceRect(atom: Atom) {
    if (!atom.node.isConnected) return null;
    if (atom.kind !== "text") return atom.anchor.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(atom.node);
    const rect = range.getBoundingClientRect();
    range.detach();
    return rect;
  }

  function keyOf(atom: Atom, anchorKeys: Map<Element, string>) {
    const key = anchorKeys.get(atom.anchor) ?? "";
    if (atom.kind === "text") return `${key}#text${atom.index}`;
    if (atom.kind === "box") return `${key}#box`;
    if (atom.anchor instanceof SVGSVGElement) return `svg#${shapeOf(atom.anchor)}`;
    return key;
  }

  const poseAt = (piece: Piece) =>
    piece.place ? poseAlong(piece.home ?? piece.place, piece.place, piece.width, piece.height, piece.t, shape) : null;

  function write(piece: Piece) {
    const pose = poseAt(piece);
    if (pose) piece.wrapper.style.transform = poseTransform(pose);
  }

  const routePath = (weight: number, part: "travelled" | "remaining") => {
    const key = `${weight}:${part}`;
    let path = routePaths.get(key);
    if (!path && lines) {
      path = document.createElementNS(SVG, "path");
      path.setAttribute("class", `decomposition-route-${part}`);
      path.setAttribute("stroke-width", String(weight));
      // Light parts first, so a dark part is never covered by another line's light part.
      if (part === "remaining") lines.prepend(path);
      else lines.append(path);
      routePaths.set(key, path);
    }
    return path;
  };

  /** Each piece's line from its original place to its sorted place, dark as far as it has moved. */
  function draw() {
    if (!lines) return;
    lines.style.display = linesVisible ? "" : "none";
    if (!linesVisible) return;
    const routes: Route[] = [];
    for (const piece of pieces.values()) {
      if (piece.home && piece.place) routes.push({ home: piece.home, place: piece.place, width: piece.width, height: piece.height, t: piece.t });
    }
    const layers = routeLayers(routes, shape);
    for (const path of routePaths.values()) path.setAttribute("d", "");
    for (const [weight, { travelled, remaining }] of layers) {
      for (const [part, data] of [["travelled", travelled], ["remaining", remaining]] as const) {
        const path = routePath(weight, part);
        path?.setAttribute("d", data);
        path?.setAttribute("stroke", routeInk);
      }
    }
  }

  /** Stage height covers the original places too while they can be seen. */
  function fit() {
    if (!stage) return;
    let bottom = layoutHeight;
    if (progress < 1 || linesVisible) {
      for (const piece of pieces.values()) {
        if (piece.home) bottom = Math.max(bottom, piece.home.y + piece.height * piece.home.scale);
      }
    }
    stage.style.height = `${bottom}px`;
  }

  /** One frame of every running tween; positions and drawn lines move together. */
  function tick(now: number) {
    tweenFrame = 0;
    let running = false;
    for (const piece of pieces.values()) {
      const tween = piece.tween;
      if (!tween) continue;
      const elapsed = tween.length ? Math.min(1, Math.max(0, (now - tween.start - tween.delay) / tween.length)) : 1;
      piece.t = tween.from + (tween.to - tween.from) * easeOut(elapsed);
      if (elapsed >= 1) piece.tween = null;
      else running = true;
      write(piece);
    }
    draw();
    if (running) {
      tweenFrame = window.requestAnimationFrame(tick);
    } else {
      const waiters = idleWaiters;
      idleWaiters = [];
      for (const resolve of waiters) resolve();
    }
  }

  /** Sends a piece along its route from where it is now to `to`. */
  function tweenTo(piece: Piece, to: number, delay: number) {
    piece.motion?.cancel();
    piece.motion = null;
    piece.tween = { from: piece.t, to, start: performance.now(), delay, length: duration() };
    if (!tweenFrame) tweenFrame = window.requestAnimationFrame(tick);
  }

  const idle = () => (tweenFrame ? new Promise<void>((resolve) => idleWaiters.push(resolve)) : Promise.resolve());

  function sync(motion: Motion = "follow") {
    if (!overlay || !backdrop || !stage || !lines) return;
    hidePage();

    // Read phase: no DOM writes until every measurement is taken.
    const found = collectActiveInterface(exclude, HIDDEN);
    const layerChanged = Boolean(layer && found.layer !== layer);
    layer = found.layer;
    const atoms = found.atoms;
    const anchorKeys = categorize(layer, Array.from(new Set(atoms.map((atom) => atom.anchor))));
    const ground = opaqueBackground(layer === document.body ? atoms.find((atom) => atom.kind === "box")?.anchor.parentElement ?? layer : layer);
    const frame = (layer === document.body ? document.querySelector("main") ?? layer : layer).getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    const top = stageRect.top + (layerChanged ? overlay.scrollTop : 0);
    const animated = motion !== "none";

    const present = new Set(atoms.map((atom) => atom.node));
    const leaving = Array.from(pieces.values())
      .filter((piece) => !present.has(piece.atom.node))
      .map((piece) => ({ piece, opacity: current(piece.wrapper, "opacity", piece.fade) }));

    type Entry = { atom: Atom; piece?: Piece; copy?: Copy | null; source: DOMRect | null; transform?: string; opacity?: string };
    const entries: Entry[] = atoms.map((atom) => {
      const piece = pieces.get(atom.node);
      const source = sourceRect(atom);
      if (!piece) return { atom, copy: copyOf(atom, ground), source };
      const refresh = piece.dirty && !piece.wrapper.contains(document.activeElement);
      return {
        atom, piece, source,
        copy: refresh ? copyOf(atom, ground) : undefined,
        transform: animated && !piece.tween ? current(piece.wrapper, "transform", piece.motion) : undefined,
        opacity: piece.wrapper.style.opacity === "0" ? current(piece.wrapper, "opacity", piece.fade) : undefined,
      };
    });

    // Write phase.
    if (layerChanged) overlay.scrollTop = 0;
    backdrop.style.backgroundColor = ground;
    // Explicit colours, never inherited: the line must read on any page and theme.
    const ink = luminance(ground) > 0.4 ? "rgb(0, 0, 0)" : "rgb(255, 255, 255)";
    routeInk = ink;
    for (const { piece, opacity } of leaving) {
      pieces.delete(piece.atom.node);
      release(piece, opacity);
    }

    const fragment = document.createDocumentFragment();
    const bins = new Map<string, Piece[]>();
    const created = new Set<Piece>();
    const entryOf = new Map<Piece, Entry>();
    for (const entry of entries) {
      let piece = entry.piece;
      if (!piece) {
        if (!entry.copy) continue;
        const wrapper = document.createElement("div");
        wrapper.setAttribute(PIECE, "");
        wrapper.className = "decomposition-piece";
        piece = {
          id: String(nextId++), atom: entry.atom, wrapper, copy: null, width: 0, height: 0,
          key: "", dirty: false, home: null, place: null, t: animated ? 0 : progress, tween: null, motion: null, fade: null,
        };
        mount(piece, entry.copy);
        byWrapper.set(wrapper, piece);
        pieces.set(entry.atom.node, piece);
        fragment.append(wrapper);
        created.add(piece);
      } else {
        piece.atom = entry.atom;
        if (entry.copy) mount(piece, entry.copy);
      }
      piece.dirty = false;
      piece.key = keyOf(entry.atom, anchorKeys);
      const { source } = entry;
      piece.home = source && source.width && source.height
        ? { x: source.left - stageRect.left, y: source.top - top, scale: source.width / piece.width }
        : null;
      entryOf.set(piece, entry);
      const bin = bins.get(piece.key);
      if (bin) bin.push(piece);
      else bins.set(piece.key, [piece]);
    }
    stage.append(fragment);

    let left = Math.max(0, frame.left);
    let width = Math.min(window.innerWidth, frame.right) - left;
    if (width < 200) {
      width = Math.min(window.innerWidth, 480);
      left = (window.innerWidth - width) / 2;
    }
    const layout = layoutBins(
      Array.from(bins, ([key, list]) => ({
        key,
        pieces: list.map(({ id, width, height, atom }) => ({ id, width, height, compact: atom.kind !== "text" })),
      })),
      { width: width - PADDING * 2 },
    );
    layoutHeight = layout.height;
    const offset = left + PADDING - stageRect.left;

    let binIndex = 0;
    for (const list of bins.values()) {
      list.forEach((piece, index) => {
        const place = layout.placements.get(piece.id);
        const entry = entryOf.get(piece);
        if (!place || !entry) return;
        piece.place = { x: offset + place.x, y: place.y, scale: place.scale };
        const isNew = created.has(piece);
        const delay = motion === "enter" || (isNew && animated) ? Math.min(binIndex * 12 + index * 18, 520) : 0;

        if (isNew) {
          if (!piece.home) {
            piece.wrapper.style.opacity = "0";
            piece.fade = play(piece.wrapper, "opacity", "0", "1", null, delay, animated ? duration() * 0.5 : 0);
          }
          write(piece);
          if (animated) tweenTo(piece, progress, delay);
          return;
        }
        if (entry.opacity !== undefined) piece.fade = play(piece.wrapper, "opacity", entry.opacity, "1", piece.fade, 0, animated ? duration() * 0.3 : 0);
        if (motion === "enter") {
          tweenTo(piece, progress, delay);
        } else if (motion === "none") {
          piece.tween = null;
          piece.t = progress;
          piece.motion?.cancel();
          write(piece);
        } else if (!piece.tween) {
          // Poses moved under a resting piece (a re-sort): glide to the new pose at the same t.
          const pose = poseAt(piece) as Pose;
          piece.motion = play(piece.wrapper, "transform", entry.transform ?? poseTransform(pose), poseTransform(pose), piece.motion);
        }
      });
      binIndex++;
    }
    fit();
    draw();
  }

  /** Holds every piece at the current progress, immediately (the slider). */
  function apply() {
    applyFrame = 0;
    for (const piece of pieces.values()) {
      piece.tween = null;
      piece.motion?.cancel();
      piece.motion = null;
      piece.t = progress;
      write(piece);
    }
    fit();
    draw();
  }

  function schedule() {
    if (syncTimer) return;
    syncTimer = window.setTimeout(() => {
      syncTimer = 0;
      window.requestAnimationFrame(() => {
        if (watching) sync();
      });
    }, 90);
  }

  function onMutations(records: MutationRecord[]) {
    const changed = new Set<Node>();
    for (const record of records) {
      const element = record.target instanceof Element ? record.target : record.target.parentElement;
      if (!element || overlay?.contains(element) || element.closest(ownControls)) continue;
      if (record.type === "attributes" && record.attributeName === HIDDEN) continue;
      changed.add(element);
    }
    if (!changed.size) return;
    for (const piece of pieces.values()) {
      if (changed.size > 40 || Array.from(changed).some((node) => node.contains(piece.atom.anchor))) piece.dirty = true;
    }
    schedule();
  }

  function onResize() {
    for (const piece of pieces.values()) piece.dirty = true;
    schedule();
  }

  function onLoad(event: Event) {
    if (!(event.target instanceof Element) || overlay?.contains(event.target)) return;
    for (const piece of pieces.values()) if (piece.atom.anchor === event.target) piece.dirty = true;
    schedule();
  }

  function watch() {
    if (watching) return;
    watching = true;
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
    window.addEventListener("resize", onResize);
    document.addEventListener("load", onLoad, true);
  }

  function unwatch() {
    watching = false;
    observer.disconnect();
    window.clearTimeout(syncTimer);
    syncTimer = 0;
    window.removeEventListener("resize", onResize);
    document.removeEventListener("load", onLoad, true);
  }

  async function prepare() {
    await document.fonts?.ready;
    const pending = Array.from(document.images).filter((image) => !image.complete && image.loading !== "lazy");
    await Promise.race([
      Promise.all(pending.map((image) => new Promise((resolve) => {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", resolve, { once: true });
      }))),
      new Promise((resolve) => window.setTimeout(resolve, 900)),
    ]);
    await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
  }

  /** Shows the copies (creating them on first use) and settles them at the current progress. */
  async function open(motion: Motion) {
    const run = ++generation;
    if (!prepared) {
      await prepare();
      prepared = true;
      if (run !== generation) return;
    }
    const surface = ensureOverlay();
    if (!pieces.size) surface.overlay.scrollTop = 0;
    surface.overlay.style.pointerEvents = "";
    watch();
    sync(motion);
  }

  /** Flies every piece home, then hands the live page back. */
  async function close() {
    const run = ++generation;
    progress = 0;
    unwatch();
    if (!overlay || !stage) return;
    overlay.style.pointerEvents = "none";
    if (overlay.contains(document.activeElement)) (document.activeElement as HTMLElement).blur();

    const stageRect = stage.getBoundingClientRect();
    const flights = Array.from(pieces.values(), (piece) => ({
      piece,
      rect: sourceRect(piece.atom),
      opacity: current(piece.wrapper, "opacity", piece.fade),
    }));
    const fades: Promise<void>[] = [];
    let index = 0;
    for (const { piece, rect, opacity } of flights) {
      if (rect && rect.width && rect.height) {
        piece.home = { x: rect.left - stageRect.left, y: rect.top - stageRect.top, scale: rect.width / (piece.width || rect.width) };
        tweenTo(piece, 0, Math.min(index++ * 2, 360));
      } else {
        piece.home = null;
        piece.fade = play(piece.wrapper, "opacity", opacity, "0", piece.fade, 0, duration() * 0.3);
        fades.push(settled(piece.fade));
      }
    }
    await Promise.all([...fades, idle()]);
    if (run === generation) teardown();
  }

  /** Copies sit exactly over their sources at this point, so swapping back is seamless. */
  function teardown() {
    window.cancelAnimationFrame(applyFrame);
    window.cancelAnimationFrame(tweenFrame);
    applyFrame = tweenFrame = 0;
    for (const resolve of idleWaiters) resolve();
    idleWaiters = [];
    detachInput?.();
    detachInput = null;
    showPage();
    pieces.clear();
    overlay?.remove();
    overlay = backdrop = stage = null;
    lines = null;
    routePaths.clear();
    layer = null;
  }

  return {
    /** Animates to the decomposition (progress 1) or back to the live page. */
    setMode(mode: DecompositionMode) {
      if (mode === "decomposition") {
        progress = 1;
        void open("enter");
      } else {
        void close();
      }
    },
    /** Holds every piece at `value` along its path, 0 original to 1 decomposed. */
    setProgress(value: number) {
      progress = Math.min(1, Math.max(0, value));
      if (!overlay || !watching) {
        void open("none");
        return;
      }
      if (!applyFrame) applyFrame = window.requestAnimationFrame(apply);
    },
    /** Draws each piece's path from its original place to its sorted place. */
    /** Moves every piece, and draws every route, along a straight segment or a cubic Bézier curve. */
    setShape(next: RouteShape) {
      shape = next;
      for (const piece of pieces.values()) if (!piece.tween) write(piece);
      draw();
    },
    setLines(visible: boolean) {
      linesVisible = visible;
      fit();
      draw();
    },
    destroy() {
      generation++;
      unwatch();
      teardown();
    },
  };
}
