export const CAMERA_MONOLITH_EXPERIMENT_ID = "camera-monolith";
export const CAMERA_MONOLITH_VARIANT_ID = "default";

export const CAMERA_MONOLITH_CAPTURE_INTERVAL_MS = 500;
export const CAMERA_MONOLITH_CAPTURE_WIDTH = 240;
export const CAMERA_MONOLITH_CAPTURE_HEIGHT = 240;
export const CAMERA_MONOLITH_MAX_PENDING_FRAMES = 120;

export const cameraMonolithEvents = {
  join: "camera-monolith:join",
  hello: "camera-monolith:hello",
  presence: "camera-monolith:presence",
  publish: "camera-monolith:publish",
  unpublish: "camera-monolith:unpublish",
  viewerReady: "camera-monolith:viewer:ready",
  viewerLeave: "camera-monolith:viewer:leave",
  publisherLeave: "camera-monolith:publisher:leave",
  offer: "camera-monolith:webrtc:offer",
  answer: "camera-monolith:webrtc:answer",
  ice: "camera-monolith:webrtc:ice",
} as const;

export type CameraMonolithRole = "mobile" | "screen";

export type CameraMonolithPresence = {
  experimentId: typeof CAMERA_MONOLITH_EXPERIMENT_ID;
  variantId: typeof CAMERA_MONOLITH_VARIANT_ID;
  total: number;
  mobiles: number;
  screens: number;
  serverTime: number;
};

export type CameraMonolithFrame = {
  id: string;
  sequence: number;
  from: string;
  capturedAt: number;
  receivedAt: number;
  width: number;
  height: number;
  image: ImageBitmap;
};

export type CameraMonolithStream = {
  publisherId: string;
  stream: MediaStream;
};
