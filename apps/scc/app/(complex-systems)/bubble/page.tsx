import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "bubble",
};

export default function BubbleIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "bubble" })}
      scope="bubble"
      scopeKey="bubble"
    />
  );
}
