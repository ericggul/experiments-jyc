import type { Metadata } from "next";
import SccNavigation from "@/components/navigation";
import { getSccNavigationItems } from "@/components/navigation/experiments";

export const metadata: Metadata = {
  title: "standalone",
};

export default function StandaloneIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ area: "standalone" })}
      scope="standalone"
      scopeKey="standalone"
    />
  );
}
