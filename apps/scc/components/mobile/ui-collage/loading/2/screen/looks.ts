// Clones of horizontal determinate progress bars, oldest first. Each look prepares once per layout:
// static chrome (troughs, frames, bevels) is painted into a cached layer, and fill paints are cached
// as row-pitch patterns so one fill() covers every row of that look per frame.
export type LookId =
  | "dos"
  | "system7"
  | "win31"
  | "win95"
  | "mac9"
  | "metal"
  | "xp"
  | "aqua"
  | "vista"
  | "ubuntu"
  | "holo"
  | "bootstrap"
  | "ios"
  | "win10"
  | "youtube"
  | "material"
  | "win11"
  | "wavy";

export const lookOrder: readonly LookId[] = [
  "dos",
  "system7",
  "win31",
  "win95",
  "mac9",
  "metal",
  "xp",
  "aqua",
  "vista",
  "ubuntu",
  "holo",
  "bootstrap",
  "ios",
  "win10",
  "youtube",
  "material",
  "win11",
  "wavy",
];

type Ctx = CanvasRenderingContext2D;

/** One look's share of the stack. */
export type Env = {
  thickness: number;
  pitch: number;
  /** Top of row 0; tile patterns are anchored here so every row lines up with the tile. */
  top: number;
  left: number;
  right: number;
  ratio: number;
  /** Row indices drawn in this look, and their bar tops. */
  rows: Int32Array;
  ys: Float64Array;
  showPercent: boolean;
};

export type Prepared = {
  /** Static chrome, painted once into the cached layer. */
  under(c: Ctx): void;
  frame(g: Ctx, progress: Float32Array, time: number): void;
};

type Look = (g: Ctx, env: Env) => Prepared;

const percents = Array.from({ length: 101 }, (_, value) => `${value}%`);
const percentIndex = (progress: number) => Math.min(100, Math.floor(progress * 100 + 1e-4));

const msSans = `"MS Sans Serif", "Microsoft Sans Serif", Tahoma, Arial, sans-serif`;
const nothing = () => {};

type Stops = readonly (readonly [number, string])[];

function vertical(c: Ctx, from: number, to: number, stops: Stops) {
  const gradient = c.createLinearGradient(0, from, 0, Math.max(from + 0.01, to));
  for (const [at, color] of stops) gradient.addColorStop(at, color);
  return gradient;
}

/**
 * A pattern whose tile is `width` CSS px wide and one row pitch tall, painted at device density.
 * `paint` draws with the bar's top at y = 0.
 */
function tilePattern(g: Ctx, env: Env, width: number, originX: number, paint: (c: Ctx) => void) {
  const deviceWidth = Math.max(1, Math.round(width * env.ratio));
  const deviceHeight = Math.max(1, Math.round(env.pitch * env.ratio));
  const canvas = document.createElement("canvas");
  canvas.width = deviceWidth;
  canvas.height = deviceHeight;
  const c = canvas.getContext("2d")!;
  c.scale(deviceWidth / width, deviceHeight / env.pitch);
  paint(c);
  const pattern = g.createPattern(canvas, "repeat")!;
  const matrix = new DOMMatrix([width / deviceWidth, 0, 0, env.pitch / deviceHeight, originX, env.top]);
  pattern.setTransform(matrix);
  return { pattern, matrix };
}

/** Labels inside the bar need room to be legible. */
const insideFits = (env: Env) => env.showPercent && env.thickness >= 14;

/** Centred percent whose colour inverts where the fill passes under it (Win 3.1, GTK). */
function centredInverted(g: Ctx, env: Env, centre: number, font: string, outside: string, inside: string, clip: Path2D, progress: Float32Array) {
  const { rows, ys } = env;
  const middle = env.thickness / 2;
  g.font = font;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = outside;
  for (let i = 0; i < rows.length; i += 1) g.fillText(percents[percentIndex(progress[rows[i]!]!)]!, centre, ys[i]! + middle);
  g.save();
  g.clip(clip);
  g.fillStyle = inside;
  for (let i = 0; i < rows.length; i += 1) g.fillText(percents[percentIndex(progress[rows[i]!]!)]!, centre, ys[i]! + middle);
  g.restore();
}

/** Discrete blocks (Win 95, XP): whole blocks only, the last one clipped at 100%. */
function blockWidth(progress: number, inner: number, period: number) {
  if (progress >= 1) return inner;
  return Math.min(inner, Math.floor((progress * inner) / period) * period);
}

/** Thin native bars (phones, Material, Fluent, video players) keep their own height, centred in the row. */
function band(env: Env, share: number, minimum: number) {
  const height = Math.max(minimum, Math.round(env.thickness * share));
  return { height, offset: Math.round((env.thickness - height) / 2) };
}

// MS-DOS 6 Setup: a text-mode row on blue; ░ light-shade cells fill with █ yellow blocks one character at a time.
const dos: Look = (g, env) => {
  const { thickness: t, rows, ys } = env;
  const x0 = env.left;
  const x1 = env.right;
  const width = x1 - x0;
  const dot = Math.max(1, Math.round(t / 8));
  const cell = Math.max(2, Math.round(t * 0.5));
  const { pattern } = tilePattern(g, env, dot * 2, x0, (c) => {
    c.fillStyle = "#0000aa";
    c.fillRect(0, 0, dot * 2, t);
    c.fillStyle = "#aaaaaa";
    for (let line = 0; line * dot * 2 < t; line += 1) c.fillRect((line % 2) * dot, line * dot * 2, dot, Math.min(dot, t - line * dot * 2));
  });
  return {
    under(c) {
      c.fillStyle = pattern;
      for (const y of ys) c.fillRect(x0, y, width, t);
    },
    frame(g, progress) {
      const fill = new Path2D();
      for (let i = 0; i < rows.length; i += 1) {
        const value = progress[rows[i]!]!;
        const bar = value >= 1 ? width : Math.floor((value * width) / cell) * cell;
        if (bar > 0) fill.rect(x0, ys[i]!, bar, t);
      }
      g.fillStyle = "#ffff55";
      g.fill(fill);
    },
  };
};

// Classic Mac OS (System 6/7 Finder copy): a 1 px black frame filling solid black.
const system7: Look = (g, env) => {
  const { thickness: t, rows, ys } = env;
  const x0 = env.left;
  const x1 = env.right;
  const border = Math.max(1, Math.round(t / 16));
  const inner = x1 - x0 - border * 2;
  return {
    under(c) {
      for (const y of ys) {
        c.fillStyle = "#000";
        c.fillRect(x0, y, x1 - x0, t);
        c.fillStyle = "#fff";
        c.fillRect(x0 + border, y + border, inner, t - border * 2);
      }
    },
    frame(g, progress) {
      const fill = new Path2D();
      for (let i = 0; i < rows.length; i += 1) {
        const bar = Math.round(progress[rows[i]!]! * inner);
        if (bar > 0) fill.rect(x0 + border, ys[i]! + border, bar, t - border * 2);
      }
      g.fillStyle = "#000";
      g.fill(fill);
    },
  };
};

// Windows 95/98: a 1 px sunken edge (grey top-left, white bottom-right) round a button-face well
// holding navy #000080 blocks about ⅔ as wide as tall.
const win95: Look = (g, env) => {
  const { thickness: t, rows, ys } = env;
  const x0 = env.left;
  const x1 = env.right;
  const edge = Math.max(1, Math.round(t / 16));
  const pad = Math.max(1, Math.round(t / 10));
  const innerX = x0 + edge + pad;
  const inner = x1 - x0 - (edge + pad) * 2;
  const innerHeight = Math.max(1, t - (edge + pad) * 2);
  const block = Math.max(2, Math.round(innerHeight * 0.66));
  const period = block + Math.max(1, Math.round(t / 10));
  const { pattern } = tilePattern(g, env, period, innerX, (c) => {
    c.fillStyle = "#000080";
    c.fillRect(0, edge + pad, block, innerHeight);
  });
  return {
    under(c) {
      for (const y of ys) {
        c.fillStyle = "#c0c0c0";
        c.fillRect(x0, y, x1 - x0, t);
        c.fillStyle = "#808080";
        c.fillRect(x0, y, x1 - x0, edge);
        c.fillRect(x0, y, edge, t);
        c.fillStyle = "#fff";
        c.fillRect(x0, y + t - edge, x1 - x0, edge);
        c.fillRect(x1 - edge, y, edge, t);
      }
    },
    frame(g, progress) {
      const fill = new Path2D();
      for (let i = 0; i < rows.length; i += 1) {
        const width = blockWidth(progress[rows[i]!]!, inner, period);
        if (width > 0) fill.rect(innerX, ys[i]!, width, t);
      }
      g.fillStyle = pattern;
      g.fill(fill);
    },
  };
};

// Java Swing Metal (Steel theme, 1998): etched #666666/white edge, #cccccc well, #9999cc fill with a
// #ccccff highlight and #666699 shadow, painted string centred and inverted over the fill.
const metal: Look = (g, env) => {
  const { thickness: t, rows, ys } = env;
  const inside = insideFits(env);
  const x0 = env.left;
  const x1 = env.right;
  const edge = Math.max(1, Math.round(t / 16));
  const inner = x1 - x0 - edge * 2;
  const font = `700 ${Math.round(t * 0.55)}px Dialog, "Lucida Sans", Arial, sans-serif`;
  return {
    under(c) {
      for (const y of ys) {
        c.fillStyle = "#fff";
        c.fillRect(x0, y, x1 - x0, t);
        c.fillStyle = "#666666";
        c.fillRect(x0, y, x1 - x0 - edge, t - edge);
        c.fillStyle = "#cccccc";
        c.fillRect(x0 + edge, y + edge, inner - edge, t - edge * 3);
      }
    },
    frame(g, progress) {
      const fill = new Path2D();
      const light = new Path2D();
      const shade = new Path2D();
      for (let i = 0; i < rows.length; i += 1) {
        const bar = Math.round(progress[rows[i]!]! * (inner - edge));
        if (bar <= 0) continue;
        const y = ys[i]! + edge;
        const height = t - edge * 3;
        fill.rect(x0 + edge, y, bar, height);
        light.rect(x0 + edge, y, bar, edge);
        light.rect(x0 + edge, y, edge, height);
        shade.rect(x0 + edge, y + height - edge, bar, edge);
      }
      g.fillStyle = "#9999cc";
      g.fill(fill);
      g.fillStyle = "#ccccff";
      g.fill(light);
      g.fillStyle = "#666699";
      g.fill(shade);
      if (inside) centredInverted(g, env, (x0 + x1) / 2, font, "#333366", "#fff", fill, progress);
    },
  };
};

// Android Holo (4.0–4.4): a flat Holo-blue #33b5e5 line over a flat grey track, square ends.
const holo: Look = (g, env) => {
  const { rows, ys } = env;
  const { height, offset } = band(env, 0.25, 2);
  const x0 = env.left;
  const width = env.right - x0;
  return {
    under(c) {
      c.fillStyle = "#d0d0d0";
      for (const y of ys) c.fillRect(x0, y + offset, width, height);
    },
    frame(g, progress) {
      const fill = new Path2D();
      for (let i = 0; i < rows.length; i += 1) {
        const bar = progress[rows[i]!]! * width;
        if (bar > 0) fill.rect(x0, ys[i]! + offset, bar, height);
      }
      g.fillStyle = "#33b5e5";
      g.fill(fill);
    },
  };
};

// iOS UIProgressView (iOS 7+): a thin fully rounded light track and system-blue progress.
const ios: Look = (g, env) => {
  const { rows, ys } = env;
  const { height, offset } = band(env, 0.3, 2);
  const x0 = env.left;
  const width = env.right - x0;
  const track = new Path2D();
  for (const y of ys) track.roundRect(x0, y + offset, width, height, height / 2);
  return {
    under(c) {
      c.fillStyle = "#e3e3e8";
      c.fill(track);
    },
    frame(g, progress) {
      const fill = new Path2D();
      for (let i = 0; i < rows.length; i += 1) {
        const bar = progress[rows[i]!]! * width;
        if (bar > 0) fill.roundRect(x0, ys[i]! + offset, bar, height, Math.min(height / 2, bar / 2));
      }
      g.fillStyle = "#007aff";
      g.fill(fill);
    },
  };
};

// YouTube player: grey track, lighter-grey buffered span ahead, red played span, red scrubber head.
// The head stays inside the shared bar ends.
const youtube: Look = (g, env) => {
  const { thickness: t, rows, ys } = env;
  const { height, offset } = band(env, 0.2, 2);
  const x0 = env.left;
  const width = env.right - x0;
  const head = Math.max(height, Math.min(t / 2, height * 2));
  const middle = t / 2;
  return {
    under(c) {
      c.fillStyle = "#e5e5e5";
      for (const y of ys) c.fillRect(x0, y + offset, width, height);
    },
    frame(g, progress) {
      const buffered = new Path2D();
      const played = new Path2D();
      for (let i = 0; i < rows.length; i += 1) {
        const value = progress[rows[i]!]!;
        const y = ys[i]!;
        buffered.rect(x0, y + offset, Math.min(1, value + 0.12 + (rows[i]! % 5) * 0.03) * width, height);
        if (value <= 0) continue;
        const bar = value * width;
        played.rect(x0, y + offset, bar, height);
        const cx = Math.max(x0 + head, Math.min(x0 + width - head, x0 + bar));
        played.moveTo(cx + head, y + middle);
        played.arc(cx, y + middle, head, 0, Math.PI * 2);
      }
      g.fillStyle = "#bdbdbd";
      g.fill(buffered);
      g.fillStyle = "#ff0000";
      g.fill(played);
    },
  };
};

// Material 3 LinearProgressIndicator: 4 dp rounded primary indicator, a gap, the remaining track, a stop dot.
const material: Look = (g, env) => {
  const { rows, ys } = env;
  const { height, offset } = band(env, 0.3, 3);
  const x0 = env.left;
  const x1 = env.right;
  const width = x1 - x0;
  const gap = height;
  const dot = height / 2;
  const middle = height / 2;
  return {
    under: nothing,
    frame(g, progress) {
      const active = new Path2D();
      const track = new Path2D();
      const dots = new Path2D();
      for (let i = 0; i < rows.length; i += 1) {
        const y = ys[i]! + offset;
        const bar = progress[rows[i]!]! * width;
        if (bar > 0) active.roundRect(x0, y, bar, height, Math.min(middle, bar / 2));
        const start = bar > 0 ? x0 + bar + gap : x0;
        if (x1 - start <= 0.5) continue;
        track.roundRect(start, y, x1 - start, height, Math.min(middle, (x1 - start) / 2));
        if (x1 - start >= height * 2) {
          dots.moveTo(x1 - middle + dot / 2, y + middle);
          dots.arc(x1 - middle, y + middle, dot / 2, 0, Math.PI * 2);
        }
      }
      g.fillStyle = "#e8def8";
      g.fill(track);
      g.fillStyle = "#6750a4";
      g.fill(active);
      g.fill(dots);
    },
  };
};

// Windows 11 Fluent ProgressBar: a 1 px track with a 3 px rounded accent indicator over it.
const win11: Look = (g, env) => {
  const { thickness: t, rows, ys } = env;
  const { height, offset } = band(env, 0.18, 2);
  const x0 = env.left;
  const width = env.right - x0;
  const hairline = Math.max(1, Math.round(height / 3));
  const lineY = Math.round((t - hairline) / 2);
  const track = new Path2D();
  for (const y of ys) track.roundRect(x0, y + lineY, width, hairline, hairline / 2);
  return {
    under(c) {
      c.fillStyle = "#8a8a8a";
      c.fill(track);
    },
    frame(g, progress) {
      const fill = new Path2D();
      for (let i = 0; i < rows.length; i += 1) {
        const bar = progress[rows[i]!]! * width;
        if (bar > 0) fill.roundRect(x0, ys[i]! + offset, bar, height, Math.min(height / 2, bar / 2));
      }
      g.fillStyle = "#005fb8";
      g.fill(fill);
    },
  };
};

// Material 3 Expressive wavy LinearProgressIndicator: the active stroke rides a travelling sine that
// flattens near 0% and 100%, then a gap, a flat track, and a stop dot; round caps stay inside the bar ends.
const wavy: Look = (g, env) => {
  const { thickness: t, rows, ys } = env;
  const x0 = env.left;
  const x1 = env.right;
  const stroke = Math.max(2, Math.round(t * 0.2));
  const amplitude = Math.max(1, t * 0.14);
  const wavelength = Math.max(16, t * 2.4);
  const wave = (Math.PI * 2) / wavelength;
  const start = x0 + stroke / 2;
  const end = x1 - stroke / 2;
  const length = end - start;
  const gap = stroke;
  const middle = t / 2;
  const step = 2;
  return {
    under: nothing,
    frame(g, progress, time) {
      const active = new Path2D();
      const track = new Path2D();
      const dots = new Path2D();
      const phase = time * Math.PI * 2;
      for (let i = 0; i < rows.length; i += 1) {
        const value = progress[rows[i]!]!;
        const y = ys[i]! + middle;
        const head = start + value * length;
        if (value > 0) {
          const height = amplitude * Math.max(0, Math.min(1, value / 0.1, (1 - value) / 0.05));
          active.moveTo(start, y + height * Math.sin(-phase));
          for (let x = start + step; x < head; x += step) active.lineTo(x, y + height * Math.sin(wave * (x - start) - phase));
          active.lineTo(head, y + height * Math.sin(wave * (head - start) - phase));
        }
        const from = value > 0 ? head + stroke + gap : start;
        if (from >= end) continue;
        track.moveTo(from, y);
        track.lineTo(end, y);
        dots.moveTo(end + stroke / 2, y);
        dots.arc(end, y, stroke / 2, 0, Math.PI * 2);
      }
      g.lineCap = "round";
      g.lineJoin = "round";
      g.lineWidth = stroke;
      g.strokeStyle = "#e8def8";
      g.stroke(track);
      g.fillStyle = "#6750a4";
      g.fill(dots);
      g.strokeStyle = "#6750a4";
      g.stroke(active);
    },
  };
};

// Windows 3.1 Setup gauge: black frame, white box, navy fill, centred percent inverted over the fill.
const win31: Look = (g, env) => {
  const { thickness: t, rows, ys } = env;
  const inside = insideFits(env);
  const x0 = env.left;
  const x1 = env.right;
  const border = Math.max(1, Math.round(t / 20));
  const inner = x1 - x0 - border * 2;
  const font = `700 ${Math.round(t * 0.6)}px ${msSans}`;
  return {
    under(c) {
      for (const y of ys) {
        c.fillStyle = "#000";
        c.fillRect(x0, y, x1 - x0, t);
        c.fillStyle = "#fff";
        c.fillRect(x0 + border, y + border, inner, t - border * 2);
      }
    },
    frame(g, progress) {
      const fill = new Path2D();
      for (let i = 0; i < rows.length; i += 1) {
        const width = progress[rows[i]!]! * inner;
        if (width > 0) fill.rect(x0 + border, ys[i]! + border, width, t - border * 2);
      }
      g.fillStyle = "#000080";
      g.fill(fill);
      if (inside) centredInverted(g, env, (x0 + x1) / 2, font, "#000080", "#fff", fill, progress);
    },
  };
};

// Mac OS 8/9 Platinum: dark frame, recessed grey trough, lavender-blue cylindrical fill.
const mac9: Look = (g, env) => {
  const { thickness: t, rows, ys } = env;
  const x0 = env.left;
  const x1 = env.right;
  const border = Math.max(1, Math.round(t / 14));
  const inner = x1 - x0 - border * 2;
  const { pattern } = tilePattern(g, env, 4, x0, (c) => {
    c.fillStyle = vertical(c, border, t - border, [
      [0, "#a3a3f2"],
      [0.22, "#dedeff"],
      [0.5, "#a6a6f4"],
      [1, "#4f4fb8"],
    ]);
    c.fillRect(0, border, 4, t - border * 2);
  });
  return {
    under(c) {
      for (const y of ys) {
        c.fillStyle = "#3a3a3a";
        c.fillRect(x0, y, x1 - x0, t);
        c.fillStyle = vertical(c, y + border, y + t - border, [
          [0, "#8c8c8c"],
          [0.2, "#bcbcbc"],
          [0.55, "#dddddd"],
          [1, "#f2f2f2"],
        ]);
        c.fillRect(x0 + border, y + border, inner, t - border * 2);
      }
    },
    frame(g, progress) {
      const fill = new Path2D();
      const end = new Path2D();
      for (let i = 0; i < rows.length; i += 1) {
        const width = Math.round(progress[rows[i]!]! * inner);
        if (width <= 0) continue;
        fill.rect(x0 + border, ys[i]!, width, t);
        // The fill ends on a darker one-pixel edge.
        if (width < inner) end.rect(x0 + border + width - border, ys[i]! + border, border, t - border * 2);
      }
      g.fillStyle = pattern;
      g.fill(fill);
      g.fillStyle = "#3b3b8f";
      g.fill(end);
    },
  };
};

// Windows XP Luna: rounded grey frame, white trough, glossy green chunks with 2 px gaps.
const xp: Look = (g, env) => {
  const { thickness: t, rows, ys } = env;
  const scale = t / 17;
  const x0 = env.left;
  const x1 = env.right;
  const border = Math.max(1, Math.round(scale));
  const radius = Math.max(1, Math.round(3 * scale));
  const pad = Math.max(1, Math.round(2 * scale));
  const innerX = x0 + border + pad;
  const inner = x1 - x0 - (border + pad) * 2;
  const innerHeight = Math.max(1, t - (border + pad) * 2);
  const chunk = Math.max(2, Math.round(innerHeight * 0.72));
  const period = chunk + Math.max(1, Math.round(2 * scale));
  const { pattern } = tilePattern(g, env, period, innerX, (c) => {
    c.fillStyle = vertical(c, border + pad, t - border - pad, [
      [0, "#e6f8e4"],
      [0.18, "#b2eaae"],
      [0.42, "#4ccf47"],
      [0.62, "#2db829"],
      [0.86, "#5bd657"],
      [1, "#a8eba6"],
    ]);
    c.fillRect(0, border + pad, chunk, innerHeight);
  });
  return {
    under(c) {
      for (const y of ys) {
        c.beginPath();
        c.roundRect(x0, y, x1 - x0, t, radius);
        c.fillStyle = "#686868";
        c.fill();
        c.beginPath();
        c.roundRect(x0 + border, y + border, x1 - x0 - border * 2, t - border * 2, Math.max(0, radius - border));
        c.fillStyle = vertical(c, y + border, y + t - border, [
          [0, "#e4e4e4"],
          [0.3, "#ffffff"],
          [1, "#f3f3f3"],
        ]);
        c.fill();
      }
    },
    frame(g, progress) {
      const fill = new Path2D();
      for (let i = 0; i < rows.length; i += 1) {
        const width = blockWidth(progress[rows[i]!]!, inner, period);
        if (width > 0) fill.rect(innerX, ys[i]!, width, t);
      }
      g.fillStyle = pattern;
      g.fill(fill);
    },
  };
};

// Mac OS X Aqua: recessed pill trough, glossy blue pill with diagonal stripes drifting along it.
const aqua: Look = (g, env) => {
  const { thickness: t, rows, ys } = env;
  const x0 = env.left;
  const x1 = env.right;
  const border = Math.max(1, Math.round(t / 16));
  const innerX = x0 + border;
  const inner = x1 - x0 - border * 2;
  const innerHeight = t - border * 2;
  const period = Math.max(6, Math.round(t * 1.25));
  const speed = period / 0.9;
  const { pattern, matrix } = tilePattern(g, env, period, innerX, (c) => {
    c.fillStyle = vertical(c, border, t - border, [
      [0, "#c9e2fc"],
      [0.46, "#5ea6f0"],
      [0.52, "#2f83e2"],
      [1, "#8fd0ff"],
    ]);
    c.fillRect(0, 0, period, t);
    c.fillStyle = "rgba(255,255,255,0.3)";
    c.beginPath();
    for (let start = -Math.ceil(t / period) - 1; start <= 1; start += 1) {
      const x = start * period;
      c.moveTo(x, t);
      c.lineTo(x + period / 2, t);
      c.lineTo(x + period / 2 + t, 0);
      c.lineTo(x + t, 0);
      c.closePath();
    }
    c.fill();
    c.fillStyle = vertical(c, border + innerHeight * 0.06, border + innerHeight * 0.5, [
      [0, "rgba(255,255,255,0.85)"],
      [1, "rgba(255,255,255,0.12)"],
    ]);
    c.fillRect(0, border + innerHeight * 0.06, period, innerHeight * 0.44);
  });
  return {
    under(c) {
      for (const y of ys) {
        c.beginPath();
        c.roundRect(x0, y, x1 - x0, t, t / 2);
        c.fillStyle = "#8e8e8e";
        c.fill();
        c.beginPath();
        c.roundRect(innerX, y + border, inner, innerHeight, innerHeight / 2);
        c.fillStyle = vertical(c, y + border, y + t - border, [
          [0, "#b9b9b9"],
          [0.22, "#dadada"],
          [0.6, "#f3f3f3"],
          [1, "#ffffff"],
        ]);
        c.fill();
      }
    },
    frame(g, progress, time) {
      const fill = new Path2D();
      for (let i = 0; i < rows.length; i += 1) {
        const width = progress[rows[i]!]! * inner;
        if (width > 0) fill.roundRect(innerX, ys[i]! + border, width, innerHeight, Math.min(innerHeight / 2, width / 2));
      }
      matrix.e = innerX + ((time * speed) % period);
      pattern.setTransform(matrix);
      g.fillStyle = pattern;
      g.fill(fill);
    },
  };
};

// Windows Vista/7 Aero: grey rounded trough, glossy continuous green, a highlight sweeping along the fill.
const vista: Look = (g, env) => {
  const { thickness: t, rows, ys } = env;
  const scale = t / 15;
  const x0 = env.left;
  const x1 = env.right;
  const border = Math.max(1, Math.round(scale));
  const radius = Math.max(1, Math.round(2 * scale));
  const innerX = x0 + border;
  const inner = x1 - x0 - border * 2;
  const innerHeight = t - border * 2;
  const sweepWidth = Math.max(30, Math.round(t * 5));
  const sweep = g.createLinearGradient(0, 0, sweepWidth, 0);
  sweep.addColorStop(0, "rgba(255,255,255,0)");
  sweep.addColorStop(0.5, "rgba(255,255,255,0.7)");
  sweep.addColorStop(1, "rgba(255,255,255,0)");
  const { pattern } = tilePattern(g, env, 4, innerX, (c) => {
    c.fillStyle = vertical(c, border, t - border, [
      [0, "#d6f7ce"],
      [0.48, "#6fe363"],
      [0.5, "#23c31b"],
      [1, "#5ae150"],
    ]);
    c.fillRect(0, border, 4, innerHeight);
  });
  return {
    under(c) {
      for (const y of ys) {
        c.beginPath();
        c.roundRect(x0, y, x1 - x0, t, radius);
        c.fillStyle = "#b2b2b2";
        c.fill();
        c.fillStyle = vertical(c, y + border, y + t - border, [
          [0, "#f6f6f6"],
          [0.5, "#e6e6e6"],
          [0.51, "#d9d9d9"],
          [1, "#e9e9e9"],
        ]);
        c.fillRect(innerX, y + border, inner, innerHeight);
      }
    },
    frame(g, progress, time) {
      const fill = new Path2D();
      for (let i = 0; i < rows.length; i += 1) {
        const width = progress[rows[i]!]! * inner;
        if (width > 0) fill.rect(innerX, ys[i]! + border, width, innerHeight);
      }
      g.fillStyle = pattern;
      g.fill(fill);
      g.fillStyle = sweep;
      for (let i = 0; i < rows.length; i += 1) {
        const width = progress[rows[i]!]! * inner;
        if (width <= 0) continue;
        // Each bar sweeps on its own 2.6 s cycle: 1.9 s travelling, then a pause.
        const phase = ((time + rows[i]! * 0.37) % 2.6) / 1.9;
        if (phase >= 1) continue;
        const start = innerX - sweepWidth + phase * (width + sweepWidth);
        const from = Math.max(start, innerX);
        const to = Math.min(start + sweepWidth, innerX + width);
        if (to <= from) continue;
        g.translate(start, 0);
        g.fillRect(from - start, ys[i]! + border, to - from, innerHeight);
        g.translate(-start, 0);
      }
    },
  };
};

// GTK / Ubuntu Ambiance: grey inset trough, orange gradient fill with a darker rim, centred inverting text.
const ubuntu: Look = (g, env) => {
  const { thickness: t, rows, ys } = env;
  const inside = insideFits(env);
  const family = `Ubuntu, Cantarell, "DejaVu Sans", Arial, sans-serif`;
  const scale = t / 18;
  const x0 = env.left;
  const x1 = env.right;
  const border = Math.max(1, Math.round(scale));
  const radius = Math.max(1, Math.round(3 * scale));
  const inner = x1 - x0 - border * 2;
  const font = `500 ${Math.round(t * 0.58)}px ${family}`;
  const { pattern } = tilePattern(g, env, 4, x0, (c) => {
    c.fillStyle = vertical(c, border * 2, t - border * 2, [
      [0, "#f8a47c"],
      [0.5, "#ef7142"],
      [1, "#dd4814"],
    ]);
    c.fillRect(0, 0, 4, t);
  });
  return {
    under(c) {
      for (const y of ys) {
        c.beginPath();
        c.roundRect(x0, y, x1 - x0, t, radius);
        c.fillStyle = "#a8a8a6";
        c.fill();
        c.beginPath();
        c.roundRect(x0 + border, y + border, inner, t - border * 2, Math.max(0, radius - border));
        c.fillStyle = vertical(c, y, y + t, [
          [0, "#c9c9c7"],
          [0.3, "#dadad8"],
          [1, "#ebebe9"],
        ]);
        c.fill();
      }
    },
    frame(g, progress) {
      const rim = new Path2D();
      const fill = new Path2D();
      for (let i = 0; i < rows.length; i += 1) {
        const width = progress[rows[i]!]! * inner;
        if (width <= 0) continue;
        const y = ys[i]! + border;
        const height = t - border * 2;
        const r = Math.min(Math.max(0, radius - border), width / 2);
        rim.roundRect(x0 + border, y, width, height, r);
        if (width > border * 2) fill.roundRect(x0 + border * 2, y + border, width - border * 2, height - border * 2, Math.max(0, r - border));
      }
      g.fillStyle = "#c1400f";
      g.fill(rim);
      g.fillStyle = pattern;
      g.fill(fill);
      if (inside) centredInverted(g, env, (x0 + x1) / 2, font, "#3c3c3c", "#fff", rim, progress);
    },
  };
};

// Bootstrap 5 `.progress-bar-striped.progress-bar-animated`: #e9ecef track, #0d6efd bar, 45° white 15%
// stripes on a one-thickness square moving one tile per second, label centred in the bar.
const bootstrap: Look = (g, env) => {
  const { thickness: t, rows, ys } = env;
  const family = `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
  const inside = insideFits(env);
  const x0 = env.left;
  const x1 = env.right;
  const width = x1 - x0;
  const radius = Math.max(1, Math.round(t / 4));
  const font = `400 ${Math.round(t * 0.75)}px ${family}`;
  g.font = font;
  const labelWidth = g.measureText("100%").width + 4;
  const track = new Path2D();
  for (const y of ys) track.roundRect(x0, y, width, t, radius);
  const period = t;
  const { pattern, matrix } = tilePattern(g, env, period, x0, (c) => {
    c.fillStyle = "#0d6efd";
    c.fillRect(0, 0, period, t);
    c.fillStyle = "rgba(255,255,255,0.15)";
    c.beginPath();
    const band = period / 4;
    for (let start = -Math.ceil(t / band); start <= 2; start += 1) {
      const x = start * band * 2;
      c.moveTo(x, 0);
      c.lineTo(x + band, 0);
      c.lineTo(x + band + t, t);
      c.lineTo(x + t, t);
      c.closePath();
    }
    c.fill();
  });
  return {
    under(c) {
      c.fillStyle = "#e9ecef";
      c.fill(track);
    },
    frame(g, progress, time) {
      const fill = new Path2D();
      for (let i = 0; i < rows.length; i += 1) {
        const bar = progress[rows[i]!]! * width;
        if (bar > 0) fill.rect(x0, ys[i]!, bar, t);
      }
      matrix.e = x0 + period - (time % 1) * period;
      pattern.setTransform(matrix);
      g.save();
      g.clip(track);
      g.fillStyle = pattern;
      g.fill(fill);
      g.restore();
      if (!inside) return;
      g.font = font;
      g.fillStyle = "#fff";
      g.textAlign = "center";
      g.textBaseline = "middle";
      for (let i = 0; i < rows.length; i += 1) {
        const value = progress[rows[i]!]!;
        const bar = value * width;
        if (bar >= labelWidth) g.fillText(percents[percentIndex(value)]!, x0 + bar / 2, ys[i]! + t / 2);
      }
    },
  };
};

// Windows 8/10 flat: #e6e6e6 trough in a 1 px #bcbcbc frame, flat #06b025 fill.
const win10: Look = (g, env) => {
  const { thickness: t, rows, ys } = env;
  const x0 = env.left;
  const x1 = env.right;
  const border = Math.max(1, Math.round(t / 20));
  const inner = x1 - x0 - border * 2;
  return {
    under(c) {
      for (const y of ys) {
        c.fillStyle = "#bcbcbc";
        c.fillRect(x0, y, x1 - x0, t);
        c.fillStyle = "#e6e6e6";
        c.fillRect(x0 + border, y + border, inner, t - border * 2);
      }
    },
    frame(g, progress) {
      const fill = new Path2D();
      for (let i = 0; i < rows.length; i += 1) {
        const bar = progress[rows[i]!]! * inner;
        if (bar > 0) fill.rect(x0 + border, ys[i]! + border, bar, t - border * 2);
      }
      g.fillStyle = "#06b025";
      g.fill(fill);
    },
  };
};

export const looks: Record<LookId, Look> = {
  dos,
  system7,
  win31,
  win95,
  mac9,
  metal,
  xp,
  aqua,
  vista,
  ubuntu,
  holo,
  bootstrap,
  ios,
  win10,
  youtube,
  material,
  win11,
  wavy,
};
