import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "network system",
};

export default function NetworkSystemIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "network-system" })}
      scope="network-system"
      scopeKey="network-system"
    />
  );
}
