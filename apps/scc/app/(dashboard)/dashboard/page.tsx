import type { Metadata } from "next";
import SccNavigation from "@/components/navigation";
import { getSccNavigationItems } from "@/components/navigation/experiments";

export const metadata: Metadata = {
  title: "dashboard",
};

export default function DashboardIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ area: "dashboard" })}
      scope="dashboard"
      scopeKey="dashboard"
    />
  );
}
