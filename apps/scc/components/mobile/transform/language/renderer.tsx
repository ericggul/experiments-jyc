"use client";

import { useEffect, useRef } from "react";
import { languageIndex, languages } from "./languages";
import { normalize, type Lexicon } from "./lexicon";
import { buildTransitions, nextState } from "./markov";

export type Settings = { rate: number; coupling: number };

type Box = { left: number; top: number; right: number; bottom: number };
type Unit = { element: Element; state: number; next: number; pace: number; neighbours: Unit[]; center: { x: number; y: number } | null };
type Align = "left" | "center" | "right";
type Look = { font: string; size: number; color: string; align: Align; transform: string; spacing: string; opacity: number; shadow: { color: string; x: number; y: number; blur: number } | null };
/** Where one rendered line of the original sits: its box, anchor, baseline, real alignment and free width. */
type Line = Box & { x: number; baseline: number; align: Align; room: number; visible: boolean };
type Segment = {
  kind: "text" | "placeholder" | "select";
  host: HTMLElement;
  node: Text | null;
  unit: Unit;
  /** One string per language; for untranslatable text beside a translated one, the original repeated. */
  row: readonly string[];
  lines: Line[];
  clip: Box;
  look: Look | null;
  pieces: Map<number, string[]>;
  run: Run | null;
};
/** Pieces of one element sharing a line (`7` + ` classes`): laid out together with their original gaps. */
type Run = { members: Segment[]; gaps: number[]; box: Box; align: Align; room: number };

const interactive = "button, a, summary, label, select, input, textarea, [role='button'], [role='link'], [role='tab'], [role='checkbox']";
const block = "h1, h2, h3, h4, h5, h6, p, li, dt, dd, legend, th, td, figcaption, blockquote";
const skipped = "script, style, noscript, textarea, option, svg, canvas, [data-language-ui]";
const textFields = /^(text|search|email|tel|url|number|password|)$/;
const markText = "data-language-text";
const markField = "data-language-field";
const unmark = (host: Element) => { host.removeAttribute(markText); host.removeAttribute(markField); };
const transitions = buildTransitions(languages, 0.06);
const segmenter = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;

/** Split one translation across the rendered line boxes of a wrapped text node, by line width. */
function splitAcross(text: string, lines: Box[]) {
  if (lines.length < 2) return [text];
  const spaced = /\s/.test(text.trim());
  const tokens = spaced ? text.split(/(?<=\s)/) : segmenter ? Array.from(segmenter.segment(text), (part) => part.segment) : Array.from(text);
  const widths = lines.map((line) => line.right - line.left);
  const total = widths.reduce((sum, width) => sum + width, 0) || 1;
  const pieces: string[] = [];
  let cursor = 0;
  let consumed = 0;
  for (let index = 0; index < lines.length; index++) {
    consumed += widths[index] / total;
    const target = index === lines.length - 1 ? tokens.length : Math.round(tokens.length * consumed);
    pieces.push(tokens.slice(cursor, Math.max(cursor, target)).join("").trim());
    cursor = Math.max(cursor, target);
  }
  return pieces;
}

function parseShadow(value: string) {
  if (!value || value === "none") return null;
  const match = /^(rgba?\([^)]*\)|#[\da-f]+|[a-z]+)\s+(-?[\d.]+)px\s+(-?[\d.]+)px(?:\s+([\d.]+)px)?/i.exec(value);
  return match ? { color: match[1], x: Number(match[2]), y: Number(match[3]), blur: Number(match[4] || 0) } : null;
}

export default function LanguageRenderer({ lexicon, settings }: { lexicon: Lexicon; settings: Settings }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const settingsRef = useRef(settings);

  useEffect(() => { settingsRef.current = settings; }, [settings]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const units = new Map<Element, Unit>();
    let segments: Segment[] = [];
    let marked = new Set<HTMLElement>();
    let structureDirty = true;
    let layoutDirty = true;
    let paintDirty = true;
    let lastStructure = -Infinity;
    let frame = 0;
    const widths = new Map<string, number>();

    // The canvas lives in the top layer so modal dialogs of the clones can sit beneath it;
    // re-entering the top layer after a dialog opens keeps it above that dialog.
    const promote = () => {
      try {
        if (canvas.matches(":popover-open")) canvas.hidePopover();
        canvas.showPopover();
      } catch {
        // Popover API unavailable: the canvas stays a fixed layer below modal dialogs.
      }
    };

    const unitFor = (host: Element, source: string) => {
      const element = host.closest(interactive) ?? host.closest(block) ?? host;
      let unit = units.get(element);
      if (!unit) {
        unit = {
          element,
          state: languageIndex.get(/[가-힣]/.test(source) ? "ko" : "en") ?? 0,
          next: performance.now() + Math.random() * 400,
          pace: 0.55 + Math.random() * 0.9,
          neighbours: [],
          center: null,
        };
        units.set(element, unit);
      }
      return unit;
    };

    const segment = (kind: Segment["kind"], host: HTMLElement, node: Text | null, source: string, row: readonly string[]): Segment => ({
      kind, host, node, row, unit: unitFor(host, source), lines: [], clip: { left: 0, top: 0, right: 0, bottom: 0 }, look: null, pieces: new Map(), run: null,
    });

    const build = () => {
      const next: Segment[] = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      const translated = new Set<HTMLElement>();
      const rest: Text[] = [];
      while ((node = walker.nextNode())) {
        const host = node.parentElement;
        const text = node.nodeValue ?? "";
        if (!host || !text.trim() || host.closest(skipped)) continue;
        const row = lexicon.resolve(text);
        if (row) {
          next.push(segment("text", host, node as Text, text, row));
          translated.add(host);
        } else {
          rest.push(node as Text);
        }
      }
      // Hiding a host hides all of its own text nodes, so numbers and other unknown
      // text beside a translated label are redrawn unchanged in their own place.
      for (const text of rest) {
        const host = text.parentElement!;
        if (translated.has(host)) next.push(segment("text", host, text, text.nodeValue ?? "", languages.map(() => normalize(text.nodeValue ?? ""))));
      }
      for (const field of document.body.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input[placeholder], select")) {
        if (field.closest("[data-language-ui]")) continue;
        if (field instanceof HTMLInputElement) {
          if (!textFields.test(field.getAttribute("type") ?? "")) continue;
          const row = lexicon.resolve(field.placeholder);
          if (row) next.push(segment("placeholder", field, null, field.placeholder, row));
        } else {
          const text = field.selectedOptions[0]?.textContent ?? "";
          const row = lexicon.resolve(text);
          if (row) next.push(segment("select", field, null, text, row));
        }
      }
      for (const [element] of units) if (!element.isConnected) units.delete(element);
      segments = next;
      structureDirty = false;
      layoutDirty = true;
    };

    const layout = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const viewport: Box = { left: 0, top: 0, right: width, bottom: height };
      const clips = new Map<Element, Box>();
      const looks = new Map<HTMLElement, Look>();
      const opacities = new Map<Element, number>();
      const clipFor = (element: Element): Box => {
        const cached = clips.get(element);
        if (cached) return cached;
        const parent = element.parentElement;
        if (!parent) return viewport;
        const outer = clipFor(parent);
        const style = window.getComputedStyle(parent);
        const clipsX = /^(auto|scroll|hidden|clip)$/.test(style.overflowX);
        const clipsY = /^(auto|scroll|hidden|clip)$/.test(style.overflowY);
        let clip = outer;
        if (clipsX || clipsY) {
          const box = parent.getBoundingClientRect();
          clip = {
            left: clipsX ? Math.max(outer.left, box.left) : outer.left,
            top: clipsY ? Math.max(outer.top, box.top) : outer.top,
            right: clipsX ? Math.min(outer.right, box.right) : outer.right,
            bottom: clipsY ? Math.min(outer.bottom, box.bottom) : outer.bottom,
          };
        }
        clips.set(element, clip);
        return clip;
      };
      const opacityFor = (element: Element | null): number => {
        if (!element) return 1;
        const cached = opacities.get(element);
        if (cached !== undefined) return cached;
        const value = Number(window.getComputedStyle(element).opacity) * opacityFor(element.parentElement);
        opacities.set(element, value);
        return value;
      };
      const lookFor = (host: HTMLElement, kind: Segment["kind"]): Look | null => {
        const cached = looks.get(host);
        if (cached) return cached;
        const style = window.getComputedStyle(host);
        if (style.visibility === "hidden" || style.display === "none") return null;
        const placeholder = kind === "placeholder" ? window.getComputedStyle(host, "::placeholder").color : "";
        const align = style.textAlign === "center" ? "center" : /right|end/.test(style.textAlign) ? "right" : "left";
        const look: Look = {
          font: `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`,
          size: parseFloat(style.fontSize) || 14,
          color: placeholder && placeholder !== style.color ? placeholder : kind === "placeholder" ? "rgba(117,117,117,0.9)" : style.color,
          align,
          transform: style.textTransform,
          spacing: style.letterSpacing === "normal" ? "0px" : style.letterSpacing,
          opacity: opacityFor(host),
          shadow: parseShadow(style.textShadow),
        };
        looks.set(host, look);
        return look;
      };
      const contentBox = (element: Element): Box => {
        const box = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return {
          left: box.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft),
          right: box.right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight),
          top: box.top + parseFloat(style.borderTopWidth) + parseFloat(style.paddingTop),
          bottom: box.bottom - parseFloat(style.borderBottomWidth) - parseFloat(style.paddingBottom),
        };
      };
      const range = document.createRange();
      // Everything already drawn inside a unit (icons, images, fields, other text) bounds
      // how far a longer translation may extend; it never paints over them.
      const obstacles = new Map<Element, { box: Box; node: Node | null }[]>();
      const obstaclesFor = (unit: Element) => {
        let found = obstacles.get(unit);
        if (found) return found;
        found = [];
        for (const element of unit.querySelectorAll("svg, img, video, canvas, input, select, textarea, button, [role='button']")) {
          if (element === unit || element.parentElement?.closest("svg")) continue;
          const { left, top, right, bottom, width, height } = element.getBoundingClientRect();
          if (width && height) found.push({ box: { left, top, right, bottom }, node: element });
        }
        const walker = document.createTreeWalker(unit, NodeFilter.SHOW_TEXT);
        let text: Node | null;
        while ((text = walker.nextNode())) {
          if (!text.nodeValue?.trim()) continue;
          range.selectNodeContents(text);
          for (const { left, top, right, bottom, width } of range.getClientRects()) if (width > 0.5) found.push({ box: { left, top, right, bottom }, node: text });
        }
        obstacles.set(unit, found);
        return found;
      };
      const metrics = new Map<string, { ascent: number; descent: number }>();
      const metricsFor = (font: string) => {
        let value = metrics.get(font);
        if (!value) {
          context.font = font;
          const sample = context.measureText("Hg");
          const ascent = sample.fontBoundingBoxAscent || sample.actualBoundingBoxAscent;
          const descent = sample.fontBoundingBoxDescent || sample.actualBoundingBoxDescent;
          value = { ascent, descent };
          metrics.set(font, value);
        }
        return value;
      };
      const paddingBox = (element: Element): Box => {
        const box = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return {
          left: box.left + parseFloat(style.borderLeftWidth),
          right: box.right - parseFloat(style.borderRightWidth),
          top: box.top + parseFloat(style.borderTopWidth),
          bottom: box.bottom - parseFloat(style.borderBottomWidth),
        };
      };
      const isInline = (element: Element) => /^(inline|contents)$/.test(window.getComputedStyle(element).display);
      /**
       * Alignment of a line as the clone lays it out: CSS text-align of its formatting
       * context when explicit; otherwise where the line sits inside that box, climbing out
       * of shrink-wrapped wrappers (a nav label span inside its centred button, a count
       * pushed to the right of its row).
       */
      const alignFor = (item: Segment, box: Box, look: Look, wrapped: boolean): Align => {
        let element: Element | null = item.host;
        while (element && element !== document.body && isInline(element)) element = element.parentElement;
        if (!element) return look.align;
        const css = window.getComputedStyle(element).textAlign;
        if (css === "center") return "center";
        if (/right|end/.test(css)) return "right";
        if (wrapped) return "left";
        let inner: Box = { ...box };
        for (const other of obstaclesFor(element)) {
          const overlap = Math.min(other.box.bottom, box.bottom) - Math.max(other.box.top, box.top);
          if (overlap < (box.bottom - box.top) * 0.4) continue;
          inner = { left: Math.min(inner.left, other.box.left), right: Math.max(inner.right, other.box.right), top: inner.top, bottom: inner.bottom };
        }
        for (let depth = 0; depth < 6 && element && element !== document.body; depth++) {
          const container = paddingBox(element);
          const left = inner.left - container.left;
          const right = container.right - inner.right;
          if (left > 1.5 || right > 1.5) return Math.abs(left - right) <= 2 ? "center" : left < right ? "left" : "right";
          inner = element.getBoundingClientRect();
          do element = element.parentElement; while (element && window.getComputedStyle(element).display === "contents");
          if (!element) break;
          const parent = paddingBox(element);
          const left2 = inner.left - parent.left;
          const right2 = parent.right - inner.right;
          if (left2 > 1.5 || right2 > 1.5) return Math.abs(left2 - right2) <= 2 ? "center" : left2 < right2 ? "left" : "right";
          inner = parent;
        }
        return look.align;
      };
      /**
       * The layout box a line belongs to: its formatting block's content box, or, while that
       * block is shrink-wrapped to its text and centred in its parent, that parent's box inside
       * the same unit (a nav label inside its button). A translation never leaves the cell
       * the clone gave it.
       */
      const cellFor = (item: Segment, box: Box): Box => {
        let start: Element | null = item.host;
        while (start && start !== item.unit.element && isInline(start)) start = start.parentElement;
        if (!start) return box;
        let element: Element = start;
        let cell = contentBox(element);
        while (element !== item.unit.element && Math.abs(cell.left - box.left) <= 1.5 && Math.abs(cell.right - box.right) <= 1.5) {
          let parent: Element | null = element.parentElement;
          while (parent && parent !== item.unit.element && window.getComputedStyle(parent).display === "contents") parent = parent.parentElement;
          if (!parent || !item.unit.element.contains(parent)) break;
          // Only a centred wrapper (a label under its icon) may use its parent's width;
          // a block pinned to one side keeps the original text extent.
          const outer = contentBox(parent);
          if (Math.abs((cell.left - outer.left) - (outer.right - cell.right)) > 2) break;
          element = parent;
          cell = outer;
        }
        return cell;
      };
      /**
       * Free horizontal space around a box inside its unit (up to the nearest icon, field or
       * other text on the same row) and its alignment. Text that touches a neighbour it does
       * not own (`30` + ` credits`) stays attached to that neighbour.
       */
      const fit = (item: Segment, box: Box, look: Look, wrapped: boolean, own: Set<Node | null>) => {
        const container = cellFor(item, box);
        let leftLimit = Math.max(container.left, item.clip.left);
        let rightLimit = Math.min(container.right, item.clip.right);
        let touchesLeft = false;
        let touchesRight = false;
        const height = box.bottom - box.top;
        for (const other of obstaclesFor(item.unit.element)) {
          if (own.has(other.node)) continue;
          const overlap = Math.min(other.box.bottom, box.bottom) - Math.max(other.box.top, box.top);
          if (overlap < Math.min(height, other.box.bottom - other.box.top) * 0.4) continue;
          // A neighbour keeps at least half an em of space from the translation.
          if (other.box.right <= box.left + 1) {
            leftLimit = Math.max(leftLimit, other.box.right + look.size * 0.5);
            if (box.left - other.box.right < look.size * 0.6) touchesLeft = true;
          } else if (other.box.left >= box.right - 1) {
            rightLimit = Math.min(rightLimit, other.box.left - look.size * 0.5);
            if (other.box.left - box.right < look.size * 0.6) touchesRight = true;
          }
        }
        // The gap to an attached neighbour is part of the layout: never grow into it.
        if (touchesLeft) leftLimit = box.left;
        if (touchesRight) rightLimit = box.right;
        leftLimit = Math.min(leftLimit, box.left);
        rightLimit = Math.max(rightLimit, box.right);
        const align: Align = touchesLeft ? "left" : touchesRight ? "right" : alignFor(item, box, look, wrapped);
        return { leftLimit, rightLimit, align };
      };
      const place = (item: Segment, box: Box, look: Look, fixed: boolean, wrapped: boolean): Line => {
        const { ascent, descent } = metricsFor(look.font);
        const height = box.bottom - box.top;
        // A text range's box is the font's content area, so its top plus ascent is the baseline.
        const baseline = !fixed && Math.abs(height - ascent - descent) <= 1.5 ? box.top + ascent : box.top + (height - ascent - descent) / 2 + ascent;
        if (fixed) {
          const x = look.align === "left" ? box.left : look.align === "right" ? box.right : (box.left + box.right) / 2;
              // A select's arrow sits beside its text: leave it about 1.6em.
          context.font = look.font;
          const original = context.measureText(normalize(item.host instanceof HTMLSelectElement ? item.host.selectedOptions[0]?.textContent ?? "" : "")).width;
          const room = item.kind === "select" ? Math.min(box.right - box.left, Math.max(original, box.right - box.left - look.size * 1.6)) : box.right - box.left;
          return { ...box, x, baseline, align: look.align, room, visible: false };
        }
        const { leftLimit, rightLimit, align } = fit(item, box, look, wrapped, new Set([item.node, item.host]));
        const center = (box.left + box.right) / 2;
        const room = align === "left" ? rightLimit - box.left : align === "right" ? box.right - leftLimit : 2 * Math.min(center - leftLimit, rightLimit - center);
        const x = align === "left" ? box.left : align === "right" ? box.right : center;
        return { ...box, x, baseline, align, room: Math.max(room, box.right - box.left), visible: false };
      };

      const hostState = new Map<HTMLElement, { inView: number; shown: number }>();
      for (const item of segments) {
        const look = item.look = lookFor(item.host, item.kind);
        item.clip = clipFor(item.host);
        let boxes: Box[] = [];
        if (item.kind === "text" && item.node) {
          if (item.node.isConnected) {
            // Measure the glyphs only: surrounding spaces stay where the clone rendered them.
            const value = item.node.nodeValue ?? "";
            const first = value.search(/\S/);
            const last = value.length - value.split("").reverse().join("").search(/\S/);
            range.setStart(item.node, Math.max(0, first));
            range.setEnd(item.node, Math.max(first + 1, last));
            boxes = Array.from(range.getClientRects()).filter((line) => line.width > 0.5 && line.height > 0.5)
              .map(({ left, top, right, bottom }) => ({ left, top, right, bottom }));
          }
        } else if (item.host.isConnected && !(item.kind === "placeholder" && (item.host as HTMLInputElement).value)) {
          boxes = [contentBox(item.host)];
        }
        const changed = boxes.length !== item.lines.length || boxes.some((box, index) => Math.abs((box.right - box.left) - (item.lines[index].right - item.lines[index].left)) > 0.5);
        if (changed) item.pieces.clear();
        item.lines = look ? boxes.map((box) => place(item, box, look, item.kind !== "text", boxes.length > 1)) : [];
        const unitBox = item.unit.element.getBoundingClientRect();
        item.unit.center = unitBox.width || unitBox.height ? { x: (unitBox.left + unitBox.right) / 2, y: (unitBox.top + unitBox.bottom) / 2 } : null;

        const state = hostState.get(item.host) ?? { inView: 0, shown: 0 };
        for (const line of item.lines) {
          if (line.right <= item.clip.left || line.left >= item.clip.right || line.bottom <= item.clip.top || line.top >= item.clip.bottom) continue;
          state.inView++;
          const x = (Math.max(line.left, item.clip.left) + Math.min(line.right, item.clip.right)) / 2;
          const y = (Math.max(line.top, item.clip.top) + Math.min(line.bottom, item.clip.bottom)) / 2;
          const hit = document.elementFromPoint(x, y);
          line.visible = !!hit && (hit === item.host || item.host.contains(hit) || hit.contains(item.host));
          if (line.visible) state.shown++;
        }
        hostState.set(item.host, state);
      }
      range.detach();

      const byHost = new Map<HTMLElement, Segment[]>();
      for (const item of segments) {
        item.run = null;
        if (item.kind === "text" && item.lines.length === 1 && item.look) byHost.set(item.host, [...(byHost.get(item.host) ?? []), item]);
      }
      for (const members of byHost.values()) {
        while (members.length > 1) {
          const first = members.shift()!;
          const line = first.lines[0];
          const row = [first, ...members.filter((other) => {
            const box = other.lines[0];
            return Math.min(box.bottom, line.bottom) - Math.max(box.top, line.top) > (line.bottom - line.top) * 0.5;
          })];
          for (const member of row.slice(1)) members.splice(members.indexOf(member), 1);
          if (row.length < 2) continue;
          row.sort((a, b) => a.lines[0].left - b.lines[0].left);
          const box: Box = {
            left: Math.min(...row.map((member) => member.lines[0].left)),
            right: Math.max(...row.map((member) => member.lines[0].right)),
            top: Math.min(...row.map((member) => member.lines[0].top)),
            bottom: Math.max(...row.map((member) => member.lines[0].bottom)),
          };
          const own = new Set<Node | null>([first.host, ...row.map((member) => member.node)]);
          const { leftLimit, rightLimit, align } = fit(first, box, first.look!, false, own);
          const center = (box.left + box.right) / 2;
          const room = align === "left" ? rightLimit - box.left : align === "right" ? box.right - leftLimit : 2 * Math.min(center - leftLimit, rightLimit - center);
          const run: Run = { members: row, gaps: row.slice(1).map((member, index) => member.lines[0].left - row[index].lines[0].right), box, align, room: Math.max(room, box.right - box.left) };
          for (const member of row) member.run = run;
        }
      }

      // Hide an original only while its replacement is drawn; an element fully covered
      // (by a modal backdrop, a sticky bar, the control) keeps its own text.
      const nextMarked = new Set<HTMLElement>();
      for (const [host, state] of hostState) if (!(state.inView > 0 && state.shown === 0)) nextMarked.add(host);
      for (const host of marked) if (!nextMarked.has(host)) unmark(host);
      for (const host of nextMarked) if (!marked.has(host)) host.setAttribute(host instanceof HTMLInputElement ? markField : markText, "");
      marked = nextMarked;
      for (const item of segments) if (!marked.has(item.host)) for (const line of item.lines) line.visible = false;

      const placed = [...new Set(segments.map((item) => item.unit))].filter((unit) => unit.center);
      for (const unit of placed) {
        unit.neighbours = placed
          .filter((other) => other !== unit)
          .map((other) => ({ other, distance: Math.hypot(other.center!.x - unit.center!.x, other.center!.y - unit.center!.y) }))
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 4)
          .map(({ other }) => other);
      }
      layoutDirty = false;
      paintDirty = true;
    };

    const measure = (text: string) => {
      const key = `${context.font}|${context.letterSpacing}|${text}`;
      let width = widths.get(key);
      if (width === undefined) {
        width = context.measureText(text).width;
        if (widths.size > 6000) widths.clear();
        widths.set(key, width);
      }
      return width;
    };

    const paint = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = window.innerWidth;
      const height = window.innerHeight;
      if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      context.textBaseline = "alphabetic";

      const piecesFor = (item: Segment, look: Look, state: number) => {
        let pieces = item.pieces.get(state);
        if (!pieces) {
          const code = languages[state].code;
          let text = item.row[state].trim();
          if (look.transform === "uppercase") text = text.toLocaleUpperCase(code);
          else if (look.transform === "lowercase") text = text.toLocaleLowerCase(code);
          pieces = splitAcross(text, item.lines);
          item.pieces.set(state, pieces);
        }
        return pieces;
      };

      for (const item of segments) {
        const look = item.look;
        if (!look || !item.lines.some((line) => line.visible)) continue;
        if (item.run && item.run.members[0] !== item) continue;
        const state = item.unit.state;
        const language = languages[state];
        const pieces = piecesFor(item, look, state);
        context.font = look.font;
        if ("letterSpacing" in context) context.letterSpacing = look.spacing;
        context.direction = language.rtl ? "rtl" : "ltr";
        context.fillStyle = look.color;
        context.globalAlpha = look.opacity;
        if (look.shadow) {
          context.shadowColor = look.shadow.color;
          context.shadowOffsetX = look.shadow.x;
          context.shadowOffsetY = look.shadow.y;
          context.shadowBlur = look.shadow.blur;
        } else {
          context.shadowColor = "transparent";
        }
        if (item.run) {
          // Re-set the whole run: each piece at its own baseline, original gaps kept.
          const run = item.run;
          const texts = run.members.map((member) => piecesFor(member, member.look!, state)[0] ?? "");
          const widths = texts.map((text) => (text ? measure(text) : 0));
          const total = widths.reduce((sum, width) => sum + width, 0) + run.gaps.reduce((sum, gap) => sum + Math.max(0, gap), 0);
          const scale = total > run.room ? run.room / total : 1;
          const span = total * scale;
          let cursor = run.align === "left" ? run.box.left : run.align === "right" ? run.box.right - span : (run.box.left + run.box.right) / 2 - span / 2;
          context.save();
          context.beginPath();
          context.rect(item.clip.left, item.clip.top, item.clip.right - item.clip.left, item.clip.bottom - item.clip.top);
          context.clip();
          context.textAlign = "left";
          run.members.forEach((member, index) => {
            if (texts[index] && member.lines[0].visible) {
              context.save();
              context.translate(cursor, member.lines[0].baseline);
              context.scale(scale, 1);
              context.fillText(texts[index], 0, 0);
              context.restore();
            }
            cursor += (widths[index] + Math.max(0, run.gaps[index] ?? 0)) * scale;
          });
          context.restore();
          continue;
        }
        item.lines.forEach((line, index) => {
          const text = pieces[index];
          if (!line.visible || !text) return;
          const measured = measure(text);
          // Same size and baseline as the original; a longer translation is only condensed.
          const scale = measured > line.room ? line.room / measured : 1;
          context.save();
          context.beginPath();
          context.rect(item.clip.left, item.clip.top, item.clip.right - item.clip.left, item.clip.bottom - item.clip.top);
          context.clip();
          context.translate(line.x, line.baseline);
          context.scale(scale, 1);
          context.textAlign = line.align;
          context.fillText(text, 0, 0);
          context.restore();
        });
      }
      context.globalAlpha = 1;
      paintDirty = false;
    };

    const tick = (now: number) => {
      frame = window.requestAnimationFrame(tick);
      if (structureDirty && now - lastStructure > 140) {
        lastStructure = now;
        build();
      }
      if (layoutDirty) layout();
      const { rate, coupling } = settingsRef.current;
      const count = languages.length;
      for (const unit of units.values()) {
        if (now < unit.next) continue;
        const neighbours = unit.neighbours.map((other) => other.state);
        const state = nextState(transitions, count, unit.state, neighbours, coupling, Math.random());
        if (state !== unit.state) {
          unit.state = state;
          paintDirty = true;
        }
        // Exponential holding time: each unit keeps its own clock.
        unit.next = now + Math.max(14, (-Math.log(1 - Math.random()) * 1000) / (rate * unit.pace));
      }
      if (paintDirty) paint();
    };

    const onLayout = () => { layoutDirty = true; };
    const observer = new MutationObserver((records) => {
      let relevant = false;
      for (const record of records) {
        if (record.target === canvas || (record.type === "attributes" && record.attributeName?.startsWith("data-language"))) continue;
        if (record.target instanceof Element && record.target.closest("[data-language-ui]")) continue;
        relevant = true;
        if (record.type === "attributes" && record.attributeName === "open" && record.target instanceof HTMLDialogElement) promote();
      }
      if (relevant) {
        structureDirty = true;
        layoutDirty = true;
      }
    });

    promote();
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true });
    window.addEventListener("scroll", onLayout, true);
    window.addEventListener("resize", onLayout);
    window.addEventListener("input", onLayout, true);
    window.addEventListener("change", onLayout, true);
    window.addEventListener("load", onLayout);
    frame = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", onLayout, true);
      window.removeEventListener("resize", onLayout);
      window.removeEventListener("input", onLayout, true);
      window.removeEventListener("change", onLayout, true);
      window.removeEventListener("load", onLayout);
      for (const host of marked) unmark(host);
      try { canvas.hidePopover(); } catch { /* not shown */ }
    };
  }, [lexicon]);

  return <canvas ref={canvasRef} popover="manual" className="language-canvas" aria-hidden="true" />;
}
