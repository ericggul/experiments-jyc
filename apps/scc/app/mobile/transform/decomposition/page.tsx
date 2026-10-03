import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getCloneNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = { title: "mobile / decomposition" };

export default function DecompositionIndexPage() {
  return (
    <SccNavigation
      experiments={getCloneNavigationItems("mobile/transform/decomposition")}
      scope="mobile/transform/decomposition"
      scopeKey="mobile/transform/decomposition"
    />
  );
}
