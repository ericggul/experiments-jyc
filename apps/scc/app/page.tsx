import type { Metadata } from "next";
import SccNavigation from "@/components/navigation";
import { getSccNavigationItems } from "@/components/navigation/experiments";

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
