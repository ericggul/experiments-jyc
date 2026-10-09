import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "desktop-collage / hype",
};

export default function HypeIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "desktop-collage/hype" })}
      scope="desktop-collage/hype"
      scopeKey="desktop-collage/hype"
    />
  );
}
