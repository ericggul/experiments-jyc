import type { Metadata } from "next";
import SccNavigation from "@/components/navigation";
import { getSccNavigationItems } from "@/components/navigation/experiments";

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
