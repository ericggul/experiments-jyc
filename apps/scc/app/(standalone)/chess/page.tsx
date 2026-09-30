import type { Metadata } from "next";
import SccNavigation from "@/components/navigation";
import { getSccNavigationItems } from "@/components/navigation/experiments";

export const metadata: Metadata = {
  title: "Chess",
};

export default function ChessIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "chess" })}
      scope="chess"
      scopeKey="chess"
    />
  );
}
