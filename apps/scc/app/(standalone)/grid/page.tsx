import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "grid",
};

export default function GridIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "grid" })}
      scope="grid"
      scopeKey="grid"
    />
  );
}
