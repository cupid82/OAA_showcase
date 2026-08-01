import { createApp } from './app.js';
import { env } from './config/env.js';
import { initStore } from './data/store.js';

// The store loads before the listener opens, so no request can observe a
// half-loaded dataset. A failure here must stop the process, not serve empty data.
const { seeded, file } = await initStore();
console.log(`[backend] data store ${seeded ? 'seeded' : 'loaded'} — ${file}`);

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`[backend] listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

function shutdown(signal: string) {
  console.log(`[backend] ${signal} received, shutting down`);
  server.close(() => process.exit(0));
  // Force-exit if connections do not drain in time.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
