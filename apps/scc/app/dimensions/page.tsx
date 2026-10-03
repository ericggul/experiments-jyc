import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "dimensions",
  description: "A dated index of SCC dimensions experiments.",
};

export default function DimensionsIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ area: "dimensions" })}
      scope="dimensions"
      scopeKey="dimensions"
    />
  );
}
