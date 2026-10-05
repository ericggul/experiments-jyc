import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "desktop-collage / primitives",
};

export default function PrimitivesIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "desktop-collage/primitives" })}
      scope="desktop-collage/primitives"
      scopeKey="desktop-collage/primitives"
    />
  );
}
