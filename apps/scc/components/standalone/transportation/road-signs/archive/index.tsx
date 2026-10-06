import Image from "next/image";
import { ROAD_SIGN_CLASSES, ROAD_SIGNS } from "./model/catalogue";
import styles from "./screen/road-signs.module.css";

export default function RoadSignsArchive() {
  return <main className={styles.page} lang="ko">
    {ROAD_SIGN_CLASSES.map((signClass) => {
      const signs = ROAD_SIGNS.filter((sign) => sign.classId === signClass.id);
      return <section key={signClass.id} className={styles.class} aria-labelledby={`road-signs-${signClass.id}`}>
        <h2 id={`road-signs-${signClass.id}`} className={styles.heading}>
          {signClass.name}<span className={styles.count}>{signs.length}</span>
        </h2>
        <ol className={signClass.id === "marking" ? `${styles.grid} ${styles.markings}` : styles.grid}>
          {signs.map((sign) => <li key={sign.id} className={styles.sign}>
            <div className={styles.figure}>
              <Image
                src={`/transportation/road-signs/${sign.id}.svg`}
                alt={sign.name}
                width={sign.width}
                height={sign.height}
                className={styles.image}
              />
            </div>
            <span className={styles.number}>{sign.num}</span>
            <span className={styles.name}>{sign.name}</span>
          </li>)}
        </ol>
      </section>;
    })}
  </main>;
}
