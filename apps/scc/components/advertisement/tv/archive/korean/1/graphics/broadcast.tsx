import { memo } from "react";
import { PhoneHandsetIcon } from "./icons";
import { QrPattern } from "./qr";
import { BADGE_BLUE, NAVY, outline } from "./type";

export const PHONE_NUMBER = "1670-7451";

/** Top-left "광고방송" label and the call number pill required on DR spots. */
export function BroadcastBadge({ opacity }: { opacity: number }) {
  return (
    <div style={{ position: "absolute", left: 0, top: 32, opacity }}>
      <div
        style={{
          marginLeft: 100,
          fontSize: 23,
          fontWeight: 700,
          color: "#fff",
          textShadow: outline("rgba(0,0,0,0.6)", 1.2, false),
          letterSpacing: "0.02em",
        }}
      >
        광고방송
      </div>
      <div
        style={{
          marginTop: 6,
          height: 82,
          width: 410,
          borderRadius: "0 41px 41px 0",
          background: BADGE_BLUE,
          display: "flex",
          alignItems: "center",
          gap: 14,
          paddingLeft: 78,
          boxShadow: "0 3px 10px rgba(0,0,0,0.35)",
        }}
      >
        <QrPattern size={62} seed={11} />
        <span style={{ fontSize: 47, fontWeight: 900, color: "#fff", letterSpacing: "-0.01em" }}>
          {PHONE_NUMBER}
        </span>
      </div>
    </div>
  );
}

export const LinaLogo = memo(function LinaLogo({
  size,
  inverse = false,
}: {
  size: number;
  inverse?: boolean;
}) {
  const ground = inverse ? "#fff" : "#0d0d0d";
  const letter = inverse ? "#0d0d0d" : "#fff";
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <rect width={100} height={100} fill={ground} />
      <g fill={letter} fontFamily="inherit" fontWeight={900} fontSize={40}>
        <text x={12} y={46}>L</text>
        <text x={42} y={46}>I</text>
        <text x={12} y={88}>N</text>
        <text x={50} y={88}>A</text>
      </g>
      <path d="M62 10 L90 10 L90 90 Z" fill={letter} opacity={0.95} />
    </svg>
  );
});

/** The bottom call bar: camera QR prompt, number, insurer signature. */
export function CallBar({ progress }: { progress: number }) {
  if (progress <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: 160,
        transform: `translateY(${(1 - progress) * 170}px)`,
        boxShadow: "0 -4px 16px rgba(0,0,0,0.25)",
      }}
    >
      <div style={{ position: "absolute", inset: 0, background: "#fff" }} />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 640,
          background: `linear-gradient(90deg, ${NAVY} 0%, #26309a 100%)`,
          clipPath: "polygon(0 0, 100% 0, 92% 100%, 0 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 596,
          top: 0,
          bottom: 0,
          width: 22,
          background: "#5d7cf0",
          clipPath: "polygon(70% 0, 100% 0, 30% 100%, 0 100%)",
        }}
      />
      <div style={{ position: "absolute", left: 58, top: 34, color: "#fff", fontSize: 31, fontWeight: 700, lineHeight: 1.32 }}>
        카메라로
        <br />
        찍어보세요!
      </div>
      <div style={{ position: "absolute", left: 296, top: 70, width: 0, height: 0, borderTop: "10px solid transparent", borderBottom: "10px solid transparent", borderLeft: "13px solid #fff" }} />
      <div style={{ position: "absolute", left: 345, top: 18, padding: 6, background: "#fff" }}>
        <QrPattern size={112} seed={23} />
      </div>
      <div style={{ position: "absolute", left: 664, top: 24, display: "flex", alignItems: "center", gap: 18 }}>
        <PhoneHandsetIcon size={108} color={NAVY} />
        <span style={{ fontSize: 118, fontWeight: 900, color: NAVY, letterSpacing: "-0.015em", lineHeight: 1 }}>
          {PHONE_NUMBER}
        </span>
      </div>
      <div style={{ position: "absolute", left: 1432, top: 46, display: "flex", alignItems: "center", gap: 12 }}>
        <LinaLogo size={58} />
        <div style={{ lineHeight: 1.05 }}>
          <div style={{ fontSize: 38, fontWeight: 700, color: "#222", letterSpacing: "-0.03em" }}>라이나생명</div>
          <div style={{ fontSize: 13, color: "#666", letterSpacing: "0.04em" }}>a Chubb Company</div>
        </div>
      </div>
    </div>
  );
}

/** Dialogue subtitle: white on a translucent black box, bottom centre. */
export function Subtitle({ text, opacity, bottom = 52 }: { text: string; opacity: number; bottom?: number }) {
  if (opacity <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom, textAlign: "center", opacity }}>
      <span
        style={{
          display: "inline-block",
          padding: "6px 18px 8px",
          background: "rgba(0,0,0,0.62)",
          color: "#fff",
          fontSize: 31,
          fontWeight: 500,
          letterSpacing: "-0.01em",
        }}
      >
        {text}
      </span>
    </div>
  );
}
