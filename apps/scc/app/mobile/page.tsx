import type { Metadata } from "next";
import SccNavigation from "@/components/navigation";
import { getSccNavigationItems } from "@/components/navigation/experiments";

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
