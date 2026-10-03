import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "bastille-day",
};

export default function BastilleDayIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "bastille-day" })}
      scope="bastille-day"
      scopeKey="bastille-day"
    />
  );
}
