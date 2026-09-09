/**
 * Express app — wires the JSON parser, the /v1 API routes and error handling.
 * Mounting everything under /v1 keeps the same API shape as before, so the
 * frontend only ever talks to /v1/... paths.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type NextFunction, type Request, type Response } from 'express';
import './env';
import { authRouter } from './routes/auth';
import { platformRouter } from './routes/platform';
import { publicRouter } from './routes/public';
import { tenantRouter } from './routes/tenant';
import { errorResponse, HttpError, requestToken, tokenPrefix } from './lib';

export function createApp(): express.Express {
  const app = express();
  app.disable('x-powered-by');

  // Optional CORS (CORS_ORIGINS in server/.env). Off by default: the browser
  // app is served same-origin (the Vite dev proxy forwards /v1 to the API),
  // so no cross-origin headers are needed. Enable it only when a frontend
  // deployed on ANOTHER domain points at this API (VITE_API_BASE over there).
  //   CORS_ORIGINS=https://app.example.com       (one origin)
  //   CORS_ORIGINS=https://a.example,https://b   (comma-separated)
  //   CORS_ORIGINS=*                              (allow any origin — dev only)
  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (corsOrigins.length > 0) {
    const allowAll = corsOrigins.includes('*');
    console.log(`[api] CORS enabled for ${allowAll ? 'any origin' : corsOrigins.join(', ')}`);
    app.use((req, res, next) => {
      const origin = req.headers.origin ?? '';
      if (allowAll || corsOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', allowAll && !origin ? '*' : origin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-session-token');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
      }
      if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
      }
      next();
    });
  }

  // Security headers on every response (DOC 6 §2.9 / §4.2). No frame-ancestors
  // or CSP here on purpose: the API serves JSON, and the SPA must stay
  // embeddable in the sandbox preview iframe (an outer origin embeds it).
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-XSS-Protection', '0'); // XSS is handled by escaping; this header is legacy noise
    next();
  });

  app.use(express.json({ limit: '1mb' }));

  // Log every API request (method, path, token prefix). The path is logged
  // without its query string so a session_token passed as a query param never
  // ends up in the log. tokenPrefix() shows the channel-agnostic token.
  app.use('/v1', (req, _res, next) => {
    const path = req.originalUrl.split('?')[0] ?? req.originalUrl;
    console.log(`[api] ${req.method} ${path} token=${tokenPrefix(requestToken(req))}`);
    next();
  });

  // GET /health — used to check the API is up
  app.get('/health', (_req, res) => {
    res.json({ ok: true, name: 'testimonial-api', time: new Date().toISOString() });
  });

  app.use('/v1', authRouter);
  app.use('/v1', tenantRouter);
  app.use('/v1', platformRouter);
  app.use('/v1', publicRouter);

  // Unknown API route -> 404 JSON (not the HTML 404 page)
  app.use('/v1', (_req, res) => {
    res.status(404).json(errorResponse(404, 'Not found.'));
  });

  // Production: serve the built web app (client/dist) same-origin.
  const webDist = join(fileURLToPath(new URL('../..', import.meta.url)), 'client', 'dist');
  if (existsSync(webDist)) {
    app.use(
      express.static(webDist, {
        setHeaders: (res, filePath) => {
          res.setHeader('Cache-Control', filePath.includes('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache');
        },
      }),
    );
    // SPA fallback: client-side routes get index.html; API paths pass through.
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/v1') || req.path.startsWith('/health')) return next();
      res.sendFile(join(webDist, 'index.html'));
    });
    console.log(`[api] serving web app from ${webDist}`);
  }

  // Everything thrown by a handler lands here as a JSON error.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      res.status(err.status).json(errorResponse(err.status, err.message));
      return;
    }
    // Malformed JSON body or another client error surfaced by express
    const status = err && typeof err === 'object' && 'status' in err ? Number((err as { status?: unknown }).status) : 0;
    if (Number.isInteger(status) && status >= 400 && status < 500) {
      res.status(status).json(errorResponse(status, 'Bad request.'));
      return;
    }
    console.error('Unhandled error:', err);
    res.status(500).json(errorResponse(500, 'Internal server error.'));
  });

  return app;
}
