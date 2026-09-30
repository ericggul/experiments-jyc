import type { Metadata } from "next";
import SccNavigation from "@/components/navigation";
import { getSccNavigationItems } from "@/components/navigation/experiments";

export const metadata: Metadata = {
  title: "ui",
  description: "A dated index of SCC ui experiments.",
};

export default function UiIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ area: "ui" })}
      scope="ui"
      scopeKey="ui"
    />
  );
}
