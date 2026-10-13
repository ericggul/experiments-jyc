import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "ar / chemical-decomposition",
};

export default function ChemicalDecompositionIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "ar/chemical-decomposition" })}
      scope="ar/chemical-decomposition"
      scopeKey="ar/chemical-decomposition"
    />
  );
}
