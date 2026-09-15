export const apps = ['chrome', 'terminal', 'preview', 'slack'] as const;
export type App = typeof apps[number];
export const appNames: Record<App, string> = { chrome: 'Chrome', terminal: 'Terminal', preview: 'Preview', slack: 'C-VAL Slack' };
export type Settings = { interval: number; steps: number; countdown: number; jitter: number; movement: number; size: number; seed: number; order: 'cycle' | 'random'; apps: App[]; windowCount: number; period: number; birth: number; spread: number; breath: number; displayWidth: number; displayHeight: number };
export const defaults: Settings = { interval: .5, steps: 60, countdown: 3, jitter: 75, movement: 85, size: 75, seed: 1, order: 'random', apps: [...apps], windowCount: 5, period: 9, birth: 70, spread: 90, breath: 40, displayWidth: 1440, displayHeight: 900 };
export const ranges = { interval: [.2, 5, .1], steps: [1, 120, 1], countdown: [0, 10, 1], jitter: [0, 100, 1], movement: [0, 100, 1], size: [40, 100, 1], seed: [1, 999999, 1], windowCount: [1, 8, 1], period: [2, 30, 1], birth: [0, 100, 1], spread: [0, 100, 1], breath: [0, 100, 1], displayWidth: [640, 7680, 1], displayHeight: [480, 4320, 1] } as const;
export function validateSettings(value: unknown): Settings {
  if (!value || typeof value !== 'object') throw new Error('설정이 필요합니다.');
  const input = value as Record<string, unknown>;
  for (const [key, [min, max]] of Object.entries(ranges)) {
    const n = input[key];
    if (typeof n !== 'number' || !Number.isFinite(n) || n < min || n > max || (key !== 'interval' && !Number.isInteger(n))) throw new Error(`${key}: ${min}–${max} 범위의 값을 입력해주세요.`);
  }
  if (input.order !== 'cycle' && input.order !== 'random') throw new Error('전환 순서를 선택해주세요.');
  if (!Array.isArray(input.apps) || !input.apps.length || input.apps.length > apps.length || new Set(input.apps).size !== input.apps.length || input.apps.some(app => !apps.includes(app as App))) throw new Error('앱을 한 개 이상 선택해주세요.');
  return Object.fromEntries([...Object.keys(ranges), 'order', 'apps'].map(key => [key, key === 'apps' ? [...input.apps as App[]] : input[key]])) as Settings;
}
export function createPlan(settings: Settings) {
  let seed = settings.seed >>> 0;
  const random = () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; };
  let previous: App | undefined;
  return Array.from({ length: settings.steps }, (_, i) => {
    const available = settings.apps.length > 1 ? settings.apps.filter(app => app !== previous) : settings.apps;
    const app = settings.order === 'cycle' ? settings.apps[i % settings.apps.length] : available[Math.floor(random() * available.length)];
    previous = app;
    const intervalMs = Math.round(settings.interval * 1000 * (1 + (random() * 2 - 1) * settings.jitter / 100));
    const scale = settings.size / 100;
    const width = Math.round(1100 * scale);
    const height = Math.round(720 * scale);
    const x = Math.round(70 + random() * 320 * settings.movement / 100);
    const y = Math.round(60 + random() * 170 * settings.movement / 100);
    return { id: i, app, intervalMs: Math.max(125, intervalMs), tab: 1 + Math.floor(random() * 3), bounds: [x, y, x + width, y + height], birth: random() * 100 < settings.birth, channel: Math.floor(random() * settings.windowCount) };
  });
}
