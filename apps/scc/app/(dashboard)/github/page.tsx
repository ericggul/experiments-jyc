import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "github",
};

export default function GithubIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "github" })}
      scope="github"
      scopeKey="github"
    />
  );
}
