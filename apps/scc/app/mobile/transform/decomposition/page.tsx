import type { Metadata } from "next";
import SccNavigation from "@/components/navigation";
import { getCloneNavigationItems } from "@/components/navigation/experiments";

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
