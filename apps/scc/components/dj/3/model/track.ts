export const englishChannels = "abcdefghijklmnopqrstuvwxyz".split("");

export type TimedWord = {
  id: string;
  text: string;
  start: number;
  end: number;
  channel: string;
};

export type DistributedVideoTrack = {
  id: string;
  title: string;
  language: "en";
  mediaUrl: string;
  duration: number;
  source: {
    label: string;
    url: string;
    transcriptUrl: string;
    rights: string;
  };
  words: readonly TimedWord[];
};

const wordQueueCache = new WeakMap<
  DistributedVideoTrack,
  Map<string, readonly TimedWord[]>
>();

export function createDistributedVideoTrack(
  track: DistributedVideoTrack,
): DistributedVideoTrack {
  let previousStart = -1;

  for (const word of track.words) {
    if (
      !word.id ||
      !word.text ||
      !englishChannels.includes(word.channel) ||
      word.start < 0 ||
      word.end <= word.start ||
      word.start < previousStart ||
      word.end > track.duration
    ) {
      throw new Error(`Invalid word timing in ${track.id}: ${word.id}`);
    }
    previousStart = word.start;
  }

  return track;
}

export function findWordAt(
  track: DistributedVideoTrack,
  time: number,
): TimedWord | null {
  let low = 0;
  let high = track.words.length - 1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const word = track.words[middle];
    if (time < word.start) {
      high = middle - 1;
    } else if (time >= word.end) {
      low = middle + 1;
    } else {
      return word;
    }
  }

  return null;
}

function getQueueCache(track: DistributedVideoTrack) {
  const cached = wordQueueCache.get(track);
  if (cached) return cached;
  const queues = new Map<string, readonly TimedWord[]>();
  wordQueueCache.set(track, queues);
  return queues;
}

export function getTrackWordQueue(
  track: DistributedVideoTrack,
  channels: readonly string[],
) {
  if (channels.length === 0) return [];
  const key = [...channels].sort().join("");
  const queues = getQueueCache(track);
  const cached = queues.get(key);
  if (cached) return cached;

  const selected = new Set(channels);
  const queue = track.words.filter((word) => selected.has(word.channel));
  queues.set(key, queue);
  return queue;
}
