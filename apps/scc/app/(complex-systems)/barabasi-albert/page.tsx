import type { Metadata } from "next";
import SccNavigation from "@/components/navigation";
import { getSccNavigationItems } from "@/components/navigation/experiments";

export const metadata: Metadata = {
  title: "Barabási–Albert network growth",
};

export default function BarabasiAlbertIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "barabasi-albert" })}
      scope="barabasi-albert"
      scopeKey="barabasi-albert"
    />
  );
}
