import { NAVY, RED } from "./type";

// Closing disclosure page of a Korean life-insurance spot. Section wording
// follows the standard 협회 disclosures; the 심의필 number is the spot's own.
const SECTIONS = [
  {
    heading: "[기존계약 해지 후, 신계약 체결 시 불이익]",
    body: [
      "보험계약자가 기존 보험계약을 해지하고, 새로운 보험계약을 체결할 경우,",
      "인수거절, 보험료 인상, 보장내용 축소 등 불이익이 생길 수 있습니다.",
    ],
  },
  {
    heading: "[예금자보호안내]",
    body: [
      "이 보험계약은 예금자보호법에 따라 해약환급금(또는 만기 시 보험금이나 기타 지급금)을",
      "합한 금액이 1인당 “1억원까지”(본 보험회사의 여타 보호상품과 합산) 보호됩니다.",
      "이와 별도로 본 보험회사 보호상품의 사고 보험금을 합산한 금액이 1인당 “1억원까지” 보호됩니다.",
      "다만, 보험계약자 및 보험료납부자가 법인인 보험계약의 경우에는 보호되지 않습니다.",
    ],
  },
  {
    heading: "[상품설명서 및 약관 참조]",
    body: [
      "보험계약 체결 전에 상품설명서 및 약관을 읽어보시기 바랍니다.",
      "라이나생명은 해당 상품에 대해 충분히 설명할 의무가 있으며,",
      "가입자는 가입에 앞서 이에 대한 충분한 설명을 받으시기 바랍니다.",
    ],
  },
] as const;

export function LegalCard() {
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 920, background: "#fff", color: "#333" }}>
      <div
        style={{
          height: 112,
          background: NAVY,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 44,
          fontWeight: 900,
          letterSpacing: "-0.02em",
        }}
      >
        (무)첫날부터암보험(갱신형)
      </div>
      <div style={{ position: "absolute", right: 64, top: 132, fontSize: 23, color: "#444" }}>
        생명보험협회 심의필 제 2026-031110호 (2026-04-09~2027-04-08)
      </div>
      <ul style={{ position: "absolute", left: 140, top: 176, margin: 0, padding: 0, listStyle: "none", color: RED, fontSize: 23, lineHeight: 1.55 }}>
        <li>• 진단금 최초 1회한</li>
        <li>• 갱신 시 보험료 인상 가능 (10년 만기 갱신형 상품으로 최대 100세까지 보장)</li>
      </ul>
      <div style={{ position: "absolute", left: 140, top: 268, width: 1440 }}>
        {SECTIONS.map((section) => (
          <section key={section.heading} style={{ marginBottom: 26 }}>
            <div style={{ fontSize: 29, fontWeight: 800, color: "#1a1a1a", marginBottom: 6 }}>{section.heading}</div>
            {section.body.map((line) => (
              <div key={line} style={{ fontSize: 24, lineHeight: 1.5, color: "#3a3a3a" }}>{line}</div>
            ))}
          </section>
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          left: 1572,
          top: 470,
          width: 240,
          borderTop: "6px solid #d22a35",
          borderBottom: "6px solid #23308f",
          borderLeft: "2px solid #c9ccd8",
          borderRight: "2px solid #c9ccd8",
          textAlign: "center",
          padding: "12px 0 14px",
          background: "#fff",
        }}
      >
        <div style={{ fontSize: 16, color: "#555" }}>예금보험공사</div>
        <div style={{ fontSize: 34, fontWeight: 900, color: "#23308f", letterSpacing: "-0.03em" }}>보호금융상품</div>
        <div style={{ fontSize: 15, color: "#555" }}>1인당 최고 1억원</div>
      </div>
    </div>
  );
}
