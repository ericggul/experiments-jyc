import * as THREE from "three";

function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(size: number) {
  const element = document.createElement("canvas");
  element.width = size;
  element.height = size;
  const context = element.getContext("2d");
  if (!context) throw new Error("2D canvas unavailable");
  return { element, context };
}

function ledBoard() {
  const size = 1024;
  const { element, context } = canvas(size);
  context.fillStyle = "#000";
  context.fillRect(0, 0, size, size);
  const pitch = size * 0.0405;
  const dot = (x: number, y: number) => {
    const radius = pitch * 0.44;
    const glow = context.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, "rgba(255,255,255,1)");
    glow.addColorStop(0.38, "rgba(255,255,255,0.92)");
    glow.addColorStop(0.72, "rgba(255,255,255,0.28)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = glow;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  };
  return { size, element, context, pitch, dot };
}

function ledTexture(element: HTMLCanvasElement, anisotropy: number) {
  const texture = new THREE.CanvasTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  return texture;
}

/**
 * LED board behind a 300 mm lens: concentric rings of individual emitters on a
 * black board, each a small bright core with a soft falloff through the diffuser.
 */
export function createLedTexture(anisotropy: number) {
  const { size, element, pitch, dot } = ledBoard();
  const centre = size / 2;
  dot(centre, centre);
  for (let ring = 1; ring <= 11; ring++) {
    const radius = ring * pitch;
    const count = Math.round((Math.PI * 2 * radius) / pitch);
    const phase = ring * 0.37;
    for (let index = 0; index < count; index++) {
      const angle = phase + (index / count) * Math.PI * 2;
      dot(centre + Math.cos(angle) * radius, centre + Math.sin(angle) * radius);
    }
  }
  return ledTexture(element, anisotropy);
}

/**
 * Korean left-turn arrow board: the arrow is drawn in rows of emitters, not
 * filled. An open chevron four rows thick and, after a short gap, a shaft three
 * rows thick, on a dark board.
 */
export function createArrowLedTexture(anisotropy: number) {
  const { size, element, pitch, dot } = ledBoard();
  const unit = size / 2;
  const centre = { x: size / 2, y: size / 2 };
  type Point = { x: number; y: number };
  const placed: Point[] = [];
  const place = (point: Point) => {
    if (placed.some((other) => Math.hypot(other.x - point.x, other.y - point.y) < pitch * 0.72)) return;
    placed.push(point);
  };
  // Rows of emitters parallel to a stroke from `from` to `to`, given in board units (radius 1, y up).
  const stroke = (from: Point, to: Point, rows: number) => {
    const ax = centre.x + from.x * unit, ay = centre.y - from.y * unit;
    const bx = centre.x + to.x * unit, by = centre.y - to.y * unit;
    const length = Math.hypot(bx - ax, by - ay);
    const ux = (bx - ax) / length, uy = (by - ay) / length;
    for (let row = 0; row < rows; row++) {
      const offset = (row - (rows - 1) / 2) * pitch * 0.87;
      const steps = Math.round(length / pitch);
      for (let step = 0; step <= steps; step++) {
        const along = (step / steps) * length;
        place({ x: ax + ux * along - uy * offset, y: ay + uy * along + ux * offset });
      }
    }
  };
  // Scaled to fill most of the lens, as on installed heads.
  stroke({ x: -0.8, y: 0 }, { x: -0.1, y: 0.68 }, 4);
  stroke({ x: -0.8, y: 0 }, { x: -0.1, y: -0.68 }, 4);
  stroke({ x: -0.36, y: 0 }, { x: 0.84, y: 0 }, 3);
  for (const point of placed) dot(point.x, point.y);
  return ledTexture(element, anisotropy);
}

/**
 * A portrait as the lamp's light: the picture's own continuous tones, so the
 * person reads at a glance even far away. The mask ellipse is scaled to fill
 * the lens; outside it the board is dark (with a short feathered edge).
 * Luminance inside is stretched between its 2nd and 98th percentiles with a
 * slight gamma, so hair, skin and features keep their contrast.
 */
export function createImageLedTexture(
  image: HTMLImageElement,
  mask: { x: number; y: number; rx: number; ry: number },
  anisotropy: number,
) {
  const size = 1024;
  const { element, context } = canvas(size);
  // Crop the picture to the mask's bounding square so the head fills the lens.
  const half = Math.max(mask.rx, mask.ry);
  const width = image.naturalWidth, height = image.naturalHeight;
  context.drawImage(
    image,
    (mask.x - half) * width, (mask.y - half) * height, 2 * half * width, 2 * half * height,
    0, 0, size, size,
  );
  const frame = context.getImageData(0, 0, size, size);
  const pixels = frame.data;
  const rx = mask.rx / (2 * half), ry = mask.ry / (2 * half);
  const weight = new Float32Array(size * size);
  const luminance = new Float32Array(size * size);
  const samples: number[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = y * size + x;
      const distance = Math.hypot((x / size - 0.5) / rx, (y / size - 0.5) / ry);
      weight[index] = Math.min(1, Math.max(0, (1 - distance) / 0.04));
      const offset = index * 4;
      luminance[index] = (0.2126 * pixels[offset] + 0.7152 * pixels[offset + 1] + 0.0722 * pixels[offset + 2]) / 255;
      if (weight[index] > 0 && (index & 7) === 0) samples.push(luminance[index]);
    }
  }
  samples.sort((a, b) => a - b);
  const low = samples[Math.floor(samples.length * 0.02)] ?? 0;
  const high = samples[Math.floor(samples.length * 0.98)] ?? 1;
  const range = Math.max(1e-3, high - low);
  for (let index = 0; index < size * size; index++) {
    const stretched = Math.min(1, Math.max(0, (luminance[index] - low) / range));
    const byte = Math.round(Math.pow(stretched, 1.15) * weight[index] * 255);
    pixels[index * 4] = byte;
    pixels[index * 4 + 1] = byte;
    pixels[index * 4 + 2] = byte;
    pixels[index * 4 + 3] = 255;
  }
  context.putImageData(frame, 0, 0);
  return ledTexture(element, anisotropy);
}

/** Hot-dip galvanised steel: mottled spangle with faint vertical drip streaks. */
export function createGalvanisedRoughness(anisotropy: number) {
  const size = 512;
  const { element, context } = canvas(size);
  const random = seeded(17);
  const image = context.createImageData(size, size);
  const columns = new Float32Array(size);
  for (let x = 0; x < size; x++) columns[x] = random();
  for (let x = 1; x < size; x++) columns[x] = columns[x] * 0.35 + columns[x - 1] * 0.65;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const spangle = random();
      const value = 0.36 + columns[x] * 0.16 + spangle * 0.1;
      const offset = (y * size + x) * 4;
      const byte = Math.round(Math.min(1, value) * 255);
      image.data[offset] = byte;
      image.data[offset + 1] = byte;
      image.data[offset + 2] = byte;
      image.data[offset + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  context.globalAlpha = 0.1;
  for (let patch = 0; patch < 90; patch++) {
    context.fillStyle = random() > 0.5 ? "#fff" : "#000";
    context.beginPath();
    context.ellipse(random() * size, random() * size, 6 + random() * 26, 4 + random() * 18, random() * Math.PI, 0, Math.PI * 2);
    context.fill();
  }
  const texture = new THREE.CanvasTexture(element);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = anisotropy;
  return texture;
}

/** Broom-finished concrete or pavement tone with aggregate speckle. */
export function createConcreteTexture(anisotropy: number, seed: number, base: number) {
  const size = 512;
  const { element, context } = canvas(size);
  const random = seeded(seed);
  const image = context.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const broom = Math.sin(y * 0.9 + Math.sin(x * 0.02) * 3) * 0.012;
      const grain = (random() - 0.5) * 0.09;
      const aggregate = random() > 0.985 ? (random() - 0.4) * 0.22 : 0;
      const value = Math.max(0, Math.min(1, base + broom + grain + aggregate));
      const offset = (y * size + x) * 4;
      image.data[offset] = Math.round(value * 255);
      image.data[offset + 1] = Math.round(value * 0.985 * 255);
      image.data[offset + 2] = Math.round(value * 0.955 * 255);
      image.data[offset + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = anisotropy;
  return texture;
}
