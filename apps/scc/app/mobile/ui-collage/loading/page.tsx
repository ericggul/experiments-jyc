import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "mobile / ui-collage / loading",
};

export default function MobileUiCollageLoadingIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "mobile/ui-collage/loading" })}
      scope="mobile/ui-collage/loading"
      scopeKey="mobile/ui-collage/loading"
    />
  );
}
