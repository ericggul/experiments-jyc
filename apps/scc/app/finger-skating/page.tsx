import type { Metadata } from "next";
import SccNavigation from "@/components/navigation";
import { getSccNavigationItems } from "@/components/navigation/experiments";

export const metadata: Metadata = {
  title: "finger-skating",
};

export default function FingerSkatingIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "finger-skating" })}
      scope="finger-skating"
      scopeKey="finger-skating"
    />
  );
}
