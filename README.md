# NU-ART Collective — Next.js + Tailwind

Full port of the NU-ART Collective site from TanStack Start to Next.js (App
Router), styled entirely with Tailwind CSS v4 — no separate/external CSS
files. Every design token, keyframe, and one-off utility class lives in the
single Tailwind entry point: `app/globals.css`.

## Pricing: Price Upon Request

Per client requirement, **no prices are displayed publicly** anywhere on the
site. Every "buy" surface (homepage picks, collections, artwork/artist
detail, country galleries, saved artworks) shows a "Price Upon Request" label
and a **Request Price** button that opens an enquiry form (name/email/message).
Submissions go to a new `enquiries` Supabase table — see
`supabase/migrations/20260726000000_enquiries.sql` (run this against your
Supabase project) — and show up under **Admin → Enquiries**, where staff can
triage status (new/contacted/quoted/closed) and reply by email directly.

`/checkout` (no token) now just explains the private-link model and points
to `/artists`. The real flow: **Admin → Enquiries** → enter a price → **Set
Quote** generates a unique token (14-day expiry) and copies
`/checkout/[token]` to the clipboard for the admin to paste into their reply
email. That page verifies the token via a `SECURITY DEFINER` Postgres
function (`get_quote_by_token`, see the `20260727000000_quotes.sql`
migration) — so a visitor can only ever resolve their *own* quote, never
browse anyone else's. An invalid/expired token shows a friendly message
instead of erroring. `/order-confirmation` is unchanged — still the mock
"success" page after submitting the form, no real payment processing, per
your instruction to leave payment out of this pass. `lib/data/cart.ts`
(localStorage cart) remains unused by the public flow.

## CMS: Sanity (hero image + copy)

The homepage hero image and headline are now editable via Sanity instead of
hardcoded:

1. Create a free project at [sanity.io](https://sanity.io).
2. Add `sanity/schemas/siteSettings.ts` (already in this repo) to your Studio
   project's schema types.
3. In Studio, create one "Site Settings" document and upload your hero image.
4. Add to `.env.local`:
   ```
   NEXT_PUBLIC_SANITY_PROJECT_ID=your-project-id
   NEXT_PUBLIC_SANITY_DATASET=production
   ```

Without those env vars set, the hero just falls back to the original
animated logo mark — nothing breaks. `lib/sanity/queries.ts` is the fetch
layer; add more fields to the schema + query as you want more of the site
CMS-editable.

## Mobile responsiveness

- **Header**: hamburger menu on mobile (`components/layout/MobileNavDrawer.tsx`) — full nav + account actions in a slide-in drawer, all tap targets ≥44px
- **Bottom nav bar** (`components/layout/MobileBottomNav.tsx`): fixed Home/Map/Artists/Saved/Menu bar, mobile only, respects safe-area-inset for notched phones
- Drawer + bottom-nav "Menu" button share state via `lib/mobile-nav.tsx` (`MobileNavProvider`)
- Atlas map (`AtlasMap.tsx`) already collapses from a 2-column map+list layout to a single stacked column on small screens (existing `grid-cols-1 lg:grid-cols-[...]`) — not a true swipeable bottom sheet yet, left as-is since retrofitting one into the 930-line D3 component is a separate, riskier piece of work
- Horizontal carousels (Featured Artists, etc.) already use native `overflow-x-auto` + scroll-snap, which gives free touch-swipe support in mobile browsers

**Not yet done**: pinch-to-zoom on artwork images, a true bottom-sheet interaction for the country map on mobile, and a systematic touch-target audit beyond the nav (some smaller buttons elsewhere in the site may still be under 44px).

## Mapbox — interactive discovery map

New `/map` page (also in header nav + mobile bottom nav) — Screen S-02 from
the UX spec: full Mapbox GL map of Africa, hover tooltip, click → `/discover/[country]`,
zoom/reset controls, quick-filter chips by medium (Painting/Sculpture/etc.,
computed live from the 178-artist directory). The homepage keeps its existing
D3 Atlas teaser section — this is the dedicated, full-screen version.

Falls back to a friendly "not configured" card (with signup link) when
`NEXT_PUBLIC_MAPBOX_TOKEN` isn't set — nothing breaks without it. Add a free
token from [account.mapbox.com](https://account.mapbox.com) to activate.

## CMS coverage (expanded)

Beyond the hero image, `/journal` and `/exhibitions` now fetch from Sanity
first (`journalPost` / `exhibition` schemas in `sanity/schemas/`), falling
back to the original static content when Sanity has no documents yet — so
both pages work immediately and become CMS-editable the moment you add
content in Studio. Same pattern as the hero: add the schema files to your
Studio project, create documents, done.

**Not yet CMS-driven**: the 178-artist directory, artwork detail pages, and
collections — these stay as structured data in `lib/data/` for now. They're
good candidates for an `artist`/`artwork` Sanity schema in a future pass if
you want editors managing them without code deploys.

## Status: all 18 routes ported

| Route | Notes |
|---|---|
| `/` | Hero, full interactive D3 Atlas map (hover sound, country shards), Featured Artists, Collector Picks, Discover by Origin, Mission Stats, Process, Newsletter |
| `/artists` | Real filterable directory — 178 artists, 54 countries, technique/country/search filters synced to the URL |
| `/artists/[slug]` | Artist profile (editorial showcase template from the original) |
| `/artworks/[slug]` | Artwork detail (editorial showcase template from the original) |
| `/auth` | Sign in / sign up (Supabase) |
| `/checkout` → `/order-confirmation` | Full commerce flow, item passed via URL params |
| `/collections` | Filterable collection browser (country/medium/price, grid/list toggle) |
| `/discover/[country]` | **Primary** country spotlight — fully data-driven for all 54 countries (featured artist, curated works, stories, exhibitions, prev/next nav) |
| `/countries/[country]` | Static Nigeria showcase template from the original (kept for parity) |
| `/gallery/[country]` | Immersive scroll-through virtual room gallery per country, with cart + artwork panel |
| `/exhibitions`, `/journal` | Editorial pages |
| `/virtual-gallery` | Full 3D museum — Three.js + react-three-fiber, WASD/pointer-lock movement, 4 zones, minimap |
| `/account` | Collector's Circle — saved artworks / followed artists / order history tabs |
| `/dashboard` | Role-based dashboard (artist / client / admin) |
| `/admin` | Admin console — members, orders, country sound uploads |

## Folder structure

```
app/                        Routes only (Next.js App Router — one folder per page)
  globals.css                ALL styling: Tailwind import + design tokens + keyframes
  layout.tsx                  Root layout: fonts, theme init script, header/footer
  page.tsx                     Homepage — composes the section components below
  providers.tsx                 React Query + Theme + Auth providers + Toaster

components/
  layout/                     SiteHeader, SiteFooter, ThemeToggle
  enquiry/                    PriceUponRequest, RequestPriceButton, EnquiryModal
  sections/
    home/                      One file per homepage section (Hero, AtlasMap, ...)
    artists/                    ArtistCard, ArtistDirectory
    checkout/                   CheckoutForm, OrderConfirmation
    collections/                 CollectionsView
  three/                       VirtualMuseum.tsx (Three.js scene)
  dashboards/                  ArtistDashboard, ClientDashboard, AdminDashboard, EnquiriesAdmin, ...
  ui/                          Reserved for shared primitives

lib/
  data/                       All content/mock data + domain logic
    content.ts                  Homepage mock artists/artworks
    artists.ts                   Full 178-artist directory
    africa.ts, africa-map.ts, africa-shards.ts   Atlas map data + geometry
    africa-geo.json              GeoJSON for the continent outline
    african-imagery.ts           Deterministic image picker (public/images)
    country-sounds.ts            Per-country hover-sound hook + admin CRUD
    cart.ts                      Tiny localStorage cart (unused by public flow now)
    enquiries.ts                  submitEnquiry() — writes to Supabase
  supabase/                   client.ts (browser client) + types.ts (generated DB types)
  sanity/                     client.ts + queries.ts (getSiteSettings)
  auth.tsx                    Supabase auth context (user/role/sign in/out)
  theme.tsx                    Dark/light theme context
  utils.ts                     `cn()` class-merging helper

sanity/schemas/                Schema files to copy into a separate Sanity Studio project

public/images/                Real asset files (artist portraits, artwork photography, etc.)
```

## Setup

```bash
npm install
cp .env.local.example .env.local   # fill in your Supabase URL + publishable key
npm run dev
```

The app runs without Supabase configured too — auth-dependent pages just
render signed-out instead of crashing.

## Notes / known simplifications

- Some images are hotlinked from the original Lovable asset host
  (`nu-artcollective.lovable.app`) as a placeholder — swap for self-hosted or
  Supabase Storage URLs when you export the real asset files. Others (the
  178-artist directory's imagery, the Atlas map's geometry) use real files
  copied into `public/images` and `lib/data/`.
- `/artists/[slug]`, `/artworks/[slug]`, and `/countries/[country]` are
  editorial *templates* in the original site (fixed showcase content, not a
  real per-item lookup) — ported as-is for fidelity. `/discover/[country]` is
  the one that's genuinely data-driven per URL param.
- No CSS Modules, styled-components, or extra stylesheets anywhere — every
  visual comes from Tailwind utility classes, plus the token/animation
  definitions centralized in `app/globals.css`.
