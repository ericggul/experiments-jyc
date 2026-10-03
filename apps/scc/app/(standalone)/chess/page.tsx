import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

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
