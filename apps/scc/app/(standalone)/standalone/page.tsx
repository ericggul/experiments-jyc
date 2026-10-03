import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

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
