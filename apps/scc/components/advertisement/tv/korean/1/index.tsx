"use client";

import { PLATE_TONES } from "./tones";
import { spoqa } from "../../fonts";
import {
  BroadcastFrame,
  Plate,
  SceneNavigator,
  sceneIndexAt,
  stepAt,
  useSpotClock,
  type CaptureOptions,
} from "../../player";
import { BottomBar, TopNumber } from "./layers/bar";
import { LegalNotice, LegalPremium, LegalRefund } from "./layers/legal";
import { SceneOverlay } from "./layers/overlays";
import { DURATION, SCENES, SHOTS, plateUrl, type SceneId } from "./scenes";

const LEGAL: Partial<Record<SceneId, typeof LegalPremium>> = {
  "legal-premium": LegalPremium,
  "legal-refund": LegalRefund,
  "legal-notice": LegalNotice,
};

/** 라이나생명 무배당 OK실버보험 120초 DR — scene-indexed clone. */
export default function LinaOkSilver({ capture }: { capture: CaptureOptions }) {
  const { time, paused, seek, togglePause } = useSpotClock(DURATION, SCENES, capture);
  const scene = SCENES[sceneIndexAt(SCENES, time)];
  const shot = stepAt(SHOTS, time);
  const Legal = LEGAL[scene.id];

  return (
    <>
      <BroadcastFrame className={spoqa.className} label={`라이나생명 OK실버보험 TV 광고 클론, ${scene.label}`} transparent={!capture.plates} fixed={capture.fixed} onClick={togglePause}>
        {Legal ? (
          <Legal />
        ) : (
          <>
            {capture.plates && shot ? <Plate src={plateUrl(shot.plate)} tone={PLATE_TONES[shot.plate]} progress={(time - shot.at) / 6} move={{ from: [1, 0, 0], to: [1.03, 0, 0] }} /> : null}
            <SceneOverlay scene={scene.id} t={time} />
            <TopNumber />
            <BottomBar time={time} />
          </>
        )}
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
