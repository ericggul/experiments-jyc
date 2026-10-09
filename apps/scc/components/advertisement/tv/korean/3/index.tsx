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
import { doHyeon } from "./fonts";
import { AdLabel, BottomBar } from "./layers/bar";
import { SceneCaption } from "./layers/captions";
import { GiftCaption, GiftChrome } from "./layers/gift";
import { LegalNotice, LegalTerms } from "./layers/legal";
import { DURATION, SCENES, SHOTS, plateUrl } from "./scenes";
import { PLATE_TONES } from "./tones";

const GIFT_END = 5.97;
const PRODUCT_BAR = [22.46, 47.18] as const;

/** AIA생명 무배당 우리가족 안심 치매보험 60초 — scene-indexed clone. */
export default function AiaFamilyDementia({ capture }: { capture: CaptureOptions }) {
  const { time, paused, seek, togglePause } = useSpotClock(DURATION, SCENES, capture);
  const scene = SCENES[sceneIndexAt(SCENES, time)];
  const shot = stepAt(SHOTS, time);
  const gift = time < GIFT_END;
  const legal = scene.id === "legal-notice" || scene.id === "legal-terms";

  return (
    <>
      <BroadcastFrame className={doHyeon.className} label={`AIA생명 우리가족 안심 치매보험 TV 광고 클론, ${scene.label}`} transparent={!capture.plates} fixed={capture.fixed} onClick={togglePause}>
        {legal ? (
          scene.id === "legal-notice" ? <LegalNotice /> : <LegalTerms />
        ) : (
          <>
            {capture.plates && shot ? <Plate src={plateUrl(shot.plate)} tone={PLATE_TONES[shot.plate]} /> : null}
            {gift ? (
              <>
                <GiftChrome />
                <GiftCaption scene={scene.id} t={time} />
                <BottomBar variant="gift" />
              </>
            ) : (
              <>
                <SceneCaption scene={scene.id} t={time} />
                {time >= PRODUCT_BAR[0] && time < PRODUCT_BAR[1] ? <BottomBar variant="product" /> : null}
                <AdLabel />
              </>
            )}
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
            return first && mark.start < 47.18 ? plateUrl(first.plate) : undefined;
          }}
          onSeek={seek}
          onTogglePause={togglePause}
        />
      ) : null}
    </>
  );
}
