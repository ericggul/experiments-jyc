import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "dimensions / xyzt-city",
};

export default function XyztCityIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "dimensions/xyzt-city" })}
      scope="dimensions/xyzt-city"
      scopeKey="dimensions/xyzt-city"
    />
  );
}
