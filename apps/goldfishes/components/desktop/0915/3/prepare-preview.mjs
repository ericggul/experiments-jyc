import { copyFile, mkdir, chmod } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export async function preparePreview() {
  const source = fileURLToPath(new URL('../../../../public/images/0908/tech-keyword-atlas/tech-keyword-atlas-v1.png', import.meta.url));
  const directory = `/private/tmp/goldfishes-desktop-preview-${process.getuid()}`;
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const destination = `${directory}/tech-keyword-atlas-v1.png`;
  await copyFile(source, destination);
  await chmod(destination, 0o600);
  return destination;
}
