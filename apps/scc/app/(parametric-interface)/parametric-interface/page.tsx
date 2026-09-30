import type { Metadata } from "next";
import SccNavigation from "@/components/navigation";
import { getSccNavigationItems } from "@/components/navigation/experiments";

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
