import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "mobile / finger-skating / road-sign",
};

export default function MobileFingerSkatingRoadSignIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "mobile/finger-skating/road-sign" })}
      scope="mobile/finger-skating/road-sign"
      scopeKey="mobile/finger-skating/road-sign"
    />
  );
}
