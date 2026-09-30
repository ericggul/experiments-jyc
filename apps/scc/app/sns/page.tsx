import type { Metadata } from "next";
import SccNavigation from "@/components/navigation";
import { getSccNavigationItems } from "@/components/navigation/experiments";

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
