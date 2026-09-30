import type { Metadata } from "next";
import SccNavigation from "@/components/navigation";
import { getSccNavigationItems } from "@/components/navigation/experiments";

export const metadata: Metadata = {
  title: "ui smile",
};

export default function UiSmileIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "ui/smile" })}
      scope="ui/smile"
      scopeKey="ui/smile"
    />
  );
}
