# BHU-RAJNAITIK OBSERVER

> Geopolitics, Visualized.

A SaaS studio for producing on-brand geopolitical infographics in under 60 seconds — the official creator tool behind [@bhurajnaitik](https://instagram.com/bhurajnaitik).

## Status

Pre-MVP — currently shipping the waitlist landing page. Alpha targets June 2026.

## Documentation

- **[AGENTS.md](AGENTS.md)** — engineering rules, design tokens, non-negotiables
- **[docs/LAUNCH_PACKAGE.md](docs/LAUNCH_PACKAGE.md)** — product, pricing, risks, GTM, comms drafts (single source of truth)

## Stack

Next.js 16 · React 19 · TypeScript · TailwindCSS v4 · Konva (planned) · Supabase (planned) · Razorpay (planned).

## Develop

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm lint
pnpm build
```

## Project layout

```
src/
  app/
    page.tsx              # waitlist landing
    layout.tsx            # fonts + base shell
    globals.css           # locked design tokens (@theme)
    api/waitlist/route.ts # MVP waitlist endpoint (JSONL → Supabase later)
  components/
    waitlist-form.tsx
docs/
  LAUNCH_PACKAGE.md
```

## License

UNLICENSED — all rights reserved while in private development.
