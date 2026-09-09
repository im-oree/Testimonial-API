# Deployment

The recommended production setup is a **single Render Web Service**. Express
serves both the `/v1` API and the built React SPA, so browser requests remain
same-origin and client-side routes can fall back to `client/dist/index.html`.

> The demo data is still stored in memory. Every restart, sleep, or redeploy
> resets it to the seeded state. Persistent storage requires a database and is
> outside the scope of this deployment setup.

## Recommended: one Render Web Service

Create a Render **Web Service**, connect this repository, and use:

| Setting | Value |
|---|---|
| Root Directory | Leave blank (repository root) |
| Build Command | `npm install && npm --prefix client run build` |
| Start Command | `npm --prefix server start` |

The root `postinstall` script installs both `server/` and `client/`
dependencies. The build command then creates `client/dist`, which Express
serves in production. Render supplies `PORT`; the server already binds to
`0.0.0.0` by default.

Set only this environment variable:

| Variable | Value |
|---|---|
| `SESSION_SECRET` | 64 hex characters; generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

Do **not** set `VITE_API_BASE`. Its same-origin default is correct for this
setup. No `CORS_ORIGINS` setting is needed either, because the browser and API
use the same service and origin.

After deployment, verify:

- `/health` returns JSON with `"ok": true`.
- `/` loads the web app.
- A client-side deep link such as `/app/designs`, `/login`, or `/wall/<slug>`
  loads the web app instead of returning 404.
- `/v1/auth/me` still returns the API's JSON `401` response when signed out.

## Alternative: separate frontend and API services

A two-service deployment still works when needed:

- Run `server/` as a Render Web Service.
- Deploy `client/` to Vercel or a Render Static Site.
- Build the client with `VITE_API_BASE` set to the public API URL.
- Set the API's `CORS_ORIGINS` to the frontend origin.

The static frontend host must also route unknown browser paths to the SPA. On
a **Render Static Site**, add this Rewrite rule:

| Source | Destination | Status |
|---|---|---|
| `/*` | `/index.html` | `200` |

Without that rewrite, direct visits and refreshes on client-side routes return
404. Configure the equivalent SPA fallback when using another static host.

## Local environment files

Environment files are gitignored so secrets never enter the repository. The
committed templates are:

```text
server/.env.example
client/.env.example
```

Local development works without either file. Copy a template only when you
need to override a default; hosted deployments should use the provider's
environment-variable settings instead of committing `.env` files.

Changing `SESSION_SECRET` invalidates existing sessions. Demo logins are
`owner@acme.test / demo1234` for a company and
`admin@zojatech.test / demo1234` for the platform console.
