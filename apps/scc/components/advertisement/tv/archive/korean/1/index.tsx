"use client";

import { Noto_Sans_KR } from "next/font/google";
import { SceneMixer, TvStage, useSpotClock, type SceneFrame } from "../../stage";
import { BroadcastBadge, CallBar } from "./graphics/broadcast";
import { CallScene } from "./scenes/call";
import { ClinicScene } from "./scenes/clinic";
import { PhoneScene } from "./scenes/phone";
import { StreetScene } from "./scenes/street";
import { XrayScene } from "./scenes/xray";
import { LINA_SCENES, badgeVisible, barProgress, type LinaScene } from "./timeline";

const notoSansKr = Noto_Sans_KR({ weight: ["200", "500", "700", "800", "900"], subsets: ["latin"], preload: false });

function renderScene({ id, local, duration }: SceneFrame<LinaScene>) {
  switch (id) {
    case "street":
      return <StreetScene t={local} duration={duration} />;
    case "phone":
      return <PhoneScene t={local} />;
    case "xray":
      return <XrayScene t={local} />;
    case "clinic":
      return <ClinicScene t={local} duration={duration} />;
    case "call":
      return <CallScene t={local} />;
  }
}

/** 라이나생명 (무)첫날부터암보험(갱신형) 엑스레이편 — five-scene clone. */
export default function KoreanTvOne() {
  const { frame, togglePause } = useSpotClock(LINA_SCENES);
  const { id, local } = frame.current;
  return (
    <TvStage
      className={notoSansKr.className}
      label="라이나생명 첫날부터암보험 TV 광고 클론: 마곡동 버스정류장, 휴대폰 보장 목록, 엑스레이 정류장, 판독실, 상담 전화와 고지 화면"
      onClick={togglePause}
    >
      <SceneMixer frame={frame} render={renderScene} />
      <BroadcastBadge opacity={badgeVisible(id, local) ? 1 : 0} />
      <CallBar progress={barProgress(id, local)} />
    </TvStage>
  );
}
