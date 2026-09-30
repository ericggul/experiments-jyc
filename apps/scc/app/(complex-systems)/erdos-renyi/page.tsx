import type { Metadata } from "next";
import SccNavigation from "@/components/navigation";
import { getSccNavigationItems } from "@/components/navigation/experiments";

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
