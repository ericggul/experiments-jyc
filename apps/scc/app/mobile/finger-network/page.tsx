import type { Metadata } from "next";
import SccNavigation from "@/components/navigation";
import { getSccNavigationItems } from "@/components/navigation/experiments";

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
