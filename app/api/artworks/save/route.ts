import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { runOriginalityCheck } from "@/lib/originality/check";

export const runtime = "nodejs";
export const maxDuration = 60;

type ArtworkInput = Database["public"]["Tables"]["artworks"]["Insert"];

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Originality checks are not configured.");
  return createClient<Database>(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !anon || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Originality checks are not configured." }, { status: 501 });
  }
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Missing auth token." }, { status: 401 });

  const caller = createClient<Database>(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user } } = await caller.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  const { data: roles } = await caller.from("user_roles").select("role").eq("user_id", user.id);
  const isAdmin = (roles ?? []).some((row) => row.role === "admin");
  const isArtist = (roles ?? []).some((row) => row.role === "artist");
  if (!isAdmin && !isArtist) return NextResponse.json({ error: "Artist or admin role required." }, { status: 403 });

  let body: { artwork?: Partial<ArtworkInput> & { id?: string } };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const input = body.artwork;
  if (!input?.title?.trim() || !input.image_url?.trim() || !(Number(input.price_usd) > 0)) {
    return NextResponse.json({ error: "Title, image, and a positive price are required." }, { status: 400 });
  }

  const service = serviceClient();
  if (!isAdmin) {
    const { data: profile } = await service.from("profiles").select("country").eq("id", user.id).maybeSingle();
    if (!profile?.country || profile.country !== input.country) {
      return NextResponse.json({ error: "Artwork country must match your registered profile country." }, { status: 403 });
    }
  }
  if (input.id) {
    const { data: existing } = await service.from("artworks").select("id, artist_id").eq("id", input.id).maybeSingle();
    if (!existing) return NextResponse.json({ error: "Artwork not found." }, { status: 404 });
    if (!isAdmin && existing.artist_id !== user.id) return NextResponse.json({ error: "You can only edit your own artwork." }, { status: 403 });
  } else if (!isAdmin && input.artist_id && input.artist_id !== user.id) {
    return NextResponse.json({ error: "You can only submit artwork for yourself." }, { status: 403 });
  }

  try {
    const originality = await runOriginalityCheck({ imageUrl: input.image_url, excludeArtworkId: input.id });
    const requestedStatus = isAdmin
      ? input.status ?? "draft"
      : input.status === "pending_review"
        ? "pending_review"
        : "draft";
    const status = originality.decision === "blocked" ? "blocked" : originality.decision === "review" ? "pending_review" : requestedStatus;
    // Never trust status or originality fields supplied by the browser.
    const submitted = { ...input };
    delete submitted.id;
    if (!isAdmin) delete submitted.managed_artist_id;
    const payload: ArtworkInput = {
      ...submitted,
      artist_id: isAdmin ? input.artist_id ?? user.id : user.id,
      title: input.title.trim(),
      image_url: input.image_url.trim(),
      price_usd: Number(input.price_usd),
      slug: input.slug?.trim() || `${input.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${crypto.randomUUID().slice(0, 6)}`,
      status,
      image_phash: originality.phash,
      originality_status: originality.decision,
      originality_score: originality.score,
      originality_report: { decision: originality.decision, score: originality.score, matches: originality.matches, webSearch: originality.webSearch, note: originality.note },
      originality_checked_at: new Date().toISOString(),
    };
    const query = input.id
      ? service.from("artworks").update(payload).eq("id", input.id).select().single()
      : service.from("artworks").insert(payload).select().single();
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return NextResponse.json({ artwork: data, originality });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save artwork." }, { status: 500 });
  }
}
