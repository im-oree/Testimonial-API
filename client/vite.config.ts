/**
 * Vite config.
 *
 * During development the frontend runs on http://localhost:3001 and the API
 * on http://localhost:3000. Every request the browser makes to /v1/... is
 * proxied by Vite to the API, so the app is always same-origin (which also
 * keeps it working inside the embedded preview iframe — no cookies involved).
 */
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const API_TARGET = process.env.VITE_API_PROXY_TARGET ?? 'http://127.0.0.1:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // 0.0.0.0 so the preview can reach it
    port: 3001,
    // The live preview opens the app on a per-sandbox *.e2b.app host.
    allowedHosts: true,
    proxy: {
      '/v1': { target: API_TARGET, changeOrigin: true },
      '/health': { target: API_TARGET, changeOrigin: true },
    },
  },
});
