import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:https';
import { fileURLToPath } from 'node:url';
import { createHelper, defaultOrigins, HELPER_PORT } from './index.ts';

// Starts the Mac helper: `pnpm desktop-collage:helper` from the repository root.
// It uses the repository's local certificates (scripts/generate-certs.sh),
// whose root the Mac already trusts for the development server.
// DESKTOP_COLLAGE_ORIGINS adds approved origins (comma-separated);
// DESKTOP_COLLAGE_HELPER_PORT changes the port.

const root = fileURLToPath(new URL('../../../../../', import.meta.url));
const key = `${root}certificates/server.key`;
const cert = `${root}certificates/server.pem`;
if (!existsSync(key) || !existsSync(cert)) {
  console.error('Certificates missing: run `bash scripts/generate-certs.sh` from the repository root.');
  process.exit(1);
}

const port = Number(process.env.DESKTOP_COLLAGE_HELPER_PORT || HELPER_PORT);
const origins = [...defaultOrigins, ...(process.env.DESKTOP_COLLAGE_ORIGINS ?? '').split(',').map(origin => origin.trim()).filter(Boolean)];
const handle = createHelper(origins);

createServer({ key: readFileSync(key), cert: readFileSync(cert) }, (request, response) => {
  handle(request, response).catch(error => {
    if (!response.headersSent) response.writeHead(500, { 'Content-Type': 'application/json' }).end(JSON.stringify({ message: (error as Error).message }));
  });
}).listen(port, '127.0.0.1', () => {
  console.log(`desktop-collage helper on https://127.0.0.1:${port} for ${origins.join(', ')}`);
});
