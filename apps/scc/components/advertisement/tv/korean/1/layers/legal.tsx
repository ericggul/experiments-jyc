import type { CSSProperties, ReactNode } from "react";
import { OkSilverMark, PHONE, PhoneGlyph } from "./bar";

// The three closing disclosure pages. Text transcribed from the capture,
// checked against the 1080p 2017 master where the capture is illegible.
const TEXT_BLUE = "#1d4fa3";
const TEXT_GRAY = "#5d5d5d";
const RULE = "#c4c9d1";
const HEAD_FILL = "#c9d7e6";
const ROW_FILL = "#eef3f8";

function Header({ presenter }: { presenter?: string }) {
  return (
    <>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 318, background: "linear-gradient(180deg, #1f4fae 0%, #2a5bb4 70%, #3a6cc0 100%)" }} />
      <div style={{ position: "absolute", left: 0, top: 318, width: 1920, height: 12, background: "linear-gradient(180deg, #8fbdf0, #d9ebff)" }} />
      <div style={{ position: "absolute", left: 748, top: 46 }}>
        <OkSilverMark scale={0.98} />
      </div>
      <div style={{ position: "absolute", left: 392, top: 176 }}>
        <PhoneGlyph width={136} color="#ffffff" />
      </div>
      <div
        style={{
          position: "absolute",
          left: 565,
          top: 136,
          fontSize: 177,
          fontWeight: 500,
          lineHeight: 1,
          letterSpacing: "-0.035em",
          color: "#fff",
          transform: "scaleX(0.99)",
          transformOrigin: "0 0",
          textShadow: "0 0 18px rgba(170, 215, 255, 0.55)",
        }}
      >
        {PHONE}
      </div>
      {presenter ? (
        <div style={{ position: "absolute", left: 1370, top: 40, width: 300, height: 278, background: `url(${presenter}) center bottom / cover no-repeat` }} />
      ) : null}
    </>
  );
}

const text = (size: number, color: string, weight = 500): CSSProperties => ({
  fontSize: size,
  fontWeight: weight,
  lineHeight: 1,
  letterSpacing: "0.005em",
  color,
  whiteSpace: "pre",
});

function At({ x, y, style, children }: { x: number; y: number; style: CSSProperties; children: ReactNode }) {
  return <div style={{ position: "absolute", left: x, top: y, ...style }}>{children}</div>;
}

type Cell = string | { text: string; rows: number };

function Table({
  x,
  y,
  widths,
  head,
  body,
  rowHeight,
  headHeight,
  size,
  ruled = true,
}: {
  x: number;
  y: number;
  widths: number[];
  head: string[];
  body: Cell[][];
  rowHeight: number;
  headHeight: number;
  size: number;
  ruled?: boolean;
}) {
  const border = ruled ? `2px solid ${RULE}` : "none";
  const cell = (fill: string): CSSProperties => ({
    border,
    background: fill,
    textAlign: "center",
    verticalAlign: "middle",
    padding: 0,
    ...text(size, TEXT_GRAY),
  });
  return (
    <table style={{ position: "absolute", left: x, top: y, borderCollapse: "collapse", tableLayout: "fixed", width: widths.reduce((a, b) => a + b, 0) }}>
      <colgroup>
        {widths.map((w, i) => (
          <col key={`${i}-${w}`} style={{ width: w }} />
        ))}
      </colgroup>
      <thead>
        <tr style={{ height: headHeight }}>
          {head.map((h) => (
            <th key={h} style={{ ...cell(HEAD_FILL), fontWeight: 500 }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {body.map((row) => (
          <tr key={row.map((c) => (typeof c === "string" ? c : c.text)).join("|")} style={{ height: rowHeight }}>
            {row.map((c, i) =>
              typeof c === "string" ? (
                <td key={`${i}-${c}`} style={cell(i === 0 ? "#e6e9ee" : ROW_FILL)}>{c}</td>
              ) : (
                <td key={`${i}-${c.text}`} rowSpan={c.rows} style={cell(ROW_FILL)}>{c.text}</td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function LegalPremium({ presenter }: { presenter?: string }) {
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: "#fdfdfd" }} />
      <Header presenter={presenter} />
      <At x={285} y={377} style={text(42, TEXT_BLUE, 700)}>만기 생존시 환급금이 없으며, 사망보험금 이외의 보험금은 없습니다.</At>
      <At x={285} y={446} style={text(32, TEXT_GRAY)}>가입연령 : 55세~83세</At>
      <At x={285} y={494} style={text(32, TEXT_GRAY)}>
        보장연령 : 70세~88세 (가입나이에 따라 납입기간 및 보장기간이 상이할 수 있으니 가입 전 확인바랍니다.)
      </At>
      <At x={285} y={549} style={text(32, TEXT_GRAY)}>[보험료]</At>
      <At x={285} y={598} style={text(32, TEXT_GRAY)}>기준 : 가입금액 1,000만원 기준, 보험기간 : 15년, 납입기간 : 전기간 월납</At>
      <At x={290} y={666} style={text(29, TEXT_GRAY)}>무배당 OK 실버보험</At>
      <At x={1002} y={666} style={text(29, TEXT_GRAY)}>무배당 가족사랑플랜보험(갱신형)</At>
      <Table
        x={285}
        y={706}
        widths={[172, 170, 173, 168]}
        head={["연령", "보험기간", "남자", "여자"]}
        body={[
          ["55세", { text: "15년", rows: 3 }, "45,000원", "22,800원"],
          ["57세", "47,300원", "24,600원"],
          ["60세", "52,400원", "28,200원"],
        ]}
        headHeight={60}
        rowHeight={57}
        size={27}
      />
      <Table
        x={1000}
        y={706}
        widths={[170, 172, 172, 168]}
        head={["연령", "보험기간", "남자", "여자"]}
        body={[
          ["55세", { text: "10년", rows: 3 }, "7,000원", "3,200원"],
          ["57세", "7,900원", "3,700원"],
          ["60세", "9,800원", "4,800원"],
        ]}
        headHeight={60}
        rowHeight={57}
        size={27}
        ruled={false}
      />
      <At x={285} y={962} style={text(30, TEXT_GRAY)}>
        55세~60세의 경우, 회사에서 정한 심사 절차를 거치면 보다 저렴한 무배당 가족사랑플랜보험에 가입 가능합니다.
      </At>
    </>
  );
}

export function LegalRefund({ presenter }: { presenter?: string }) {
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: "#fdfdfd" }} />
      <Header presenter={presenter} />
      <At x={285} y={428} style={text(33, TEXT_GRAY)}>[해지환급금]</At>
      <At x={285} y={476} style={text(41, TEXT_BLUE, 700)}>중도 해지시 해지환급금은 납입보험료보다 적거나 없을 수 있습니다.</At>
      <At x={285} y={528} style={text(34, TEXT_GRAY)}>기준:가입 금액 1,000만원, 남 57세,15년 전기납</At>
      <Table
        x={285}
        y={583}
        widths={[177, 176, 329, 331, 329]}
        head={["경과기간", "도달나이", "납입보험료 누계", "해지환급금", "해지환급률"]}
        body={[
          ["1년", "58세", "567,600원", "37,943원", "6.7%"],
          ["3년", "60세", "1,702,800원", "524,729원", "30.8%"],
          ["5년", "62세", "2,838,000원", "682,914원", "24.1%"],
          ["10년", "67세", "5,676,000원", "773,100원", "13.6%"],
          ["15년", "72세", "8,514,000원", "0원", "0.0%"],
        ]}
        headHeight={62}
        rowHeight={60}
        size={30}
      />
    </>
  );
}

const NOTICE_BLUE = [
  ["청약일로부터 30일 한도로 보험증권 수령 후 15일 이내에 청약철회가 가능하며, 이 경우 3일 이내에 이미", 495],
  ["납입한 보험료를 돌려드립니다.", 540],
  ["청약 미녹취, 약관 및 청약서 미교부, 설명 의무 불이행 시 계약성립일로부터 3개월 이내 계약취소가 가능합니다.", 600],
  ["고의적 사고 및 가입 2년 이내 자살은 보장에서 제외됩니다.", 668],
] as const;

const NOTICE_GRAY = [
  ["기존 보험계약 해지 후 신 계약 체결 시 보험인수 거절, 보험료 인상 또는 보장내용이 달라질 수 있습니다.", 730],
  ["보험계약 체결 전에 상품설명서 및 약관을 읽어 보시기 바랍니다.", 793],
  ["이 보험계약은 예금자보호법에 따라 예금보험공사가 보호하되, 보호한도는 본 보험회사에 있는 귀하의 모든", 853],
  ["예금보호대상 금융상품의 해지환급금 (또는 만기 시 보험금이나 사고보험금) 에 기타지급금을 합하여 1인당", 900],
  ["‘최고 5천만원’이며, 5천만원을 초과하는 나머지 금액은 보호하지 않습니다.", 948],
] as const;

export function LegalNotice({ presenter }: { presenter?: string }) {
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: "#fdfdfd" }} />
      <Header presenter={presenter} />
      <div style={{ position: "absolute", left: 660, top: 377, width: 595, height: 74, border: "3px solid #4cd137", boxSizing: "border-box", display: "flex", background: "#fff" }}>
        <div style={{ width: 196, background: "linear-gradient(180deg, #2fd43a, #1ab52a)", color: "#fff", display: "grid", placeItems: "center", fontSize: 37, fontWeight: 900, letterSpacing: "0.02em" }}>
          NAVER
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", paddingLeft: 30, ...text(38, "#222", 500), letterSpacing: "-0.07em" }}>
          라이나 OK실버보험
        </div>
        <div style={{ width: 50, display: "grid", placeItems: "center", color: "#2cbf3a", fontSize: 18 }}>▼</div>
      </div>
      {NOTICE_BLUE.map(([line, y]) => (
        <At key={line} x={285} y={y} style={text(33, TEXT_BLUE, 700)}>{line}</At>
      ))}
      {NOTICE_GRAY.map(([line, y]) => (
        <At key={line} x={285} y={y} style={text(32, TEXT_GRAY)}>{line}</At>
      ))}
      <At x={285} y={990} style={text(32, "#7a6a5a")}>생명보험협회 심의필 제 2015-1346호 (2015.5.26)</At>
    </>
  );
}
