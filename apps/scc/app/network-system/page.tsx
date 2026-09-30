import type { Metadata } from "next";
import SccNavigation from "@/components/navigation";
import { getSccNavigationItems } from "@/components/navigation/experiments";

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
