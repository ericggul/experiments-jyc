import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Script, runInNewContext } from "node:vm";
import { installRunnerCompatibility } from "./compatibility.mjs";
import { installAudioCompatibility, restoreBrowserReplacements } from "./browser.mjs";
import { installLifeAgeMeter } from "./life-age.mjs";
import { installLifeGamePresentation } from "./life-game.mjs";

const original = readFileSync(new URL("./dino.html", import.meta.url), "utf8");
const packaged = JSON.parse(readFileSync(new URL("./document.json", import.meta.url), "utf8"));

test("vendored HTML matches the pinned upstream bytes", () => {
  const hash = createHash("sha256").update(original).digest("hex");
  assert.equal(hash, "942ee61b111ddd7778cd8204bf9a4a60802d3a63549ec6e9d2353edd6eb5198a");
  assert.equal(packaged.sha256, hash);
});

test("packaging preserves the upstream document outside its explicit integration additions", () => {
  assert.ok(packaged.html.includes(`(${installRunnerCompatibility.toString()})(window.Runner, window);`));
  assert.ok(packaged.html.includes(`(${installLifeAgeMeter.toString()})(window);`));
  assert.ok(packaged.html.includes(`(${installLifeGamePresentation.toString()})(document);`));
  assert.match(packaged.html, /data-spoon-class-module-style/);
  assert.match(packaged.html, /data-spoon-class-module-presentation/);
  const restored = packaged.html
    .replace(/\n<meta http-equiv="Content-Security-Policy"[^>]+>/, "")
    .replace(/<style data-spoon-class-module-style>[\s\S]*?<\/style>\n/, "")
    .replace(/<style data-spoon-class-browser-style>[\s\S]*?<\/style>\n/, "")
    .replace(/<script data-spoon-class-compatibility>[\s\S]*?<\/script>\n/, "")
    .replace(/<script data-spoon-class-audio>[\s\S]*?<\/script>\n/, "")
    .replace(/<script data-spoon-class-life-presentation>[\s\S]*?<\/script>\n/, "")
    .replace(/<script data-spoon-class-life-age>[\s\S]*?<\/script>\n/, "");
  const sourceRestored = restored.replace(
    /<script data-spoon-class-module-presentation>[\s\S]*?<\/script>\n/,
    "",
  );
  assert.equal(restoreBrowserReplacements(sourceRestored), original);
});

test("age meter replaces score with an editable six-months-per-second clock", () => {
  const calls = [];
  const context = {
    save() {},
    restore() {},
    fillRect(...args) {
      calls.push(args);
    },
  };
  const meter = { canvasCtx: context, x: 100, y: 5 };
  const runner = {
    started: true,
    playingIntro: false,
    crashed: false,
    distanceMeter: meter,
    restart() {},
  };
  installLifeAgeMeter({ Runner: { instance_: runner } });
  meter.update(0);
  const atBirth = JSON.stringify(calls);
  calls.length = 0;
  meter.update(1000 / 6);
  assert.notEqual(JSON.stringify(calls), atBirth);
  assert.equal(meter.update(0), false);
});

test("life presentation replaces the runner, test and large-life-obstacle sprites", () => {
  const images = new Map(
    [
      "1x-trex",
      "2x-trex",
      "1x-obstacle-small",
      "2x-obstacle-small",
      "1x-obstacle-large",
      "2x-obstacle-large",
    ].map((id) => [id, { src: "upstream" }]),
  );
  installLifeGamePresentation({ getElementById: (id) => images.get(id) });
  for (const image of images.values()) {
    assert.match(image.src, /^data:image\/svg\+xml;charset=utf-8,/);
  }
});

test("the module document removes standalone text and forwards only player keys", () => {
  assert.match(packaged.html, /querySelectorAll\("\.onlyforchrome"\)/);
  assert.match(packaged.html, /getElementById\("main-frame-notchrome"\)/);
  assert.match(packaged.html, /channel: "spoon-class-input"/);
  assert.match(packaged.html, /!event\.isTrusted/);
  assert.match(packaged.html, /\}, "\*"\);/);  assert.match(packaged.html, /addEventListener\("touchstart", syncTouch, touchOptions\)/);
  assert.match(packaged.html, /keyCode: 32\n/);
});

const SAFARI_IPAD = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
const FIREFOX = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.0; rv:131.0) Gecko/20100101 Firefox/131.0";

test("every browser constructs the original Runner, not only Chrome user agents", () => {
  assert.doesNotMatch(packaged.html, /indexOf\('chrome'\)/);
  const bootstrap = [...packaged.html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
    .find((match) => match[1].includes("new Runner('.interstitial-wrapper')"))[1];
  for (const userAgent of [SAFARI_IPAD, FIREFOX, "Mozilla/5.0 (iPhone) CriOS/129.0 Mobile Safari/604.1"]) {
    let constructed = 0;
    runInNewContext(bootstrap, {
      navigator: { userAgent },
      Runner: function Runner() {
        constructed += 1;
      },
      document: { getElementById: () => assert.fail("non-Chrome notice shown") },
    });
    assert.equal(constructed, 1, userAgent);
  }
});

test("touch-primary devices without a Mobi user agent use the original touch input", () => {
  const line = packaged.html.match(/var IS_MOBILE = [^\n]+/)[0];
  const isMobile = (window) => runInNewContext(`var IS_IOS = false; ${line} IS_MOBILE;`, { window });
  const media = (coarse) => () => ({ matches: coarse });
  assert.equal(isMobile({ navigator: { userAgent: SAFARI_IPAD, maxTouchPoints: 5 }, matchMedia: media(true) }), true);
  assert.equal(isMobile({ navigator: { userAgent: FIREFOX, maxTouchPoints: 0 }, matchMedia: media(false) }), false);
  assert.equal(isMobile({ navigator: { userAgent: "Android Mobile", maxTouchPoints: 5 }, matchMedia: media(true) }), true);
});

test("audio falls back to webkitAudioContext and a failed Ogg decode stays silent", async () => {
  let rejected = false;
  class LegacyContext {
    decodeAudioData(_buffer, _onDecoded, onError) {
      assert.equal(typeof onError, "function");
      return Promise.reject(new Error("Ogg unsupported")).catch((error) => {
        rejected = true;
        throw error;
      });
    }
  }
  const window = { webkitAudioContext: LegacyContext };
  installAudioCompatibility(window);
  assert.equal(window.AudioContext, LegacyContext);
  await new window.AudioContext().decodeAudioData(new ArrayBuffer(0), () => {})?.catch(() => {});
  assert.equal(rejected, true);

  const silent = {};
  installAudioCompatibility(silent);
  assert.doesNotThrow(() => new silent.AudioContext().decodeAudioData(new ArrayBuffer(0), () => {}));
});

test("all upstream inline scripts parse without executing a browser", () => {
  const scripts = [...original.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length >= 5);
  for (const [index, match] of scripts.entries()) {
    assert.doesNotThrow(() => new Script(match[1], { filename: `upstream-script-${index}.js` }));
  }
});

test("both sprite densities and all three original Ogg sounds are intact", () => {
  const sprites = [...original.matchAll(/<img id="([12])x-([^"]+)" src="data:image\/png;base64,([^"]+)"/g)];
  assert.equal(sprites.length, 14);
  for (const [, , , data] of sprites) {
    const png = Buffer.from(data, "base64");
    assert.equal(png.subarray(1, 4).toString(), "PNG");
    assert.ok(png.readUInt32BE(16) > 0);
    assert.ok(png.readUInt32BE(20) > 0);
  }
  const sounds = [...original.matchAll(/<audio id="offline-sound-([^"]+)" src="data:audio\/mpeg;base64,([^"]+)"/g)];
  assert.deepEqual(sounds.map((sound) => sound[1]), ["press", "hit", "reached"]);
  for (const [, , data] of sounds) {
    // The source labels these MPEG, but the bytes contain Ogg/Vorbis audio.
    assert.equal(Buffer.from(data, "base64").subarray(0, 4).toString(), "OggS");
  }
});
