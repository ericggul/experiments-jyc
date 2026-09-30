import type { Metadata } from "next";
import SccNavigation from "@/components/navigation";
import { getSccNavigationItems } from "@/components/navigation/experiments";

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
