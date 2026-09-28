import { sixSigmaNavigationExperiments } from "@/components/experiments";
import SixSigmaNavigation from "@/components/navigation";

export default function MobileIndexPage() {
  return (
    <SixSigmaNavigation
      experiments={sixSigmaNavigationExperiments.filter((item) => item.key.startsWith("mobile/"))}
      scope="mobile"
    />
  );
}
