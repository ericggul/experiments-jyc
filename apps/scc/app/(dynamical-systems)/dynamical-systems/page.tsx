import type { Metadata } from "next";
import SccNavigation from "@/components/navigation";
import { getSccNavigationItems } from "@/components/navigation/experiments";

export const metadata: Metadata = {
  title: "dynamical-systems",
  description: "A dated index of SCC dynamical-systems experiments.",
};

export default function DynamicalSystemsIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ area: "dynamical-systems" })}
      scope="dynamical-systems"
      scopeKey="dynamical-systems"
    />
  );
}
