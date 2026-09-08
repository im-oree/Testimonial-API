/**
 * Entry point — starts the Express API server.
 *
 *   npm run dev   -> tsx watch (restarts on file changes)
 *   npm start     -> tsx (single run)
 *
 * Configuration comes from server/.env (see .env.example) with built-in
 * defaults for everything — copy the example file to configure.
 *
 * Data is in-memory and seeded with demo accounts (see demo-data.ts), so
 * every restart resets to the same clean demo state.
 */
import './env';
import { createApp } from './app';

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '0.0.0.0';

const app = createApp();

app.listen(PORT, HOST, () => {
  console.log(`[testimonial-api] listening on http://${HOST}:${PORT}`);
  console.log('[testimonial-api] demo login: owner@acme.test / demo1234 (company) · admin@zojatech.test / demo1234 (platform)');
});
