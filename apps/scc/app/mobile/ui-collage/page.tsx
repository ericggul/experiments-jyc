import type { Metadata } from "next";
import SccNavigation from "@/components/navigation";
import { getSccNavigationItems } from "@/components/navigation/experiments";

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
