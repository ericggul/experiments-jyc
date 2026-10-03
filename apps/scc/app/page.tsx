import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "SCC",
};

export default function SccIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems()}
    />
  );
}
