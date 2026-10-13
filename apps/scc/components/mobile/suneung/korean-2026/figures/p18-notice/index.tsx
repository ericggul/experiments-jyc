import styles from "./p18-notice.module.css";

type Line = { id: string; x: number; y: number; text: string; cls: string };

const lines: Line[] = [
  { id: "lib", x: 12.5, y: 44, text: "◇◇ 시립 도서관", cls: "lib" },
  { id: "head", x: 31, y: 62, text: "알림 메시지 도착", cls: "head" },
  { id: "consent", x: 14, y: 82.5, text: "※ 이 메시지는 수신에 동의한 회원에게만 발송됩니다.", cls: "note" },
  { id: "title", x: 146, y: 105, text: "‘상호 대차’ 이용 안내", cls: "title" },
  { id: "h1", x: 20, y: 129.5, text: "1. 상호 대차란?", cls: "h" },
  { id: "p1", x: 28, y: 145, text: "우리 도서관에 없는 도서를 협력 관계에 있는 도내 다른 도서관에", cls: "body" },
  { id: "p2", x: 19.5, y: 159, text: "신청하여 이용자가 지정한 도서관에서 받아 볼 수 있는 도서 대출", cls: "body" },
  { id: "p3", x: 19.5, y: 172.5, text: "서비스", cls: "body" },
  { id: "h2", x: 20, y: 194, text: "2. 이용 안내 및 유의 사항", cls: "h" },
  { id: "b1", x: 22, y: 210, text: "•", cls: "body" },
  { id: "b1t", x: 28, y: 210, text: "신청 권수 및 대출 기간: 월 5권 이내, 14일간", cls: "body" },
  { id: "b2", x: 22, y: 223.7, text: "•", cls: "body" },
  { id: "b2t", x: 28, y: 223.7, text: "수령 기간: 도착 문자 수신일로부터 3업무일 이내", cls: "body" },
  { id: "n1", x: 27, y: 235.7, text: "※ 정기 휴관일(월요일) 및 공휴일 제외(일요일은 운영)", cls: "sub" },
  { id: "n2", x: 27, y: 248, text: "※ 미수령 시 자동 반납 및 3일간 재신청 불가", cls: "sub" },
  { id: "b3", x: 22, y: 263.7, text: "•", cls: "body" },
  { id: "b3t", x: 28, y: 263.7, text: "수령 시간: 09:00 ~ 18:00", cls: "body" },
  { id: "n3", x: 27, y: 276.3, text: "※ 도서관 자료실 운영 시간(09:00 ~ 22:00)과 상이함.", cls: "sub" },
  { id: "b4", x: 22, y: 290.7, text: "•", cls: "body" },
  { id: "b4t", x: 28, y: 290.7, text: "신청 절차: 누리집 로그인 → 도서 검색 → 상호 대차 신청", cls: "body" },
  { id: "b4u", x: 77.5, y: 304.5, text: "→ 수령 도서관 지정 → 신청 완료", cls: "body" },
];

export default function P18Notice() {
  return (
    <div className={styles.root}>
      <div className={styles.speaker} />
      <div className={styles.camera} />
      <div className={styles.screen} />
      <div className={styles.bar}>
        <span className={styles.back} />
        <span className={styles.barTitle}>◇◇ 시립 도서관</span>
        <span className={styles.lens} />
        <span className={styles.handle} />
        <span className={`${styles.menu} ${styles.m1}`} />
        <span className={`${styles.menu} ${styles.m2}`} />
        <span className={`${styles.menu} ${styles.m3}`} />
      </div>
      <div className={styles.panel}>
        <div className={styles.panelHead} />
      </div>
      {lines.map((l) => (
        <div key={l.id} className={`${styles.line} ${styles[l.cls]}`} style={{ left: l.x, top: l.y }}>
          {l.text}
        </div>
      ))}
      <div className={styles.button}>◇◇ 시립 도서관 누리집 바로 가기</div>
    </div>
  );
}
