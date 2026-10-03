import { languages } from "./languages";

/**
 * Times and dates the clones generate at runtime (`7:00`, `AM`, `09:00`,
 * `오후 02:30`, `Fri, 25 Sept`, `9월 23일 수요일`) are not in the lexicon;
 * they are re-formatted per language with Intl, keeping the source's fields.
 */
const locale = (code: string) => (code === "tl" ? "fil" : code);
const formatters = new Map<string, Intl.DateTimeFormat>();
const formatter = (code: string, options: Intl.DateTimeFormatOptions) => {
  const key = `${code}|${JSON.stringify(options)}`;
  let value = formatters.get(key);
  if (!value) {
    value = new Intl.DateTimeFormat(locale(code), { timeZone: "UTC", ...options });
    formatters.set(key, value);
  }
  return value;
};
const each = (format: (code: string) => string) => languages.map(({ code }) => format(code));
const at = (hour: number, minute: number, day = 23, month = 8) => new Date(Date.UTC(2026, month, day, hour, minute));
const withoutPeriod = (code: string, date: Date) => formatter(code, { hour: "numeric", minute: "2-digit", hourCycle: "h12" })
  .formatToParts(date).filter((part) => part.type === "hour" || part.type === "minute" || (part.type === "literal" && /^[^\s]+$/.test(part.value))).map((part) => part.value).join("").trim();
const periodOnly = (code: string, date: Date) => formatter(code, { hour: "numeric", hourCycle: "h12" })
  .formatToParts(date).find((part) => part.type === "dayPeriod")?.value ?? "";

const weekdays = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const koreanWeekdays = "일월화수목금토";

/** Date for an English label; weekday-only labels pick a matching day in the sample month. */
function englishDate(month?: string, day?: string, weekday?: string) {
  const monthIndex = month ? months.indexOf(month.slice(0, 3).toLowerCase()) : 8;
  if (day) return at(12, 0, Number(day), monthIndex);
  if (weekday) return at(12, 0, 20 + weekdays.indexOf(weekday.slice(0, 3).toLowerCase()), 8);
  return at(12, 0, 1, monthIndex);
}

function generated(text: string): string[] | null {
  let match: RegExpExecArray | null;
  if ((match = /^(\d{1,2}):(\d{2})\s?(AM|PM)$/i.exec(text))) {
    const hour = (Number(match[1]) % 12) + (match[3].toUpperCase() === "PM" ? 12 : 0);
    return each((code) => formatter(code, { hour: "numeric", minute: "2-digit", hourCycle: "h12" }).format(at(hour, Number(match![2]))));
  }
  if ((match = /^(오전|오후)\s?(\d{1,2}):(\d{2})$/.exec(text))) {
    const hour = (Number(match[2]) % 12) + (match[1] === "오후" ? 12 : 0);
    return each((code) => formatter(code, { hour: "2-digit", minute: "2-digit", hourCycle: "h12" }).format(at(hour, Number(match![3]))));
  }
  if ((match = /^(\d{2}):(\d{2})$/.exec(text))) {
    return each((code) => formatter(code, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(at(Number(match![1]), Number(match![2]))));
  }
  // Clone 9 renders `7:00` and `AM` as separate nodes.
  if ((match = /^(\d{1,2}):(\d{2})$/.exec(text))) {
    return each((code) => withoutPeriod(code, at(Number(match![1]), Number(match![2]))));
  }
  if (/^(AM|PM)$/i.test(text)) {
    return each((code) => periodOnly(code, at(text.toUpperCase() === "PM" ? 15 : 9, 0)));
  }
  const weekday = "(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*";
  const month = "(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*";
  if ((match = new RegExp(`^${weekday},? (\\d{1,2}) ${month}$`).exec(text))) {
    const long = match[1].length < text.split(",")[0].length;
    return each((code) => formatter(code, { weekday: long ? "long" : "short", day: "numeric", month: "short" }).format(englishDate(match![3], match![2])));
  }
  if ((match = new RegExp(`^${weekday},? ${month} (\\d{1,2})$`).exec(text))) {
    const long = match[1].length < text.split(",")[0].length;
    return each((code) => formatter(code, { weekday: long ? "long" : "short", day: "numeric", month: "short" }).format(englishDate(match![2], match![3])));
  }
  if ((match = new RegExp(`^${month} (\\d{1,2})$`).exec(text))) {
    return each((code) => formatter(code, { day: "numeric", month: "short" }).format(englishDate(match![1], match![2])));
  }
  if ((match = new RegExp(`^${month} (\\d{4})$`).exec(text))) {
    const long = match[1].length < text.split(" ")[0].length;
    return each((code) => formatter(code, { month: long ? "long" : "short", year: "numeric" }).format(englishDate(match![1])));
  }
  if ((match = new RegExp(`^${weekday}$`).exec(text))) {
    const long = text.length > 3;
    return each((code) => formatter(code, { weekday: long ? "long" : "short" }).format(englishDate(undefined, undefined, match![1])));
  }
  if ((match = /^(\d{1,2})월 (\d{1,2})일 ([일월화수목금토])요일$/.exec(text))) {
    return each((code) => formatter(code, { month: "long", day: "numeric", weekday: "long" }).format(at(12, 0, Number(match![2]), Number(match![1]) - 1)));
  }
  if ((match = /^([일월화수목금토])요일$/.exec(text))) {
    return each((code) => formatter(code, { weekday: "long" }).format(at(12, 0, 20 + koreanWeekdays.indexOf(match![1]), 8)));
  }
  return null;
}

/** The source language keeps the clone's own string exactly; every other language is re-formatted. */
export function formatGenerated(text: string): readonly string[] | null {
  const row = generated(text);
  if (!row) return null;
  const source = languages.findIndex(({ code }) => code === (/[가-힣]/.test(text) ? "ko" : "en"));
  row[source] = text;
  return row;
}
