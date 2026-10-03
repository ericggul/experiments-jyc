import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

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
