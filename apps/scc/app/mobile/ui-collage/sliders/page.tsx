import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "mobile / ui-collage / sliders",
};

export default function MobileUiCollageSlidersIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "mobile/ui-collage/sliders" })}
      scope="mobile/ui-collage/sliders"
      scopeKey="mobile/ui-collage/sliders"
    />
  );
}
