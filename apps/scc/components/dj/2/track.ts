export type TrackLanguage = "ko" | "en";

export type TimedWord = {
  id: string;
  text: string;
  start: number;
  end: number;
  channel: string;
};

export type DjTrack = {
  id: string;
  title: string;
  language: TrackLanguage;
  audioUrl: string;
  duration: number;
  words: TimedWord[];
};

type WordRange = readonly [start: number, end: number];
type TimedLine = {
  text: string;
  ranges: readonly WordRange[];
};

export const koreanInitials = [
  "ㄱ",
  "ㄲ",
  "ㄴ",
  "ㄷ",
  "ㄸ",
  "ㄹ",
  "ㅁ",
  "ㅂ",
  "ㅃ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅉ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
] as const;

export const englishInitials = "abcdefghijklmnopqrstuvwxyz".split("");

const timedLines: TimedLine[] = [
  {
    text: "반포의 빛이 나를 부르네",
    ranges: [[14.18, 15.58], [15.58, 15.98], [15.98, 16.48], [16.48, 17.72]],
  },
  {
    text: "자이의 품에 안기고 싶어",
    ranges: [[17.72, 19.12], [19.12, 19.62], [19.62, 20.3], [20.3, 21.32]],
  },
  {
    text: "강남의 별들 아래 꿈꾸네",
    ranges: [[21.68, 22.76], [22.76, 23.16], [23.16, 23.6], [23.6, 24.7]],
  },
  {
    text: "높은 순위 속에 날 세우고 싶어",
    ranges: [[24.7, 25.42], [25.42, 26.02], [26.02, 26.74], [26.74, 27.16], [27.16, 28.32], [28.32, 29.28]],
  },
  {
    text: "반포야 반포야 너는 나의 별",
    ranges: [[32.5, 33.9], [33.9, 34.7], [34.7, 35.24], [35.24, 35.86], [35.86, 36.56]],
  },
  {
    text: "자이야 자이야 나를 안아줘",
    ranges: [[36.56, 37.56], [37.56, 38.08], [38.08, 38.94], [38.94, 40]],
  },
  {
    text: "상급지의 왕관 내가 쓸래",
    ranges: [[40, 41.54], [41.54, 42.2], [42.2, 42.76], [42.76, 43.98]],
  },
  {
    text: "학군지도 나를 반겨줄래",
    ranges: [[43.98, 45.1], [45.1, 45.82], [45.82, 48.84]],
  },
  {
    text: "한 번 더 해봅시다",
    ranges: [[64.38, 64.69], [64.69, 65], [65, 65.31], [65.31, 65.62]],
  },
  {
    text: "강바람 속에 흩날리는 꿈",
    ranges: [[65.62, 66.14], [66.14, 66.66], [66.66, 68.08], [68.08, 68.5]],
  },
  {
    text: "부동산 지도 속 반짝이는 점",
    ranges: [[68.5, 69.76], [69.76, 70.14], [70.14, 70.48], [70.48, 71.6], [71.6, 72.06]],
  },
  {
    text: "하급지는 뒤로 상급지로 달려",
    ranges: [[72.06, 73.06], [73.06, 73.68], [73.68, 74.9], [74.9, 75.54]],
  },
  {
    text: "자이의 문턱 넘고 싶어",
    ranges: [[75.54, 76.28], [76.28, 77.16], [77.16, 77.9], [77.9, 79.66]],
  },
  {
    text: "반포야 반포야 너는 나의 별",
    ranges: [[82.82, 84.06], [84.06, 84.84], [84.84, 85.4], [85.4, 85.98], [85.98, 86.44]],
  },
  {
    text: "자이야 자이야 나를 안아줘",
    ranges: [[86.44, 87.68], [87.68, 88.22], [88.22, 89.08], [89.08, 90]],
  },
  {
    text: "상급지의 왕관 내가 쓸래",
    ranges: [[90, 91.74], [91.74, 92.36], [92.36, 92.9], [92.9, 94.12]],
  },
  {
    text: "학군지도 나를 반겨줄래",
    ranges: [[94.12, 95.2], [95.2, 95.96], [95.96, 99]],
  },
  {
    text: "순위의 숫자에 내 마음이 춤춰",
    ranges: [[100.44, 101.54], [101.54, 102.4], [102.4, 102.88], [102.88, 103.3], [103.3, 104.18]],
  },
  {
    text: "반포의 꿈이 나를 깨우네",
    ranges: [[104.18, 105.12], [105.12, 105.82], [105.82, 106.6], [106.6, 107.82]],
  },
  {
    text: "자이의 이름을 가슴에 새기며",
    ranges: [[107.82, 108.76], [108.76, 109.66], [109.66, 110.44], [110.44, 111.3]],
  },
  {
    text: "내 미래를 이곳에 맡기고 싶어",
    ranges: [[111.3, 111.86], [111.86, 112.54], [112.54, 113.38], [113.38, 114.32], [114.32, 115.16]],
  },
  {
    text: "반포야 반포야 너는 나의 별",
    ranges: [[115.16, 116.3], [116.3, 117.08], [117.08, 117.64], [117.64, 118.26], [118.26, 118.7]],
  },
  {
    text: "자이야 자이야 나를 안아줘",
    ranges: [[118.7, 119.9], [119.9, 120.48], [120.48, 121.3], [121.3, 122.5]],
  },
  {
    text: "상급지의 왕관 내가 쓸래",
    ranges: [[122.5, 123.96], [123.96, 124.6], [124.6, 125.16], [125.16, 126.38]],
  },
  {
    text: "학군지도 나를 반겨줄래",
    ranges: [[126.38, 127.46], [127.46, 128.22], [128.22, 131.2]],
  },
  {
    text: "감사합니다",
    ranges: [[153.42, 153.8]],
  },
];

export function getWordChannel(word: string, language: TrackLanguage) {
  const first = word.trim().toLocaleLowerCase().charAt(0);

  if (language === "en") {
    return /^[a-z]$/.test(first) ? first : "";
  }

  const code = first.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return "";
  return koreanInitials[Math.floor((code - 0xac00) / 588)] ?? "";
}

function compileWords(lines: readonly TimedLine[], language: TrackLanguage) {
  return lines.flatMap((line, lineIndex) => {
    const tokens = line.text.split(/\s+/);
    if (tokens.length !== line.ranges.length) {
      throw new Error(`dj/2 track timing mismatch on line ${lineIndex + 1}`);
    }

    return tokens.map((text, wordIndex) => {
      const [start, end] = line.ranges[wordIndex];
      return {
        id: `${lineIndex}-${wordIndex}`,
        text,
        start,
        end,
        channel: getWordChannel(text, language),
      };
    });
  });
}

export const banpoXismOne: DjTrack = {
  id: "banpo-xism-1",
  title: "반포자이즘 1",
  language: "ko",
  audioUrl: "/audio/dj/2/banpo-xism-1.mp3",
  duration: 153.984,
  words: compileWords(timedLines, "ko"),
};

export const djTracks: readonly DjTrack[] = [banpoXismOne];
export const activeDjTrack = djTracks[0];

export function getTrackChannels(track: DjTrack) {
  return track.language === "ko" ? koreanInitials : englishInitials;
}

export function findWordAt(track: DjTrack, time: number) {
  return track.words.find((word) => time >= word.start && time < word.end) ?? null;
}
