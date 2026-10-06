import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { HEAD_LAMPS, type HeadKind, type SignalLamp } from "../model/signal-cycle";

// Korean vehicle head with 300 mm lamps, in metres. Auxiliary heads reuse it at a smaller scale.
const LAMP_SPACING = 0.36;
const HEAD_BREADTH = 0.4;
export const BODY_DEPTH = 0.22;
const LENS_RADIUS = 0.152;
const FRONT_Z = BODY_DEPTH / 2;
const VISOR_DEPTH = 0.16;
/** Housing centre forward of the arm axis for arm heads. */
export const ARM_HOUSING_OFFSET = 0.3;

export type Orientation = "horizontal" | "vertical";
export type LedTextures = { disc: THREE.Texture; arrow: THREE.Texture };

// Off, Korean LED lenses read near-black grey with the emitters showing through,
// only faintly tinted by their colour.
export const LAMP_COLOURS: Record<SignalLamp, { light: string; tint: string }> = {
  red: { light: "#ff1d0e", tint: "#1d1514" },
  yellow: { light: "#ffa400", tint: "#1d1a14" },
  // Korean vehicle green sits toward blue-green; the arrow is the same green.
  arrow: { light: "#00ff9c", tint: "#141c19" },
  green: { light: "#00ff9c", tint: "#141c19" },
};

/** Length of a head along its lamp row. */
export const headLength = (kind: HeadKind) => HEAD_LAMPS[kind].length * LAMP_SPACING + 0.02;

/** Distance from an arm head's centre to its outer clamp band, along the arm. */
export const armHeadReach = (kind: HeadKind) => headLength(kind) / 2 - 0.25 + 0.03;

/** Lamp centres in the housing frame, in lamp order. */
export function lampCentres(kind: HeadKind, orientation: Orientation) {
  const order = HEAD_LAMPS[kind];
  return order.map((_, index) => {
    const along = (index - (order.length - 1) / 2) * LAMP_SPACING;
    return orientation === "vertical" ? new THREE.Vector3(0, -along, FRONT_Z) : new THREE.Vector3(along, 0, FRONT_Z);
  });
}

function roundedRect(shape: THREE.Shape | THREE.Path, width: number, height: number, radius: number) {
  const x = -width / 2, y = -height / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
}

/** Merges placed parts into one non-indexed geometry with position, normal and uv. */
function mergeParts(parts: { geometry: THREE.BufferGeometry; matrix?: THREE.Matrix4 }[]) {
  const prepared = parts.map(({ geometry, matrix }) => {
    const flat = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    if (matrix) flat.applyMatrix4(matrix);
    for (const name of Object.keys(flat.attributes)) {
      if (name !== "position" && name !== "normal" && name !== "uv") flat.deleteAttribute(name);
    }
    flat.clearGroups();
    return flat;
  });
  const merged = mergeGeometries(prepared, false);
  prepared.forEach((geometry) => geometry.dispose());
  parts.forEach(({ geometry }) => geometry.dispose());
  if (!merged) throw new Error("Head geometry could not be merged");
  // Shared vertices: each is shaded once however many triangles meet there; hard edges keep distinct normals.
  const indexed = mergeVertices(merged, 1e-5);
  merged.dispose();
  indexed.computeBoundingSphere();
  return indexed;
}

const at = (x: number, y: number, z: number, rotate?: THREE.Euler) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(rotate ?? new THREE.Euler()), new THREE.Vector3(1, 1, 1));

/**
 * Every powder-coated part of one head — body, front and rear doors, hinges,
 * visors, visor lips and lens gaskets — as one geometry centred on the origin,
 * lamps facing +z.
 */
function createHousingGeometry(kind: HeadKind, orientation: Orientation) {
  const vertical = orientation === "vertical";
  const length = headLength(kind);
  const width = vertical ? HEAD_BREADTH : length;
  const height = vertical ? length : HEAD_BREADTH;
  const centres = lampCentres(kind, orientation);
  const parts: { geometry: THREE.BufferGeometry; matrix?: THREE.Matrix4 }[] = [];

  parts.push({ geometry: new RoundedBoxGeometry(width, height, BODY_DEPTH, 3, 0.035) });

  // Front door: a separate pressed plate, its seam with the body visible as a shadow line.
  const door = new THREE.Shape();
  roundedRect(door, width + 0.014, height + 0.014, 0.045);
  for (const centre of centres) {
    const hole = new THREE.Path();
    hole.absarc(centre.x, centre.y, LENS_RADIUS + 0.004, 0, Math.PI * 2, true);
    door.holes.push(hole);
  }
  parts.push({
    geometry: new THREE.ExtrudeGeometry(door, {
      depth: 0.008, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 1, curveSegments: 24,
    }),
    matrix: at(0, 0, FRONT_Z - 0.004),
  });

  // Rear access door and hinge knuckles along the long edge.
  parts.push({ geometry: new RoundedBoxGeometry(width - 0.08, height - 0.07, 0.012, 2, 0.005), matrix: at(0, 0, -BODY_DEPTH / 2 - 0.004) });
  const hingeOffset = length / 2 - 0.19;
  for (const sign of [-1, 1]) {
    parts.push({
      geometry: new THREE.CylinderGeometry(0.009, 0.009, 0.07, 10),
      matrix: vertical
        ? at(-width / 2 + 0.02, sign * hingeOffset, -BODY_DEPTH / 2 - 0.01)
        : at(sign * hingeOffset, height / 2 - 0.02, -BODY_DEPTH / 2 - 0.01, new THREE.Euler(0, 0, Math.PI / 2)),
    });
  }

  // Visor: a short cut cylinder of sheet metal, open underneath so the whole lamp reads from below.
  const visorGap = Math.PI * 0.8;
  const visorStart = -Math.PI / 2 + visorGap / 2;
  const visorEnd = visorStart + Math.PI * 2 - visorGap;
  const visorShape = new THREE.Shape();
  visorShape.absarc(0, 0, LENS_RADIUS + 0.026, visorStart, visorEnd, false);
  visorShape.absarc(0, 0, LENS_RADIUS + 0.02, visorEnd, visorStart, true);
  visorShape.closePath();
  for (const centre of centres) {
    parts.push({
      geometry: new THREE.ExtrudeGeometry(visorShape, { depth: VISOR_DEPTH, bevelEnabled: false, curveSegments: 24 }),
      matrix: at(centre.x, centre.y, FRONT_Z + 0.006),
    });
    parts.push({
      geometry: new THREE.TorusGeometry(LENS_RADIUS + 0.024, 0.004, 4, 24, Math.PI * 2 - visorGap),
      matrix: at(centre.x, centre.y, FRONT_Z + 0.006 + VISOR_DEPTH, new THREE.Euler(0, 0, visorStart)),
    });
    parts.push({
      geometry: new THREE.TorusGeometry(LENS_RADIUS + 0.004, 0.0065, 6, 40),
      matrix: at(centre.x, centre.y, FRONT_Z + 0.007),
    });
  }
  return mergeParts(parts);
}

function hexBolt(radius: number, length: number) {
  return new THREE.CylinderGeometry(radius, radius, length, 6);
}

/**
 * Two clamp brackets for a horizontal head on an arm running along x through
 * the origin; the housing sits forward on +z at `ARM_HOUSING_OFFSET`.
 */
export function createArmClampGeometry(kind: HeadKind, armRadius: number) {
  const parts: { geometry: THREE.BufferGeometry; matrix?: THREE.Matrix4 }[] = [];
  const backZ = ARM_HOUSING_OFFSET - BODY_DEPTH / 2 - 0.01;
  const clamp = headLength(kind) / 2 - 0.25;
  const strutLength = backZ - 0.012 - armRadius;
  for (const x of [-clamp, clamp]) {
    parts.push({ geometry: new RoundedBoxGeometry(0.09, 0.3, 0.012, 2, 0.004), matrix: at(x, 0, backZ - 0.006) });
    parts.push({ geometry: new RoundedBoxGeometry(0.05, 0.06, strutLength, 2, 0.006), matrix: at(x, 0, armRadius + strutLength / 2) });
    parts.push({ geometry: new RoundedBoxGeometry(0.075, 0.1, 0.03, 2, 0.006), matrix: at(x, 0, armRadius + 0.01) });
    for (const offset of [-0.022, 0.022]) {
      parts.push({
        geometry: new THREE.TorusGeometry(armRadius + 0.006, 0.008, 6, 24),
        matrix: at(x + offset, 0, 0, new THREE.Euler(0, Math.PI / 2, 0)),
      });
    }
    for (const y of [-0.11, 0.11]) {
      parts.push({ geometry: hexBolt(0.011, 0.012), matrix: at(x, y, backZ - 0.016, new THREE.Euler(Math.PI / 2, 0, 0)) });
    }
  }
  return mergeParts(parts);
}

/**
 * Upper and lower brackets for a vertical head on a pole whose axis runs along
 * y through the origin. Returns the geometry and the housing's forward offset.
 */
export function createPoleClampGeometry(kind: HeadKind, poleRadius: number) {
  const parts: { geometry: THREE.BufferGeometry; matrix?: THREE.Matrix4 }[] = [];
  const housingOffset = poleRadius + BODY_DEPTH / 2 + 0.05;
  const backZ = housingOffset - BODY_DEPTH / 2 - 0.01;
  const clamp = headLength(kind) / 2 - 0.2;
  const strutLength = backZ - 0.012 - poleRadius + 0.01;
  for (const y of [-clamp, clamp]) {
    parts.push({ geometry: new RoundedBoxGeometry(0.3, 0.09, 0.012, 2, 0.004), matrix: at(0, y, backZ - 0.006) });
    parts.push({ geometry: new RoundedBoxGeometry(0.06, 0.05, strutLength, 2, 0.006), matrix: at(0, y, poleRadius - 0.01 + strutLength / 2) });
    parts.push({ geometry: new RoundedBoxGeometry(0.1, 0.075, 0.03, 2, 0.006), matrix: at(0, y, poleRadius + 0.008) });
    for (const shift of [-0.022, 0.022]) {
      parts.push({
        geometry: new THREE.TorusGeometry(poleRadius + 0.006, 0.009, 6, 28),
        matrix: at(0, y + shift, 0, new THREE.Euler(Math.PI / 2, 0, 0)),
      });
    }
    for (const x of [-0.11, 0.11]) {
      parts.push({ geometry: hexBolt(0.011, 0.012), matrix: at(x, y, backZ - 0.016, new THREE.Euler(Math.PI / 2, 0, 0)) });
    }
  }
  return { geometry: mergeParts(parts), housingOffset };
}

/**
 * Lets one instanced lamp material show some instances lit and others dark:
 * a per-instance `lampOn` (0 or 1) scales the emissive term.
 */
function withLampSwitch<T extends THREE.MeshStandardMaterial>(material: T) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float lampOn;\nvarying float vLampOn;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvLampOn = lampOn;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vLampOn;")
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance *= vLampOn;");
  };
  material.customProgramCacheKey = () => "lamp-switch";
  return material;
}

/**
 * Shared geometry and materials for every head in the scene. Housings are
 * cached per kind and orientation; boards and lenses are one geometry each.
 */
export function createHeadKit(textures: LedTextures, ledIntensity: Record<SignalLamp, number>, lensGlow: number) {
  const housings = new Map<string, THREE.BufferGeometry>();
  const housing = (kind: HeadKind, orientation: Orientation) => {
    const key = `${kind}:${orientation}`;
    let geometry = housings.get(key);
    if (!geometry) {
      geometry = createHousingGeometry(kind, orientation);
      housings.set(key, geometry);
    }
    return geometry;
  };

  const board = new THREE.CircleGeometry(LENS_RADIUS, 56);
  board.translate(0, 0, 0.001);
  const domeHeight = 0.02;
  const domeRadius = (LENS_RADIUS * LENS_RADIUS + domeHeight * domeHeight) / (2 * domeHeight);
  const domeAngle = Math.asin(LENS_RADIUS / domeRadius);
  const domeProfile: THREE.Vector2[] = [];
  for (let step = 0; step <= 14; step++) {
    const angle = (step / 14) * domeAngle;
    domeProfile.push(new THREE.Vector2(domeRadius * Math.sin(angle), domeRadius * Math.cos(angle) - domeRadius * Math.cos(domeAngle)));
  }
  const lens = new THREE.LatheGeometry(domeProfile, 56);
  lens.rotateX(Math.PI / 2);
  lens.translate(0, 0, 0.004);
  // Planar UVs matching the board's, so the lens glows only over lit emitters (the arrow, not the disc).
  const lensPosition = lens.getAttribute("position");
  const lensUv = lens.getAttribute("uv");
  for (let index = 0; index < lensPosition.count; index++) {
    lensUv.setXY(index, lensPosition.getX(index) / (2 * LENS_RADIUS) + 0.5, lensPosition.getY(index) / (2 * LENS_RADIUS) + 0.5);
  }

  const powderCoat = new THREE.MeshPhysicalMaterial({
    color: "#1b1c1e", roughness: 0.62, metalness: 0.05, clearcoat: 0.35, clearcoatRoughness: 0.45,
  });
  const hardware = new THREE.MeshStandardMaterial({ color: "#9a9d9c", roughness: 0.4, metalness: 0.95 });
  const boards = {} as Record<SignalLamp, THREE.MeshStandardMaterial>;
  const lenses = {} as Record<SignalLamp, THREE.MeshPhysicalMaterial>;
  for (const lamp of Object.keys(LAMP_COLOURS) as SignalLamp[]) {
    const colours = LAMP_COLOURS[lamp];
    const texture = lamp === "arrow" ? textures.arrow : textures.disc;
    boards[lamp] = withLampSwitch(new THREE.MeshStandardMaterial({
      color: "#3a3a3a", map: texture, roughness: 0.55, metalness: 0,
      emissive: colours.light, emissiveMap: texture, emissiveIntensity: ledIntensity[lamp],
    }));
    lenses[lamp] = withLampSwitch(new THREE.MeshPhysicalMaterial({
      // Weathered polycarbonate: soft enough that the sun does not bloom into a false lit lamp.
      color: colours.tint, roughness: 0.22, metalness: 0, ior: 1.49, clearcoat: 0.5, clearcoatRoughness: 0.28,
      transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide,
      emissive: colours.light, emissiveMap: texture, emissiveIntensity: lensGlow,
    }));
  }

  return {
    housing,
    board,
    lens,
    powderCoat,
    hardware,
    boards,
    lenses,
    dispose() {
      housings.forEach((geometry) => geometry.dispose());
      board.dispose();
      lens.dispose();
      powderCoat.dispose();
      hardware.dispose();
      Object.values(boards).forEach((material) => material.dispose());
      Object.values(lenses).forEach((material) => material.dispose());
    },
  };
}

export type HeadKit = ReturnType<typeof createHeadKit>;
