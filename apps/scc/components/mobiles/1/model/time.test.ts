import assert from "node:assert/strict";
import test from "node:test";
import { advance, format24, formatClock, formatDate, formatTime, weekdayOf } from "./time.ts";

test("ten simulated minutes pass per real second by default rate", () => {
  assert.deepEqual(advance({ day: 0, minute: 0 }, 6000, 10), { day: 0, minute: 60 });
});

test("the clock rolls into the next day", () => {
  const next = advance({ day: 4, minute: 1435 }, 1000, 10);
  assert.equal(next.day, 5);
  assert.equal(next.minute, 5);
  assert.equal(weekdayOf(next.day), 0);
});

test("times print in iOS style", () => {
  assert.equal(formatClock(0), "12:00");
  assert.equal(formatClock(7 * 60 + 5), "7:05");
  assert.equal(formatTime(13 * 60 + 30), "1:30 PM");
  assert.equal(format24(7 * 60 + 5), "07:05");
});

test("simulated days skip weekends", () => {
  assert.equal(formatDate(0), "Monday, October 5");
  assert.equal(formatDate(5), "Monday, October 12");
});

test("phones refresh on staggered beats", async () => {
  const { phoneMinute } = await import("./time.ts");
  assert.equal(phoneMinute(10, 0, 3), 9);
  assert.equal(phoneMinute(10, 1, 3), 10);
  assert.equal(phoneMinute(10, 2, 3), 8);
  // Only a third of seats change between two consecutive minutes.
  const changed = Array.from({ length: 90 }, (_, i) => phoneMinute(100, i, 3) !== phoneMinute(101, i, 3)).filter(Boolean).length;
  assert.equal(changed, 30);
  for (let i = 0; i < 9; i++) assert.ok(phoneMinute(1, i, 3) >= 0);
});
