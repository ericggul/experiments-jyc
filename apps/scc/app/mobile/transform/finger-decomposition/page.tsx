import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getCloneNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = { title: "mobile / finger-decomposition" };

export default function FingerDecompositionIndexPage() {
  return (
    <SccNavigation
      experiments={getCloneNavigationItems("mobile/transform/finger-decomposition")}
      scope="mobile/transform/finger-decomposition"
      scopeKey="mobile/transform/finger-decomposition"
    />
  );
}
