// Shared time and easing, as in Bjørn Staal's multipleWindow3dScene
// (github.com/bgstaal/multipleWindow3dScene, main.js).

const midnight = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); })();

/**
 * Seconds since local midnight, so every window computes the same phase
 * (main.js `getTime`). Wrapped at two hours to keep GPU float precision.
 */
export const sharedTime = () => ((Date.now() - midnight) / 1000) % 7200;

/** main.js eases toward targets with `falloff = .05` per frame at ~60 fps; this is the same decay per tick at `hz`. */
export const falloffAt = (hz: number) => 1 - Math.pow(1 - 0.05, 60 / hz);
