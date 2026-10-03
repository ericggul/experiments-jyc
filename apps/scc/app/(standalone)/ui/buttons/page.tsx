import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "ui buttons",
};

export default function UiButtonsIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "ui/buttons" })}
      scope="ui/buttons"
      scopeKey="ui/buttons"
    />
  );
}
