import { createApp } from './app.js';
import { env, googleSignInEnabled } from './config/env.js';
import { closeStore, initStore } from './data/store.js';

// The store loads before the listener opens, so no request can observe a
// half-loaded dataset. A failure here must stop the process, not serve empty data.
const { backend, origin } = await initStore();
console.log(`[backend] data ${origin} — ${backend}`);
console.log(
  `[backend] sign-in: ${[
    googleSignInEnabled ? 'Google (Supabase)' : null,
    env.PASSWORD_LOGIN === 'on' ? 'roll number + password' : null,
  ]
    .filter(Boolean)
    .join(', ') || 'none configured'}`,
);

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`[backend] listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

function shutdown(signal: string) {
  console.log(`[backend] ${signal} received, shutting down`);
  server.close(() => {
    // Let queued writes reach the database before the connection closes.
    closeStore()
      .catch((error: unknown) => console.error('[backend] error while closing the store:', error))
      .finally(() => process.exit(0));
  });
  // Force-exit if connections do not drain in time.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
