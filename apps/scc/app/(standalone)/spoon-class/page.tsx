import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "spoon-class",
};

export default function SpoonClassIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "spoon-class" })}
      scope="spoon-class"
      scopeKey="spoon-class"
    />
  );
}
