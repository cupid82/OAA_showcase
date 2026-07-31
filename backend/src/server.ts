import { createApp } from './app.js';
import { env } from './config/env.js';

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
