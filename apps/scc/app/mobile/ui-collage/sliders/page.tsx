import type { Metadata } from "next";
import SccNavigation from "@/components/navigation";
import { getSccNavigationItems } from "@/components/navigation/experiments";

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
