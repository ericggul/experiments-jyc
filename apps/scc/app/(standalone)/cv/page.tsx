import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

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
