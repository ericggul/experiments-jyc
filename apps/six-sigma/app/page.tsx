import SixSigmaNavigation from "@/foundations/navigation";
import { sixSigmaNavigationExperiments } from "@/components/experiments";

export default function HomePage() {
  return <SixSigmaNavigation experiments={sixSigmaNavigationExperiments} />;
}
