import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "mobile / substitution",
};

export default function MobileTransformSubstitutionIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "mobile/transform/substitution" })}
      scope="mobile/transform/substitution"
      scopeKey="mobile/transform/substitution"
    />
  );
}
