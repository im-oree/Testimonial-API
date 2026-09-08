# Integration test guide — put Acme's testimonials on another site

This is the **end-to-end test** for the DOC-7 integration story: a tenant
(Acme Inc) connects its testimonials to a **completely separate external
website**, with little-to-no code, styled per company/theme/product, and
secured so no secret ever lives on the external page.

> Live example: open the static external page (it is *not* part of the app):
>
> ```
> {app-origin}/external/acme.html?app=acme-marketing-site&form=website-review
> ```
> e.g. `http://localhost:3001/external/acme.html?app=acme-marketing-site&form=website-review`

---

## 1 · The scenario

- **Zojatech** = the platform (owner). Manages tenants, plans, and the global
  **theme template library**.
- **Acme Inc** = a tenant (company) with its own workspace and its own theme.
- **Acme Marketing Site** = Acme's product; owns forms, moderation and a wall.
- **acme.test website** = Acme's *external* site (the demo file above) that has
  nothing to do with the app — it only embeds a widget.

## 2 · Who sets the styling (layering)

```
1. THEME TEMPLATE   — made by Zojatech (Platform -> Theme Templates)
2. COMPANY THEME    — Acme picks/adopts a template, can fine-tune any token
                      (tenant: Settings -> Appearance & theme,
                       platform: Tenants -> Acme -> Theme & branding)
3. PRODUCT OVERRIDE — optional per-product tweaks on top
                      (tenant: Products -> product -> Connect & design -> step 3)
```

Public read path is one pre-resolved payload:
`GET /v1/public/theme/acme-marketing-site` — check the `version` field: it
bumps on every save (that's your "it updated" proof).

## 3 · How to test, step by step

### A. Widget (no-code) on the external site
1. Sign in as `owner@acme.test / demo1234` -> **Products -> Acme Marketing Site ->
   Connect & design -> step 4**.
2. Click **"Open example external site ↗"** (or open the URL above). You are on
   Acme's fake external website; its wall renders in a box.
3. Proof it is separate: the page chrome is Acme's own plain HTML — there is no
   app sidebar, no login, nothing Zojatech-branded except the wall itself.

### B. Theme flows everywhere instantly
1. Tenant side: **Settings -> Appearance & theme** -> pick a template (or change
   the brand colour) -> **Save theme**.
2. Reload the external page -> colours, corners, font and logo follow. Nothing
   was redeployed — the wall reads the resolved theme on every load.
3. Platform side: sign in as `admin@zojatech.test / demo1234` ->
   **Tenants -> Acme Inc -> Theme & branding** -> change it -> reload the external
   page again. Zojatech can restyle a tenant; the tenant keeps the final say
   from its own Appearance page (last writer wins, same version counter).

### C. Templates — owners create, tenants adopt
1. Platform -> **Theme Templates** -> **＋ New template** (name, colours, radius,
   font) -> Save.
2. Tenant (`owner@acme.test`) -> **Settings -> Appearance & theme** -> the new
   template is in the picker -> click it -> Save. It is now Acme's company theme.
3. Edit the template in the platform panel -> tenants see the change in their
   picker on next open (they keep whatever tokens they adopted until they
   re-save).

### D. Per-product override
1. Acme -> **Connect & design -> step 3** -> set e.g. Product colour + font
   "mono" -> **Save product design**.
2. Check `GET /v1/public/theme/acme-marketing-site` — only *this* product
   changed. Acme Blog (`/external/acme.html?app=acme-blog&form=blog-review`)
   still shows the company theme.
3. Click **Inherit company** and save -> product follows the company theme again.

### E. Content flows (moderation is the guard)
1. On the external page click **Leave a review** -> submit the public form.
2. In Acme's workspace the submission arrives as **pending** (Moderation page).
3. It does **not** appear on the external wall while pending.
4. Approve it in Moderation -> reload the external page -> it appears.
5. Reject one -> it disappears from the wall for good.

### F. Developer path (little code, still no secret)
Public GET endpoints are CORS-open and contain **approved reviews + theme
tokens only**:

```bash
curl http://localhost:3000/v1/public/theme/acme-marketing-site   # tokens + version
curl http://localhost:3000/v1/public/walls/acme-marketing-site   # approved reviews
curl http://localhost:3000/v1/public/theme-presets               # template catalogue
```

Embed scripts and iframes carry only the public product slug. Session tokens
and API keys never appear on external pages — moderation and tenant scoping
are enforced server-side before anything is published.

## 4 · Expected results checklist

- [ ] External page renders Acme's wall with **approved** reviews only.
- [ ] Template -> company theme -> product override layering is visible and each
      layer can win independently.
- [ ] Theme version bumps on every save (`GET /v1/public/theme/:slug`).
- [ ] A pending submission never shows on the wall until approved.
- [ ] No 401/secret leakage from any public endpoint used by the widget.
- [ ] Security suite still green: `npm run test:security` -> 27 pass / 0 fail.

## 5 · Where things live

| Concern | Where |
|---|---|
| Company theme (tokens, versioning) | `server/src/theme.ts`, tenant `theme` row |
| Template catalogue CRUD | Platform -> Theme Templates (`/v1/platform/theme-templates`) |
| Tenant theme editor | Settings -> Appearance & theme (`/v1/settings/theme`) |
| Platform per-tenant editor | Tenants -> :id -> Theme & branding (`/v1/platform/tenants/:id/theme`) |
| Per-product overrides | Connect & design -> step 3 (`PATCH /v1/apps/:appId`) |
| Public theme/tokens | `/v1/public/theme-presets`, `/v1/public/theme/:appSlug` |
| No-code embed script | `/widget/embed.js` (static), wall at `/wall/:appSlug` |

## 6 · Widget design library (plug-and-play)

Every widget on the platform is one entry in a single registry, one file per
design (`client/src/widgets/`):

- `index.tsx` — lists **all** designs (`WIDGET_DESIGNS`) plus helpers
  (`getWidgetDesign`, `DEFAULT_WIDGET_DESIGN`) and sample preview content.
- `designs/<id>.tsx` — exactly one design each (classic grid, spotlight,
  carousel, wall of love, marquee, orbit).
- `primitives.tsx` — the things **every** design is required to show: author
  picture (initials fallback), name, rating, message and date, plus optional
  CTA and a shared empty state.
- `types.ts` — the `WidgetDesignProps` contract: `{ items, tokens, cta }`.

To add a design, drop `<id>.tsx` in `designs/`, implement the props contract,
then register it in `index.tsx` — the picker, preview and public walls adopt it
automatically. A design may add caveats (hover reveal, cursor tilt,
auto-rotation, orbit) but never drop a required field.

### Test: choose, preview, embed

1. Log in as Acme -> Products -> a product -> **Connect & design**.
2. **1 · Pick the look**: choose each design and watch the live preview switch.
   With zero approved reviews the preview shows clearly-labelled sample
   content; with reviews it renders the real, approved ones.
3. **Fine-tune**: override colour / accent / corners / font for this product
   (or keep "Company" to inherit), save. The preview uses the current tokens
   without a page reload.
4. The saved design + overrides are per product:
   ```bash
   curl http://localhost:3000/v1/public/theme/acme-marketing-site | grep design
   curl http://localhost:3000/v1/public/walls/acme-marketing-site | grep design
   ```
   Both return the design id (default `classic`). App summaries expose it too
   (`PATCH /v1/apps/:appId` with `widgetDesign`).
5. Open the public wall (`Preview wall`) — the full page header + the chosen
   design render below it. Add `?design=wall` (or any id) to preview a
   different design without saving.
6. **2 · Get the code**: switch tabs (Widget / iframe / Button / API), copy,
   and open **"See it on an example external site"** — the static Acme page
   loads `/widget/embed.js` exactly like a third-party site.

### Auto-height embeds (no more cropping)

- The wall accepts `?embed=1` — a chrome-free, transparent widget surface.
- The wall posts its rendered height to the parent
  (`postMessage { zojatech: { height } }`) on load/resize; `embed.js` resizes
  the iframe accordingly. `data-height` on the script tag is only the
  fallback while the wall loads.
- Long designs (carousel, orbit, wall of love) therefore never get clipped.

### Expected results checklist (design library)

- [ ] Registry lists every design; each has its own file implementing
      `WidgetDesignProps` (picture/initials, name, rating, message, date).
- [ ] Choosing a design + saving persists it (`PATCH /v1/apps/:id`) and the
      public theme/wall payloads return it immediately.
- [ ] Public wall and the external demo page render the chosen design; a
      rejected/unknown id falls back to `classic`.
- [ ] `?design=<id>` overrides the saved design for previews.
- [ ] Embed iframes auto-size to the design (no crop, no internal scrollbar).
- [ ] App shell: sidebar and top header stay fixed; only the page content
      scrolls; page headers pin to the top of the scroll area.
- [ ] No emoji anywhere — all glyphs come from `client/src/components/icons/`.

| Concern | Where |
|---|---|
| Widget design registry | `client/src/widgets/index.tsx` (+ `designs/*`, `primitives.tsx`, `types.ts`) |
| Per-product design picker & preview | Connect & design -> 1 · Pick the look |
| Design persistence | `PATCH /v1/apps/:appId` -> `widgetDesign` (server whitelist) |
| Public design id | `/v1/public/theme/:slug` and `/v1/public/walls/:slug` -> `design` |
| Auto-height embed | `/wall/:slug?embed=1` + `client/public/widget/embed.js` |
