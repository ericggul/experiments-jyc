import { reaganChallengerTrack } from "@/components/dj/3/tracks/reagan-challenger";

export const djThreeTracks = {
  "reagan-challenger-1986": reaganChallengerTrack,
} as const;

export type DjThreeTrackId = keyof typeof djThreeTracks;

export const activeDjThreeTrack: DjThreeTrackId = "reagan-challenger-1986";
export const activeTrack = djThreeTracks[activeDjThreeTrack];
