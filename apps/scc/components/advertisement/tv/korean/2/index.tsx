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
import { OnAir, ProductBar } from "./layers/bar";
import { GiftSegment } from "./layers/gift";
import { LEGAL_PAGES } from "./layers/legal";
import { BrandCard, Care, Cdr, Criteria, Example, Notice } from "./layers/program";
import { DURATION, GIFT_LENGTH, GIFT_STARTS, SCENES, SHOTS, plateUrl, type SceneId } from "./scenes";

function Programme({ scene, t, plates }: { scene: SceneId; t: number; plates: boolean }) {
  switch (scene) {
    case "brand":
      return <BrandCard t={t} />;
    case "criteria":
      return <Criteria t={t} />;
    case "cdr":
      return <Cdr t={t} />;
    case "notice-diagnosis":
      return <Notice t={t} which="diagnosis" />;
    case "care":
      return <Care t={t} />;
    case "notice-onset":
      return <Notice t={t} which="onset" />;
    case "example":
      return <Example t={t} plates={plates} />;
    default:
      return null;
  }
}

/** 흥국생명 (무)가족사랑 치매간병보험 120초 DR — scene-indexed clone. */
export default function HeungkukDementiaCare({ capture }: { capture: CaptureOptions }) {
  const { time, paused, seek, togglePause } = useSpotClock(DURATION, SCENES, capture);
  const scene = SCENES[sceneIndexAt(SCENES, time)];
  const shot = stepAt(SHOTS, time);
  const giftStart = GIFT_STARTS.find((start) => time >= start && time < start + GIFT_LENGTH);
  const Legal = scene.id in LEGAL_PAGES ? LEGAL_PAGES[scene.id as keyof typeof LEGAL_PAGES] : undefined;

  return (
    <>
      <BroadcastFrame className={spoqa.className} label={`흥국생명 가족사랑 치매간병보험 TV 광고 클론, ${scene.label}`} transparent={!capture.plates} fixed={capture.fixed} onClick={togglePause}>
        {Legal ? (
          <Legal t={time} plates={capture.plates} />
        ) : (
          <>
            {capture.plates && shot?.plate ? <Plate src={plateUrl(shot.plate)} tone={PLATE_TONES[shot.plate]} progress={(time - shot.at) / 6} move={{ from: [1, 0, 0], to: [1.03, 0, 0] }} /> : null}
            {giftStart !== undefined ? (
              <GiftSegment lt={time - giftStart} plates={capture.plates} />
            ) : (
              <>
                <Programme scene={scene.id} t={time} plates={capture.plates} />
                <OnAir />
                <ProductBar />
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
            return plateUrl(first?.plate);
          }}
          onSeek={seek}
          onTogglePause={togglePause}
        />
      ) : null}
    </>
  );
}
