import Link from "next/link";
import { uiCategories } from "../model/data";
import styles from "./ui-navigation.module.css";

export function UiNavigation() {
  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <h1 className={styles.title}>ui</h1>
        <nav aria-label="UI experiments" className={styles.routes}>
          {uiCategories.map((category) => (
            <Link target="_blank" rel="noopener noreferrer" className={styles.route} href={category.href} key={category.id}>
              <span className={styles.label}>{category.label}</span>
              <span className={styles.path}>{category.href}</span>
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}
