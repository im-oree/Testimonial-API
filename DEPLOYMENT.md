# Deployment

The app is two packages:

| Piece | What it is | Where it runs |
|---|---|---|
| `server/` | **Express** (Node + TypeScript) API — `/v1/*` + `/health` | A long-running host: **Render** (or Railway/Fly) |
| `client/` | **React + Vite** static bundle (`npm run build` → `dist/`) | Any static host: **Vercel** (or Render Static Site) |

> Why not Vercel for the API? Vercel runs functions serverless: every cold
> start would restart the Node process and wipe the in-memory data. The API
> needs a persistent process — that's Render's Web Service.

## Where are the `.env` files?

**They are gitignored on purpose (secrets never go in git)** — a fresh pull
only contains the templates:

```
server/.env.example   →  copy to server/.env
client/.env.example   →  copy to client/.env
```

Locally that's all you need; every variable has a default and the app runs
with **no** `.env` at all (the demo experience).

On a host you don't create `.env` files — you set the same variables in the
host's dashboard (Render: Environment, Vercel: Settings → Environment
Variables).

## Option A (recommended): Vercel + Render

### 1. API on Render

- New → **Web Service** → connect the repo
- **Root directory:** `server`
- **Build command:** `npm install`
- **Start command:** `npm start`
- Instance: free is fine for a demo
- **Environment variables:**

| Variable | Value |
|---|---|
| `SESSION_SECRET` | 64+ hex chars — generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `CORS_ORIGINS` | your frontend URL, e.g. `https://your-app.vercel.app` (only needed because the frontend is on a different domain) |

`PORT` is injected by Render automatically; `HOST` already defaults to
`0.0.0.0`. Your API is then `https://<service>.onrender.com` — check
`https://<service>.onrender.com/health`.

### 2. Frontend on Vercel

- Import the repo → **Root directory:** `client`
- Framework preset: **Vite** (build `npm run build`, output `dist`)
- **Environment variable:**

| Variable | Value |
|---|---|
| `VITE_API_BASE` | `https://<service>.onrender.com` |

`VITE_API_PROXY_TARGET` and `VITE_PORT` are **dev-only** (Vite dev server) —
not needed in production. In production the browser calls the API directly at
`VITE_API_BASE`, so the server needs the `CORS_ORIGINS` above.

## Option B: everything on Render

Same API service as above, plus a **Static Site** for the frontend:
root `client`, build `npm install && npm run build`, publish `dist`, env
`VITE_API_BASE` = the API URL, and the same `CORS_ORIGINS` on the API.

(There is also a single-service option — Express serving the built client —
which removes CORS entirely; ask and it can be added.)

## Things to know

- **Data is in-memory and seeded with demo accounts.** Every restart, sleep
  (free tier) or redeploy resets it to the demo state. Persistent storage
  needs a database later.
- Changing `SESSION_SECRET` invalidates all existing sign-ins.
- The platform login is `admin@zojatech.test / demo1234`; company logins are
  `owner@acme.test` etc. (all `demo1234`).
