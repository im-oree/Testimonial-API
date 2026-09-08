/**
 * Vite config.
 *
 * During development the frontend runs on http://localhost:3001 and the API
 * on http://localhost:3000. Every request the browser makes to /v1/... is
 * proxied by Vite to the API, so the app is always same-origin (which also
 * keeps it working inside the embedded preview iframe — no cookies involved).
 *
 * Configuration comes from client/.env (see .env.example): copy the example
 * file to change the dev port or point the proxy at an API on another port.
 * `loadEnv` reads those files here, at config time (VITE_* vars are also
 * exposed to app code via import.meta.env — e.g. VITE_API_BASE in lib/api).
 */
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), ''); // .env, .env.local, .env.[mode]
  const API_TARGET = env.VITE_API_PROXY_TARGET ?? 'http://127.0.0.1:3000';
  const PORT = Number(env.VITE_PORT ?? 3001);

  return {
    plugins: [react()],
    server: {
      host: true, // 0.0.0.0 so the preview can reach it
      port: PORT,
      // The live preview opens the app on a per-sandbox *.e2b.app host.
      allowedHosts: true,
      proxy: {
        '/v1': { target: API_TARGET, changeOrigin: true },
        '/health': { target: API_TARGET, changeOrigin: true },
      },
    },
  };
});
