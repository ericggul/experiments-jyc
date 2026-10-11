// Fixed local clock for the fixture: 9:41 AM, October 11 2026 (UTC so server and browser agree).
const BASE = Date.UTC(2026, 9, 11, 9, 41);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const ageMinutes = (time: string) => time === 'now' ? 0 : Number.parseInt(time, 10) * (time.endsWith('d') ? 1440 : time.endsWith('h') ? 60 : 1);

/** Timeline stamp: X shows relative units under a day, then a short date. */
export function shortTime(time: string) {
 if (time === 'now') return 'now';
 if (!time.endsWith('d')) return time;
 const d = new Date(BASE - ageMinutes(time) * 60000);
 return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** Post detail stamp, e.g. "9:12 AM · 10/11/26". */
export function fullTime(time: string) {
 const d = new Date(BASE - ageMinutes(time) * 60000);
 const h = d.getUTCHours();
 const m = String(d.getUTCMinutes()).padStart(2, '0');
 return `${h % 12 || 12}:${m} ${h < 12 ? 'AM' : 'PM'} · ${d.getUTCMonth() + 1}/${d.getUTCDate()}/${String(d.getUTCFullYear()).slice(2)}`;
}

export const compact = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}K` : String(n);
