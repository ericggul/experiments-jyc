import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "desktop-collage",
  description: "A dated index of SCC desktop-collage experiments.",
};

export default function DesktopCollageIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ area: "desktop-collage" })}
      scope="desktop-collage"
      scopeKey="desktop-collage"
    />
  );
}
