"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./fractal-logo.module.css";
import { fractalLogos, logoGeometry, type FractalLogo, type LogoGeometry } from "./logos";
import {
  DEFAULT_RATIO,
  MAX_DEPTH,
  MAX_RATIO,
  MIN_RATIO,
  boxShape,
  createLogoLayout,
  layoutLogoFractal,
} from "./model";

// Safe sprite budget until the route is observed on the user's device.
const RENDER_DPR = 1;
/** Sprites are rasterised from each vector at these widths (px). */
const SPRITE_SIDES = [8, 16, 32, 64, 128, 256, 512, 1024, 2048] as const;
const SOURCE_SIDE = 2048;
/** Mix keeps the four-tip square frame and changes the logo at every copy. */
const MIX = "mix";

type Order = "parent" | "child";

type LoadedLogo = {
  logo: FractalLogo;
  source: HTMLImageElement;
  sprites: HTMLCanvasElement[];
};

/**
 * The served SVG, unchanged except for an intrinsic size and, for single-colour
 * marks, the registered fill in place of `currentColor` or the default black.
 */
async function loadLogo(logo: FractalLogo): Promise<LoadedLogo> {
  let text = await (await fetch(logo.src)).text();
  if (logo.fill) text = text.replace(/currentColor/g, logo.fill);
  text = text.replace(/<svg\b([^>]*)>/, (_, attributes: string) => {
    const rest = attributes.replace(/\s(width|height)="[^"]*"/g, "");
    const fill = logo.fill && !/\sfill="/.test(rest) ? ` fill="${logo.fill}"` : "";
    return `<svg${rest}${fill} width="${SOURCE_SIDE}" height="${SOURCE_SIDE}">`;
  });
  const url = URL.createObjectURL(new Blob([text], { type: "image/svg+xml" }));
  try {
    const source = new Image();
    source.src = url;
    await source.decode();
    const sprites = SPRITE_SIDES.map((side) => {
      const canvas = document.createElement("canvas");
      canvas.width = side;
      canvas.height = side;
      const context = canvas.getContext("2d");
      if (context) {
        context.imageSmoothingQuality = "high";
        context.drawImage(source, 0, 0, side, side);
      }
      return canvas;
    });
    return { logo, source, sprites };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function drawLogo(
  context: CanvasRenderingContext2D,
  { logo, source, sprites }: LoadedLogo,
  geometry: LogoGeometry,
  x: number,
  y: number,
  half: number,
) {
  const [vx, vy, vw, vh] = logo.viewBox;
  const unit = half / geometry.half;
  const width = vw * unit;
  const height = vh * unit;
  const sprite = sprites.find((canvas) => canvas.width >= Math.max(width, height));
  context.drawImage(
    sprite ?? source,
    x - (geometry.center[0] - vx) * unit,
    y - (geometry.center[1] - vy) * unit,
    width,
    height,
  );
}

export default function FractalLogoOne() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loadedRef = useRef(new Map<string, Promise<LoadedLogo>>());
  const [logoId, setLogoId] = useState(fractalLogos[0]!.id);
  const [ratio, setRatio] = useState(DEFAULT_RATIO);
  const [depth, setDepth] = useState(MAX_DEPTH);
  const [allTips, setAllTips] = useState(false);
  const [order, setOrder] = useState<Order>("parent");
  const [controlsExpanded, setControlsExpanded] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const mix = logoId === MIX;
    const logos = mix ? fractalLogos : fractalLogos.filter((logo) => logo.id === logoId);
    if (!canvas || !context || logos.length === 0) return;

    let cancelled = false;
    let loaded: LoadedLogo[] | null = null;
    const geometries = logos.map((logo) => logoGeometry(logo, mix));
    const shape = mix ? boxShape() : geometries[0]!.shape;
    const layout = createLogoLayout();

    const draw = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = Math.round(width * RENDER_DPR);
      canvas.height = Math.round(height * RENDER_DPR);
      context.setTransform(RENDER_DPR, 0, 0, RENDER_DPR, 0, 0);
      context.clearRect(0, 0, width, height);
      if (!loaded) return;
      layoutLogoFractal(layout, width, height, {
        ratio,
        depth,
        allTips,
        shape,
        variants: logos.length,
      });
      context.imageSmoothingQuality = "high";
      const drawAt = (index: number) => {
        const variant = layout.variant[index]!;
        drawLogo(
          context,
          loaded![variant]!,
          geometries[variant]!,
          layout.x[index]!,
          layout.y[index]!,
          layout.half[index]!,
        );
      };
      if (order === "parent") {
        // Deepest first, so every parent's tips lie whole over the copies they hold.
        for (let index = layout.count - 1; index >= 0; index -= 1) drawAt(index);
      } else {
        for (let index = 0; index < layout.count; index += 1) drawAt(index);
      }
    };

    Promise.all(
      logos.map((logo) => {
        let pending = loadedRef.current.get(logo.id);
        if (!pending) {
          pending = loadLogo(logo);
          loadedRef.current.set(logo.id, pending);
          pending.catch(() => loadedRef.current.delete(logo.id));
        }
        return pending;
      }),
    )
      .then((result) => {
        if (cancelled) return;
        loaded = result;
        draw();
      })
      .catch((error: unknown) => {
        if (!cancelled) console.error(error);
      });

    draw();
    window.addEventListener("resize", draw);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", draw);
    };
  }, [logoId, ratio, depth, allTips, order]);

  const logoName =
    logoId === MIX ? "mixed" : (fractalLogos.find((logo) => logo.id === logoId)?.name ?? "");

  const logoButton = (id: string, name: string) => (
    <button
      key={id}
      className={styles.textButton}
      type="button"
      role="radio"
      aria-checked={id === logoId}
      onClick={() => setLogoId(id)}
    >
      {name}
    </button>
  );

  return (
    <main className={styles.field}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="img"
        aria-label={`A ${logoName} logo with smaller logos on each of its tips, repeated`}
      />
      <div className={styles.controlDock}>
        <div id="logo-fractal-controls" className={styles.controlPanel} hidden={!controlsExpanded}>
          <div className={styles.logoGroups} role="radiogroup" aria-label="logo">
            <div className={styles.logos}>
              {fractalLogos
                .filter((logo) => logo.group === "ai")
                .map((logo) => logoButton(logo.id, logo.name))}
            </div>
            <div className={styles.logos}>
              {fractalLogos
                .filter((logo) => logo.group === "tech")
                .map((logo) => logoButton(logo.id, logo.name))}
            </div>
            <div className={styles.logos}>{logoButton(MIX, "Mix")}</div>
          </div>
          <label className={styles.parameter} htmlFor="logo-fractal-ratio">
            <span>scale</span>
            <input
              id="logo-fractal-ratio"
              className={styles.slider}
              type="range"
              min={MIN_RATIO}
              max={MAX_RATIO}
              step="0.01"
              value={ratio}
              onChange={(event) => setRatio(Number(event.target.value))}
            />
            <output htmlFor="logo-fractal-ratio">{ratio.toFixed(2)}</output>
          </label>
          <label className={styles.parameter} htmlFor="logo-fractal-depth">
            <span>depth</span>
            <input
              id="logo-fractal-depth"
              className={styles.slider}
              type="range"
              min="0"
              max={MAX_DEPTH}
              step="1"
              value={depth}
              onChange={(event) => setDepth(Number(event.target.value))}
            />
            <output htmlFor="logo-fractal-depth">{depth >= MAX_DEPTH ? "∞" : depth}</output>
          </label>
          <button
            className={styles.textButton}
            type="button"
            aria-pressed={allTips}
            onClick={() => setAllTips((current) => !current)}
          >
            back tip {allTips ? "on" : "off"}
          </button>
          <button
            className={styles.textButton}
            type="button"
            onClick={() => setOrder((current) => (current === "parent" ? "child" : "parent"))}
          >
            {order} over
          </button>
        </div>
        <button
          className={styles.expandButton}
          type="button"
          aria-controls="logo-fractal-controls"
          aria-expanded={controlsExpanded}
          onClick={() => setControlsExpanded((current) => !current)}
        >
          {controlsExpanded ? "collapse" : "expand"}
        </button>
      </div>
    </main>
  );
}
