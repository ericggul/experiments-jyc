import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "diffusion-graph",
};

export default function DiffusionGraphIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "diffusion-graph" })}
      scope="diffusion-graph"
      scopeKey="diffusion-graph"
    />
  );
}
