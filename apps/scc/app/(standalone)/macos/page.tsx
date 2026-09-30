import type { Metadata } from "next";
import SccNavigation from "@/components/navigation";
import { getSccNavigationItems } from "@/components/navigation/experiments";

export const metadata: Metadata = {
  title: "macOS",
};

export default function MacosIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "macos" })}
      scope="macos"
      scopeKey="macos"
    />
  );
}
