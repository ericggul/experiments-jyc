import type { Metadata } from "next";
import SccNavigation from "@/components/navigation";
import { getSccNavigationItems } from "@/components/navigation/experiments";

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
