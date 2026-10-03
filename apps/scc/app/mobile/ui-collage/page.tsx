import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "mobile / ui-collage",
};

export default function MobileUiCollageIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "mobile/ui-collage" })}
      scope="mobile/ui-collage"
      scopeKey="mobile/ui-collage"
    />
  );
}
