import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "mobile / ui-collage / volume",
};

export default function MobileUiCollageVolumeIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "mobile/ui-collage/volume" })}
      scope="mobile/ui-collage/volume"
      scopeKey="mobile/ui-collage/volume"
    />
  );
}
