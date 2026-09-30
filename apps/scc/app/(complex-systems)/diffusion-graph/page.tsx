import type { Metadata } from "next";
import SccNavigation from "@/components/navigation";
import { getSccNavigationItems } from "@/components/navigation/experiments";

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
