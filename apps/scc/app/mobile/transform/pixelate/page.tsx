import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getCloneNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = { title: "mobile / pixelate" };

export default function PixelateIndexPage() {
  return (
    <SccNavigation
      experiments={getCloneNavigationItems("mobile/transform/pixelate")}
      scope="mobile/transform/pixelate"
      scopeKey="mobile/transform/pixelate"
    />
  );
}
