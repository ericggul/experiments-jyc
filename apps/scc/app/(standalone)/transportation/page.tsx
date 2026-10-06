import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "Transportation",
};

export default function TransportationIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "transportation" })}
      scope="transportation"
      scopeKey="transportation"
    />
  );
}
