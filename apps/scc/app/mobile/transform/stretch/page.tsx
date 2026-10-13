import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getCloneNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = { title: "mobile / stretch" };

export default function StretchIndexPage() {
  return (
    <SccNavigation
      experiments={getCloneNavigationItems("mobile/transform/stretch")}
      scope="mobile/transform/stretch"
      scopeKey="mobile/transform/stretch"
    />
  );
}
