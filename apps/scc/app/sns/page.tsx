import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "sns",
};

export default function SnsIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "sns" })}
      scope="sns"
      scopeKey="sns"
    />
  );
}
