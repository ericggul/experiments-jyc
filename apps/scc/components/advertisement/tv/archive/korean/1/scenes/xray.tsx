import { Camera, easeInOutCubic, easeOutCubic, ramp } from "../../../stage";
import { ProductTitle, SearchPrompt } from "../graphics/product-title";
import { RED, heavy } from "../graphics/type";
import { Presenter } from "../plates/studio";
import { XrayStopPlate, XrayTorsoPlate } from "../plates/xray";
import { BEATS } from "../timeline";

const B = BEATS.xray;

/** 3 · The shelter scanned into an X-ray; then the product is named. */
export function XrayScene({ t }: { t: number }) {
  if (t >= B.product) {
    const local = t - B.product;
    const enter = easeOutCubic(ramp(local, 0, 0.6));
    return (
      <>
        <Camera t={local} duration={4} from={{ scale: 1.08, x: 0, y: 0 }} to={{ scale: 1.0, x: 0, y: 0 }}>
          <XrayTorsoPlate />
        </Camera>
        <div style={{ position: "absolute", left: 1240, top: 170, opacity: enter, transform: `translateX(${(1 - enter) * 60}px)` }}>
          <Presenter gesture={easeInOutCubic(ramp(local, 0.8, 1.4))} />
        </div>
        <div
          style={{
            position: "absolute",
            left: 1300,
            top: 800,
            padding: "6px 16px",
            background: "rgba(16, 24, 90, 0.85)",
            color: "#fff",
            fontSize: 22,
            fontWeight: 600,
            opacity: ramp(local, 0.9, 1.2),
          }}
        >
          생명보험설계사 자격보유
        </div>
        <ProductTitle t={local - 0.1} />
        <SearchPrompt t={t - B.search} />
      </>
    );
  }

  const reveal = easeInOutCubic(ramp(t, B.reveal, B.reveal + B.revealDuration));
  const line1 = easeOutCubic(ramp(t, 0.3, 0.8));
  const line2 = easeOutCubic(ramp(t, B.copy2, B.copy2 + 0.5));
  return (
    <>
      <Camera t={t} duration={B.product} from={{ scale: 1.0, x: 0, y: 0 }} to={{ scale: 1.06, x: 0, y: -10 }}>
        <XrayStopPlate xray={false} />
        {reveal > 0 ? (
          <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 0 ${(1 - reveal) * 100}% 0)` }}>
            <XrayStopPlate xray />
          </div>
        ) : null}
        {reveal > 0 && reveal < 1 ? (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: `${reveal * 100}%`,
              height: 5,
              background: "#d6f1ff",
              boxShadow: "0 0 30px 12px rgba(120, 200, 255, 0.6)",
            }}
          />
        ) : null}
      </Camera>
      <div style={{ position: "absolute", left: 150, top: 420 }}>
        <div style={{ ...heavy(92, "#fff"), opacity: line1, transform: `translateY(${(1 - line1) * 16}px)` }}>지금,</div>
        <div style={{ ...heavy(92, "#fff"), opacity: line2, transform: `translateY(${(1 - line2) * 16}px)`, display: "flex", alignItems: "center" }}>
          이미&nbsp;
          <span style={{ background: RED, borderRadius: 14, padding: "0 10px", textShadow: "none", transform: `scale(${0.6 + 0.4 * easeOutCubic(ramp(t, B.copy2 + 0.3, B.copy2 + 0.6))})`, display: "inline-block" }}>
            암
          </span>
          과 함께일지도 모릅니다
        </div>
      </div>
    </>
  );
}
