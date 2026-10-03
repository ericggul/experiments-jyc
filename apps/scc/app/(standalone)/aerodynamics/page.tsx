import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "Aerodynamics",
};

export default function AerodynamicsIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "aerodynamics" })}
      scope="aerodynamics"
      scopeKey="aerodynamics"
    />
  );
}
