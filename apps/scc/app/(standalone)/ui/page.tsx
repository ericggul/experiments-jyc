import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

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
