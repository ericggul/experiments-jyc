import { notFound } from 'next/navigation';
import GoldfishesNavigation from '@/components/navigation';
import { findGoldfishExperiment, getGoldfishExperimentsForDate } from '@/components/experiments';

export default async function DesktopExperiment({ params }: { params: Promise<{ experiment: string[] }> }) {
  const { experiment: path } = await params;
  if (path.length === 1) {
    const experiments = getGoldfishExperimentsForDate(path[0], 'desktop').map(({ key, area, section, date, phrase }) => ({ key, area, section, date, phrase }));
    if (!experiments.length) notFound();
    return <GoldfishesNavigation experiments={experiments} scope="desktop" archiveKey={`desktop/${path[0]}`} />;
  }
  const experiment = findGoldfishExperiment(['desktop', ...path]);
  if (!experiment || experiment.area !== 'desktop') notFound();
  const { default: Component } = await experiment.load();
  return <Component />;
}
