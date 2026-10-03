import type { Metadata } from "next";
import SccNavigation from "@/components/navigation";
import { getSccNavigationItems } from "@/components/navigation/experiments";

export const metadata: Metadata = {
  title: "mobiles",
};

export default function MobilesIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "mobiles" })}
      scope="mobiles"
      scopeKey="mobiles"
    />
  );
}
