import type { ComponentType } from "react";
import {
  CapsuleIcon,
  CellIcon,
  HouseIcon,
  RadiationIcon,
  RobotArmIcon,
  ScalpelIcon,
  StethoscopeIcon,
  TargetSyringeIcon,
} from "./icons";
import { LinaLogo } from "./broadcast";
import { RED } from "./type";

// The in-spot "app" surfaces: a floating coverage card and the phone screens.
const CREAM = "#f3f0e8";
const TILE = "#e1eadf";
const GREEN = "#3f8a68";
const TEXT = "#41644f";

type Item = { id: string; Icon: ComponentType<{ size: number; color?: string }>; label: [string, string?]; note?: string };

export const CARD_ITEMS: readonly Item[] = [
  { id: "diagnosis", Icon: StethoscopeIcon, label: ["암 진단금"] },
  { id: "chemo", Icon: CellIcon, label: ["항암치료비"] },
  { id: "living", Icon: HouseIcon, label: ["암 생활비"] },
  { id: "surgery", Icon: ScalpelIcon, label: ["암 수술비"] },
];

export const PHONE_ITEMS: readonly Item[] = [
  { id: "drug", Icon: CapsuleIcon, label: ["항암 약물", "치료비"], note: "(최초 1회한)" },
  { id: "targeted", Icon: TargetSyringeIcon, label: ["표적항암약물허가", "치료비"], note: "(최초 1회한)" },
  { id: "robot", Icon: RobotArmIcon, label: ["다빈치로봇", "수술비"], note: "(최초 1회한)" },
  { id: "proton", Icon: RadiationIcon, label: ["중입자 방사선", "치료비"], note: "(최초 1회한)" },
  { id: "diagnosis", Icon: StethoscopeIcon, label: ["각종 암", "진단금"], note: "(최초 1회한)" },
];

export function CoverageCard({ rise }: { rise: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 250,
        top: 200,
        width: 360,
        height: 810,
        borderRadius: 14,
        background: CREAM,
        boxShadow: "0 18px 50px rgba(0,0,0,0.5)",
        opacity: Math.min(1, rise * 1.6),
        transform: `translateY(${(1 - rise) * 120}px)`,
        overflow: "hidden",
      }}
    >
      <div style={{ height: 44, background: "#e9e4da", display: "flex", alignItems: "center", padding: "0 16px", gap: 8 }}>
        <LinaLogo size={22} />
        <span style={{ fontSize: 15, color: "#8a857a", fontWeight: 700 }}>LINA</span>
        <span style={{ marginLeft: "auto", fontSize: 18, color: "#8a857a" }}>×</span>
      </div>
      <div style={{ padding: "22px 0 18px", textAlign: "center", fontSize: 34, fontWeight: 900, color: "#2b2b2b", letterSpacing: "-0.04em" }}>
        꼼꼼<span style={{ fontSize: 20, fontWeight: 700 }}>하고 </span>다양한 <span style={{ color: GREEN }}>보장</span>
      </div>
      {CARD_ITEMS.map(({ id, Icon, label }, i) => (
        <div
          key={id}
          style={{
            margin: "0 22px 14px",
            height: 146,
            background: TILE,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            padding: "0 18px",
            gap: 18,
            opacity: Math.min(1, Math.max(0, rise * 4 - i * 0.6)),
          }}
        >
          <Icon size={86} />
          <span style={{ fontSize: 27, fontWeight: 700, color: TEXT, letterSpacing: "-0.03em" }}>{label[0]}</span>
        </div>
      ))}
      <div style={{ position: "absolute", right: 18, bottom: 16, width: 38, height: 38, borderRadius: 19, background: "#333", color: "#fff", fontSize: 18, display: "grid", placeItems: "center" }}>⌄</div>
    </div>
  );
}

const ROW = 270;

/** Phone screen: coverage tiles scrolled by `scroll` pixels. */
export function PhoneCoverageList({ scroll }: { scroll: number }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: CREAM }}>
      <div style={{ height: 70, background: "#e8e3d8", display: "flex", alignItems: "center", padding: "0 30px", gap: 10, position: "relative", zIndex: 1 }}>
        <LinaLogo size={26} />
        <span style={{ fontSize: 18, color: "#8a857a", fontWeight: 700 }}>LINA</span>
      </div>
      <div style={{ transform: `translateY(${-scroll}px)` }}>
        {PHONE_ITEMS.map(({ id, Icon, label, note }) => (
          <div
            key={id}
            style={{
              margin: "18px 22px 0",
              height: ROW - 18,
              background: TILE,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              padding: "0 26px",
              gap: 24,
            }}
          >
            <Icon size={150} />
            <div style={{ textAlign: "center", flex: 1 }}>
              <div style={{ fontSize: 33, fontWeight: 800, color: "#3b8a79", lineHeight: 1.25, letterSpacing: "-0.04em" }}>
                {label[0]}
                <br />
                {label[1]}
              </div>
              <div style={{ fontSize: 17, color: "#8b9690", marginTop: 6 }}>{note}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const PHONE_LIST_ROW = ROW;

/** The reduction-period check page with its 0–90 days–1 year bar. */
export function PhoneCheckPage({ chart }: { chart: number }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: CREAM, padding: "96px 26px 0", textAlign: "center" }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 30, fontWeight: 800, color: "#2c6a59" }}>
        <span style={{ display: "inline-grid", placeItems: "center", width: 30, height: 30, border: "3px solid #2c6a59", borderRadius: 4, fontSize: 20 }}>✓</span>
        가입 시 필수 체크 사항
      </div>
      <div style={{ marginTop: 40, fontSize: 62, fontWeight: 900, color: "#2c6a59", letterSpacing: "-0.04em" }}>감액기간</div>
      <div style={{ marginTop: 18, fontSize: 27, fontWeight: 700, color: "#2c6a59", lineHeight: 1.4 }}>
        :계약일로부터 1년 미만은
        <br />
        <span style={{ color: RED }}>보험금액의 50% 지급</span>
      </div>
      <ReductionChart progress={chart} width={404} />
    </div>
  );
}

export function ReductionChart({ progress, width }: { progress: number; width: number }) {
  const h = width * 0.42;
  const split = 0.34;
  return (
    <div style={{ position: "relative", margin: "48px auto 0", width, height: h + 60, border: "2px solid #c9ccc4", borderRadius: 12, background: "#f8f7f2" }}>
      <div style={{ position: "absolute", left: "8%", top: "16%", width: "84%", height: "48%", display: "flex" }}>
        <div style={{ width: `${split * 100}%`, background: "#a6d0cf", display: "grid", placeItems: "center", color: "#4c6f6c", fontSize: width * 0.042, fontWeight: 700 }}>
          면책기간
        </div>
        <div
          style={{
            width: `${(1 - split) * 100 * progress}%`,
            background: "#7cc0c2",
            display: "grid",
            placeItems: "center",
            color: "#1d3836",
            fontSize: width * 0.044,
            fontWeight: 800,
            textAlign: "center",
            lineHeight: 1.3,
            overflow: "hidden",
            whiteSpace: "nowrap",
          }}
        >
          <span>
            1년이내 진단 시
            <br />
            <span style={{ color: "#b3202a" }}>가입금액의 50% 지급</span>
          </span>
        </div>
      </div>
      <div style={{ position: "absolute", left: "8%", right: "8%", top: "70%", height: 3, background: "#8eb9b3" }} />
      {[
        { at: 0, label: "가입" },
        { at: split, label: "가입 후\n90일 이내" },
        { at: 1, label: "가입 후\n1년 이내" },
      ].map(({ at, label }) => (
        <div key={label} style={{ position: "absolute", left: `${8 + at * 84}%`, top: "66%", transform: "translateX(-50%)", textAlign: "center" }}>
          <div style={{ width: 12, height: 12, borderRadius: 6, background: "#6aa8a0", margin: "0 auto" }} />
          <div style={{ fontSize: width * 0.03, color: "#555", whiteSpace: "pre", lineHeight: 1.2, marginTop: 4 }}>{label}</div>
        </div>
      ))}
    </div>
  );
}
