import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

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
