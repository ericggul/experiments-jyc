import type { ComponentType } from "react";

export type SixSigmaExperiment = {
  key: string;
  legacyKeys?: readonly string[];
  date: string;
  label: string;
  load: () => Promise<{ default: ComponentType }>;
};

export type NavigationExperiment = Pick<SixSigmaExperiment, "key" | "date" | "label">;

export const sixSigmaExperiments: readonly SixSigmaExperiment[] = [
  {
    key: "mobile/network-instability/1",
    legacyKeys: ["mobile/0930/network-instability"],
    date: "2026-09-30",
    label: "Network instability",
    load: () => import("./mobile/network-instability/1"),
  },
  {
    key: "mobile/k6/1",
    legacyKeys: ["mobile/0927/K6"],
    date: "2026-09-27",
    label: "K6",
    load: () => import("./mobile/k6/1"),
  },
  {
    key: "mobile/k6/2",
    legacyKeys: ["mobile/0927/local-optimum"],
    date: "2026-09-27",
    label: "Local optimum",
    load: () => import("./mobile/k6/2"),
  },
  {
    key: "screen/hello-world/1",
    legacyKeys: ["screen/0923/hello-world"],
    date: "2026-09-23",
    label: "Hello world",
    load: () => import("./screen/hello-world/1"),
  },
];

export const sixSigmaNavigationExperiments: readonly NavigationExperiment[] =
  sixSigmaExperiments.map(({ key, date, label }) => ({ key, date, label }));

export function findSixSigmaExperiment(path: readonly string[]) {
  const key = path.join("/");
  return sixSigmaExperiments.find(
    (item) => item.key === key || item.legacyKeys?.includes(key),
  );
}
