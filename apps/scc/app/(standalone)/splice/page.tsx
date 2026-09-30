import type { Metadata } from "next";
import SccNavigation from "@/components/navigation";
import { getSccNavigationItems } from "@/components/navigation/experiments";

export const metadata: Metadata = {
  title: "Splice",
};

export default function SpliceIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "splice" })}
      scope="splice"
      scopeKey="splice"
    />
  );
}
