import styles from "./player.module.css";

export type CameraMove = { from: [number, number, number]; to: [number, number, number] };

/**
 * Background plate for a shot (a generated still standing in for footage).
 * `progress` 0..1 drives an optional slow camera move: [scale, x, y] in frame px.
 */
export function Plate({ src, progress = 0, move }: { src?: string; progress?: number; move?: CameraMove }) {
  if (!src) return <div className={styles.placeholder} />;
  const p = Math.min(1, Math.max(0, progress));
  const [s0, x0, y0] = move?.from ?? [1, 0, 0];
  const [s1, x1, y1] = move?.to ?? [1, 0, 0];
  const transform = move
    ? `translate(${x0 + (x1 - x0) * p}px, ${y0 + (y1 - y0) * p}px) scale(${s0 + (s1 - s0) * p})`
    : undefined;
  return <div className={styles.plate} style={{ backgroundImage: `url(${src})`, transform }} />;
}
