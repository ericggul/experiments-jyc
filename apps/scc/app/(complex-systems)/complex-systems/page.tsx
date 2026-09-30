import type { Metadata } from "next";
import SccNavigation from "@/components/navigation";
import { getSccNavigationItems } from "@/components/navigation/experiments";

export const metadata: Metadata = {
  title: "complex-systems",
  description: "A dated index of SCC complex-systems experiments.",
};

export default function ComplexSystemsIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ area: "complex-systems" })}
      scope="complex-systems"
      scopeKey="complex-systems"
    />
  );
}
