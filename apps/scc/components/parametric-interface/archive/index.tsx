import SccNavigation from "@/foundations/navigation";
import type { ParametricInterfaceExperiment } from "../experiments";

export default function ParametricInterfaceArchive({
  dateKey,
  experiments,
}: {
  dateKey: string;
  experiments: readonly ParametricInterfaceExperiment[];
}) {
  const items = experiments.flatMap((experiment) => {
    if (!experiment.date) return [];
    const key = `parametric-interface/${experiment.key}`;
    return [
      {
        key,
        area: "parametric-interface" as const,
        family: "parametric-interface",
        date: experiment.date,
        phrase: experiment.phrase,
        routes: [{ label: key, href: `/${key}` }],
      },
    ];
  });

  return (
    <SccNavigation
      experiments={items}
      scope={`parametric-interface/${dateKey}`}
      scopeKey={`parametric-interface/${dateKey}`}
    />
  );
}
