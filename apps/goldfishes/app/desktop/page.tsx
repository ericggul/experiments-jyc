import GoldfishesNavigation from '@/components/navigation';
import { goldfishExperiments } from '@/components/experiments';

export default function DesktopIndex() {
  const experiments = goldfishExperiments.filter(item => item.area === 'desktop').map(({ key, area, section, date, phrase }) => ({ key, area, section, date, phrase }));
  return <GoldfishesNavigation experiments={experiments} scope="desktop" />;
}
