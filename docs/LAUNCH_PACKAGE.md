# BHU-RAJNAITIK OBSERVER — Launch Package v1.1

> Geopolitics, Visualized.
> Working document — Prashant Goit · May 2026

---

## 0. Executive Snapshot (one-screen pitch)

| | |
|---|---|
| **Product** | A browser-based studio that turns a headline + a country name into a finished, on-brand geopolitical infographic in <60 seconds. |
| **Wedge** | The visual identity of `@bhurajnaitik` (dark world map · red accents · authoritative typography) productized as a template engine. |
| **Buyer** | IR students, UPSC aspirants, defence/geopolitics creators, think-tank comms, digital journalists. |
| **Pricing** | Free (watermarked) · Premium ₹499/mo or ₹4,999/yr · Team ₹1,499/seat/mo · Enterprise custom. |
| **Moat** | Brand authority of the parent handle + opinionated templates + curated map asset library + creator community flywheel. |
| **Stage** | Pre-MVP. Goal: shippable v0.1 in 6 weeks, paid Premium in 10 weeks. |

---

## 1. Problem → Solution Mapping (sharper)

| Problem (today) | Today's workaround | BRO replacement | Time saved |
|---|---|---|---|
| Map + flag + caption layout in Canva | Manual layering, hunt for assets | One template, country pre-pinned | 25–40 min |
| Inconsistent branding across posts | Saved Canva brand kit (still drifts) | Locked design tokens per template | Drift → 0 |
| Headline copywriting | Manual rewrites | AI headline rewriter trained on `@bhurajnaitik` voice | 10–15 min |
| Multi-format export | Resize manually 3× | One-click IG square / Story / X / LinkedIn | 8–12 min |
| Sourcing maps without copyright risk | Google → risky | Built-in licensed Natural Earth / OSM tiles | Legal risk → 0 |

**Net**: 60–90 min → <60 sec per post. That is the ROI line in every marketing page.

---

## 2. Why Not Just Canva? (defensibility)

Canva is a horizontal tool; BRO is a **vertical category killer** for geopolitics. Defensibility ranked by durability:

1. **Brand halo (highest)** — `@bhurajnaitik` audience pre-trusts the visual language. Canva can't replicate trust.
2. **Opinionated constraints** — fewer choices → faster output → more posts per week → users post → free distribution.
3. **Domain assets** — country outlines, theatre-of-war maps, ORBAT icons, NATO/SCO/BRICS flag bundles, sanction overlays. Boring to build, painful to recreate.
4. **AI fine-tuned to IR voice** — a Canva user types "Iran-Israel"; BRO suggests "Tehran's deterrence calculus shifts as…". Fine-tuned on curated IR corpus.
5. **Workflow lock-in (later)** — team accounts, post calendars, embassy/think-tank approvals.

**Risk**: Canva ships a "Geopolitics" template pack. **Mitigation**: own the brand category before they notice; depth of assets > breadth.

---

## 3. Product — MVP Scope Discipline

Cut ruthlessly. The MVP must do **one** thing perfectly: reproduce a BHU-RAJNAITIK-grade square post from a headline.

### v0.1 (Week 6 — paid alpha to 50 hand-picked users)
- 1 template (the canonical dark-map-red-line layout)
- Headline + sub-headline + 1 country pin
- Auto red-keyword highlighter (rule-based, no AI yet)
- 1080×1080 PNG export, watermarked
- Email-magic-link auth
- Stripe / Razorpay payment for "remove watermark" (₹99 one-shot, ₹499/mo)

### v0.2 (Week 10 — public launch)
- 5 templates (Breaking, Conflict map, Leader profile, Sanction tracker, Deal/Treaty)
- Story (1080×1920) + X (1600×900) export
- AI headline rewriter (Claude/Grok via server proxy, rate-limited)
- Post history (Supabase row per export)

### v0.3 (Week 16)
- Bulk mode (CSV → 20 posts)
- Custom background upload + auto-darken
- Brand-kit override for Premium (logo + color)

### v1.0 (Quarter 2)
- Team workspaces
- API (POST /render, returns PNG URL)
- White-label

**What is explicitly NOT in MVP**: video, animations, mobile app, collab cursors, Figma plugin. Each is a "no" until v0.3+.

---

## 4. Technical Architecture (concrete)

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js 15 (App Router, RSC)        Vercel Edge            │
│   ├─ /editor      Konva.js canvas + React state             │
│   ├─ /api/render  serverless → @napi-rs/canvas → PNG buffer │
│   └─ /api/ai/*    proxy to Anthropic/xAI, server-side keys  │
└──────┬──────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  Supabase (Postgres + Auth + Storage + Row-Level Security)  │
│   └─ buckets: exports/, user-uploads/, template-assets/     │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  Cloudflare R2 (cold storage of exports) + Cloudinary CDN   │
└─────────────────────────────────────────────────────────────┘
```

**Why Konva over Fabric**: better React integration, smaller bundle, simpler serialization (template JSON ↔ canvas).

**Why server-side render** (`/api/render`) instead of client `canvas.toDataURL()`: pixel-identical exports across browsers, font embedding control, watermark cannot be DOM-stripped.

**Data model (minimum viable)**:
```sql
users        (id, email, plan, created_at, razorpay_customer_id)
templates    (id, slug, name, schema_json, thumbnail_url, is_premium)
posts        (id, user_id, template_id, payload_json, updated_at)
exports      (id, post_id, format, url, watermarked, created_at)
ai_calls     (id, user_id, kind, tokens_in, tokens_out, created_at)  -- for rate limiting
```

**Security checklist (do not ship without)**:
- [ ] Server-side AI key only; never expose to client
- [ ] RLS on every table (`user_id = auth.uid()`)
- [ ] Upload MIME sniff + max 5 MB + image-only re-encode through Sharp (strips EXIF, prevents polyglot)
- [ ] Rate limit: 10 renders/min anon, 60/min auth, 200/min Premium (Upstash Redis)
- [ ] Razorpay webhook signature verify
- [ ] CSP, HSTS, no inline scripts (Next.js defaults + tightening)

---

## 5. Visual System (hand to a designer / lock as tokens)

```
Background        #0B0F14   (near-black, slight blue)
Map landmass      #1A2330
Map borders       #2A3645
Accent (primary)  #E10600   (BRO red)
Accent (highlight)#FF2D2D   (text underline)
Ink primary       #F5F7FA
Ink secondary     #9AA4B2

Type
  Display  : "Inter Tight" 800, tracking -0.02em
  Body     : "Inter" 500
  Numerals : "JetBrains Mono" 600 (for stats)

Grid: 1080 canvas, 64px safe margin, 12-col baseline
Logo lockup: top-left, 96px tall, BRO-red wordmark on dark
```

These are tokens, not suggestions — codify in `tailwind.config.ts` and `template-schema.json`.

---

## 6. Go-to-Market — 12-Week Sequence

| Week | Milestone | Channel action |
|---|---|---|
| -2 | Landing page + waitlist live | "Coming Soon" Story on @bhurajnaitik (3×/week) |
| 0 | v0.1 alpha | DM 50 IR creators, lifetime Premium for video review |
| 2 | Alpha feedback → fixes | Behind-the-scenes Reels: "How I make my posts" |
| 4 | v0.2 ready | Launch thread on X (template = §10 below) |
| 4 | Public launch | IG post, Reel, 6-tweet thread, ProductHunt (Tuesday) |
| 5 | Press push | Pitch ThePrint, ORF blog, MediaNama (angle: "Made-in-India creator tool for geopolitics") |
| 6–8 | Influencer wave | 10 paid micro-influencer collabs (₹2–5k each, IR/UPSC niches) |
| 10 | First case study | "How @xyz scaled to 50k followers using BRO" — long-form |
| 12 | First enterprise pilot | Pitch 3 think-tanks (ORF, Takshashila, IDSA) at ₹15k/mo |

**North-star metric**: weekly active creators × posts/creator. Vanity (signups) is ignored.

---

## 7. Pricing & Unit Economics (defensible)

| Tier | Price | Limits | Target persona |
|---|---|---|---|
| Free | ₹0 | 5 exports/mo, watermark, 1 template | Curious students |
| Premium | ₹499/mo or ₹4,999/yr | Unlimited, no watermark, all templates, AI rewriter (100/day) | Serious creator |
| Team | ₹1,499/seat/mo | 3+ seats, shared brand kit, comments | Think-tank comms |
| Enterprise | from ₹40k/mo | API, white-label, SSO | Embassy / agency |

**Unit economics (Premium, conservative)**:
- ARPU: ₹420/mo (blended monthly + annual)
- COGS/user: ~₹35/mo (Vercel + Supabase + AI ~₹15 + Cloudinary ~₹8 + payments ~₹12)
- Gross margin: **~92%**
- CAC target: ≤ ₹600 organic, ≤ ₹1,500 paid → payback < 4 months
- Annual churn assumption: 6% monthly → LTV ≈ ₹6,000 → LTV/CAC ≥ 4× threshold

**Revised revenue projections** (replace the hand-wavy numbers):
- **Year 1**: 5,000 free + 1,200 paid (24% conversion of engaged users, 60% of signups stay free) → ARR ≈ ₹50–60 L
- **Year 2**: 25,000 free + 7,000 paid + 8 enterprise → ARR ≈ ₹4.0–4.5 Cr
- Sensitivity: a 1pp shift in free→paid conversion = ±₹35 L on Y1.

---

## 8. Risks & Mitigations (was missing)

| Risk | Severity | Mitigation |
|---|---|---|
| Brand confusion: is BRO official? | High | Co-brand explicitly: "From the team behind @bhurajnaitik". Single legal entity owns both. |
| Map / border representation (India sensitivity: Kashmir, Arunachal) | **Critical** | Use Survey of India-aligned outlines for India-rendering; geofence default outline; legal review before launch. |
| Defamation via user-generated content | High | ToS: user owns content + warrants accuracy; takedown SLA 24h; no AI-generated faces of real people in v1. |
| Canva ships geo-template pack | Medium | Speed + brand halo; depth of asset library |
| AI hallucinates facts in headlines | Medium | Rewriter is **rephrasing only** — does not generate facts; explicit user-confirms checkbox |
| Razorpay/Stripe declines for sanction-related content | Low | Content policy doc; manual review queue for "war/sanction" keyword posts |
| Founder bandwidth (single creator + dev) | High | Hire 1 contractor designer @ Week 4; freeze scope creep |

---

## 9. Org & Hiring (90-day)

- **Founder (you)**: product, brand, content
- **Week 0–6**: solo / one freelance Next.js dev (₹80k–1.2L for MVP build)
- **Week 6**: contract designer for template pack 2 (₹40k flat for 5 templates)
- **Week 10**: part-time community/support (₹25k/mo)
- **Quarter 2**: full-time engineer #1 once MRR > ₹3 L

---

## 10. Launch Comms — Polished Drafts

### X Thread (8 posts, hooks tightened)

**1/8** — Hook
> For 18 months I posted geopolitics on @bhurajnaitik.
> Every single post took 60+ minutes in Canva.
> Today I'm releasing the tool I built to do it in 60 seconds.
> Meet **BHU-RAJNAITIK OBSERVER**.

**2/8** — Demo
> 🎥 [15-sec screen-record: type headline → pick country → export]
> That's it. No design skill needed.

**3/8** — Why
> Analysis is hard. Visuals shouldn't be.
> Your 2 a.m. take on Iran shouldn't lose to a slick infographic from someone with half your insight.

**4/8** — What ships today
> • Pixel-exact BRO template
> • Auto red-keyword highlighting
> • IG square + Story + X export
> • Free tier (yes, really free)

**5/8** — Who it's for
> UPSC aspirants. IR students. Journalists. Think-tank interns. Anyone who has 1000 takes and 0 hours.

**6/8** — Proof
> Used by 50 alpha creators last 30 days.
> They published 1,400+ posts.
> Avg time per post: 47 seconds.

**7/8** — Pricing
> Free forever for 5 posts/month.
> Premium ₹499/mo. Lifetime deal for first 100: ₹2,999.

**8/8** — CTA
> 👉 bhurajnaitik.observer
> RT post #1 if you build in public — it helps a lot.

### Instagram Caption (long form)

> Two years ago I made a single post about the Russia-Ukraine front line.
> It got 80k saves. The DMs all said the same thing: *"How did you make this?"*
>
> The honest answer: 90 minutes in Canva, every time.
>
> So I built the tool I wished existed.
>
> Today I'm opening **BHU-RAJNAITIK OBSERVER** to everyone — the same tool I use for every post on this page.
>
> Type a headline. Pick a country. Hit export. Done.
>
> Free to start. Link in bio.
>
> If you're a student, an analyst, or just someone who refreshes BBC at 1 a.m. — this is for you.

### Cold DM to influencers (90% reply rate target)

> Hey [name] — I run @bhurajnaitik. I just built the visual tool behind every post on the page and I want to give you lifetime Premium (worth ~₹50k) in exchange for one honest 60-sec review. Reply with "in" and I'll send you access today.

---

## 11. Taglines — Ranked

1. **"Geopolitics, Visualized."** — clearest, ownable, headline-friendly. **Use this.**
2. "Authority in Every Pixel." — strong B2B angle, secondary tagline.
3. "From Think Tank to Feed." — good for ORF/IDSA pitch deck.
4. ~"Serious Analysis. Sharp Visuals."~ — drop, generic.

---

## 12. Open Questions (decide before Week 0)

- [ ] Domain: `.observer` (premium, ~₹6k/yr) vs `.in` (national signal, cheaper) vs subdomain `creator.bhurajnaitik.com`?
- [ ] Legal entity: sole prop / LLP / Pvt Ltd? (Pvt Ltd if raising; LLP if bootstrapping)
- [ ] India border-rendering policy doc — who reviews?
- [ ] Are we OK with Razorpay-only at launch (India-first), or do we need Stripe for global?
- [ ] Trademark: file "BHU-RAJNAITIK OBSERVER" word mark + logo (Class 9 + 42)?

---

## 13. Definition of Done — Week 6 Alpha

A user-shaped human can:
1. Visit bhurajnaitik.observer
2. Sign up with email magic link in <30s
3. Pick the canonical template
4. Type "Iran strikes Israeli air base" + select Iran
5. See live preview update <100ms
6. Click Export → receive 1080×1080 PNG indistinguishable from a hand-made @bhurajnaitik post
7. Pay ₹99 → watermark removed → re-export

If any of these 7 steps takes >2 attempts, ship is blocked.

---

## 14. Next 5 Concrete Actions (this week)

1. Register `bhurajnaitik.observer` (or chosen domain) + Razorpay merchant account
2. Pull 30 best `@bhurajnaitik` posts → annotate every variable element → that becomes `template-schema.json` v0
3. Draft `template-schema.json` and the corresponding Konva renderer in a 100-line spike
4. Create waitlist landing page (Next.js + Resend for emails) — ship by Friday
5. Post the "I'm building this" teaser on @bhurajnaitik to start collecting waitlist

---

*End v1.1. Edit freely; treat as the single source of truth and supersede all earlier docs.*
