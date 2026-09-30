import type { ComponentType } from "react";

export type SixSigmaExperiment = {
  key: string;
  date: string;
  label: string;
  load: () => Promise<{ default: ComponentType }>;
};

export type NavigationExperiment = Pick<SixSigmaExperiment, "key" | "date" | "label">;

export const sixSigmaExperiments: readonly SixSigmaExperiment[] = [
  {
    key: "mobile/0927/K6",
    date: "2026-09-27",
    label: "K6",
    load: () => import("./mobile/0927/K6"),
  },
  {
    key: "mobile/0927/local-optimum",
    date: "2026-09-27",
    label: "Local optimum",
    load: () => import("./mobile/0927/local-optimum"),
  },
  {
    key: "screen/0923/hello-world",
    date: "2026-09-23",
    label: "Hello world",
    load: () => import("./screen/0923/hello-world"),
  },
];

export const sixSigmaNavigationExperiments: readonly NavigationExperiment[] =
  sixSigmaExperiments.map(({ key, date, label }) => ({ key, date, label }));

export function findSixSigmaExperiment(path: readonly string[]) {
  return sixSigmaExperiments.find((item) => item.key === path.join("/"));
}
