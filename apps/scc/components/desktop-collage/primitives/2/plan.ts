import { defineControl } from '../../foundations/control/definition.ts';
import { arrange } from './model/arrangement.ts';
import { driftAt } from './model/drift.ts';
import { colorAt, validateSettings } from './model/settings.ts';

const WINDOW_PATH = '/desktop-collage/primitives/2/window';
const DRIFT_HZ = 24;

export const definition = defineControl({
  validate: validateSettings,
  plan: (settings, display, origin) => {
    const run = Date.now().toString(36);
    const range = Math.round(display.visible.width * settings.range / 100);
    return {
      surface: 'chrome-app',
      intervalMs: 150,
      items: arrange(display.visible, settings).map((rect, index) => {
        const color = colorAt(settings.fill, index);
        const partner = colorAt(settings.fill, (index + 1) % settings.count);
        const query = new URLSearchParams({ run, i: String(index), n: String(settings.count), c: color.slice(1), p: partner.slice(1), r: String(range), f: settings.form, t: String(settings.turnover) });
        return { ...rect, rank: 1, color, url: `${origin}${WINDOW_PATH}?${query}` };
      }),
    };
  },
  // Drift: the computer moves the real windows, and the field follows them.
  animate: (settings, plan, display, move) => {
    if (settings.motion !== 'drift') return null;
    const started = Date.now();
    const timer = setInterval(() => {
      const t = (Date.now() - started) / 1000;
      plan.items.forEach((item, index) => move(index, driftAt(item, display.visible, index, t, settings)));
    }, 1000 / DRIFT_HZ);
    return () => clearInterval(timer);
  },
});
