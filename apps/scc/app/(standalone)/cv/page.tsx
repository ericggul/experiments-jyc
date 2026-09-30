import type { Metadata } from "next";
import SccNavigation from "@/components/navigation";
import { getSccNavigationItems } from "@/components/navigation/experiments";

export const metadata: Metadata = {
  title: "cv",
};

export default function CvIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "cv" })}
      scope="cv"
      scopeKey="cv"
    />
  );
}
