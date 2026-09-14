import wordData from "@/components/dj/3/tracks/reagan-challenger.words.json";
import {
  createDistributedVideoTrack,
  type TimedWord,
} from "@/components/dj/3/model/track";

export const reaganChallengerTrack = createDistributedVideoTrack({
  id: "reagan-challenger-1986",
  title: "Challenger address",
  language: "en",
  mediaUrl: "/video/dj/3/reagan-challenger-address.mp4",
  duration: 258.928,
  source: {
    label: "White House Television Office tape 242",
    url: "https://catalog.archives.gov/id/6014714",
    transcriptUrl:
      "https://www.reaganlibrary.gov/archives/speech/address-nation-explosion-space-shuttle-challenger",
    rights: "Public domain; National Archives identifier 6014714",
  },
  words: wordData as TimedWord[],
});
