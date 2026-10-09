"use client";

import { useEffect, useRef, useState } from "react";
import { edgeMatrix, layoutEdges } from "./model/edges";
import { glyphs, type Glyph, type GlyphId } from "./model/glyphs";
import styles from "./fractal.module.css";

const INK = "rgb(248, 249, 249)";
const MAX_RATIO = 3;

function glyphPath(glyph: Glyph) {
  const path = new Path2D(glyph.path);
  if ("fold" in glyph) {
    path.moveTo(glyph.fold.x1, glyph.fold.y1);
    path.lineTo(glyph.fold.x2, glyph.fold.y2);
  }
  return path;
}

function GlyphIcon({ glyph }: { glyph: Glyph }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      {glyph.paint === "fill" ? (
        <path fill="currentColor" d={glyph.path} />
      ) : (
        <g fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d={glyph.path} />
          {"fold" in glyph && <line {...glyph.fold} />}
        </g>
      )}
    </svg>
  );
}

export default function ArithmeticFractal() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const [glyphId, setGlyphId] = useState<GlyphId>("heart");

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const glyph = glyphs.find((candidate) => candidate.id === glyphId);
    if (!canvas || !context || !glyph) return;
    const path = glyphPath(glyph);

    const draw = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, MAX_RATIO);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      // The fractal fits the area above the options; only its finest glyphs are drawn.
      const optionsTop = optionsRef.current?.getBoundingClientRect().top ?? height;
      const { edges, unit } = layoutEdges(glyph, width, Math.min(height, optionsTop));
      const shapes = new Path2D();
      for (const edge of edges) shapes.addPath(path, new DOMMatrix([...edgeMatrix(glyph, edge)]));
      if (glyph.paint === "fill") {
        context.fillStyle = INK;
        context.fill(shapes);
      } else {
        // Instagram's 2-unit stroke at the finest glyphs' scale.
        context.strokeStyle = INK;
        context.lineWidth = 2 * unit;
        context.lineCap = "round";
        context.lineJoin = "round";
        context.stroke(shapes);
      }
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [glyphId]);

  return (
    <main className={styles.field}>
      <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label="An Instagram action traced by smaller copies of itself, each traced by smaller copies" />
      <div ref={optionsRef} className={styles.options} role="radiogroup" aria-label="action">
        {glyphs.map((glyph) => (
          <button
            key={glyph.id}
            type="button"
            role="radio"
            aria-checked={glyph.id === glyphId}
            aria-label={glyph.label}
            className={styles.option}
            onClick={() => setGlyphId(glyph.id)}
          >
            <GlyphIcon glyph={glyph} />
          </button>
        ))}
      </div>
    </main>
  );
}
