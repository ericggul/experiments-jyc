import Link from "next/link";
import { referenceSources } from "./model/sources";
import styles from "./reference.module.css";

export default function ReferenceShelf() {
  return (
    <main className={styles.page}>
      <div className={styles.frame}>
        <header className={styles.header}>
          <Link target="_blank" rel="noopener noreferrer" className={styles.homeLink} href="/">
            SCC
          </Link>
          <p>Reference shelf</p>
        </header>

        <section className={styles.introduction} aria-labelledby="reference-title">
          <h1 id="reference-title">
            When a visual question stays open, begin here.
          </h1>
          <p>
            These are not a style kit. They are working references for noticing
            a relation, studying its construction, and finding a precise next
            experiment.
          </p>
        </section>

        <section aria-label="Visual and rendering references" className={styles.sources}>
          {referenceSources.map((source) => (
            <article className={styles.source} key={source.id}>
              <span className={styles.sourceRole}>{source.role}</span>
              <a
                className={styles.sourceName}
                href={source.links[0].href}
                rel="noreferrer"
                target="_blank"
              >
                {source.name}
              </a>
              <span className={styles.sourceDescription}>{source.description}</span>
              <span className={styles.sourceLinks}>
                {source.links.map((link) => (
                  <a
                    className={styles.visit}
                    href={link.href}
                    key={link.href}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {link.label}
                  </a>
                ))}
              </span>
            </article>
          ))}
        </section>

        <aside className={styles.note}>
          Take the operative rule, not the surface: a shader, material, motion,
          or spatial relation is useful only when it makes this experiment’s
          own question easier to perceive.
        </aside>
      </div>
    </main>
  );
}
