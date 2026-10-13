import { iou, type Box, type Region } from "./analysis.ts";

// Material beliefs that outlive a single frame. Regions are re-found every
// frame; a track follows one thing across frames by name and overlap, so
// MobileCLIP's choice accumulates instead of flickering.

export type Track = {
  thing: number;
  box: Box;
  /** Probability per candidate, or null before the first look. */
  belief: Float32Array | null;
  lastLook: number;
  lastSeen: number;
};

const BLEND = 0.45;
const FORGET_AFTER = 4;

export function matchTracks(tracks: Track[], regions: readonly Region[], frame: number) {
  const claimed = new Set<Track>();
  const matched = regions.map((region) => {
    let best: Track | null = null;
    let bestOverlap = 0.15;
    for (const track of tracks) {
      if (track.thing !== region.thing || claimed.has(track)) continue;
      const overlap = iou(track.box, region.box);
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        best = track;
      }
    }
    if (!best) {
      best = { thing: region.thing, box: region.box, belief: null, lastLook: -Infinity, lastSeen: frame };
      tracks.push(best);
    }
    claimed.add(best);
    best.box = region.box;
    best.lastSeen = frame;
    return best;
  });
  for (let index = tracks.length - 1; index >= 0; index -= 1) {
    if (frame - tracks[index].lastSeen > FORGET_AFTER) tracks.splice(index, 1);
  }
  return matched;
}

export function updateBelief(track: Track, probabilities: Float32Array, frame: number) {
  if (!track.belief || track.belief.length !== probabilities.length) {
    track.belief = probabilities;
  } else {
    for (let index = 0; index < probabilities.length; index += 1) {
      track.belief[index] = track.belief[index] * (1 - BLEND) + probabilities[index] * BLEND;
    }
  }
  track.lastLook = frame;
}

/** Candidate index the track currently believes; the catalogue prior first. */
export function believedCandidate(track: Track) {
  if (!track.belief) return { candidate: 0, confidence: 0 };
  let candidate = 0;
  for (let index = 1; index < track.belief.length; index += 1) {
    if (track.belief[index] > track.belief[candidate]) candidate = index;
  }
  return { candidate, confidence: track.belief[candidate] };
}

/**
 * Regions worth a look this frame: never-seen and long-unseen first,
 * weighted by size. Objects count from a smaller size than scene regions.
 */
export function regionsToLook(
  regions: readonly Region[],
  tracks: readonly Track[],
  candidateCounts: readonly number[],
  mapArea: number,
  firstObjectThing: number,
  limit: number,
  frame: number,
) {
  return regions
    .map((region, index) => ({ region, index, track: tracks[index] }))
    .filter(({ region }) => candidateCounts[region.thing] > 1)
    .filter(({ region }) => region.area >= mapArea * (region.thing >= firstObjectThing ? 0.002 : 0.012))
    .map((entry) => ({ ...entry, priority: Math.sqrt(entry.region.area) * Math.min(12, frame - entry.track.lastLook) }))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit);
}
