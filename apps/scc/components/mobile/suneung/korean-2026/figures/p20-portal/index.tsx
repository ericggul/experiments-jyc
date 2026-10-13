import glass from "../../assets/p20-portal-glass.webp";
import face from "../../assets/p20-portal-face.webp";
import pill from "../../assets/p20-portal-pill.webp";
import pumpkin from "../../assets/p20-portal-pumpkin.webp";
import chestnut from "../../assets/p20-portal-chestnut.webp";
import sweet from "../../assets/p20-portal-sweet.webp";
import styles from "./p20-portal.module.css";

const arts = [
  { id: "glass", src: glass.src, left: 50, top: 90, width: 31.25, height: 40 },
  { id: "face", src: face.src, left: 86.25, top: 97.5, width: 18.75, height: 17.5 },
  { id: "pill", src: pill.src, left: 86.25, top: 118.75, width: 20, height: 11.25 },
  { id: "pumpkin", src: pumpkin.src, left: 205.5, top: 88.75, width: 17.5, height: 11.25 },
  { id: "chestnut", src: chestnut.src, left: 205.5, top: 103.75, width: 16, height: 11.5 },
  { id: "sweet", src: sweet.src, left: 205.5, top: 119.25, width: 16, height: 12.25 },
];

const navs = [
  { id: "n1", text: "○○고등학교 소식", left: 11, top: 33, width: 66.5, height: 11, on: false },
  { id: "n2", text: "[특집] 소개하고 싶은…", left: 77, top: 30.5, width: 72.5, height: 13.5, on: true },
  { id: "n3", text: "만나고 싶은 사람들", left: 149.5, top: 33, width: 65.5, height: 11, on: false },
  { id: "n4", text: "말하고 싶은 이야기", left: 215, top: 33, width: 66, height: 11, on: false },
];

const sides = [
  { id: "s1", text: "전통\n놀이", top: 48, height: 23, on: false },
  { id: "s2", text: "전통\n음료", top: 70.75, height: 24.5, on: true },
  { id: "s3", text: "전통\n간식", top: 95, height: 24, on: false },
];

const kinds = [
  { id: "k1", text: "단호박식혜", top: 94.25 },
  { id: "k2", text: "밤식혜", top: 109 },
  { id: "k3", text: "고구마식혜", top: 124 },
];

export default function P20Portal() {
  return (
    <div className={styles.root}>
      <div className={styles.win} />
      <div className={styles.strip} />
      <div className={styles.icon} />
      <div className={styles.btab} />
      <div className={`${styles.l}`} style={{ left: 19.5, top: 8.5, fontSize: 6.3 }}>○○고등학교 온라인 소식지</div>
      <div className={styles.l} style={{ left: 91.5, top: 8.5, fontSize: 6.3 }}>×</div>
      <div className={styles.l} style={{ left: 102.5, top: 8, fontSize: 8 }}>+</div>
      <div className={styles.min} />
      <div className={styles.maxbox} />
      <div className={styles.c} style={{ left: 283.5, top: 8, fontSize: 7 }}>×</div>

      <div className={styles.c} style={{ left: 146, top: 22.5, fontSize: 8.8 }}>○○고등학교 온라인 소식지</div>

      {navs.map((n) => (
        <div
          key={n.id}
          className={`${styles.nav} ${n.on ? styles.navOn : ""}`}
          style={{ left: n.left, top: n.top, width: n.width, height: n.height }}
        >
          {n.text}
        </div>
      ))}

      <div className={styles.panel} />
      {sides.map((s) => (
        <div
          key={s.id}
          className={`${styles.side} ${s.on ? styles.sideOn : ""}`}
          style={{ top: s.top, height: s.height }}
        >
          {s.text}
        </div>
      ))}
      <div className={styles.frameOut}>
        <div className={styles.frameIn} />
      </div>

      <div className={`${styles.c} ${styles.title}`} style={{ left: 134, top: 58.5, fontSize: 7.8 }}>전통 음료</div>
      <div className={`${styles.c} ${styles.title}`} style={{ left: 181.5, top: 57.5, fontSize: 14.5, fontWeight: 500 }}>한 모금</div>

      <div className={styles.box} style={{ left: 39.5, top: 68, width: 121, height: 106.25 }}>
        <div className={styles.head}>식혜의 특징</div>
      </div>
      <div className={styles.box} style={{ left: 165, top: 68, width: 116.25, height: 68.25 }}>
        <div className={styles.head}>식혜의 종류</div>
      </div>
      <div className={styles.box} style={{ left: 165, top: 139.5, width: 116.25, height: 34.75 }} />

      {arts.map((a) => (
        <img
          key={a.id}
          className={`${styles.art} ${styles.over}`}
          src={a.src}
          alt=""
          draggable={false}
          style={{ left: a.left, top: a.top, width: a.width, height: a.height }}
        />
      ))}

      <div className={`${styles.c} ${styles.over}`} style={{ left: 66, top: 136, fontSize: 8.5 }}>식혜</div>
      <div className={`${styles.l} ${styles.over}`} style={{ left: 107.5, top: 103, fontSize: 8.5 }}>은은한 단맛</div>
      <div className={`${styles.l} ${styles.over}`} style={{ left: 107.5, top: 123, fontSize: 8.5 }}>천연 소화제</div>
      <div className={`${styles.c} ${styles.over}`} style={{ left: 100, top: 150, fontSize: 7.5 }}>단맛의 비밀, 천연 소화제의 원리는</div>
      <div className={styles.btn} style={{ left: 43, top: 156.75, width: 32.5, height: 13.75, fontSize: 8 }}>+더 보기</div>
      <div className={`${styles.l} ${styles.over}`} style={{ left: 78, top: 163.5, fontSize: 7.3 }}>(☜클릭)새 창에서 확인</div>

      <div className={styles.oval}>{"밥\n엿기름\n꿀"}</div>
      {kinds.map((k) => (
        <div key={k.id}>
          <div className={`${styles.c} ${styles.over}`} style={{ left: 199, top: k.top, fontSize: 8.5 }}>+</div>
          <div className={`${styles.c} ${styles.over}`} style={{ left: 227, top: k.top, fontSize: 8.5 }}>=</div>
          <div className={`${styles.l} ${styles.over}`} style={{ left: 234, top: k.top, fontSize: 9.5 }}>{k.text}</div>
        </div>
      ))}

      <div className={styles.btn} style={{ left: 173, top: 145.5, width: 24.5, height: 22.5, fontSize: 7.8 }}>{"전통\n간식"}</div>
      <div className={`${styles.l} ${styles.over}`} style={{ left: 199.5, top: 151, fontSize: 7.5 }}>(☜클릭)에서 식혜에</div>
      <div className={`${styles.l} ${styles.over}`} style={{ left: 199.5, top: 162.5, fontSize: 7.5 }}>어울리는 간식을 확인</div>
    </div>
  );
}
