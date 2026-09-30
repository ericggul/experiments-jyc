import type { Metadata } from "next";
import SccNavigation from "@/components/navigation";
import { getCloneNavigationItems } from "@/components/navigation/experiments";

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
