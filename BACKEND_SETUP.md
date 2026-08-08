# Connecting the Backend — Step by Step

This project uses **three** backend services. Only Supabase is required for
the site to actually function (auth, data, enquiries); Sanity and Mapbox are
optional enhancements that gracefully no-op without them.

| Service | Powers | Required? |
|---|---|---|
| **Supabase** | Auth, user roles, artworks/orders schema, enquiries, quotes, country-sound uploads | ✅ Yes |
| **Sanity** | Journal posts, exhibitions, artists, artworks (CMS-editable content) | Optional |
| **Mapbox** | `/map` interactive discovery map | Optional |

---

## Part 1 — Supabase (required)

### Step 1: Create the project
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
2. Pick a name, database password (save it somewhere), and region.
3. Wait ~2 minutes for provisioning.

### Step 2: Get your API keys
1. In your project, go to **Project Settings → API Keys**.
2. Copy the **Project URL** (top of the page).
3. Copy the **Publishable key** (`sb_publishable_...`). If you don't see one yet, click **Create new API keys**. (The old-style `anon` key under "Legacy API Keys" also works if you already have one.)
4. Also copy the **service_role** key (sometimes labeled **secret**) from the same page — needed for Step 3b (deleting users from `/admin`). Never put this in a `NEXT_PUBLIC_*` variable or send it to the browser.

### Step 3: Set your env vars
```bash
cd nu-art-nextjs
cp .env.local.example .env.local
```
Open `.env.local` and fill in:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxxxxxxxxxx
```

### Step 3b: Add the service role key (optional — only needed to delete users)
The **users** tab in `/admin` can delete a user's account entirely, which requires
Supabase's Admin API rather than the public one. Add:
```
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxxxxxxxxxxxxxxxxxxx
```
Without this, everything else works — the delete button in `/admin` just returns
a "not configured" error instead of deleting.

### Step 4: Run the database migrations
All schema files live in `supabase/migrations/`, in order:

| File | Creates |
|---|---|
| `20260630080102_...sql` | Core schema: `profiles`, `user_roles`, `artworks`, `orders`, `order_items`, `favorites` + role-checking functions (`has_role`, `get_my_primary_role`) + auto-create-profile trigger |
| `20260630080117_...sql` | Trigger helper fix |
| `20260630080237_...sql` | Storage policies for `artworks` and `avatars` buckets |
| `20260708203111_...sql` | Minor schema adjustment |
| `20260708203150_...sql` | Role-function hardening |
| `20260714105149_...sql` | `country_sounds` table |
| `20260714105213_...sql` | Storage policies for `country-sounds` bucket |
| `20260714110102_...sql` | Small follow-up fix |
| `20260714165653_...sql` | Small follow-up fix |
| `20260726000000_enquiries.sql` | `enquiries` table (Price Upon Request flow) |
| `20260727000000_quotes.sql` | Adds quote fields + `get_quote_by_token()` function (private checkout links) |
| `20260802124500_create_artworks_bucket.sql` | Creates the `artworks` storage bucket |
| `20260803141500_create_avatars_bucket.sql` | Creates the `avatars` storage bucket |
| `20260804000000_journal_exhibitions.sql` | `journal_posts` + `exhibitions` tables (admin-authored, no draft gate — publish = insert) |
| `20260804000001_create_journal_exhibitions_buckets.sql` | Creates the `journal` and `exhibitions` storage buckets |
| `20260804000002_journal_exhibitions_bucket_policies.sql` | Storage policies for the `journal` and `exhibitions` buckets |
| `20260805000000_page_blocks.sql` | `page_blocks` table (backs inline on-page editing on `/journal` and `/exhibitions`) |

**Easiest way to run them — paste into the SQL Editor:**
1. In Supabase Dashboard, open **SQL Editor**.
2. Open each file in `supabase/migrations/` **in filename order** (oldest timestamp first), paste its contents, click **Run**.
3. Repeat for all files. Order matters — later ones reference tables/functions created earlier.

**Or, if you use the Supabase CLI** (faster for 11 files):
```bash
npm install -g supabase
supabase login
supabase link --project-ref your-project-ref   # find this in your project URL
supabase db push
```

### Step 5: Create storage buckets (manual — not in SQL)
The migrations set up *policies* for these buckets, and the bucket-insert migrations above create the buckets too — but if your project doesn't allow `insert into storage.buckets` from the SQL Editor, create them manually:
1. Dashboard → **Storage** → **New bucket**.
2. Create five buckets, each **public**:
   - `artworks`
   - `avatars`
   - `country-sounds`
   - `journal`
   - `exhibitions`

### Step 6: Make yourself an admin
The admin dashboard (`/admin`) and Enquiries inbox are gated behind the `admin` role. To grant it to your own account:
1. Sign up on the running site (`/auth`) with your email first — this auto-creates your `profiles` row via the trigger.
2. In Supabase Dashboard → **SQL Editor**, run:
   ```sql
   insert into public.user_roles (user_id, role)
   values ('YOUR-USER-UUID-HERE', 'admin');
   ```
   Find your UUID under **Authentication → Users**.

### Step 7: Enable Google OAuth Login (Required for Google Sign-In)
By default, Google Auth is disabled in a new Supabase project, causing `Unsupported provider: provider is not enabled` error if attempted before setup.

To enable Google Auth:
1. **Google Cloud Console setup:**
   - Go to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
   - Create a new project (or select an existing one) → **Create Credentials** → **OAuth client ID**.
   - Select **Web application** as application type.
   - Under **Authorized redirect URIs**, add:
     `https://<YOUR-SUPABASE-PROJECT-REF>.supabase.co/auth/v1/callback`
     *(Replace `<YOUR-SUPABASE-PROJECT-REF>` with your actual Supabase URL host, e.g. `azysiozxzznstcvwjefd`)*.
   - Click **Create** and copy your **Client ID** and **Client Secret**.
2. **Supabase Dashboard configuration:**
   - Open your Supabase Dashboard → **Authentication** → **Providers**.
   - Scroll down to **Google** and expand it.
   - Toggle **Enable Google provider** to ON.
   - Paste your **Client ID** and **Client Secret**.
   - Click **Save**.

### Step 8: Verify it's connected
```bash
npm run dev
```
- Go to `/auth` and sign up — if it redirects to `/dashboard`, auth works.
- Go to `/artworks/[any-slug]` and click **Request Price**, submit the form — if it shows "Enquiry sent", the `enquiries` table write works.
- Go to `/admin` (after granting yourself the admin role) — you should see the enquiry you just submitted under the **Enquiries** tab.

---

## Part 2 — Sanity CMS (optional)

Powers editable content for: homepage hero *(currently unused since the hero redesign — see note in `app/page.tsx`)*, `/artists`, `/artworks/[slug]`. `/journal` and `/exhibitions` now read primarily from Supabase and only fall back to Sanity, then static content, when Supabase has nothing published yet — but they're no longer managed from `/admin`. Instead, an admin visiting `/journal` or `/exhibitions` directly sees small edit-pencil icons on every editable block (headline, paragraphs, images, and the post/exhibition cards) and edits in place; changes save straight to Supabase (`journal_posts`, `exhibitions`, `page_blocks` tables) and appear on the page immediately.

### Step 1: Create a Sanity project
1. Go to [sanity.io](https://sanity.io) → sign up (free tier is enough) → **Create new project**.
2. Note your **Project ID** (shown on the project dashboard).

### Step 2: Set up Sanity Studio (the content-editing admin)
Sanity Studio is a **separate app** from this Next.js project — it's where you and your team actually write content.
```bash
npm create sanity@latest
# follow prompts, choose "Clean project with no predefined schema"
```
Then copy this repo's schema files into your new Studio project:
```bash
cp -r nu-art-nextjs/sanity/schemas/* your-sanity-studio/schemaTypes/
```
In your Studio's `sanity.config.ts`:
```ts
import { schemaTypes } from './schemaTypes'
export default defineConfig({ ..., schema: { types: schemaTypes } })
```
Run the Studio locally to start adding content:
```bash
cd your-sanity-studio
npm run dev
```

### Step 3: Connect the Next.js app to it
In `nu-art-nextjs/.env.local`:
```
NEXT_PUBLIC_SANITY_PROJECT_ID=your-project-id
NEXT_PUBLIC_SANITY_DATASET=production
```

### Step 4: Add content
In Studio, create documents: one `Site Settings`, and as many `Journal Post` / `Exhibition` / `Artist` / `Artwork` documents as you want. They'll appear on the live site within ~60 seconds (revalidation).

**Nothing is required here** — every page that reads from Sanity falls back to the existing static content when Sanity has no matching documents yet.

---

## Part 3 — Mapbox (optional)

Powers `/map` only.

1. Go to [account.mapbox.com](https://account.mapbox.com) → sign up (free tier: 50,000 map loads/month) → **Tokens** tab.
2. Copy your **default public token** (starts with `pk.`).
3. In `.env.local`:
   ```
   NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxxxxxxxxxxxxxxxxxxxx
   ```

Without this, `/map` shows a friendly "not configured" card instead of erroring.

---

## Quick reference: full `.env.local`

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SANITY_PROJECT_ID=
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_MAPBOX_TOKEN=
```

Restart `npm run dev` after any `.env.local` change — Next.js only reads env vars at server start.
