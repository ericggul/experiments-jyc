import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

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
