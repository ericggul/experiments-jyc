import { Camera, easeOutCubic, ramp } from "../../../stage";
import { PHONE_NUMBER } from "../graphics/broadcast";
import { LegalCard } from "../graphics/legal-card";
import { QrPattern } from "../graphics/qr";
import { NAVY, YELLOW, heavy } from "../graphics/type";
import { BusStopPlate } from "../plates/night";
import { Presenter } from "../plates/studio";
import { BEATS } from "../timeline";

const B = BEATS.call;

/** 5 · Call to action at the street, then the disclosure page. */
export function CallScene({ t }: { t: number }) {
  const copy = easeOutCubic(ramp(t, B.copy, B.copy + 0.4));
  const phone = easeOutCubic(ramp(t, B.phone, B.phone + 0.4));
  const qr = easeOutCubic(ramp(t, B.qr, B.qr + 0.4));
  return (
    <>
      <div style={{ position: "absolute", inset: 0, filter: "blur(12px) brightness(0.75)" }}>
        <Camera t={t} duration={10} from={{ scale: 1.5, x: -300, y: 80 }} to={{ scale: 1.55, x: -320, y: 80 }}>
          <BusStopPlate />
        </Camera>
      </div>
      <div style={{ position: "absolute", left: 1180, top: 160 }}>
        <Presenter gesture={0.25 + Math.sin(t * 2.2) * 0.12} />
      </div>
      <div style={{ position: "absolute", left: 170, top: 210 }}>
        <div style={{ ...heavy(70, "#fff"), opacity: copy }}>
          암이 <span style={{ color: YELLOW }}>더 가까워지기</span> 전에
        </div>
        <div
          style={{
            marginTop: 14,
            display: "inline-block",
            padding: "0 26px",
            background: NAVY,
            ...heavy(150, "#fff", NAVY, 2),
            lineHeight: 1.1,
            transform: `scale(${0.85 + 0.15 * phone})`,
            transformOrigin: "0 50%",
            opacity: phone,
          }}
        >
          {PHONE_NUMBER}
        </div>
        <div style={{ marginTop: 26, display: "flex", alignItems: "center", gap: 30, opacity: qr }}>
          <div style={{ padding: 8, background: "#fff" }}>
            <QrPattern size={200} seed={31} />
          </div>
          <div style={heavy(84, "#fff")}>
            QR코드로
            <br />
            간편하게
          </div>
        </div>
      </div>
      {t >= B.legal ? <LegalCard /> : null}
    </>
  );
}
