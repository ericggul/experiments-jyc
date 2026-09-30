import type { Metadata } from "next";
import SccNavigation from "@/components/navigation";
import { getSccNavigationItems } from "@/components/navigation/experiments";

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
