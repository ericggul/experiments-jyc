import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

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
