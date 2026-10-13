import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "ar",
};

export default function ArIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ area: "ar" })}
      scope="ar"
      scopeKey="ar"
    />
  );
}
