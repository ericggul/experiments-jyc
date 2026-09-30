import type { Metadata } from "next";
import SccNavigation from "@/components/navigation";
import { getSccNavigationItems } from "@/components/navigation/experiments";

export const metadata: Metadata = {
  title: "stock",
};

export default function StockIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "stock" })}
      scope="stock"
      scopeKey="stock"
    />
  );
}
