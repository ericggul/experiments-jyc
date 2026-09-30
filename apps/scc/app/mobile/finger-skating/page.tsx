import type { Metadata } from "next";
import SccNavigation from "@/components/navigation";
import { getSccNavigationItems } from "@/components/navigation/experiments";

export const metadata: Metadata = {
  title: "mobile / finger-skating",
};

export default function MobileFingerSkatingIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "mobile/finger-skating" })}
      scope="mobile/finger-skating"
      scopeKey="mobile/finger-skating"
    />
  );
}
