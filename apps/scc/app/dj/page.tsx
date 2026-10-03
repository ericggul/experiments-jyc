import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "dj",
};

export default function DjIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "dj" })}
      scope="dj"
      scopeKey="dj"
    />
  );
}
