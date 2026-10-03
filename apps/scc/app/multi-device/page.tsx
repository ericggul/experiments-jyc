import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "multi-device",
};

export default function MultiDeviceIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ area: "multi-device" })}
      scope="multi-device"
      scopeKey="multi-device"
    />
  );
}
