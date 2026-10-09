import { routeControl } from '../../foundations/control/index.ts';
import { definition } from './plan.ts';

export const { GET, POST } = routeControl(definition);
