import { BAR_PURPLE, Box, Fit, WHITE } from "./type";

// Persistent chrome, measured on the median of nine reference frames:
// purple bar from y 938, white chevron panel (tip x 42 / 1240 at y 1009),
// 흥국생명 mark, product name, and the number.
const BAR_TOP = 938;
const PANEL = "polygon(86px 938px, 1196px 938px, 1240px 1009px, 1196px 1080px, 86px 1080px, 42px 1009px)";
const PINK = "#f2368f";

function HeungkukMark() {
  return (
    <>
      <Box x={261} y={979} w={19} h={18} style={{ background: PINK, borderRadius: 2 }} />
      <Box x={261} y={1009} w={19} h={18} style={{ background: PINK, borderRadius: 2 }} />
      <Box x={296} y={986} w={34} h={34} style={{ background: PINK, borderRadius: 3, transform: "rotate(45deg)" }} />
    </>
  );
}

export function BottomBar() {
  return (
    <>
      <Box x={0} y={BAR_TOP} w={1920} h={1080 - BAR_TOP} style={{ background: BAR_PURPLE }} />
      <div style={{ position: "absolute", inset: 0, clipPath: PANEL, background: "#ffffff" }} />
      <Fit id="bar-mubaedang" color="#86849c" />
      <HeungkukMark />
      <Fit id="bar-heungkuk" color="#6c6782" />
      <Fit id="bar-hk-kr" color="#8a85a0" />
      <Fit id="bar-dasarang" color="#7a659f" />
      <Box x={724} y={981} w={126} h={62} style={{ background: "linear-gradient(90deg, #b44a8e, #de4f98)", borderRadius: 8 }} />
      <Fit id="bar-3n5" color={WHITE} />
      <Fit id="bar-gpgg" color="#3f3368" />
      <Fit id="bar-num" color={WHITE} />
    </>
  );
}

/** "광고방송" + 상담예약 number, from the first insurance shot to the end. */
export function TopStrip({ onSheet = false }: { onSheet?: boolean }) {
  return (
    <>
      {/* Over the white disclosure sheet the white label would vanish; set it in grey there. */}
      <Fit id="top-ad" color={onSheet ? "#8c8a96" : "rgba(255,255,255,0.88)"} shadow={onSheet ? undefined : "0 0 3px rgba(60,60,70,0.35)"} />
      <Box x={292} y={56} w={122} h={34} style={{ background: "#ffffff" }} />
      <Fit id="top-consult" color="#3a3a36" />
      <Box x={414} y={56} w={256} h={34} style={{ background: "#3e3070" }} />
      <Fit id="top-num" color="#f2f0ff" />
    </>
  );
}

/** The channel's own programme ticker (10.4–49.9 s on the capture). */
export function NowTicker() {
  return (
    <>
      <Box x={1460} y={70} w={382} h={42} style={{ background: "#4b5fd2", boxShadow: "0 0 0 1px rgba(150,170,255,0.6)" }} />
      <Fit id="now-now" color="#f4caa4" />
      <div
        style={{
          position: "absolute",
          left: 1561,
          top: 85,
          width: 0,
          height: 0,
          borderTop: "6px solid transparent",
          borderBottom: "6px solid transparent",
          borderLeft: "8px solid #e9ecff",
        }}
      />
      <Fit id="now-text" color="#eef0ff" />
    </>
  );
}
