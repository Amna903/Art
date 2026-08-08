import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

// The admin/artist editors (JournalGrid, ExhibitionsGrid, ArtistDashboard)
// write straight to Supabase from the browser — there's no server action in
// that path to call revalidateTag from directly. This lets them ping it
// after a successful write so the change is visible immediately instead of
// waiting out the 60s unstable_cache window (see lib/data/journal.ts,
// lib/data/exhibitions.ts, lib/data/supabase-artists-cached.ts). Whitelisted
// tags only — this endpoint only clears cache entries, it can't read or
// write any data, so the worst a bad actor gets is a few extra Supabase
// reads.
const ALLOWED_TAGS = new Set(["journal-posts", "exhibitions", "artworks"]);

export async function POST(req: Request) {
  const { tag } = await req.json().catch(() => ({ tag: null }));

  if (typeof tag !== "string" || !ALLOWED_TAGS.has(tag)) {
    return NextResponse.json({ error: "Unknown tag." }, { status: 400 });
  }

  // { expire: 0 }, not the recommended profile="max", because this is called
  // right after an admin/artist write and the very next page view (their own
  // navigation back to the page) needs the fresh row, not stale-while-revalidate.
  revalidateTag(tag, { expire: 0 });
  return NextResponse.json({ revalidated: true, tag });
}
