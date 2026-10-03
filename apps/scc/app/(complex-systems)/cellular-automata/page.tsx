import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "complex-systems",
};

export default function CellularAutomataIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "cellular-automata" })}
      scope="cellular-automata"
      scopeKey="cellular-automata"
    />
  );
}
