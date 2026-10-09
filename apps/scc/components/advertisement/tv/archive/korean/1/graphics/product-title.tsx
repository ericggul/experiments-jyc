import { CalendarCheckIcon } from "./icons";
import { NAVY, YELLOW, heavy } from "./type";
import { easeOutBack, ramp } from "../../../stage/timeline";

// "(무) 더 새로워진 첫날부터 암보험(갱신형)" product super, built in three beats.
export function ProductTitle({ t }: { t: number }) {
  const tag = easeOutBack(ramp(t, 0, 0.35));
  const first = easeOutBack(ramp(t, 0.2, 0.55));
  const second = easeOutBack(ramp(t, 0.45, 0.8));
  return (
    <div style={{ position: "absolute", left: 200, top: 280 }}>
      <div
        style={{
          position: "absolute",
          left: 232,
          top: 0,
          padding: "8px 30px 10px",
          background: NAVY,
          border: "4px solid #fff",
          borderRadius: 6,
          color: "#fff",
          fontSize: 50,
          fontWeight: 900,
          transform: `scale(${tag})`,
          transformOrigin: "50% 100%",
          whiteSpace: "nowrap",
        }}
      >
        더 새로워진
      </div>
      <div style={{ position: "absolute", left: 6, top: 76, ...heavy(48, "#fff", NAVY, 3), opacity: first }}>(무)</div>
      <div style={{ position: "absolute", left: 0, top: 104, display: "flex", alignItems: "center", transform: `scale(${first})`, transformOrigin: "0 50%" }}>
        <span style={heavy(150, YELLOW, NAVY, 6)}>첫날</span>
        <span style={heavy(150, "#fff", NAVY, 6)}>부터</span>
        <span style={{ marginLeft: 10, filter: `drop-shadow(0 0 3px ${NAVY}) drop-shadow(0 4px 6px rgba(0,0,0,0.45))` }}>
          <CalendarCheckIcon size={118} />
        </span>
      </div>
      <div style={{ position: "absolute", left: 236, top: 270, display: "flex", alignItems: "flex-end", transform: `scale(${second})`, transformOrigin: "0 50%" }}>
        <span style={heavy(150, "#e2f7ff", NAVY, 6)}>암보험</span>
        <span style={{ ...heavy(60, "#fff", NAVY, 3.5), marginLeft: 14, marginBottom: 18 }}>(갱신형)</span>
      </div>
    </div>
  );
}

/** Portal search bar prompt: type the insurer's name. */
export function SearchPrompt({ t }: { t: number }) {
  const shown = ramp(t, 0, 0.3);
  if (shown <= 0) return null;
  const query = "라이나";
  const typed = query.slice(0, Math.floor(ramp(t, 0.35, 1.0) * query.length + 0.0001));
  return (
    <div
      style={{
        position: "absolute",
        left: 290,
        top: 790,
        width: 580,
        height: 96,
        borderRadius: 48,
        background: "#fff",
        border: "5px solid #19ce60",
        display: "flex",
        alignItems: "center",
        padding: "0 28px",
        gap: 26,
        opacity: shown,
        transform: `translateY(${(1 - shown) * 20}px)`,
        boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
      }}
    >
      <span style={{ width: 50, height: 50, borderRadius: 8, background: "#19ce60", color: "#fff", fontSize: 38, fontWeight: 900, display: "grid", placeItems: "center" }}>N</span>
      <span style={{ fontSize: 42, fontWeight: 700, color: "#222", flex: 1 }}>
        {typed}
        <span style={{ opacity: Math.floor(t * 3) % 2 ? 0 : 1, color: "#19ce60" }}>|</span>
      </span>
      <svg width={30} height={44} viewBox="0 0 30 44" fill="none" stroke="#19ce60" strokeWidth={4} strokeLinecap="round">
        <rect x={8} y={2} width={14} height={26} rx={7} />
        <path d="M2 20 a13 13 0 0 0 26 0 M15 33 v9" />
      </svg>
    </div>
  );
}
