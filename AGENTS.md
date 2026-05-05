<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# BHU-RAJNAITIK OBSERVER — Agent Rules

> Source of truth for product, scope, pricing, risks, and launch plan: [docs/LAUNCH_PACKAGE.md](docs/LAUNCH_PACKAGE.md).
> When this file and the launch package disagree, the launch package wins — update this file.

A SaaS studio for producing on-brand geopolitical infographics in <60 seconds, built on the visual identity of `@bhurajnaitik`.

---

## Stack (locked — installed versions)

- **Frontend**: Next.js **16** (App Router, RSC) · React 19 · TypeScript 5 · TailwindCSS **v4** · Konva.js (planned, not yet installed)
- **Backend**: Supabase (Postgres + Auth + Storage + RLS) · Next.js Route Handlers
- **Render**: server-side via `@napi-rs/canvas` in `/api/render` — **never** export from the client (`canvas.toDataURL`) for production PNGs
- **Storage**: Supabase Storage (hot) → Cloudflare R2 (cold) · Cloudinary CDN
- **Payments**: Razorpay (India-first); Stripe is a v1+ decision, not MVP
- **AI**: Anthropic / xAI proxied through `/api/ai/*` — keys server-side only
- **Package manager**: pnpm

Do not introduce Fabric.js, raw `<canvas>`, Firebase, Prisma, or alternative auth providers without an explicit decision update here.

### Next.js 16 / Tailwind v4 specifics
- **No `tailwind.config.ts`** — Tailwind v4 uses `@import "tailwindcss"` and `@theme` blocks in [src/app/globals.css](src/app/globals.css). Design tokens live there.
- Always read `node_modules/next/dist/docs/` for current Next.js 16 API surface before assuming React-Server-Component patterns. Async params, headers, and cookies behaviours have changed.
- Turbopack is **disabled** at scaffold (`--no-turbopack`). Re-enable only with explicit decision.

---

## Non-negotiables

1. **RLS everywhere.** Every Supabase table must enforce `user_id = auth.uid()`. No table ships without policies.
2. **AI keys never reach the browser.** All model calls go through server routes with rate limiting (Upstash Redis: 10/min anon, 60/min auth, 200/min Premium).
3. **Uploads**: max 5 MB, MIME-sniff, re-encode through Sharp to strip EXIF and prevent polyglot files.
4. **Razorpay webhooks must verify signatures** before mutating subscription state.
5. **AI rewriter rephrases only — it does not generate facts.** A user must confirm headlines before export.
6. **India map rendering**: use Survey-of-India-aligned outlines (Kashmir, Arunachal Pradesh, Aksai Chin shown as part of India). Legal/brand-critical, not a preference.
7. **Watermark removal is server-enforced**, not a client flag. The render endpoint reads the user's plan from the DB.

---

## Design tokens (locked — codified in `src/app/globals.css` `@theme` block)

```
bg-base       #0B0F14      ink-primary    #F5F7FA
map-land      #1A2330      ink-secondary  #9AA4B2
map-border    #2A3645      accent         #E10600   (BRO red)
                            highlight      #FF2D2D
```

- Display type: `Inter Tight` 800, tracking `-0.02em`
- Body: `Inter` 500
- Numerals/stats: `JetBrains Mono` 600
- Canvas: 1080 square baseline, 64px safe margin, 12-col grid

Hex values are immutable. New shades require a token, not an inline class.

---

## Scope discipline

The MVP does **one** thing: reproduce a BHU-RAJNAITIK-grade square post from a headline. See [docs/LAUNCH_PACKAGE.md](docs/LAUNCH_PACKAGE.md) §3 for v0.1 / v0.2 / v0.3 / v1.0 boundaries.

**Explicitly NOT in MVP** — push back if asked to build any of these before v0.3:
- Video or animation export · mobile native app · real-time collaborative cursors · Figma plugin · generic non-geopolitics templates

When in doubt, cut. Speed-to-alpha beats feature breadth.

---

## Data model (minimum viable)

```
users      (id, email, plan, created_at, razorpay_customer_id)
templates  (id, slug, name, schema_json, thumbnail_url, is_premium)
posts      (id, user_id, template_id, payload_json, updated_at)
exports    (id, post_id, format, url, watermarked, created_at)
ai_calls   (id, user_id, kind, tokens_in, tokens_out, created_at)
```

New tables require an RLS policy in the same migration.

---

## Build & test

```bash
pnpm install
pnpm dev          # Next.js dev server
pnpm build        # production build
pnpm lint         # eslint
# planned: pnpm test (vitest), pnpm db:push (supabase)
```

---

## Conventions

- **TypeScript strict**: no `any`, no implicit `any`, no `// @ts-ignore` without inline justification.
- **Server vs client components**: default to RSC; mark `"use client"` only when interactivity is required.
- **No secrets in the repo.** `.env.local` only.
- **Migrations are reversible.** Every schema change ships with both `up` and `down`.
- **Image URLs in posts**: always go through Cloudinary or Supabase signed URLs — never embed raw user upload URLs in exports.

---

## North-star metric

**Weekly active creators × posts per creator.** Signups and pageviews are vanity.

---

## Decisions still open

Tracked in [docs/LAUNCH_PACKAGE.md](docs/LAUNCH_PACKAGE.md) §12: domain, legal entity, payment scope, trademark filing, border-policy reviewer. Do not silently pick a side — surface the decision.
