# Legacy code (parked)

This folder contains the **previous** implementation of this project: a Next.js
(App Router) + NestJS + turbo monorepo (`apps/`, `packages/`, `infra/`,
`scripts/`, `docs/`).

It is kept purely for reference. The active codebase now lives at the repo
root:

- `server/` — plain Express + TypeScript API
- `client/` — plain React + Vite + TypeScript app

The old code is **not** wired to the root scripts anymore. To run it you would
need to install its own dependencies first (`npm ci` inside `legacy/`), and it
may conflict with the new servers on ports 3000/3001.
