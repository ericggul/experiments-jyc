import type { Metadata } from "next";
import SccNavigation from "@/components/navigation";
import { getSccNavigationItems } from "@/components/navigation/experiments";

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
