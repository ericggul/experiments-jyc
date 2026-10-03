import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

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
