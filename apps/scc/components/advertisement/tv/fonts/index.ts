import localFont from "next/font/local";

// Pretendard (SIL OFL 1.1): closest measured match to the spots' Yoon-gothic captions.
export const pretendard = localFont({
  src: "./PretendardVariable.woff2",
  weight: "45 920",
  display: "block",
  variable: "--font-pretendard",
});

// Spoqa Han Sans Neo (SIL OFL 1.1): best measured fit for the Korean DR captions
// (per-syllable IoU against the captures, see docs/experiments/advertisement).
export const spoqa = localFont({
  src: [
    { path: "./spoqa/SpoqaHanSansNeo-Light.woff2", weight: "300" },
    { path: "./spoqa/SpoqaHanSansNeo-Regular.woff2", weight: "400" },
    { path: "./spoqa/SpoqaHanSansNeo-Medium.woff2", weight: "500" },
    { path: "./spoqa/SpoqaHanSansNeo-Bold.woff2", weight: "700" },
  ],
  display: "block",
  variable: "--font-spoqa",
});
