import type { Owner } from "./types.ts";

/** The person whose phone the single-clone and hands-on routes show. */
export const sampleOwner: Owner = {
  id: "sample",
  archetype: "office-commuter",
  firstName: "Alex",
  lastName: "Morgan",
  home: "Bushwick",
  work: "Midtown",
  alarm: 7 * 60,
  seed: 20261005,
};
