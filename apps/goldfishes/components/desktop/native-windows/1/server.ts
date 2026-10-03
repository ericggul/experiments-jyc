import { createDesktopControl } from '../shared/control-server.ts';
import { validateSettings } from './settings.ts';

export const { GET, POST } = createDesktopControl({
  runner: 'components/desktop/native-windows/1/runner.mjs',
  validate: validateSettings,
});
