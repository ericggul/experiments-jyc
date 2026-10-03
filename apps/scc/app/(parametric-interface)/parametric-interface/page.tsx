import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "parametric-interface",
};

export default function ParametricInterfaceIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ area: "parametric-interface" })}
      scope="parametric-interface"
      scopeKey="parametric-interface"
    />
  );
}
