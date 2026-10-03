import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "mobile / language",
};

export default function MobileTransformLanguageIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "mobile/transform/language" })}
      scope="mobile/transform/language"
      scopeKey="mobile/transform/language"
    />
  );
}
