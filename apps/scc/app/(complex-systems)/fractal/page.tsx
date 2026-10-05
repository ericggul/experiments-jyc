import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "complex-systems",
};

export default function FractalIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "fractal" })}
      scope="fractal"
      scopeKey="fractal"
    />
  );
}
