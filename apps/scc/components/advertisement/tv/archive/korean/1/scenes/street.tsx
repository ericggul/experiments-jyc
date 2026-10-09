import { Camera, easeOutCubic, presence, ramp } from "../../../stage";
import { CoverageCard } from "../graphics/app-cards";
import { Subtitle } from "../graphics/broadcast";
import { BusStopPlate, StreetPlate } from "../plates/night";
import { BEATS } from "../timeline";

const B = BEATS.street;

/** 1 · 서울. 마곡동 — establishing street, then the shelter and the floating card. */
export function StreetScene({ t, duration }: { t: number; duration: number }) {
  if (t < B.busStop) {
    const title = presence(t, B.title[0], B.title[1], 0.6);
    return (
      <>
        <Camera t={t} duration={B.busStop} from={{ scale: 1.02, x: 0, y: 0 }} to={{ scale: 1.1, x: -40, y: 10 }}>
          <StreetPlate />
        </Camera>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 70,
            textAlign: "center",
            fontSize: 250,
            fontWeight: 500,
            letterSpacing: "0.04em",
            color: "transparent",
            WebkitTextStroke: "2.5px rgba(255,255,255,0.92)",
            opacity: title,
            transform: `translateY(${(1 - title) * 14}px)`,
            filter: "drop-shadow(0 0 8px rgba(0,0,0,0.6))",
          }}
        >
          서울. 마곡동
        </div>
      </>
    );
  }
  const local = t - B.busStop;
  return (
    <>
      <Camera t={local} duration={duration - B.busStop} from={{ scale: 1.0, x: 0, y: 0 }} to={{ scale: 1.05, x: 30, y: 0 }}>
        <BusStopPlate />
      </Camera>
      <CoverageCard rise={easeOutCubic(ramp(t, B.card, B.card + 0.7))} />
      <Subtitle text="진단금에 항암치료비도 보장..." opacity={presence(t, B.subtitle[0], B.subtitle[1], 0.15)} />
    </>
  );
}
