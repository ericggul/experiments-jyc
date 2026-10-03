"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { CityData } from "../model/city";
import { frontierWidth, type ThresholdMode } from "../model/threshold";
import { YEAR_TICKS, extentCentre, groundToWorld, yearToWorld } from "../model/axes";
import { buildPrismGeometries } from "./prisms";
import {
  PALETTE,
  createEdgeMaterial,
  createFaceMaterial,
  createPrismUniforms,
  type PrismUniforms,
} from "./prism-material";
import styles from "../screen/xyzt-city.module.css";

/** Axonometric view from the south-east, above. */
const VIEW_DIRECTION = new THREE.Vector3(1, 0.82, 1).normalize();
/** Pixels kept clear around the fitted cube (the right edge holds the control). */
const FIT_MARGIN_X = 150;
const FIT_MARGIN_Y = 72;
/** Aim below the cube's middle (as a share of its height) so the city sits higher on screen. */
const AIM_HEIGHT = 0.36;

type CubeFrame = {
  centre: THREE.Vector3;
  /** Camera and orbit target. */
  aim: THREE.Vector3;
  corners: THREE.Vector3[];
  radius: number;
  axisX: number;
  axisZ: number;
  tickLength: number;
  ticks: { year: number; y: number }[];
};

function cubeFrame(data: CityData): CubeFrame {
  const centre = extentCentre(data);
  const [x0, z0] = groundToWorld(data.extent.minX, data.extent.minY, centre);
  const [x1, z1] = groundToWorld(data.extent.maxX, data.extent.maxY, centre);
  const top = yearToWorld(data.years.min, data);
  const corners: THREE.Vector3[] = [];
  for (const x of [x0, x1]) for (const y of [0, top]) for (const z of [z0, z1]) {
    corners.push(new THREE.Vector3(x, y, z));
  }
  const middle = new THREE.Vector3(0, top / 2, 0);
  const radius = Math.max(...corners.map((corner) => corner.distanceTo(middle)));
  return {
    centre: middle,
    aim: new THREE.Vector3(0, top * AIM_HEIGHT, 0),
    corners,
    radius,
    // South-west corner: x min, y min (south is +Z).
    axisX: x0,
    axisZ: z0,
    tickLength: Math.max(Math.abs(x1 - x0), Math.abs(z1 - z0)) * 0.012,
    ticks: YEAR_TICKS.filter((year) => year >= data.years.min && year <= data.years.present)
      .map((year) => ({ year, y: yearToWorld(year, data) })),
  };
}

function fitZoom(camera: THREE.Camera, frame: CubeFrame, width: number, height: number) {
  camera.updateMatrixWorld();
  const view = camera.matrixWorldInverse;
  const centre = frame.aim.clone().applyMatrix4(view);
  let spanX = 1e-6;
  let spanY = 1e-6;
  const point = new THREE.Vector3();
  for (const corner of frame.corners) {
    point.copy(corner).applyMatrix4(view);
    spanX = Math.max(spanX, Math.abs(point.x - centre.x));
    spanY = Math.max(spanY, Math.abs(point.y - centre.y));
  }
  const usableX = Math.max(80, width - FIT_MARGIN_X * 2);
  const usableY = Math.max(80, height - FIT_MARGIN_Y * 2);
  return Math.min(usableX / (2 * spanX), usableY / (2 * spanY));
}

/** Fits the cube to the viewport, keeping any zoom the participant added. */
function refitCamera(
  camera: THREE.OrthographicCamera,
  frame: CubeFrame,
  width: number,
  height: number,
  previousFit: number | null,
) {
  if (previousFit === null) camera.lookAt(frame.aim);
  const zoom = fitZoom(camera, frame, width, height);
  const ratio = previousFit === null ? 1 : camera.zoom / previousFit;
  camera.zoom = zoom * ratio;
  camera.updateProjectionMatrix();
  return zoom;
}

function applyThreshold(uniforms: PrismUniforms, thresholdM: number, mode: ThresholdMode) {
  uniforms.uZ.value = thresholdM;
  uniforms.uMode.value = mode === "above" ? 1 : 0;
  uniforms.uFrontier.value = frontierWidth(thresholdM);
}

function CameraFit({ frame, onFit }: { frame: CubeFrame; onFit: (zoom: number) => void }) {
  const camera = useThree((state) => state.camera);
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const invalidate = useThree((state) => state.invalidate);
  const fitted = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (!(camera instanceof THREE.OrthographicCamera)) return;
    fitted.current = refitCamera(camera, frame, width, height, fitted.current);
    onFit(fitted.current);
    invalidate();
  }, [camera, frame, width, height, onFit, invalidate]);

  return null;
}

function CityPrisms({ data, thresholdM, mode }: CityCanvasProps) {
  const invalidate = useThree((state) => state.invalidate);
  const geometries = useMemo(() => buildPrismGeometries(data), [data]);
  const [scene] = useState(() => {
    const uniforms = createPrismUniforms();
    return {
      uniforms,
      faces: createFaceMaterial(uniforms),
      edges: createEdgeMaterial(uniforms),
    };
  });

  useEffect(() => () => {
    geometries.faces.dispose();
    geometries.edges.dispose();
  }, [geometries]);
  useEffect(() => () => {
    scene.faces.dispose();
    scene.edges.dispose();
  }, [scene]);
  useEffect(() => {
    applyThreshold(scene.uniforms, thresholdM, mode);
    invalidate();
  }, [scene, thresholdM, mode, invalidate]);

  return <>
    <mesh geometry={geometries.faces} material={scene.faces} frustumCulled={false} />
    <lineSegments geometry={geometries.edges} material={scene.edges} frustumCulled={false} />
  </>;
}

function TimeAxis({ frame }: { frame: CubeFrame }) {
  const geometry = useMemo(() => {
    const { axisX: x, axisZ: z, tickLength, ticks } = frame;
    const points = [x, 0, z, x, frame.centre.y * 2, z];
    for (const tick of ticks) points.push(x, tick.y, z, x - tickLength, tick.y, z + tickLength);
    const result = new THREE.BufferGeometry();
    result.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    return result;
  }, [frame]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return <>
    <lineSegments geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial color={PALETTE.axis} />
    </lineSegments>
    {frame.ticks.map((tick) => (
      <Html
        key={tick.year}
        position={[frame.axisX - frame.tickLength * 2, tick.y, frame.axisZ + frame.tickLength * 2]}
        className={styles.tick}
        zIndexRange={[1, 0]}
      >
        {tick.year}
      </Html>
    ))}
  </>;
}

export type CityCanvasProps = {
  data: CityData;
  thresholdM: number;
  mode: ThresholdMode;
};

export default function CityCanvas({ data, thresholdM, mode }: CityCanvasProps) {
  const frame = useMemo(() => cubeFrame(data), [data]);
  const [fit, setFit] = useState(1);
  const distance = frame.radius * 4;
  const [camera] = useState(() => ({
    position: frame.aim.clone().addScaledVector(VIEW_DIRECTION, distance).toArray(),
    zoom: 1,
    near: 1,
    far: distance * 2 + frame.radius * 2,
  }));

  return <Canvas
    className={styles.canvas}
    orthographic
    frameloop="demand"
    dpr={1}
    camera={camera}
    gl={{ alpha: false, antialias: true, powerPreference: "high-performance" }}
    aria-label="Lower Manhattan buildings as prisms in space and time: the present is the ground and the past stacks upward; each footprint spans its construction year to its demolition year or the present. The height control admits buildings by height. Drag to rotate, right-drag to pan, scroll to zoom."
  >
    <color attach="background" args={[PALETTE.background]} />
    <CameraFit frame={frame} onFit={setFit} />
    <CityPrisms data={data} thresholdM={thresholdM} mode={mode} />
    <TimeAxis frame={frame} />
    <OrbitControls
      makeDefault
      target={frame.aim}
      enableDamping={false}
      enablePan
      minZoom={fit * 0.6}
      maxZoom={fit * 24}
    />
  </Canvas>;
}
