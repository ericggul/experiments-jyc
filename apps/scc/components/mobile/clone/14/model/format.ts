// YouTube-style compact numbers: 999, 1.2K, 12K, 1.2M, 12M, 1.2B.
export function compact(value: number) {
  const tiers: [number, string][] = [[1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
  for (const [size, suffix] of tiers) {
    if (value >= size) {
      const scaled = value / size;
      const text = scaled >= 10 ? String(Math.floor(scaled)) : (Math.floor(scaled * 10) / 10).toString();
      return `${text}${suffix}`;
    }
  }
  return String(Math.max(0, Math.round(value)));
}

export const views = (value: number) => `${compact(value)} ${value === 1 ? 'view' : 'views'}`;
export const subscribers = (value: number) => `${compact(value)} subscribers`;

// m:ss below an hour, h:mm:ss above; negative and NaN clamp to 0:00.
export function clock(seconds: number) {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

// Fraction watched for the red bar under thumbnails; a finished video counts as fully watched.
export function watchedFraction(position: number | undefined, duration: number) {
  if (!position || !duration) return 0;
  return Math.min(1, Math.max(0, position / duration));
}

// Resume point: restart if near the end or barely started.
export function resumeAt(position: number | undefined, duration: number) {
  if (!position || !duration || position < 3 || position > duration - 3) return 0;
  return position;
}

// Splits a title around a case-insensitive query match so the match can be bolded in suggestions.
export function highlight(text: string, query: string): { id: string; text: string; strong: boolean }[] {
  const q = query.trim().toLowerCase();
  if (!q) return [{ id: 'a', text, strong: false }];
  const at = text.toLowerCase().indexOf(q);
  if (at < 0) return [{ id: 'a', text, strong: false }];
  return [
    { id: 'a', text: text.slice(0, at), strong: false },
    { id: 'b', text: text.slice(at, at + q.length), strong: true },
    { id: 'c', text: text.slice(at + q.length), strong: false },
  ].filter(part => part.text);
}
