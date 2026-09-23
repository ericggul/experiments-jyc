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
