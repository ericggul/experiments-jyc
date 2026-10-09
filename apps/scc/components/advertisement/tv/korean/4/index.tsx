"use client";

import {
  BroadcastFrame,
  Plate,
  SceneNavigator,
  sceneIndexAt,
  stepAt,
  useSpotClock,
  type CaptureOptions,
} from "../../player";
import { gmarket } from "./fonts";
import { BottomBar, NowTicker, TopStrip } from "./layers/bar";
import { GiftOverlay } from "./layers/gift";
import { LegalPage } from "./layers/legal";
import { SceneOverlay } from "./layers/overlays";
import { DURATION, LEGAL_AT, SCENES, SHOTS, plateUrl } from "./scenes";
import { PLATE_TONES } from "./tones";

const GIFT_END = 5.72;
const TICKER = [10.4, 49.9] as const;

/** 흥국생명 무배당 다사랑 3N5 간편건강보험 60초 DR — scene-indexed clone. */
export default function HeungkukDasarang({ capture }: { capture: CaptureOptions }) {
  const { time, paused, seek, togglePause } = useSpotClock(DURATION, SCENES, capture);
  const scene = SCENES[sceneIndexAt(SCENES, time)];
  const shot = stepAt(SHOTS, time);
  const legal = time >= LEGAL_AT;

  return (
    <>
      <BroadcastFrame
        className={gmarket.className}
        label={`흥국생명 다사랑 3N5 간편건강보험 TV 광고 클론, ${scene.label}`}
        transparent={!capture.plates}
        fixed={capture.fixed}
        onClick={togglePause}
      >
        {legal ? (
          <LegalPage t={time} />
        ) : (
          <>
            {capture.plates && shot ? (
              <Plate src={plateUrl(shot.plate)} tone={PLATE_TONES[shot.plate]} progress={(time - shot.at) / 6} move={{ from: [1, 0, 0], to: [1.02, 0, 0] }} />
            ) : null}
            {time < GIFT_END ? <GiftOverlay scene={scene.id} t={time} plates={capture.plates} /> : <SceneOverlay scene={scene.id} t={time} />}
          </>
        )}
        {time >= GIFT_END ? <TopStrip onSheet={legal} /> : null}
        {time >= TICKER[0] && time < TICKER[1] ? <NowTicker /> : null}
        <BottomBar />
      </BroadcastFrame>
      {capture.nav ? (
        <SceneNavigator
          scenes={SCENES}
          time={time}
          duration={DURATION}
          paused={paused}
          thumbnail={(mark) => {
            const first = stepAt(SHOTS, mark.start);
            return first ? plateUrl(first.plate) : undefined;
          }}
          onSeek={seek}
          onTogglePause={togglePause}
        />
      ) : null}
    </>
  );
}
