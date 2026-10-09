import type { ReactNode } from "react";
import { Camera, easeOutBack, easeOutCubic, ramp } from "../../../stage";
import { NAVY, YELLOW, heavy } from "../graphics/type";
import { ClinicPlate } from "../plates/studio";
import { XrayStopPlate } from "../plates/xray";
import { BEATS } from "../timeline";

const B = BEATS.clinic;

function FirstDayTag({ show }: { show: number }) {
  return (
    <span
      style={{
        position: "absolute",
        left: -4,
        top: -38,
        padding: "2px 12px",
        background: YELLOW,
        color: NAVY,
        fontSize: 28,
        textShadow: "none",
        fontWeight: 900,
        borderRadius: 4,
        transform: `scale(${easeOutBack(show)})`,
        transformOrigin: "0 100%",
      }}
    >
      첫날부터
    </span>
  );
}

function Line({ at, t, top, children }: { at: number; t: number; top: number; children: ReactNode }) {
  const show = easeOutCubic(ramp(t, at, at + 0.35));
  return (
    <div style={{ position: "absolute", left: 96, top, opacity: show, transform: `translateX(${(1 - show) * -24}px)`, ...heavy(66, "#fff") }}>
      <FirstDayTag show={ramp(t, at + 0.35, at + 0.6)} />
      {children}
    </div>
  );
}

const yellow = (text: string) => <span style={{ color: YELLOW }}>{text}</span>;

/** 4 · Reading room: coverage from day one, 100% paid; then the stepped-up payout. */
export function ClinicScene({ t, duration }: { t: number; duration: number }) {
  if (t >= B.circles) {
    return <CirclesBeat t={t - B.circles} duration={duration - B.circles} />;
  }
  const lines = t < B.hundred;
  const count = Math.round(easeOutCubic(ramp(t, B.count[0], B.count[1])) * 100);
  return (
    <>
      <Camera t={t} duration={B.circles} from={{ scale: 1.0, x: 0, y: 0 }} to={{ scale: 1.05, x: -20, y: 0 }}>
        <ClinicPlate />
      </Camera>
      {lines ? (
        <>
          <Line at={B.lines[0]} t={t} top={196}>각종 {yellow("암 진단금")}</Line>
          <Line at={B.lines[1]} t={t} top={330}>{yellow("암 직접 치료비")} (최대 5년 보장/ 특약)</Line>
          <Line at={B.lines[2]} t={t} top={464}>{yellow("표적항암약물")}허가치료비까지 (특약)</Line>
          <div style={{ position: "absolute", left: 104, top: 590, ...heavy(30, "#fff", "#14183f", 2), opacity: ramp(t, 2.6, 3.0), lineHeight: 1.5 }}>
            (암 진단금 및 표적항암약물허가치료비(특약) 최초 1회,
            <br />
            암 직접치료비(특약) 연 1회, 경계성종양/제자리암 제외)
          </div>
        </>
      ) : (
        <div style={{ position: "absolute", left: 170, top: 400 }}>
          <div style={{ ...heavy(96, YELLOW), opacity: ramp(t, B.hundred, B.hundred + 0.3) }}>가입 그 순간부터</div>
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 8, opacity: ramp(t, B.count[0] - 0.2, B.count[0]) }}>
            <span style={{ ...heavy(96, YELLOW), background: NAVY, padding: "0 14px" }}>보험금</span>
            <span style={heavy(96, "#fff")}>{count}% 지급</span>
          </div>
        </div>
      )}
    </>
  );
}

const STEPS = [
  { id: "y1", label: "1년", r: 92 },
  { id: "y2", label: "2년", r: 170 },
  { id: "y3", label: "3년", r: 250 },
] as const;

function CirclesBeat({ t, duration }: { t: number; duration: number }) {
  const cx = 1250;
  const cy = 470;
  return (
    <>
      <Camera t={t} duration={duration} from={{ scale: 1.32, x: 120, y: 60 }} to={{ scale: 1.36, x: 110, y: 60 }}>
        <XrayStopPlate xray={false} />
      </Camera>
      {STEPS.map((step, i) => {
        const grow = easeOutBack(ramp(t, 0.4 + i * 0.5, 0.9 + i * 0.5));
        const r = step.r * grow;
        return (
          <div
            key={step.id}
            style={{
              position: "absolute",
              left: cx - r + i * 70,
              top: cy - r,
              width: r * 2,
              height: r * 2,
              borderRadius: "50%",
              background: `radial-gradient(circle at 40% 35%, rgba(205, 220, 255, ${0.95 - i * 0.12}), rgba(80, 110, 230, ${0.75 - i * 0.12}))`,
              boxShadow: "0 0 30px rgba(120, 150, 255, 0.4)",
              zIndex: 3 - i,
            }}
          />
        );
      })}
      {STEPS.map((step, i) => (
        <div
          key={`${step.id}-label`}
          style={{
            position: "absolute",
            left: cx - 60 + i * 150,
            top: cy - 22,
            width: 120,
            textAlign: "center",
            opacity: ramp(t, 0.8 + i * 0.5, 1.0 + i * 0.5),
            zIndex: 5,
          }}
        >
          <div style={{ display: "inline-block", padding: "2px 20px", background: NAVY, color: "#fff", borderRadius: 20, fontSize: 26, fontWeight: 900 }}>{step.label}</div>
        </div>
      ))}
      <div style={{ position: "absolute", left: 170, top: 400 }}>
        <div style={{ ...heavy(80, "#fff"), opacity: ramp(t, 0.1, 0.4) }}>암에 걸리지 않는다면</div>
        <div style={{ ...heavy(80, "#fff"), opacity: ramp(t, 0.3, 0.6) }}>
          <span style={{ color: t > 1.6 ? YELLOW : "#fff" }}>진단금</span>은{" "}
          <span style={{ color: t > 2.0 ? YELLOW : "#fff" }}>더 크게 보장</span>
        </div>
      </div>
    </>
  );
}
