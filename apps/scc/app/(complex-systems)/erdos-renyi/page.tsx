import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "Erdős–Rényi random graph",
};

export default function ErdosRenyiIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "erdos-renyi" })}
      scope="erdos-renyi"
      scopeKey="erdos-renyi"
    />
  );
}
