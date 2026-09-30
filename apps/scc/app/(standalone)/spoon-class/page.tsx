import type { Metadata } from "next";
import SccNavigation from "@/components/navigation";
import { getSccNavigationItems } from "@/components/navigation/experiments";

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
