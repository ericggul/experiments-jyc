import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "mobile",
};

export default function MobileIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ area: "mobile" })}
      scope="mobile"
      scopeKey="mobile"
    />
  );
}
