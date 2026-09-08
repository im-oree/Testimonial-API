/**
 * Express app — wires the JSON parser, the /v1 API routes and error handling.
 * Mounting everything under /v1 keeps the same API shape as before, so the
 * frontend only ever talks to /v1/... paths.
 */
import express, { type NextFunction, type Request, type Response } from 'express';
import { authRouter } from './routes/auth';
import { platformRouter } from './routes/platform';
import { publicRouter } from './routes/public';
import { tenantRouter } from './routes/tenant';
import { errorResponse, HttpError, requestToken, tokenPrefix } from './lib';

export function createApp(): express.Express {
  const app = express();
  app.disable('x-powered-by');

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
