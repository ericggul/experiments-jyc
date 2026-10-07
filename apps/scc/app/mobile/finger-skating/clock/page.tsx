import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "mobile / finger-skating / clock",
};

export default function MobileFingerSkatingClockIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "mobile/finger-skating/clock" })}
      scope="mobile/finger-skating/clock"
      scopeKey="mobile/finger-skating/clock"
    />
  );
}
