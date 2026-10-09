import localFont from "next/font/local";

// Gmarket Sans for every caption: the closest measured match to the capture.
// Self-hosted; licence in ./fonts/LICENSE.txt.

/** Gmarket Sans: captions, headlines, footnotes, product name, icon labels. */
export const gmarket = localFont({
  src: [
    { path: "./fonts/GmarketSansLight.woff", weight: "300" },
    { path: "./fonts/GmarketSansMedium.woff", weight: "500" },
    { path: "./fonts/GmarketSansBold.woff", weight: "700" },
  ],
  display: "block",
  variable: "--font-gmarket",
});

