import faceA from "../../assets/p20-meeting-face-a.webp";
import faceB from "../../assets/p20-meeting-face-b.webp";
import faceC from "../../assets/p20-meeting-face-c.webp";
import { Fragment } from "react";
import styles from "./p20-meeting.module.css";

const members = [
  { id: "m1", name: "다겸(나)", face: faceA, faceBox: { x: 186.5, y: 19.8, w: 16.3, h: 17.7 }, top: 19, h: 18.7 },
  { id: "m2", name: "도윤", face: faceB, faceBox: { x: 187.2, y: 40.2, w: 14.4, h: 17.8 }, top: 39.7, h: 18.7 },
  { id: "m3", name: "서현", face: faceC, faceBox: { x: 186.7, y: 60.8, w: 16.6, h: 18.2 }, top: 60.3, h: 19 },
];

const callouts = [
  { id: "a", mark: "ㄱ", y: 42, x1: 142.3, x2: 153.6 },
  { id: "b", mark: "ㄴ", y: 64.3, x1: 142.3, x2: 153.6 },
  { id: "c", mark: "ㄷ", y: 42.7, x1: 267.7, x2: 279.4 },
  { id: "e", mark: "ㅁ", y: 129.3, x1: 267.3, x2: 279.4 },
];

export default function P20Meeting() {
  return (
    <div className={styles.root}>
      <div className={styles.screen} />
      <div className={styles.title}>다겸(나) 님의 화면을 공유 중입니다.</div>

      <div className={`${styles.panel} ${styles.panelTop}`} />
      <div className={`${styles.panel} ${styles.panelBody}`} />
      <div className={styles.panelCover} />
      <div className={styles.info}>
        <span>회의실</span>
        <span>정 보</span>
      </div>
      <div className={styles.tab} style={{ top: 44.8, height: 15.5 }}>음성 설정</div>
      <div className={styles.tab} style={{ top: 60.3, height: 16.6 }}>영상 설정</div>
      <div className={styles.roomId}>회의실 ID: 526 831</div>
      <div className={styles.pwBox} />
      <div className={styles.pwText}>암호: 0827</div>
      <div className={styles.linkBox} />
      <div className={styles.linkTitle}>회의실 초대 링크</div>
      <div className={styles.url}>https://□□.com/△△</div>

      <div className={styles.members}>
        <div className={styles.membersHead}>회의실 참여자(3) ▲</div>
        {members.map((m) => (
          <div key={m.id} className={styles.member} style={{ top: m.top, height: m.h }}>
            <span className={styles.memberDivider} />
            <span className={styles.status}>참여 중</span>
            <span className={styles.name}>{m.name}</span>
          </div>
        ))}
        {members.map((m) => (
          <img
            key={m.id}
            className={styles.face}
            src={m.face.src}
            alt=""
            draggable={false}
            style={{ left: m.faceBox.x - 176.5 - 1.8, top: m.faceBox.y - 2.9 - 1.8, width: m.faceBox.w, height: m.faceBox.h }}
          />
        ))}
      </div>

      <div className={styles.toolbar} />
      <div className={styles.tool} style={{ left: 22, width: 38 }}>
        <span className={styles.micBody} />
        <span className={styles.micArc} />
        <span className={styles.micStem} />
        <span className={styles.toolLabel} style={{ left: 11.5 }}>음소거</span>
      </div>
      <span className={styles.sep} style={{ left: 55.5 }} />
      <span className={styles.camBody} />
      <span className={styles.camLens} />
      <span className={styles.toolText} style={{ left: 80.7 }}>카메라</span>
      <div className={styles.shareBox} />
      <span className={styles.shareIcon}>↑</span>
      <span className={styles.toolText} style={{ left: 127.7 }}>화면 공유</span>
      <span className={styles.gear}>⚙</span>
      <span className={styles.toolText} style={{ left: 189.7 }}>설정</span>
      <span className={styles.sep} style={{ left: 217 }} />
      <span className={styles.door} />
      <span className={styles.toolText} style={{ left: 238.9 }}>나가기</span>

      <span className={styles.leaderV} style={{ left: 136.4, top: 98.5, height: 7.4 }} />
      <span className={styles.leaderH} style={{ left: 136.4, top: 105.3, width: 8.4 }} />
      <span className={styles.circle} style={{ left: 144.7, top: 105.3 }}>ㄹ</span>

      {callouts.map((c) => (
        <Fragment key={c.id}>
          <span className={styles.leaderH} style={{ left: c.x1, top: c.y, width: c.x2 - c.x1 }} />
          <span className={styles.circle} style={{ left: c.x2, top: c.y }}>{c.mark}</span>
        </Fragment>
      ))}

      <div className={styles.dialog} />
      <div className={styles.dialogText}>혜정 님이 회의실에 참여하고자 합니다.</div>
      <div className={styles.button} style={{ left: 60.1 }}>수락</div>
      <div className={styles.button} style={{ left: 162.8 }}>거절</div>
      <div className={styles.cursor}>
        <div className={styles.cursorFill} />
      </div>
    </div>
  );
}
