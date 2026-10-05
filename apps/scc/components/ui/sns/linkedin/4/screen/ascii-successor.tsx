"use client";

import { type CSSProperties, type ReactNode, useLayoutEffect, useRef } from "react";

const firstPrintableAscii = 0x20;
const lastPrintableAscii = 0x7e;
const firstHangulSyllable = 0xac00;
const lastHangulSyllable = 0xd7a3;
const hangulSyllableCount = lastHangulSyllable - firstHangulSyllable + 1;
const egyptianGlyphs = Array.from("𓀀𓀁𓀂𓀃𓀄𓀅𓀆𓀇𓀈𓀉𓀊𓀋𓀌𓀍𓀎𓀏𓀐𓀑𓀒𓀓𓀔𓀕𓀖𓀗𓀘𓀙𓀚𓀛𓀜𓀝𓀞𓀟");
const romanNumeralParts: ReadonlyArray<readonly [number, string]> = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
const userFacingAttributes = ["alt", "aria-label", "placeholder", "title"] as const;
const typographySelector = "a, article, aside, b, button, div, em, footer, h1, h2, h3, h4, header, input, label, legend, li, main, nav, output, p, section, small, span, strong, textarea, time";
const typefaceFamilies = {
  roman: "Georgia, 'Nimbus Roman No9 L', serif",
  times: "'Times New Roman', Times, serif",
} as const;
type Typeface = "system" | keyof typeof typefaceFamilies;

type TypographyStyle = {
  fontSize: number;
  inlineFontFamily: string;
  inlineFontSize: string;
  inlineLineHeight: string;
  lineHeight: string;
};

function wrap(value: number, size: number) {
  return ((value % size) + size) % size;
}

function toRomanNumeral(value: number) {
  if (value === 0) return "N";
  if (!Number.isSafeInteger(value) || value < 0 || value > 3999) return null;

  let remaining = value;
  let numeral = "";
  romanNumeralParts.forEach(([amount, glyph]) => {
    while (remaining >= amount) {
      numeral += glyph;
      remaining -= amount;
    }
  });
  return numeral;
}

function splitRomanNumeralSegments(value: string) {
  const segments: Array<{ preserve: boolean; value: string }> = [];
  let endOfPrevious = 0;
  const digits = /\d+(?:,\d+)*/g;

  for (const match of value.matchAll(digits)) {
    const index = match.index ?? 0;
    if (index > endOfPrevious) segments.push({ preserve: false, value: value.slice(endOfPrevious, index) });
    const numeral = toRomanNumeral(Number(match[0].replaceAll(",", "")));
    segments.push({ preserve: numeral !== null, value: numeral ?? match[0] });
    endOfPrevious = index + match[0].length;
  }
  if (endOfPrevious < value.length) segments.push({ preserve: false, value: value.slice(endOfPrevious) });
  return segments.length ? segments : [{ preserve: false, value }];
}

/**
 * Advances printable ASCII by its literal code point and shifts complete Hangul
 * syllables inside U+AC00–U+D7A3, preserving valid Korean syllables at every value.
 */
export function shiftCharacters(value: string, amount: number, useEgyptianGlyphs = false, useRomanNumerals = false) {
  const segments = useRomanNumerals ? splitRomanNumeralSegments(value) : [{ preserve: false, value }];
  return segments.map(({ preserve, value: segment }) => Array.from(segment, (character) => {
    if (useEgyptianGlyphs && /\s/u.test(character)) return character;
    if (preserve && !useEgyptianGlyphs) return character;
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) return character;
    let shifted = character;
    if (codePoint >= firstPrintableAscii && codePoint <= lastPrintableAscii) {
      shifted = String.fromCodePoint(codePoint + amount);
    } else if (codePoint >= firstHangulSyllable && codePoint <= lastHangulSyllable) {
      shifted = String.fromCodePoint(
        firstHangulSyllable + wrap(codePoint - firstHangulSyllable + amount, hangulSyllableCount),
      );
    }
    if (!useEgyptianGlyphs) return shifted;
    return egyptianGlyphs[(shifted.codePointAt(0) ?? 0) % egyptianGlyphs.length] ?? shifted;
  }).join("")).join("");
}

function isExcluded(node: Node) {
  return node.parentElement?.closest("script, style, textarea, option, [data-transform-exempt]") !== null;
}

export function AsciiSuccessor({
  characterShift,
  className,
  children,
  fontScale,
  hueShift,
  typeface,
  useEgyptianGlyphs,
  useRomanNumerals,
}: {
  characterShift: number;
  className: string;
  children: ReactNode;
  fontScale: number;
  hueShift: number;
  typeface: Typeface;
  useEgyptianGlyphs: boolean;
  useRomanNumerals: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const textSources = useRef(new WeakMap<Text, string>());
  const attributeSources = useRef(new WeakMap<Element, Map<string, string>>());
  const typographyStyles = useRef(new WeakMap<HTMLElement, TypographyStyle>());
  const appliedShift = useRef({ characterShift, useEgyptianGlyphs, useRomanNumerals });
  const style = { "--ascii-image-hue": `${hueShift}deg` } as CSSProperties;

  useLayoutEffect(() => {
    const previousShift = appliedShift.current;
    appliedShift.current = { characterShift, useEgyptianGlyphs, useRomanNumerals };

    const sourceFor = (current: string, original: string | undefined) => {
      if (original !== undefined && current === shiftCharacters(original, previousShift.characterShift, previousShift.useEgyptianGlyphs, previousShift.useRomanNumerals)) return original;
      return current;
    };

    const shiftText = (text: Text) => {
      if (isExcluded(text)) return;

      const current = text.nodeValue ?? "";
      const source = sourceFor(current, textSources.current.get(text));
      textSources.current.set(text, source);
      const shifted = shiftCharacters(source, characterShift, useEgyptianGlyphs, useRomanNumerals);
      if (shifted !== current) text.nodeValue = shifted;
    };

    const shiftAttribute = (element: Element, attribute: (typeof userFacingAttributes)[number]) => {
      const current = element.getAttribute(attribute);
      if (current === null) return;

      const sources = attributeSources.current.get(element) ?? new Map<string, string>();
      const source = sourceFor(current, sources.get(attribute));
      sources.set(attribute, source);
      attributeSources.current.set(element, sources);
      const shifted = shiftCharacters(source, characterShift, useEgyptianGlyphs, useRomanNumerals);
      if (shifted !== current) element.setAttribute(attribute, shifted);
    };

    const processSubtree = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) shiftText(node as Text);
      if (node.nodeType === Node.ELEMENT_NODE) {
        userFacingAttributes.forEach((attribute) => shiftAttribute(node as Element, attribute));
      }

      const walker = document.createTreeWalker(
        node,
        NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
      );
      while (walker.nextNode()) {
        if (walker.currentNode.nodeType === Node.TEXT_NODE) shiftText(walker.currentNode as Text);
        else userFacingAttributes.forEach((attribute) => shiftAttribute(walker.currentNode as Element, attribute));
      }
    };

    const root = rootRef.current;
    if (!root) return;
    processSubtree(root);

    const observer = new MutationObserver((records) => {
      records.forEach((record) => {
        if (record.type === "characterData") shiftText(record.target as Text);
        if (record.type === "attributes") {
          shiftAttribute(record.target as Element, record.attributeName as (typeof userFacingAttributes)[number]);
        }
        if (record.type === "childList") record.addedNodes.forEach(processSubtree);
      });
    });
    observer.observe(root, {
      attributeFilter: [...userFacingAttributes],
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [characterShift, useEgyptianGlyphs, useRomanNumerals]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const applyTypographyScale = (scope: ParentNode) => {
      const scopeElement = scope instanceof HTMLElement && scope.matches(typographySelector) ? [scope] : [];
      const elements = [...scopeElement, ...Array.from(scope.querySelectorAll<HTMLElement>(typographySelector))];

      elements.forEach((element) => {
        if (typographyStyles.current.has(element)) return;
        const computed = window.getComputedStyle(element);
        const fontSize = Number.parseFloat(computed.fontSize);
        const computedLineHeight = Number.parseFloat(computed.lineHeight);
        typographyStyles.current.set(element, {
          fontSize,
          inlineFontFamily: element.style.fontFamily,
          inlineFontSize: element.style.fontSize,
          inlineLineHeight: element.style.lineHeight,
          lineHeight: Number.isFinite(computedLineHeight) ? computed.lineHeight : `${fontSize * 1.2}px`,
        });
      });

      elements.forEach((element) => {
        const base = typographyStyles.current.get(element);
        if (!base) return;
        if (fontScale === 1) {
          element.style.fontSize = base.inlineFontSize;
          element.style.lineHeight = base.inlineLineHeight;
        } else {
          element.style.fontSize = `${base.fontSize * fontScale}px`;
          element.style.lineHeight = base.lineHeight;
        }
        element.style.fontFamily = typeface === "system" ? base.inlineFontFamily : typefaceFamilies[typeface];
      });
    };

    applyTypographyScale(root);
    const observer = new MutationObserver((records) => {
      records.forEach((record) => {
        if (record.type === "childList") {
          record.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) applyTypographyScale(node as HTMLElement);
          });
        }
      });
    });
    observer.observe(root, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [fontScale, typeface]);

  return <div className={className} ref={rootRef} style={style}>{children}</div>;
}
