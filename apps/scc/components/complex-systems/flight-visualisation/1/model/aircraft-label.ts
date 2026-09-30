/**
 * AircraftLabel from viz1090: each label is a box tethered to its aircraft by a spring,
 * pushed off other labels, other icons and the screen edge, low-passed through a
 * 15-sample moving average, and progressively reduced (full → callsign → hidden) when
 * the neighbourhood is too dense. Forces and constants are the original's; neighbour
 * search uses sort-and-sweep rather than walking the full list for every label.
 */

import type { Typography } from "../view/typography";
import type { Aircraft } from "./aircraft";

const LABEL_FORCE = 0.01;
const DENSITY_FORCE = 0.01;
const ATTACHMENT_FORCE = 0.01;
const ATTACHMENT_DIST = 10;
const ICON_FORCE = 0.01;
const BOUNDARY_FORCE = 0.01;
const DAMPING = 0.65;
const VELOCITY_LIMIT = 1;
const EDGE_MARGIN = 15;
const BUFFER_LENGTH = 15;
const GAP = 10;
const DENSITY_MULT = 0.15;
const LEVEL_RATE = 0.25;

const sign = (value: number) => (value > 0 ? 1 : value < 0 ? -1 : 0);

export class AircraftLabel {
  x: number;
  y: number;
  w = 0;
  h = 0;
  /** Position at the previous tick, for interpolated drawing. */
  previousX: number;
  previousY: number;
  opacity = 0;
  private targetOpacity = 0;
  /** 0 shows callsign, altitude and speed; 1 callsign only; 2 hides the label. */
  level = 0;
  private lastLevelChange: number;
  private dx = 0;
  private dy = 0;
  ddx = 0;
  ddy = 0;
  private xBuffer = new Float64Array(BUFFER_LENGTH);
  private yBuffer = new Float64Array(BUFFER_LENGTH);
  private bufferIndex = 0;

  flightText = "";
  altitudeText = "";
  speedText = "";

  constructor(p: Aircraft, now: number, ui: number) {
    this.x = p.x;
    this.y = p.y + 20 * ui;
    this.previousX = this.x;
    this.previousY = this.y;
    this.xBuffer.fill(this.x);
    this.yBuffer.fill(this.y);
    this.lastLevelChange = now;
  }

  updateText(p: Aircraft, metric: boolean) {
    this.flightText = p.callsign;
    this.altitudeText = metric ? ` ${Math.round(p.altitude * 0.3048)}m` : ` ${p.altitude}'`;
    this.speedText = metric ? ` ${Math.round(p.speed * 1.852)}km/h` : ` ${p.speed}kt`;
  }

  /** Width and height of the label at a given level (getFullRect). */
  extent(level: number, typography: Typography) {
    let w = 0;
    let h = 0;
    if (level < 2) {
      w = Math.max(w, typography.width(this.flightText));
      h += typography.lineHeight;
    }
    if (level < 1) {
      w = Math.max(w, typography.width(this.altitudeText), typography.width(this.speedText));
      h += typography.lineHeight * 2;
    }
    return { w, h };
  }

  get hidden() {
    return this.level >= 2 && this.opacity === 0;
  }

  move(dx: number, dy: number) {
    for (let i = 0; i < BUFFER_LENGTH; i++) {
      this.xBuffer[i] += dx;
      this.yBuffer[i] += dy;
    }
    this.x += dx;
    this.y += dy;
    this.previousX += dx;
    this.previousY += dy;
  }

  applyForces() {
    let dx = (this.dx + this.ddx) * DAMPING;
    let dy = (this.dy + this.ddy) * DAMPING;
    if (Math.abs(dx) > VELOCITY_LIMIT) dx = sign(dx) * VELOCITY_LIMIT;
    if (Math.abs(dy) > VELOCITY_LIMIT) dy = sign(dy) * VELOCITY_LIMIT;
    if (Math.abs(dx) < 0.01) dx = 0;
    if (Math.abs(dy) < 0.01) dy = 0;
    this.dx = dx;
    this.dy = dy;

    let x = 0;
    let y = 0;
    for (let i = 0; i < BUFFER_LENGTH; i++) {
      x += this.xBuffer[i];
      y += this.yBuffer[i];
    }
    x /= BUFFER_LENGTH;
    y /= BUFFER_LENGTH;
    this.xBuffer[this.bufferIndex] = x + dx;
    this.yBuffer[this.bufferIndex] = y + dy;
    this.bufferIndex = (this.bufferIndex + 1) % BUFFER_LENGTH;
    this.x = Number.isFinite(x) ? x : 0;
    this.y = Number.isFinite(y) ? y : 0;
  }

  /** Once-per-tick easing of opacity and box size (the state half of AircraftLabel::draw). */
  ease(selected: boolean, typography: Typography) {
    if (this.opacity === 0 && this.level < 2) this.targetOpacity = 1;
    if (this.opacity > 0 && this.level >= 2) this.targetOpacity = 0;
    if (selected) this.targetOpacity = 1;
    this.opacity += 0.15 * (this.targetOpacity - this.opacity);
    if (this.opacity < 0.005) this.opacity = 0;

    const target = this.extent(selected ? 0 : this.level, typography);
    this.w += 0.25 * (target.w - this.w);
    this.h += 0.25 * (target.h - this.h);
    if (this.w < 0.05) this.w = 0;
    if (this.h < 0.05) this.h = 0;
  }

  /** Label level-of-detail update, run when the randomised 5–10 s timer elapses. */
  updateLevel(now: number, density: (level: number) => number) {
    if (now - this.lastLevelChange <= 5000 + 5000 * Math.random()) return;
    if (this.level < -1.2 + DENSITY_MULT * density(Math.trunc(this.level - 1))) {
      if (this.level <= 2) {
        if (Math.ceil(this.level) - this.level <= LEVEL_RATE) this.level += 0.5;
        this.level += LEVEL_RATE;
        this.lastLevelChange = now;
      }
    } else if (this.level > 1.2 + DENSITY_MULT * density(Math.trunc(this.level + 1))) {
      if (this.level >= 0) {
        if (this.level - Math.floor(this.level) <= LEVEL_RATE) this.level -= 0.5;
        this.level -= LEVEL_RATE;
        this.lastLevelChange = now;
      }
    }
  }
}

type Entry = { p: Aircraft; label: AircraftLabel };

function lowerBound(sorted: Float64Array, value: number) {
  let low = 0;
  let high = sorted.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (sorted[mid] < value) low = mid + 1;
    else high = mid;
  }
  return low;
}

function upperBound(sorted: Float64Array, value: number) {
  let low = 0;
  let high = sorted.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (sorted[mid] <= value) low = mid + 1;
    else high = mid;
  }
  return low;
}

/** Pushes `a` away from overlapping box `b` along the axis of least penetration. */
function overlapForce(a: AircraftLabel, b: AircraftLabel) {
  const left = a.x;
  const right = a.x + a.w;
  const top = a.y;
  const bottom = a.y + a.h;
  const checkLeft = b.x;
  const checkRight = b.x + b.w;
  const checkTop = b.y;
  const checkBottom = b.y + b.h;
  let td = Math.abs(top - checkBottom);
  let ld = Math.abs(left - checkRight);
  let xMag: number;
  let yMag: number;

  if ((top + bottom) / 2 > (checkTop + checkBottom) / 2) {
    yMag = checkBottom - top + GAP;
  } else {
    yMag = checkTop - bottom - GAP;
    td = Math.abs(bottom - checkTop);
  }
  if ((left + right) / 2 > (checkLeft + checkRight) / 2) {
    xMag = checkRight - left + GAP;
  } else {
    xMag = checkLeft - right - GAP;
    ld = Math.abs(right - checkLeft);
  }
  if (td < ld) xMag = 0;
  else yMag = 0;

  a.ddx += LABEL_FORCE * xMag;
  a.ddy += LABEL_FORCE * yMag;
}

/**
 * Uniform bucket grid over the screen (items off-screen clamp to the border cells).
 * Built by counting sort into reusable typed arrays, so a pass allocates nothing
 * proportional to the number of pairs and crowded columns do not degrade to O(n²).
 */
const CELL = 64;

class BucketGrid {
  columns = 1;
  rows = 1;
  private starts = new Int32Array(1);
  items = new Int32Array(64);
  private cursor = new Int32Array(1);

  reset(width: number, height: number) {
    this.columns = Math.max(1, Math.ceil(width / CELL));
    this.rows = Math.max(1, Math.ceil(height / CELL));
    const cells = this.columns * this.rows;
    if (this.starts.length < cells + 1) {
      this.starts = new Int32Array(cells + 1);
      this.cursor = new Int32Array(cells + 1);
    } else {
      this.starts.fill(0, 0, cells + 1);
    }
  }

  column(x: number) {
    const c = Math.floor(x / CELL);
    return c < 0 ? 0 : c >= this.columns ? this.columns - 1 : c;
  }

  row(y: number) {
    const r = Math.floor(y / CELL);
    return r < 0 ? 0 : r >= this.rows ? this.rows - 1 : r;
  }

  /** Two-pass fill: `visit(add)` is called twice, first to count, then to place. */
  build(visit: (add: (item: number, c0: number, r0: number, c1: number, r1: number) => void) => void) {
    const columns = this.columns;
    const cells = columns * this.rows;
    const starts = this.starts;
    visit((_, c0, r0, c1, r1) => {
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) starts[r * columns + c + 1]++;
    });
    for (let i = 0; i < cells; i++) starts[i + 1] += starts[i];
    if (this.items.length < starts[cells]) this.items = new Int32Array(starts[cells] * 2);
    this.cursor.set(starts.subarray(0, cells));
    const cursor = this.cursor;
    const items = this.items;
    visit((item, c0, r0, c1, r1) => {
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) items[cursor[r * columns + c]++] = item;
    });
  }

  start(column: number, row: number) {
    return this.starts[row * this.columns + column];
  }

  end(column: number, row: number) {
    return this.starts[row * this.columns + column + 1];
  }
}

const boxGrid = new BucketGrid();
const iconGrid = new BucketGrid();
let visited = new Int32Array(64);
let midX = new Float64Array(64);
let midY = new Float64Array(64);
let sortedMidX = new Float64Array(64);
let sortedMidY = new Float64Array(64);

/**
 * One relaxation pass over every drawn label (View::resolveLabelConflicts):
 * clear accelerations, accumulate forces from the frozen positions, then integrate.
 */
export function relaxLabels(entries: Entry[], width: number, height: number, now: number, typography: Typography) {
  const n = entries.length;
  if (!n) return;

  if (midX.length < n) {
    const size = n * 2;
    midX = new Float64Array(size);
    midY = new Float64Array(size);
    sortedMidX = new Float64Array(size);
    sortedMidY = new Float64Array(size);
    visited = new Int32Array(size);
  }

  for (let i = 0; i < n; i++) {
    const { label } = entries[i];
    label.ddx = 0;
    label.ddy = 0;
    midX[i] = label.x + label.w / 2;
    midY[i] = label.y + label.h / 2;
    visited[i] = -1;
  }
  const sortedX = sortedMidX.subarray(0, n);
  const sortedY = sortedMidY.subarray(0, n);
  sortedX.set(midX.subarray(0, n));
  sortedY.set(midY.subarray(0, n));
  sortedX.sort();
  sortedY.sort();

  const half = GAP / 2;
  boxGrid.reset(width, height);
  boxGrid.build((add) => {
    for (let i = 0; i < n; i++) {
      const { label } = entries[i];
      // A fully hidden label (level 2, faded out) no longer occupies space.
      if (label.hidden) continue;
      add(
        i,
        boxGrid.column(label.x - half),
        boxGrid.row(label.y - half),
        boxGrid.column(label.x + label.w + half),
        boxGrid.row(label.y + label.h + half),
      );
    }
  });
  iconGrid.reset(width, height);
  iconGrid.build((add) => {
    for (let i = 0; i < n; i++) {
      const { p } = entries[i];
      const c = iconGrid.column(p.x);
      const r = iconGrid.row(p.y);
      add(i, c, r, c, r);
    }
  });
  const boxes = boxGrid.items;
  const icons = iconGrid.items;

  for (let i = 0; i < n; i++) {
    const { p, label } = entries[i];
    const left = label.x;
    const right = label.x + label.w;
    const top = label.y;
    const bottom = label.y + label.h;

    // Spring to the aircraft, resting a fixed distance off the icon.
    const offsetX = midX[i] - p.x;
    const offsetY = midY[i] - p.y;
    label.ddx -= sign(offsetX) * ATTACHMENT_FORCE * (Math.abs(offsetX) - (ATTACHMENT_DIST + label.w / 2));
    label.ddy -= sign(offsetY) * ATTACHMENT_FORCE * (Math.abs(offsetY) - (ATTACHMENT_DIST + label.h / 2));

    if (left < EDGE_MARGIN) label.ddx += BOUNDARY_FORCE * (EDGE_MARGIN - left);
    if (right > width - EDGE_MARGIN) label.ddx += BOUNDARY_FORCE * (width - EDGE_MARGIN - right);
    if (top < EDGE_MARGIN) label.ddy += BOUNDARY_FORCE * (EDGE_MARGIN - top);
    if (bottom > height - EDGE_MARGIN) label.ddy += BOUNDARY_FORCE * (height - EDGE_MARGIN - bottom);

    const c0 = boxGrid.column(left - half);
    const c1 = boxGrid.column(right + half);
    const r0 = boxGrid.row(top - half);
    const r1 = boxGrid.row(bottom + half);

    // Other icons inside this box push it away.
    for (let r = iconGrid.row(top); r <= iconGrid.row(bottom); r++) {
      for (let c = iconGrid.column(left); c <= iconGrid.column(right); c++) {
        for (let k = iconGrid.start(c, r), end = iconGrid.end(c, r); k < end; k++) {
          const other = entries[icons[k]].p;
          if (other === p || other.x < left || other.x > right || other.y < top || other.y > bottom) continue;
          label.ddx += ICON_FORCE * (midX[i] - other.x > 0 ? other.x - left + GAP : other.x - right - GAP);
          label.ddy += ICON_FORCE * (midY[i] - other.y > 0 ? other.y - top + GAP : other.y - bottom - GAP);
        }
      }
    }

    // Box overlaps including the 10px gap; each pair once, forces applied both ways.
    for (let r = r0; r <= (label.hidden ? -1 : r1); r++) {
      for (let c = c0; c <= c1; c++) {
        for (let k = boxGrid.start(c, r), end = boxGrid.end(c, r); k < end; k++) {
          const j = boxes[k];
          if (j <= i || visited[j] === i) continue;
          visited[j] = i;
          const other = entries[j].label;
          if (left >= other.x + other.w + GAP || other.x >= right + GAP) continue;
          if (top >= other.y + other.h + GAP || other.y >= bottom + GAP) continue;
          overlapForce(label, other);
          overlapForce(other, label);
        }
      }
    }

    // Net drift away from the crowd: Σ sign(mid − other mid) over every other label.
    if (n > 1) {
      const sumX = lowerBound(sortedX, midX[i]) - (n - upperBound(sortedX, midX[i]));
      const sumY = lowerBound(sortedY, midY[i]) - (n - upperBound(sortedY, midY[i]));
      label.ddx += (DENSITY_FORCE * sumX) / (n - 1);
      label.ddy += (DENSITY_FORCE * sumY) / (n - 1);
    }
  }

  for (let i = 0; i < n; i++) {
    const { label } = entries[i];
    label.updateLevel(now, (level) => density(entries, i, level, width, height, typography));
  }

  for (const { label } of entries) label.applyForces();
}

/** AircraftLabel::calculateDensity: the most crowded on-screen neighbour ratio. */
function density(entries: Entry[], index: number, level: number, width: number, height: number, typography: Typography) {
  const self = entries[index].label;
  const extent = self.extent(level, typography);
  let max = 0;
  for (let j = 0; j < entries.length; j++) {
    if (j === index) continue;
    const other = entries[j].label;
    if (other.x + other.w < 0 || other.y + other.h < 0 || other.x > width || other.y > height) continue;
    const value =
      ((extent.w + other.w) / Math.abs(self.x - other.x)) *
      ((extent.h + other.h) / Math.abs(self.y - other.y));
    if (value > max) max = value;
  }
  return max;
}
