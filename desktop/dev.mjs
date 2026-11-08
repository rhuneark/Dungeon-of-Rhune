/**
 * `npm run desktop:dev` — Vite dev server (hot reload) inside the Electron
 * shell. The shell loads the dev URL instead of the built app:// bundle.
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { createServer } from 'vite';

const require = createRequire(import.meta.url);
const server = await createServer({ server: { port: 5173 } });
await server.listen();
const url = server.resolvedUrls?.local?.[0] ?? 'http://localhost:5173/';
console.log(`[desktop:dev] vite at ${url}`);

const electron = require('electron'); // path to the binary when required from Node
const child = spawn(electron, ['.', ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: { ...process.env, RHUNE_DEV_URL: url },
});
child.on('exit', async (code) => {
    await server.close();
    process.exit(code ?? 0);
});
