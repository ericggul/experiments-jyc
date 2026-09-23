import { sixSigmaNavigationExperiments } from "@/components/experiments";
import SixSigmaNavigation from "@/components/navigation";

export default function ScreenIndexPage() {
  return (
    <SixSigmaNavigation
      experiments={sixSigmaNavigationExperiments.filter((item) => item.key.startsWith("screen/"))}
      scope="screen"
    />
  );
}
