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
    build: {
      rollupOptions: {
        output: {
          // Split the heavyweight libraries out of the entry chunk and pin
          // EVERY vendor module to an explicit chunk — when anything is left
          // unassigned, Rollup may merge shared modules (React itself!) into
          // a lazy chunk, dragging it onto every page. recharts (with its d3
          // deps) is only needed by dashboard routes; framer-motion is shared
          // by the shell, modals and the widget runtime. Route components
          // themselves are lazy (see App.tsx), so public wall/form visitors
          // never download the admin pages at all.
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (/(recharts|d3-[^/]*|victory-vendor)/.test(id)) return 'vendor-charts';
            if (/(framer-motion|motion-dom|motion-utils)/.test(id)) return 'vendor-motion';
            // The whole React family must stay in ONE chunk: splitting
            // react-router-dom from @remix-run/router / use-sync-external-store
            // creates a circular chunk init (React reads as undefined at boot).
            if (/(^|\/)(react|react-dom|react-router[^/]*|scheduler|react-is|use-sync-external-store)(\/|$)|@remix-run\/router/.test(id.replace(/.*node_modules\//, ''))) return 'vendor-react';
            return 'vendor';
          },
        },
      },
    },
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
    // `vite preview` serves the PRODUCTION build (dist/) — use it to smoke
    // the real split chunks: BASE_URL=http://127.0.0.1:4173 node e2e/verify-embed.js
    preview: {
      host: true,
      allowedHosts: true,
      port: 4173,
      proxy: {
        '/v1': { target: API_TARGET, changeOrigin: true },
        '/health': { target: API_TARGET, changeOrigin: true },
      },
    },
  };
});
