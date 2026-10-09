import { easeInOutCubic, presence, ramp } from "../../../stage";
import { PHONE_LIST_ROW, PhoneCheckPage, PhoneCoverageList } from "../graphics/app-cards";
import { Subtitle } from "../graphics/broadcast";
import { RadiationIcon } from "../graphics/icons";
import { heavy } from "../graphics/type";
import { BusStopPlate } from "../plates/night";
import { PHONE_SCREEN, PhoneInHands } from "../plates/phone";
import { BEATS } from "../timeline";

const B = BEATS.phone;

/** 2 · Close on the phone: scroll the coverage list, then the 감액기간 check. */
export function PhoneScene({ t }: { t: number }) {
  if (t >= B.zoom[0] && t < B.zoom[1]) {
    const local = t - B.zoom[0];
    return (
      <>
        <div style={{ position: "absolute", inset: 0, transform: `scale(${2.4 + local * 0.05})`, transformOrigin: "48% 42%", filter: "blur(14px) brightness(0.8)" }}>
          <BusStopPlate />
        </div>
        <div style={{ position: "absolute", left: 210, top: 250, opacity: 0.85, filter: "drop-shadow(0 0 2px #fff)" }}>
          <RadiationIcon size={420} color="#3d6a8f" />
        </div>
        <div style={{ position: "absolute", left: 860, top: 300, textAlign: "center", ...heavy(118, "#2f8a5f", "#ffffff", 4) }}>
          중입자 방사선
          <br />
          치료비
          <div style={{ ...heavy(70, "#2b2b2b", "#ffffff", 3), marginTop: 10 }}>(최초 1회한)</div>
        </div>
        <Subtitle text="아~ 이거 엄청 비쌀 텐데.." opacity={presence(local, 0.2, 1.5, 0.1)} />
      </>
    );
  }

  const checking = t >= B.check;
  const scroll = easeInOutCubic(ramp(t, 0.6, 3.6)) * PHONE_LIST_ROW * 2.1;
  const tapPhase = (t * 1.3) % 1;
  const tap = checking
    ? { x: 1010, y: 940, pressed: 0 }
    : { x: 1000 - Math.sin(t * 1.6) * 30, y: 760 - scroll * 0.12, pressed: tapPhase > 0.8 ? 1 : 0 };
  const zoom = easeInOutCubic(ramp(t, B.chart, B.chart + 1.0));
  const focusX = PHONE_SCREEN.x + PHONE_SCREEN.width / 2;
  const focusY = PHONE_SCREEN.y + 505;

  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `translate(${(960 - focusX) * zoom}px, ${(540 - focusY) * zoom}px) scale(${1 + zoom * 1.25})`,
          transformOrigin: `${focusX}px ${focusY}px`,
        }}
      >
        <PhoneInHands tap={tap}>
          {checking ? <PhoneCheckPage chart={easeInOutCubic(ramp(t, B.check + 0.5, B.chart + 0.6))} /> : <PhoneCoverageList scroll={scroll} />}
        </PhoneInHands>
      </div>
      <Subtitle text="로봇수술비에 중입자 치료비도??" opacity={presence(t, 1.0, B.list[1] - 0.05, 0.1)} />
      <Subtitle text="근데 가입 1년 미만은 50% 지급?" opacity={presence(t, B.check + 0.3, B.chart + 0.7, 0.1)} />
      <Subtitle text="아~ 절반만 준다고" opacity={presence(t, B.chart + 0.9, 9.4, 0.1)} />
    </>
  );
}
