# TESTIMONIAL API — Documentation Series Roadmap

Six standalone documents, each buildable/reviewable independently, following the **body metaphor**:

| Doc | Metaphor | Contents |
|---|---|---|
| **Doc 1** | 🦴 **Skeleton** | Architecture philosophy, folder structure, domain model, database-agnostic design, full SQL schema, Firebase↔SQL adapter strategy |
| **Doc 2** | 🫀 **Muscles & Organs** | Backend business logic — modules, services, RBAC engine, auth engine, quota engine, moderation engine, job workers |
| **Doc 3** | 🧠 **Nervous System** | API layer — every endpoint, DTOs, contracts, realtime/WebSocket system, webhooks, SDKs, integrations |
| **Doc 4** | 🧍 **Skin** | Frontend architecture — every page, every component (unstyled/structural), file-by-file component tree, state management |
| **Doc 5** | 💇 **Hair & Makeup** | Design system — Tailwind theme, component styling, animations, branding/white-label theming engine, dashboard visuals |
| **Doc 6** | 🛡️ **Immune System** | Security hardening, penetration test plan, load/scalability testing, DevOps/CI-CD, disaster recovery, audit checklist |

> **Status:** Docs 1 is **implemented in this repository** (see `docs/01-skeleton.md` and the codebase itself).
> Doc 2 is next in the delivery order and builds directly on the Doc 1 skeleton.

---

## Relationship to `README.md`

- `README.md` — the original **v1.0 master specification** (Firestore-first product spec). Still the source of truth for *product* requirements, copy, plans, and flows.
- `docs/*` — the **engineering implementation series**. Where the README says "what", these say "how, file by file". Where Doc 1 deliberately evolves the data model (e.g. introducing a centralized `users` identity table, Postgres as production target), Doc 1's decisions **supersede** the README's Firestore-only model — the README remains the reference for product behavior (RBAC catalogue, moderation lifecycle, billing plans, notification matrix).
