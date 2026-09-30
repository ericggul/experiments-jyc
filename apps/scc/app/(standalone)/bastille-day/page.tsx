import type { Metadata } from "next";
import SccNavigation from "@/components/navigation";
import { getSccNavigationItems } from "@/components/navigation/experiments";

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
