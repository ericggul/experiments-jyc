import * as THREE from "three";
import type { TemporalCell } from "../model";
import {
  CAMERA_MONOLITH_MAX_PENDING_FRAMES,
  type CameraMonolithFrame,
} from "../transport";
import {
  FRAME_ATLAS_COLUMNS,
  FRAME_ATLAS_ROWS,
  FrameAtlas,
} from "./frame-atlas";

export const CAMERA_MONOLITH_RENDERER_REVISION = 2;

export type CameraProjection = "perspective" | "orthographic";
export type CameraSurface = "white" | "company" | "cat" | "kiss" | "politician";
export type FieldPoint = { x: number; y: number };

const MAX_CELL_COUNT = 4096;
const MAX_STRATA_COUNT = 2048;
const CURRENT_LAYER_Y = 700;
const MAX_TEMPORAL_EXTENT = 4800;
const FLOOR_Y = 0;
const FLOOR_SURFACE_Y = FLOOR_Y - 0.6;
const CAMERA_DISTANCE_MULTIPLIER = 6;
const CAMERA_TARGET_Y = 72;
const INITIAL_CAMERA_ELEVATION = Math.PI / 2;
const MEDIA_OVERSCAN = 2;
export const CAMERA_MONOLITH_DEFAULT_VERTICAL_SCALE = 1.2;

type CellPlayback = {
  tile: number;
  startedAt: number;
};

function atlasUvFunction() {
  return `
    vec2 atlasUv(float tileIndex, vec2 sourceUv) {
      float column = mod(tileIndex, ${FRAME_ATLAS_COLUMNS.toFixed(1)});
      float row = floor(tileIndex / ${FRAME_ATLAS_COLUMNS.toFixed(1)});
      vec2 localUv = mix(vec2(0.012), vec2(0.988), sourceUv);
      return vec2(
        (column + localUv.x) / ${FRAME_ATLAS_COLUMNS.toFixed(1)},
        1.0 - (row + 1.0 - localUv.y) / ${FRAME_ATLAS_ROWS.toFixed(1)}
      );
    }
  `;
}

export class CameraMonolithScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  private readonly cameraProjection: CameraProjection;
  private readonly raycaster = new THREE.Raycaster();
  private readonly floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -FLOOR_Y);
  private readonly hitPoint = new THREE.Vector3();
  private readonly ndc = new THREE.Vector2();
  private readonly local = new THREE.Object3D();
  private readonly fieldTexture: THREE.CanvasTexture;
  private readonly floorMaterial: THREE.MeshBasicMaterial;
  private readonly floor: THREE.Mesh;
  private readonly atlas = new FrameAtlas();
  private readonly pillarTile = new THREE.InstancedBufferAttribute(
    new Float32Array(MAX_CELL_COUNT),
    1,
  );
  private readonly pillarStartedAt = new THREE.InstancedBufferAttribute(
    new Float32Array(MAX_CELL_COUNT),
    1,
  );
  private readonly pillarMaterial: THREE.ShaderMaterial;
  private readonly pillars: THREE.InstancedMesh;
  private readonly mediaTile = new THREE.InstancedBufferAttribute(
    new Float32Array(MAX_CELL_COUNT),
    1,
  );
  private readonly mediaMaterial: THREE.ShaderMaterial;
  private readonly mediaCells: THREE.InstancedMesh;
  private readonly strataTile = new THREE.InstancedBufferAttribute(
    new Float32Array(MAX_STRATA_COUNT),
    1,
  );
  private readonly strataStartedAt = new THREE.InstancedBufferAttribute(
    new Float32Array(MAX_STRATA_COUNT),
    1,
  );
  private readonly strataEndedAt = new THREE.InstancedBufferAttribute(
    new Float32Array(MAX_STRATA_COUNT),
    1,
  );
  private readonly strataMaterial: THREE.ShaderMaterial;
  private readonly strata: THREE.InstancedMesh;
  private readonly playbackByCell = new Map<string, CellPlayback>();
  private readonly pendingFrames: CameraMonolithFrame[] = [];
  private cells: TemporalCell[] = [];
  private width = 1;
  private height = 1;
  private fitDistance = 1;
  private cameraAzimuth = 0;
  private cameraElevation = INITIAL_CAMERA_ELEVATION;
  private cameraZoom = 1;
  private surface: CameraSurface = "company";
  private mediaSpeed = 12;
  private temporalGrowthRate = 1000;
  private verticalScale = CAMERA_MONOLITH_DEFAULT_VERTICAL_SCALE;
  private strataEnabled = true;
  private strataCount = 0;
  private strataWriteIndex = 0;
  private currentTile: number | null = null;
  private currentFrameStartedAt = 0;
  private lastElapsedSeconds = 0;
  private nextFrameAt = 0;
  private disposed = false;

  constructor({
    canvas,
    fieldCanvas,
    paperColor,
    blockColor,
    cameraProjection = "orthographic",
  }: {
    canvas: HTMLCanvasElement;
    fieldCanvas: HTMLCanvasElement;
    paperColor: string;
    blockColor: string;
    cameraProjection?: CameraProjection;
  }) {
    this.cameraProjection = cameraProjection;
    this.camera =
      cameraProjection === "orthographic"
        ? new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 1, 10000)
        : new THREE.PerspectiveCamera(40, 1, 1, 10000);
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas,
      powerPreference: "high-performance",
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.13;

    this.fieldTexture = new THREE.CanvasTexture(fieldCanvas);
    this.fieldTexture.colorSpace = THREE.SRGBColorSpace;
    this.fieldTexture.minFilter = THREE.LinearFilter;
    this.fieldTexture.magFilter = THREE.LinearFilter;
    this.floorMaterial = new THREE.MeshBasicMaterial({
      map: this.fieldTexture,
      side: THREE.DoubleSide,
    });
    const floorGeometry = new THREE.PlaneGeometry(1, 1);
    floorGeometry.rotateX(-Math.PI / 2);
    this.floor = new THREE.Mesh(floorGeometry, this.floorMaterial);
    this.floor.position.y = FLOOR_SURFACE_Y;
    this.floor.visible = false;
    this.scene.add(this.floor);

    this.pillarTile.setUsage(THREE.DynamicDrawUsage);
    this.pillarStartedAt.setUsage(THREE.DynamicDrawUsage);
    const pillarGeometry = new THREE.BoxGeometry(1, 1, 1);
    pillarGeometry.setAttribute("mediaTile", this.pillarTile);
    pillarGeometry.setAttribute("frameStartedAt", this.pillarStartedAt);
    this.pillarMaterial = new THREE.ShaderMaterial({
      uniforms: {
        atlas: { value: this.atlas.texture },
        pillarColor: { value: new THREE.Color(blockColor) },
        paperColor: { value: new THREE.Color(paperColor) },
        useCamera: { value: 0 },
        elapsedSeconds: { value: 0 },
        growthRate: { value: this.temporalGrowthRate },
        verticalScale: { value: this.verticalScale },
      },
      vertexShader: `
        attribute float mediaTile;
        attribute float frameStartedAt;
        uniform float elapsedSeconds;
        uniform float growthRate;
        uniform float verticalScale;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying float vTile;
        void main() {
          vUv = uv;
          vNormal = normal;
          vTile = mediaTile;
          float length = min(
            ${MAX_TEMPORAL_EXTENT.toFixed(1)},
            max(0.001, elapsedSeconds - frameStartedAt) * growthRate * verticalScale
          );
          vec3 temporalPosition = position;
          temporalPosition.y = temporalPosition.y * length - length * 0.5;
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(temporalPosition, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D atlas;
        uniform vec3 pillarColor;
        uniform vec3 paperColor;
        uniform float useCamera;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying float vTile;
        ${atlasUvFunction()}
        void main() {
          float topFace = step(0.5, vNormal.y);
          float sideShade = mix(0.16, 0.32, abs(vNormal.x));
          vec3 base = mix(mix(pillarColor, paperColor, sideShade), pillarColor, topFace);
          vec4 cameraFrame = texture2D(atlas, atlasUv(vTile, vUv));
          gl_FragColor = vec4(mix(base, cameraFrame.rgb, useCamera), 1.0);
          #include <colorspace_fragment>
        }
      `,
      depthTest: true,
      depthWrite: true,
      toneMapped: false,
    });
    this.pillars = new THREE.InstancedMesh(
      pillarGeometry,
      this.pillarMaterial,
      MAX_CELL_COUNT,
    );
    this.pillars.count = 0;
    this.pillars.frustumCulled = false;
    this.pillars.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.pillars);

    this.mediaTile.setUsage(THREE.DynamicDrawUsage);
    const mediaGeometry = new THREE.PlaneGeometry(1, 1);
    mediaGeometry.rotateX(-Math.PI / 2);
    mediaGeometry.setAttribute("mediaTile", this.mediaTile);
    this.mediaMaterial = new THREE.ShaderMaterial({
      uniforms: { atlas: { value: this.atlas.texture } },
      vertexShader: `
        attribute float mediaTile;
        varying vec2 vUv;
        varying float vTile;
        void main() {
          vUv = uv;
          vTile = mediaTile;
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D atlas;
        varying vec2 vUv;
        varying float vTile;
        ${atlasUvFunction()}
        void main() {
          gl_FragColor = texture2D(atlas, atlasUv(vTile, vUv));
          #include <colorspace_fragment>
        }
      `,
      depthTest: true,
      depthWrite: true,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    this.mediaCells = new THREE.InstancedMesh(
      mediaGeometry,
      this.mediaMaterial,
      MAX_CELL_COUNT,
    );
    this.mediaCells.count = 0;
    this.mediaCells.frustumCulled = false;
    this.mediaCells.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mediaCells.visible = false;
    this.scene.add(this.mediaCells);

    this.strataTile.setUsage(THREE.DynamicDrawUsage);
    this.strataStartedAt.setUsage(THREE.DynamicDrawUsage);
    this.strataEndedAt.setUsage(THREE.DynamicDrawUsage);
    const strataGeometry = new THREE.BoxGeometry(1, 1, 1);
    strataGeometry.setAttribute("mediaTile", this.strataTile);
    strataGeometry.setAttribute("segmentStartedAt", this.strataStartedAt);
    strataGeometry.setAttribute("segmentEndedAt", this.strataEndedAt);
    this.strataMaterial = new THREE.ShaderMaterial({
      uniforms: {
        atlas: { value: this.atlas.texture },
        elapsedSeconds: { value: 0 },
        growthRate: { value: this.temporalGrowthRate },
        verticalScale: { value: this.verticalScale },
      },
      vertexShader: `
        attribute float mediaTile;
        attribute float segmentStartedAt;
        attribute float segmentEndedAt;
        uniform float elapsedSeconds;
        uniform float growthRate;
        uniform float verticalScale;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying float vTile;
        void main() {
          float length = max(
            0.0001,
            (segmentEndedAt - segmentStartedAt) * growthRate * verticalScale
          );
          float below =
            max(0.0, elapsedSeconds - segmentEndedAt) *
            growthRate *
            verticalScale;
          vec3 temporalPosition = position;
          temporalPosition.y = temporalPosition.y * length - below - length * 0.5;
          vUv = uv;
          vNormal = normal;
          vTile = mediaTile;
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(temporalPosition, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D atlas;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying float vTile;
        ${atlasUvFunction()}
        void main() {
          if (abs(vNormal.y) > 0.5) discard;
          gl_FragColor = texture2D(atlas, atlasUv(vTile, vUv));
          #include <colorspace_fragment>
        }
      `,
      depthTest: true,
      depthWrite: true,
      toneMapped: false,
    });
    this.strata = new THREE.InstancedMesh(
      strataGeometry,
      this.strataMaterial,
      MAX_STRATA_COUNT,
    );
    this.strata.count = 0;
    this.strata.frustumCulled = false;
    this.strata.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.strata.visible = false;
    this.scene.add(this.strata);

    this.setPaperColor(paperColor);
  }

  enqueueFrame(frame: CameraMonolithFrame) {
    if (this.pendingFrames.length >= CAMERA_MONOLITH_MAX_PENDING_FRAMES) {
      return false;
    }
    this.pendingFrames.push(frame);
    return true;
  }

  private consumeNextFrame(elapsedSeconds: number) {
    if (
      this.mediaSpeed === 0 ||
      this.pendingFrames.length === 0 ||
      elapsedSeconds < this.nextFrameAt
    ) {
      return;
    }
    const frame = this.pendingFrames.shift();
    if (!frame) return;
    this.nextFrameAt = elapsedSeconds + 1 / this.mediaSpeed;
    try {
      const tile = this.atlas.write(frame);
      if (!this.disposed) this.applyFrame(tile, this.lastElapsedSeconds);
    } catch {
      // The bitmap is already closed by the atlas; continue with the next frame.
    }
  }

  private applyFrame(tile: number, elapsedSeconds: number) {
    for (const cell of this.cells) {
      const playback = this.playbackByCell.get(cell.id);
      if (playback && this.strataEnabled) {
        this.addStratum(cell, playback.tile, playback.startedAt, elapsedSeconds);
      }
      this.playbackByCell.set(cell.id, { tile, startedAt: elapsedSeconds });
    }
    this.currentTile = tile;
    this.currentFrameStartedAt = elapsedSeconds;
    this.refreshCells();
  }

  private addStratum(
    cell: TemporalCell,
    tile: number,
    startedAt: number,
    endedAt: number,
  ) {
    if (!this.strataEnabled || endedAt <= startedAt) return;
    const index = this.strataWriteIndex;
    this.local.position.set(
      cell.centerX - this.width / 2,
      CURRENT_LAYER_Y,
      cell.centerY - this.height / 2,
    );
    this.local.rotation.set(0, 0, 0);
    this.local.scale.set(cell.width, 1, cell.height);
    this.local.updateMatrix();
    this.strata.setMatrixAt(index, this.local.matrix);
    this.strataTile.setX(index, tile);
    this.strataStartedAt.setX(index, startedAt);
    this.strataEndedAt.setX(index, endedAt);

    this.strataWriteIndex = (index + 1) % MAX_STRATA_COUNT;
    this.strataCount = Math.min(MAX_STRATA_COUNT, this.strataCount + 1);
    this.strata.count = this.strataCount;
    this.strata.visible = this.surface !== "white" && this.strataCount > 0;
    this.strata.instanceMatrix.needsUpdate = true;
    this.strataTile.needsUpdate = true;
    this.strataStartedAt.needsUpdate = true;
    this.strataEndedAt.needsUpdate = true;
  }

  setTemporalCells(cells: readonly TemporalCell[]) {
    this.cells = cells.slice(0, MAX_CELL_COUNT);
    const activeIds = new Set(this.cells.map((cell) => cell.id));
    for (const id of this.playbackByCell.keys()) {
      if (!activeIds.has(id)) this.playbackByCell.delete(id);
    }
    if (this.currentTile !== null) {
      for (const cell of this.cells) {
        if (!this.playbackByCell.has(cell.id)) {
          this.playbackByCell.set(cell.id, {
            tile: this.currentTile,
            startedAt: Math.max(cell.createdAt, this.currentFrameStartedAt),
          });
        }
      }
    }
    if (this.cells.length === 0) this.clearStrata();
    this.refreshCells();
  }

  private refreshCells() {
    const count = this.cells.length;
    for (let index = 0; index < count; index += 1) {
      const cell = this.cells[index];
      const playback = this.playbackByCell.get(cell.id);
      const startedAt =
        this.strataEnabled && playback ? playback.startedAt : cell.createdAt;
      this.local.position.set(
        cell.centerX - this.width / 2,
        CURRENT_LAYER_Y,
        cell.centerY - this.height / 2,
      );
      this.local.rotation.set(0, 0, 0);
      this.local.scale.set(cell.width, 1, cell.height);
      this.local.updateMatrix();
      this.pillars.setMatrixAt(index, this.local.matrix);
      this.pillarTile.setX(index, playback?.tile ?? 0);
      this.pillarStartedAt.setX(index, startedAt);

      this.local.position.set(
        cell.centerX - this.width / 2,
        CURRENT_LAYER_Y + 0.02,
        cell.centerY - this.height / 2,
      );
      this.local.scale.set(
        cell.width + MEDIA_OVERSCAN,
        1,
        cell.height + MEDIA_OVERSCAN,
      );
      this.local.updateMatrix();
      this.mediaCells.setMatrixAt(index, this.local.matrix);
      this.mediaTile.setX(index, playback?.tile ?? 0);
    }
    this.pillars.count = count;
    this.mediaCells.count = count;
    this.pillars.instanceMatrix.needsUpdate = true;
    this.pillarTile.needsUpdate = true;
    this.pillarStartedAt.needsUpdate = true;
    this.mediaCells.instanceMatrix.needsUpdate = true;
    this.mediaTile.needsUpdate = true;
    const showCamera = this.surface !== "white" && this.currentTile !== null;
    this.pillarMaterial.uniforms.useCamera.value = showCamera ? 1 : 0;
    this.mediaCells.visible = showCamera && count > 0;
  }

  private clearStrata() {
    this.strataCount = 0;
    this.strataWriteIndex = 0;
    this.strata.count = 0;
    this.strata.visible = false;
  }

  setAttentionSurface(surface: CameraSurface) {
    this.surface = surface;
    this.clearStrata();
    this.refreshCells();
  }

  setMediaSpeed(speed: number) {
    this.mediaSpeed = THREE.MathUtils.clamp(speed, 0, 24);
    this.nextFrameAt = this.lastElapsedSeconds;
  }

  setTemporalGrowthRate(rate: number) {
    this.temporalGrowthRate = THREE.MathUtils.clamp(rate, 0, 1000);
    this.pillarMaterial.uniforms.growthRate.value = this.temporalGrowthRate;
    this.strataMaterial.uniforms.growthRate.value = this.temporalGrowthRate;
  }

  setVerticalScale(scale: number) {
    this.verticalScale = THREE.MathUtils.clamp(scale, 0.25, 4);
    this.pillarMaterial.uniforms.verticalScale.value = this.verticalScale;
    this.strataMaterial.uniforms.verticalScale.value = this.verticalScale;
    this.refreshCells();
  }

  setMediaStrataEnabled(enabled: boolean) {
    if (this.strataEnabled === enabled) return;
    this.strataEnabled = enabled;
    this.clearStrata();
    for (const playback of this.playbackByCell.values()) {
      playback.startedAt = this.lastElapsedSeconds;
    }
  }

  setPaperColor(color: string) {
    this.renderer.setClearColor(color, 1);
    this.scene.background = new THREE.Color(color);
    this.pillarMaterial.uniforms.paperColor.value.set(color);
  }

  setBlockColor(color: string) {
    this.pillarMaterial.uniforms.pillarColor.value.set(color);
  }

  setSize(width: number, height: number) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(this.width, this.height, false);

    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.aspect = this.width / this.height;
      const verticalFov = THREE.MathUtils.degToRad(this.camera.fov);
      const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * this.camera.aspect);
      this.fitDistance = Math.max(
        this.width / 2 / Math.tan(horizontalFov / 2),
        this.height / 2 / Math.tan(verticalFov / 2),
      ) * 1.1;
    } else {
      this.camera.left = -this.width / 2;
      this.camera.right = this.width / 2;
      this.camera.top = this.height / 2;
      this.camera.bottom = -this.height / 2;
      this.fitDistance = Math.max(this.width, this.height) * 1.5 * CAMERA_DISTANCE_MULTIPLIER;
    }
    this.updateCamera();
    this.floor.scale.set(this.width, 1, this.height);
    this.floor.updateMatrixWorld();
    this.refreshCells();
  }

  private updateCamera() {
    const distance = this.fitDistance * this.cameraZoom;
    const horizontalDistance = Math.cos(this.cameraElevation) * distance;
    const sinAzimuth = Math.sin(this.cameraAzimuth);
    const cosAzimuth = Math.cos(this.cameraAzimuth);
    const sinElevation = Math.sin(this.cameraElevation);
    const cosElevation = Math.cos(this.cameraElevation);
    this.camera.position.set(
      sinAzimuth * horizontalDistance,
      sinElevation * distance,
      cosAzimuth * horizontalDistance,
    );
    this.camera.up.set(
      -sinAzimuth * sinElevation,
      cosElevation,
      -cosAzimuth * sinElevation,
    );
    this.camera.near = Math.max(1, distance * 0.34);
    this.camera.far = distance * 2.35 + 520;
    if (this.camera instanceof THREE.OrthographicCamera) {
      this.camera.zoom = 1 / this.cameraZoom;
    }
    this.camera.lookAt(0, CAMERA_TARGET_Y, 0);
    this.camera.updateProjectionMatrix();
  }

  orbit(deltaX: number, deltaY: number) {
    this.cameraAzimuth = THREE.MathUtils.euclideanModulo(
      this.cameraAzimuth - deltaX * 0.0045,
      Math.PI * 2,
    );
    this.cameraElevation = THREE.MathUtils.euclideanModulo(
      this.cameraElevation + deltaY * 0.0035,
      Math.PI * 2,
    );
    this.updateCamera();
  }

  zoom(deltaY: number) {
    this.cameraZoom = THREE.MathUtils.clamp(
      this.cameraZoom * Math.exp(deltaY * 0.0015),
      0.28,
      3,
    );
    this.updateCamera();
  }

  resetCamera() {
    this.cameraAzimuth = 0;
    this.cameraElevation = INITIAL_CAMERA_ELEVATION;
    this.cameraZoom = 1;
    this.updateCamera();
  }

  screenToField(screenX: number, screenY: number): FieldPoint | null {
    this.ndc.set(
      (screenX / this.width) * 2 - 1,
      -(screenY / this.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const hit = this.raycaster.ray.intersectPlane(this.floorPlane, this.hitPoint);
    if (!hit) return null;
    return {
      x: THREE.MathUtils.clamp(hit.x + this.width / 2, 0, this.width),
      y: THREE.MathUtils.clamp(hit.z + this.height / 2, 0, this.height),
    };
  }

  updateField() {
    this.fieldTexture.needsUpdate = true;
  }

  render(elapsedSeconds: number) {
    this.lastElapsedSeconds = elapsedSeconds;
    this.consumeNextFrame(elapsedSeconds);
    this.pillarMaterial.uniforms.elapsedSeconds.value = elapsedSeconds;
    this.strataMaterial.uniforms.elapsedSeconds.value = elapsedSeconds;
    this.renderer.render(this.scene, this.camera);
  }

  getPerformanceInfo() {
    return {
      drawCalls: this.renderer.info.render.calls,
      textures: this.renderer.info.memory.textures,
      triangles: this.renderer.info.render.triangles,
    };
  }

  getTemporalColumnCount() {
    return this.cells.length;
  }

  getMediaStrataCount() {
    return this.strataCount;
  }

  dispose() {
    this.disposed = true;
    for (const frame of this.pendingFrames) frame.image.close();
    this.pendingFrames.length = 0;
    this.pillars.geometry.dispose();
    this.pillarMaterial.dispose();
    this.mediaCells.geometry.dispose();
    this.mediaMaterial.dispose();
    this.strata.geometry.dispose();
    this.strataMaterial.dispose();
    this.floor.geometry.dispose();
    this.floorMaterial.dispose();
    this.fieldTexture.dispose();
    this.atlas.dispose();
    this.renderer.dispose();
  }
}
