import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "mobile / finger-network",
};

export default function MobileFingerNetworkIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "mobile/finger-network" })}
      scope="mobile/finger-network"
      scopeKey="mobile/finger-network"
    />
  );
}
