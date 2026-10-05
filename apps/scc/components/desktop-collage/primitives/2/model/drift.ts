import type { Rect } from './field.ts';
import type { Settings } from './settings.ts';

/**
 * A window's place at time t (s) while drifting around its starting place:
 * two incommensurate sine terms per axis, phase-shifted per window, so the
 * windows approach, cross and part without repeating in step.
 */
export function driftAt(base: Rect, frame: Rect, index: number, t: number, settings: Pick<Settings, 'amplitude' | 'period' | 'seed'>): Rect {
  const amplitude = Math.min(frame.width, frame.height) * settings.amplitude / 100;
  const w = (Math.PI * 2) / settings.period;
  const phase = index * 2.399 + settings.seed * 0.618;
  const dx = amplitude * (0.7 * Math.sin(w * t + phase) + 0.3 * Math.sin(w * 1.618 * t + phase * 1.3));
  const dy = amplitude * (0.7 * Math.cos(w * 0.809 * t + phase * 0.7) + 0.3 * Math.sin(w * 2.17 * t + phase));
  const x = Math.min(frame.x + frame.width - base.width, Math.max(frame.x, base.x + dx));
  const y = Math.min(frame.y + frame.height - base.height, Math.max(frame.y, base.y + dy));
  return { x: Math.round(x), y: Math.round(y), width: base.width, height: base.height };
}
