import type { Metadata } from "next";
import SccNavigation from "@/components/navigation";
import { getSccNavigationItems } from "@/components/navigation/experiments";

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
