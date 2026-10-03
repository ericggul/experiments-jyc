import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

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
