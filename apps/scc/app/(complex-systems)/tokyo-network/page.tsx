import type { Metadata } from "next";
import SccNavigation from "@/components/navigation";
import { getSccNavigationItems } from "@/components/navigation/experiments";

export const metadata: Metadata = {
  title: "complex-systems",
};

export default function TokyoNetworkIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "tokyo-network" })}
      scope="tokyo-network"
      scopeKey="tokyo-network"
    />
  );
}
