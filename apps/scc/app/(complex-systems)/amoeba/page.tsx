import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "amoeba",
};

export default function AmoebaIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "amoeba" })}
      scope="amoeba"
      scopeKey="amoeba"
    />
  );
}
