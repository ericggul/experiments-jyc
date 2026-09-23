import Link from "next/link";
import type { ParametricInterfaceExperimentSlug } from "../experiments";
import styles from "./navigation.module.css";

type NavigationExperiment = {
  slug: ParametricInterfaceExperimentSlug;
  label: string;
};

export default function ParametricInterfaceNavigation({
  experiments,
}: {
  experiments: readonly NavigationExperiment[];
}) {
  return (
    <main className={styles.page}>
      <nav aria-label="Parametric interface experiments" className={styles.list}>
        {experiments.map((experiment) => (
          <Link
            target="_blank"
            rel="noopener noreferrer"
            key={experiment.slug}
            href={`/parametric-interface/${experiment.slug}`}
            className={styles.link}
          >
            {experiment.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
