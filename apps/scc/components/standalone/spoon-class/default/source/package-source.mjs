// Mechanical packaging only: never rewrite the upstream Runner or its assets.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { installRunnerCompatibility } from "./compatibility.mjs";
import {
  applyBrowserReplacements,
  browserStyle,
  installAudioCompatibility,
} from "./browser.mjs";
import { installLifeAgeMeter } from "./life-age.mjs";

const original = readFileSync(new URL("./dino.html", import.meta.url), "utf8");
const policy = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; media-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'">`;
// Install before the original bootstrap. Preserve the upstream file separately
// so the small integration correction is reviewable without rewriting its code.
const adapter = `<script data-spoon-class-compatibility>(${installRunnerCompatibility.toString()})(window.Runner, window);</script>`;
const audioAdapter = `<script data-spoon-class-audio>(${installAudioCompatibility.toString()})(window);</script>`;
const ageAdapter = `<script data-spoon-class-life-age>(${installLifeAgeMeter.toString()})(window);</script>`;
const runnerBootstrapEnd = `  </script>

  <div class="onlyforchrome">`;
const html = applyBrowserReplacements(
  original
    .replace("<head>", `<head>\n${policy}`)
    .replace("</head>", `${browserStyle}\n${adapter}\n${audioAdapter}\n</head>`)
    .replace(runnerBootstrapEnd, `  </script>\n${ageAdapter}\n\n  <div class="onlyforchrome">`),
);
const packaged = {
  repository: "https://github.com/alexelzx/chrome-dino",
  revision: "6e472666cfd94e95056b7e747f46badf00e1226d",
  sha256: createHash("sha256").update(original).digest("hex"),
  html,
};
writeFileSync(new URL("./document.json", import.meta.url), `${JSON.stringify(packaged, null, 2)}\n`);
