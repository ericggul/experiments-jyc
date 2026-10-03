import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

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
